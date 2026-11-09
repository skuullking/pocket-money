import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeEach } from 'vitest';
import app from '../../src/server';
import { assertTestDatabase } from './testDatabase';

assertTestDatabase(process.env.DATABASE_URL as string);

export const prisma = new PrismaClient();
export const PASSWORD = 'password123';
export const ORIGIN = 'http://localhost:5173';

// bcrypt est lent par conception : un seul hachage pour toutes les fixtures.
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

const TABLES = [
  'GoalParticipant',
  'Transaction',
  'ExpenseRequest',
  'Chore',
  'ChildSettings',
  'AllowanceSchedule',
  'ChoreTemplate',
  'PasswordResetToken',
  'Goal',
  'Rule',
  'User',
  'Family',
];

export const useCleanDatabase = () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map(t => `"${t}"`).join(', ')} CASCADE`);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
};

// Chaque requête vient d'une IP différente, sauf si un test en impose une.
let ipCounter = 0;
export const nextIp = () => {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
};

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Actor = { id: string };

export const sessionCookie = (userId: string) =>
  `pm_session=${jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' })}`;

const client = (cookie?: string, ip?: string) => {
  const send = (method: Method) => (path: string) => {
    const agent = request(app);
    const req = agent[method](path).set('X-Forwarded-For', ip ?? nextIp());
    return cookie ? req.set('Cookie', cookie) : req;
  };
  return { get: send('get'), post: send('post'), put: send('put'), patch: send('patch'), delete: send('delete') };
};

export const anonymous = (ip?: string) => client(undefined, ip);
export const as = (actor: Actor, ip?: string) => client(sessionCookie(actor.id), ip);

// ── Fixtures ─────────────────────────────────────────────────────────────

type ChildSpec = { name: string; balance?: number };

export const createFamily = async (label = 'Dupont', childSpecs: ChildSpec[] = [{ name: 'Alice', balance: 20 }]) => {
  const family = await prisma.family.create({
    data: { name: `Famille ${label}`, inviteCode: randomUUID().slice(0, 8).toUpperCase() },
  });
  const parent = await prisma.user.create({
    data: {
      name: `Parent ${label}`,
      email: `${randomUUID()}@example.test`,
      password: passwordHash,
      role: 'PARENT',
      familyId: family.id,
      termsAcceptedAt: new Date(),
      parentalConsentAt: new Date(),
    },
  });
  const children = await Promise.all(
    childSpecs.map(({ name, balance = 0 }) =>
      prisma.user.create({
        data: { name, password: passwordHash, role: 'CHILD', familyId: family.id, age: 10, balance },
      }),
    ),
  );
  return { family, parent, children, child: children[0] };
};

export const createChore = (assigneeId: string, overrides: Record<string, unknown> = {}) =>
  prisma.chore.create({
    data: {
      title: 'Vaisselle',
      reward: 5,
      assigneeId,
      deadline: '2026-12-31',
      status: 'SUBMITTED',
      ...overrides,
    } as never,
  });

export const createGoal = async (
  familyId: string,
  participants: { childId: string; contributedAmount?: number }[] = [],
  overrides: Record<string, unknown> = {},
) => {
  const contributed = participants.reduce((sum, p) => sum + (p.contributedAmount ?? 0), 0);
  return prisma.goal.create({
    data: {
      title: 'Vélo',
      target: 100,
      current: contributed,
      icon: '🚲',
      familyId,
      ...overrides,
      participants: { create: participants },
    } as never,
  });
};

export const createRule = (familyId: string, amount = 5, overrides: Record<string, unknown> = {}) =>
  prisma.rule.create({ data: { title: 'Téléphone à table', amount, familyId, ...overrides } as never });

export const createExpense = (childId: string, amount = 5, overrides: Record<string, unknown> = {}) =>
  prisma.expenseRequest.create({
    data: { childId, title: 'Livre', amount, expenseType: 'CASH', ...overrides } as never,
  });

export const setSettings = (childId: string, data: Record<string, unknown>) =>
  prisma.childSettings.create({ data: { childId, ...data } as never });

// ── Lecture de l'état réel en base ───────────────────────────────────────

export const getUser = (id: string) => prisma.user.findUniqueOrThrow({ where: { id } });
export const balanceOf = async (id: string) => (await getUser(id)).balance;
export const transactionsOf = (childId: string) =>
  prisma.transaction.findMany({ where: { childId }, orderBy: { date: 'asc' } });
export const getGoal = (id: string) => prisma.goal.findUniqueOrThrow({ where: { id } });
export const getParticipant = (goalId: string, childId: string) =>
  prisma.goalParticipant.findUnique({ where: { goalId_childId: { goalId, childId } } });

export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
