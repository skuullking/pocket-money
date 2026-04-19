import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emitToFamily, SocketEvents } from '../socket';

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  target: z.number().positive('Target must be positive'),
  icon: z.string().optional(),
  isShared: z.boolean().default(false),
  participantIds: z.array(z.string()).optional(),
});

const fundGoalSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

const withdrawGoalSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

export const getGoals = async (req: Request, res: Response): Promise<void> => {
  try {
    const goals = await prisma.goal.findMany({
      where: { familyId: req.user.familyId },
      include: {
        participants: {
          include: {
            child: {
              select: { id: true, name: true, avatar: true, color: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ goals });
  } catch (err) {
    console.error('[getGoals]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGoal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = createGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { title, target, icon, isShared, participantIds } = parsed.data;

    // Verify participant IDs belong to the family
    if (participantIds && participantIds.length > 0) {
      const children = await prisma.user.findMany({
        where: {
          id: { in: participantIds },
          familyId: req.user.familyId,
          role: 'CHILD',
        },
      });

      if (children.length !== participantIds.length) {
        res.status(400).json({
          error: 'One or more participant IDs are invalid or not in your family',
        });
        return;
      }
    }

    const goal = await prisma.goal.create({
      data: {
        familyId: req.user.familyId,
        title,
        target,
        icon,
        isShared,
        status: 'IN_PROGRESS',
        participants: participantIds
          ? {
              create: participantIds.map((childId) => ({
                childId,
                contributedAmount: 0,
              })),
            }
          : undefined,
      },
      include: {
        participants: {
          include: {
            child: {
              select: { id: true, name: true, avatar: true, color: true },
            },
          },
        },
      },
    });

    res.status(201).json({ goal });
  } catch (err) {
    console.error('[createGoal]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const fundGoal = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = fundGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { amount } = parsed.data;
    const { id: goalId } = req.params;
    const childId = req.user.id;

    const [goal, child] = await Promise.all([
      prisma.goal.findUnique({
        where: { id: goalId },
        include: { participants: true },
      }),
      prisma.user.findUnique({ where: { id: childId } }),
    ]);

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    if (goal.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (goal.status === 'COMPLETED') {
      res.status(400).json({ error: 'Goal is already completed' });
      return;
    }

    if (!child) {
      res.status(404).json({ error: 'Child not found' });
      return;
    }

    if (child.balance < amount) {
      res.status(400).json({
        error: `Insufficient balance. You have ${child.balance}, need ${amount}`,
      });
      return;
    }

    // Find or create participant record
    let participant = goal.participants.find((p) => p.childId === childId);

    const result = await prisma.$transaction(async (tx) => {
      // Deduct child's balance
      const newBalance = child.balance - amount;
      await tx.user.update({
        where: { id: childId },
        data: { balance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          childId,
          amount: -amount,
          type: 'GOAL_FUNDING',
          description: `Contribution objectif: ${goal.title}`,
          goalId,
        },
      });

      // Update or create participant record
      if (participant) {
        await tx.goalParticipant.update({
          where: { id: participant.id },
          data: { contributedAmount: { increment: amount } },
        });
      } else {
        participant = await tx.goalParticipant.create({
          data: {
            goalId,
            childId,
            contributedAmount: amount,
          },
        });
      }

      // Update goal's current amount
      const newCurrent = Math.min(goal.current + amount, goal.target);
      const isCompleted = newCurrent >= goal.target;

      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: {
          current: newCurrent,
          status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
        },
        include: {
          participants: {
            include: {
              child: {
                select: { id: true, name: true, avatar: true, color: true },
              },
            },
          },
        },
      });

      return { updatedGoal, transaction, newBalance };
    });

    emitToFamily(req.user.familyId, SocketEvents.GOAL_FUNDED, {
      goal: result.updatedGoal,
      childId,
      amount,
    });

    res.json({ goal: result.updatedGoal, newBalance: result.newBalance });
  } catch (err) {
    console.error('[fundGoal]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const withdrawGoal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = withdrawGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { amount } = parsed.data;
    const { id: goalId } = req.params;
    const childId = req.user.id;

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        participants: { where: { childId } },
      },
    });

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    if (goal.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const participant = goal.participants[0];
    if (!participant) {
      res.status(400).json({ error: 'You are not a participant in this goal' });
      return;
    }

    if (participant.contributedAmount < amount) {
      res.status(400).json({
        error: `Insufficient contributed amount. You contributed ${participant.contributedAmount}, requesting ${amount}`,
      });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Increase child's balance
      const child = await tx.user.findUnique({ where: { id: childId } });
      if (!child) throw new Error('Child not found');

      const newBalance = child.balance + amount;
      await tx.user.update({
        where: { id: childId },
        data: { balance: newBalance },
      });

      // Create refund transaction
      const transaction = await tx.transaction.create({
        data: {
          childId,
          amount: +amount,
          type: 'REFUND',
          description: `Retrait objectif: ${goal.title}`,
          goalId,
        },
      });

      // Decrease participant's contribution
      await tx.goalParticipant.update({
        where: { id: participant.id },
        data: { contributedAmount: { decrement: amount } },
      });

      // Decrease goal's current amount
      const newCurrent = Math.max(0, goal.current - amount);

      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: {
          current: newCurrent,
          // If it was completed and we withdrew, revert to in progress
          status: newCurrent < goal.target ? 'IN_PROGRESS' : goal.status,
        },
        include: {
          participants: {
            include: {
              child: {
                select: { id: true, name: true, avatar: true, color: true },
              },
            },
          },
        },
      });

      return { updatedGoal, transaction, newBalance };
    });

    res.json({ goal: result.updatedGoal, newBalance: result.newBalance });
  } catch (err) {
    console.error('[withdrawGoal]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
