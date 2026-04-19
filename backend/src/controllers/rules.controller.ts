import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emitToUser, SocketEvents } from '../socket';

const createRuleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  active: z.boolean().default(true),
});

const updateRuleSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  active: z.boolean().optional(),
});

const applyPenaltySchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
});

export const getRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const rules = await prisma.rule.findMany({
      where: { familyId: req.user.familyId },
      orderBy: { title: 'asc' },
    });

    res.json({ rules });
  } catch (err) {
    console.error('[getRules]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { title, description, amount, active } = parsed.data;

    const rule = await prisma.rule.create({
      data: {
        familyId: req.user.familyId,
        title,
        description,
        amount,
        active,
      },
    });

    res.status(201).json({ rule });
  } catch (err) {
    console.error('[createRule]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = updateRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { id } = req.params;

    const existing = await prisma.rule.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    if (existing.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const rule = await prisma.rule.update({
      where: { id },
      data: parsed.data,
    });

    res.json({ rule });
  } catch (err) {
    console.error('[updateRule]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.rule.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    if (existing.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.rule.delete({ where: { id } });

    res.json({ message: 'Rule deleted successfully' });
  } catch (err) {
    console.error('[deleteRule]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const applyPenalty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = applyPenaltySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { childId } = parsed.data;
    const { id: ruleId } = req.params;

    const [rule, child] = await Promise.all([
      prisma.rule.findUnique({ where: { id: ruleId } }),
      prisma.user.findUnique({ where: { id: childId } }),
    ]);

    if (!rule) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }

    if (rule.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!rule.active) {
      res.status(400).json({ error: 'Rule is not active' });
      return;
    }

    if (!child || child.role !== 'CHILD') {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    if (child.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Child is not in your family' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newBalance = Math.max(0, child.balance - rule.amount);

      await tx.user.update({
        where: { id: childId },
        data: { balance: newBalance },
      });

      const transaction = await tx.transaction.create({
        data: {
          childId,
          amount: -rule.amount,
          type: 'PENALTY',
          description: `Pénalité: ${rule.title}`,
        },
      });

      return { transaction, newBalance };
    });

    emitToUser(childId, SocketEvents.PENALTY_APPLIED, {
      rule,
      transaction: result.transaction,
    });

    emitToUser(childId, SocketEvents.BALANCE_UPDATED, {
      childId,
      balance: result.newBalance,
    });

    res.json({ transaction: result.transaction, newBalance: result.newBalance });
  } catch (err) {
    console.error('[applyPenalty]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
