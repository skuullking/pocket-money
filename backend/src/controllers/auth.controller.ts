import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { JwtPayload } from '../middleware/auth';

const registerParentSchema = z.object({
  familyName: z.string().min(1, 'Family name is required'),
  parentName: z.string().min(1, 'Parent name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.union([
  z.object({
    email: z.string().email(),
    password: z.string().min(1),
    childId: z.undefined().optional(),
  }),
  z.object({
    childId: z.string().min(1),
    email: z.undefined().optional(),
    password: z.undefined().optional(),
  }),
]);

function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

function sanitizeUser(user: {
  id: string;
  familyId: string;
  role: string;
  name: string;
  email: string | null;
  age: number | null;
  avatar: string | null;
  color: string | null;
  balance: number;
  monthDelta: number;
  createdAt: Date;
  updatedAt: Date;
  password?: string | null;
}) {
  const { password, ...safe } = user;
  void password; // intentionally omitted
  return safe;
}

export const registerParent = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = registerParentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { familyName, parentName, email, password } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { name: familyName },
      });

      const user = await tx.user.create({
        data: {
          familyId: family.id,
          role: 'PARENT',
          name: parentName,
          email,
          password: hashedPassword,
        },
      });

      return { family, user };
    });

    const payload: JwtPayload = {
      id: result.user.id,
      role: 'PARENT',
      familyId: result.family.id,
      name: result.user.name,
    };

    const token = signToken(payload);

    res.status(201).json({
      token,
      user: sanitizeUser(result.user),
      family: result.family,
    });
  } catch (err) {
    console.error('[registerParent]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const body = parsed.data;

    // Child login by ID (no password required)
    if ('childId' in body && body.childId) {
      const child = await prisma.user.findUnique({
        where: { id: body.childId },
        select: {
          id: true,
          familyId: true,
          role: true,
          name: true,
          email: true,
          age: true,
          avatar: true,
          color: true,
          balance: true,
          monthDelta: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!child || child.role !== 'CHILD') {
        res.status(401).json({ error: 'Child not found' });
        return;
      }

      const payload: JwtPayload = {
        id: child.id,
        role: 'CHILD',
        familyId: child.familyId,
        name: child.name,
      };

      const token = signToken(payload);
      res.json({ token, user: child });
      return;
    }

    // Parent login by email + password
    if ('email' in body && body.email && body.password) {
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (!user || !user.password) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const valid = await bcrypt.compare(body.password, user.password);
      if (!valid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const payload: JwtPayload = {
        id: user.id,
        role: user.role as 'PARENT' | 'CHILD',
        familyId: user.familyId,
        name: user.name,
      };

      const token = signToken(payload);
      res.json({ token, user: sanitizeUser(user) });
      return;
    }

    res.status(400).json({ error: 'Provide either email+password or childId' });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        familyId: true,
        role: true,
        name: true,
        email: true,
        age: true,
        avatar: true,
        color: true,
        balance: true,
        monthDelta: true,
        createdAt: true,
        updatedAt: true,
        family: {
          select: { id: true, name: true, inviteCode: true },
        },
        childSettings: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error('[me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
