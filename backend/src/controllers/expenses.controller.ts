import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
import { emitToFamily, emitToUser, SocketEvents } from '../socket';

const requestExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  expenseType: z.enum(['ONLINE', 'CASH', 'OTHER', 'IMPOSED']).default('OTHER'),
  description: z.string().optional(),
  reference: z.string().optional(),
});

const approveExpenseSchema = z.object({
  approvedAmount: z.number().positive('Approved amount must be positive'),
  parentNote: z.string().optional(),
});

const rejectExpenseSchema = z.object({
  rejectionReason: z.string().optional(),
});

const deductExpenseSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional(),
});

const refundExpenseSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
  amount: z.number().positive('Amount must be positive'),
});

const getExpenseHistorySchema = z.object({
  childId: z.string().optional(),
  month: z.string().optional(), // YYYY-MM format
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']).optional(),
  limit: z.coerce.number().default(20),
  offset: z.coerce.number().default(0),
});

export const requestExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = requestExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { title, amount, expenseType, description, reference } = parsed.data;
    const childId = req.user.id;

    // Check child settings
    const settings = await prisma.childSettings.findUnique({
      where: { childId },
    });

    if (settings?.frozen) {
      res.status(403).json({ error: 'Your account is frozen by a parent' });
      return;
    }

    if (settings && amount > settings.maxExpensePerRequest) {
      res.status(400).json({
        error: `Amount exceeds maximum per request (${settings.maxExpensePerRequest})`,
      });
      return;
    }

    // Check weekly spend
    if (settings) {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const weeklySpend = await prisma.transaction.aggregate({
        where: {
          childId,
          type: { in: ['EXPENSE_APPROVED', 'EXPENSE_DEDUCTION'] },
          date: { gte: startOfWeek },
        },
        _sum: { amount: true },
      });

      const spent = Math.abs(weeklySpend._sum.amount ?? 0);
      if (spent + amount > settings.maxExpensePerWeek) {
        res.status(400).json({
          error: `This request would exceed your weekly limit (${settings.maxExpensePerWeek})`,
        });
        return;
      }
    }

    const expense = await prisma.expenseRequest.create({
      data: {
        childId,
        title,
        amount,
        expenseType,
        description,
        reference,
        status: 'PENDING',
      },
      include: {
        child: {
          select: { id: true, name: true, avatar: true, familyId: true },
        },
      },
    });

    // Notify parents in family room
    emitToFamily(req.user.familyId, SocketEvents.EXPENSE_REQUESTED, expense);

    res.status(201).json({ expense });
  } catch (err) {
    console.error('[requestExpense]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = approveExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { approvedAmount, parentNote } = parsed.data;
    const { id } = req.params;

    const expense = await prisma.expenseRequest.findUnique({
      where: { id },
      include: { child: true },
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense request not found' });
      return;
    }

    // Ensure expense belongs to a child in the parent's family
    if (expense.child.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (expense.status !== 'PENDING') {
      res.status(400).json({ error: 'Expense is not in PENDING status' });
      return;
    }

    // Clamp approved amount to child's current balance
    const clampedAmount = Math.min(approvedAmount, expense.child.balance);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.expenseRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAmount: clampedAmount,
          parentNote,
        },
      });

      await tx.user.update({
        where: { id: expense.childId },
        data: {
          balance: Math.max(0, expense.child.balance - clampedAmount),
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          childId: expense.childId,
          amount: -clampedAmount,
          type: 'EXPENSE_APPROVED',
          description: `Dépense approuvée: ${expense.title}`,
          expenseId: id,
        },
      });

      return { updated, transaction };
    });

    // Notify child
    emitToUser(expense.childId, SocketEvents.EXPENSE_APPROVED, result.updated);
    emitToUser(expense.childId, SocketEvents.BALANCE_UPDATED, {
      childId: expense.childId,
      balance: Math.max(0, expense.child.balance - clampedAmount),
    });

    res.json({ expense: result.updated });
  } catch (err) {
    console.error('[approveExpense]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = rejectExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { rejectionReason } = parsed.data;
    const { id } = req.params;

    const expense = await prisma.expenseRequest.findUnique({
      where: { id },
      include: { child: true },
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense request not found' });
      return;
    }

    if (expense.child.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (expense.status !== 'PENDING') {
      res.status(400).json({ error: 'Expense is not in PENDING status' });
      return;
    }

    const updated = await prisma.expenseRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason },
    });

    emitToUser(expense.childId, SocketEvents.EXPENSE_REJECTED, updated);

    res.json({ expense: updated });
  } catch (err) {
    console.error('[rejectExpense]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deductExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = deductExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { childId, title, amount, description } = parsed.data;

    const child = await prisma.user.findUnique({ where: { id: childId } });
    if (!child || child.role !== 'CHILD') {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    if (child.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expenseRequest.create({
        data: {
          childId,
          title,
          description,
          amount,
          expenseType: 'IMPOSED',
          status: 'COMPLETED',
          approvedAmount: amount,
        },
      });

      const newBalance = Math.max(0, child.balance - amount);

      await tx.user.update({
        where: { id: childId },
        data: { balance: newBalance },
      });

      const transaction = await tx.transaction.create({
        data: {
          childId,
          amount: -amount,
          type: 'EXPENSE_DEDUCTION',
          description: description ?? `Dépense imposée: ${title}`,
          expenseId: expense.id,
        },
      });

      return { expense, transaction, newBalance };
    });

    emitToUser(childId, SocketEvents.EXPENSE_DEDUCTED, result.expense);
    emitToUser(childId, SocketEvents.BALANCE_UPDATED, {
      childId,
      balance: result.newBalance,
    });

    res.status(201).json({ expense: result.expense });
  } catch (err) {
    console.error('[deductExpense]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const refundExpense = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = refundExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { expenseId, amount } = parsed.data;

    const expense = await prisma.expenseRequest.findUnique({
      where: { id: expenseId },
      include: { child: true },
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (expense.child.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!['APPROVED', 'COMPLETED'].includes(expense.status)) {
      res.status(400).json({
        error: 'Can only refund approved or completed expenses',
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newBalance = expense.child.balance + amount;

      await tx.user.update({
        where: { id: expense.childId },
        data: { balance: newBalance },
      });

      const transaction = await tx.transaction.create({
        data: {
          childId: expense.childId,
          amount: +amount,
          type: 'REFUND',
          description: `Remboursement: ${expense.title}`,
          expenseId,
        },
      });

      return { transaction, newBalance };
    });

    emitToUser(expense.childId, SocketEvents.BALANCE_UPDATED, {
      childId: expense.childId,
      balance: result.newBalance,
    });

    res.json({ transaction: result.transaction });
  } catch (err) {
    console.error('[refundExpense]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpenseHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = getExpenseHistorySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { childId, month, status, limit, offset } = parsed.data;

    // Build where clause
    const where: Prisma.ExpenseRequestWhereInput = {};

    if (req.user.role === 'CHILD') {
      where.childId = req.user.id;
    } else if (childId) {
      // Parent requesting for specific child — verify child is in family
      const child = await prisma.user.findUnique({ where: { id: childId } });
      if (!child || child.familyId !== req.user.familyId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      where.childId = childId;
    } else {
      // Parent requesting all family expenses
      const familyChildren = await prisma.user.findMany({
        where: { familyId: req.user.familyId, role: 'CHILD' },
        select: { id: true },
      });
      where.childId = { in: familyChildren.map((c) => c.id) };
    }

    if (status) {
      where.status = status;
    }

    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      where.createdAt = { gte: start, lt: end };
    }

    const [expenses, total] = await Promise.all([
      prisma.expenseRequest.findMany({
        where,
        include: {
          child: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.expenseRequest.count({ where }),
    ]);

    // Aggregations
    const aggregations = await prisma.expenseRequest.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
      _sum: { amount: true },
    });

    res.json({ expenses, total, aggregations });
  } catch (err) {
    console.error('[getExpenseHistory]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
