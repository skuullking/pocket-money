import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { emitToFamily, emitToUser, SocketEvents } from '../socket';

const createChoreSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  reward: z.number().positive('Reward must be positive'),
  assigneeId: z.string().min(1, 'Assignee ID is required'),
  deadline: z.string().min(1, 'Deadline is required'),
});

const submitChoreSchema = z.object({
  note: z.string().optional(),
  proofImageUrl: z.string().url().optional(),
});

const rejectChoreSchema = z.object({
  rejectionReason: z.string().optional(),
});

const getChorseQuerySchema = z.object({
  assigneeId: z.string().optional(),
  status: z
    .enum(['PENDING', 'SUBMITTED', 'COMPLETED', 'REJECTED'])
    .optional(),
});

export const getChores = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = getChorseQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { assigneeId, status } = parsed.data;

    const where: Prisma.ChoreWhereInput = {
      assignee: { familyId: req.user.familyId },
    };

    // Child can only see own chores
    if (req.user.role === 'CHILD') {
      where.assigneeId = req.user.id;
    } else if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (status) {
      where.status = status;
    }

    const chores = await prisma.chore.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ chores });
  } catch (err) {
    console.error('[getChores]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createChore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = createChoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { title, description, reward, assigneeId, deadline } = parsed.data;

    // Verify assignee is a CHILD in the same family
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) {
      res.status(404).json({ error: 'Assignee not found' });
      return;
    }

    if (assignee.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Assignee is not in your family' });
      return;
    }

    if (assignee.role !== 'CHILD') {
      res.status(400).json({ error: 'Assignee must be a child' });
      return;
    }

    const chore = await prisma.chore.create({
      data: {
        title,
        description,
        reward,
        assigneeId,
        deadline,
        status: 'PENDING',
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
    });

    res.status(201).json({ chore });
  } catch (err) {
    console.error('[createChore]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitChore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = submitChoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { note, proofImageUrl } = parsed.data;
    const { id } = req.params;

    const chore = await prisma.chore.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, familyId: true },
        },
      },
    });

    if (!chore) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }

    // Only the assigned child can submit
    if (chore.assigneeId !== req.user.id) {
      res.status(403).json({ error: 'You can only submit your own chores' });
      return;
    }

    if (chore.status !== 'PENDING') {
      res.status(400).json({ error: 'Chore is not in PENDING status' });
      return;
    }

    const updated = await prisma.chore.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        note,
        proofImageUrl,
        submittedAt: new Date(),
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
    });

    // Notify parents in family
    emitToFamily(
      chore.assignee.familyId,
      SocketEvents.CHORE_SUBMITTED,
      updated
    );

    res.json({ chore: updated });
  } catch (err) {
    console.error('[submitChore]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveChore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const chore = await prisma.chore.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!chore) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }

    if (chore.assignee.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (chore.status !== 'SUBMITTED') {
      res.status(400).json({ error: 'Chore is not in SUBMITTED status' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.chore.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true, color: true },
          },
        },
      });

      await tx.user.update({
        where: { id: chore.assigneeId },
        data: { balance: { increment: chore.reward } },
      });

      const transaction = await tx.transaction.create({
        data: {
          childId: chore.assigneeId,
          amount: chore.reward,
          type: 'CHORE',
          description: `Tâche complétée: ${chore.title}`,
          choreId: id,
        },
      });

      const updatedChild = await tx.user.findUnique({
        where: { id: chore.assigneeId },
        select: { id: true, balance: true },
      });

      return { updated, transaction, updatedChild };
    });

    emitToUser(chore.assigneeId, SocketEvents.CHORE_APPROVED, result.updated);
    emitToUser(chore.assigneeId, SocketEvents.BALANCE_UPDATED, {
      childId: chore.assigneeId,
      balance: result.updatedChild?.balance ?? 0,
    });

    res.json({ chore: result.updated });
  } catch (err) {
    console.error('[approveChore]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectChore = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = rejectChoreSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { rejectionReason } = parsed.data;
    const { id } = req.params;

    const chore = await prisma.chore.findUnique({
      where: { id },
      include: { assignee: true },
    });

    if (!chore) {
      res.status(404).json({ error: 'Chore not found' });
      return;
    }

    if (chore.assignee.familyId !== req.user.familyId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (chore.status !== 'SUBMITTED') {
      res.status(400).json({ error: 'Chore is not in SUBMITTED status' });
      return;
    }

    const updated = await prisma.chore.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, color: true },
        },
      },
    });

    emitToUser(chore.assigneeId, SocketEvents.CHORE_REJECTED, updated);

    res.json({ chore: updated });
  } catch (err) {
    console.error('[rejectChore]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
