import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const getTransactionsSchema = z.object({
  childId: z.string().optional(),
  type: z
    .enum([
      'CHORE',
      'ALLOWANCE',
      'PENALTY',
      'GOAL_FUNDING',
      'EXPENSE_APPROVED',
      'EXPENSE_DEDUCTION',
      'REFUND',
    ])
    .optional(),
  limit: z.coerce.number().default(20),
  offset: z.coerce.number().default(0),
});

export const getTransactions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = getTransactionsSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { childId, type, limit, offset } = parsed.data;

    const where: Prisma.TransactionWhereInput = {};

    if (req.user.role === 'CHILD') {
      // Children can only see their own transactions
      where.childId = req.user.id;
    } else if (childId) {
      // Parent requesting specific child's transactions — verify family membership
      const child = await prisma.user.findUnique({ where: { id: childId } });
      if (!child || child.familyId !== req.user.familyId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      where.childId = childId;
    } else {
      // Parent requesting all family transactions
      const familyChildren = await prisma.user.findMany({
        where: { familyId: req.user.familyId, role: 'CHILD' },
        select: { id: true },
      });
      where.childId = { in: familyChildren.map((c) => c.id) };
    }

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          child: {
            select: { id: true, name: true, avatar: true },
          },
          chore: {
            select: { id: true, title: true },
          },
          expense: {
            select: { id: true, title: true },
          },
          goal: {
            select: { id: true, title: true },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({ transactions, total });
  } catch (err) {
    console.error('[getTransactions]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
