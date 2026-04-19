import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Helpers & Middlewares ──────────────────────────────────────────────────
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      include: { family: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// ── Auth Endpoints ────────────────────────────────────────────────────────

// 1. Parent: Create Family + Initial Rules
app.post('/api/auth/register/parent/create', async (req, res) => {
  const { name, email, password, familyName, rules } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const family = await prisma.family.create({
      data: {
        name: familyName,
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        rules: {
          create: (rules || []).map((r: any) => ({
            title: r.title,
            amount: parseFloat(r.amount),
          }))
        }
      }
    });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'PARENT',
        familyId: family.id,
      }
    });

    const token = generateToken(user.id);
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, avatar: user.avatar, color: user.color } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/register/parent/join', async (req, res) => {
  const { name, email, password, inviteCode } = req.body;
  try {
    const family = await prisma.family.findUnique({ where: { inviteCode } });
    if (!family) return res.status(404).json({ error: 'Code invalide' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'PARENT', familyId: family.id }
    });
    const token = generateToken(user.id);
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, avatar: user.avatar, color: user.color } });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/auth/register/child', async (req, res) => {
  const { name, password, inviteCode, age } = req.body;
  try {
    const family = await prisma.family.findUnique({ where: { inviteCode } });
    if (!family) return res.status(404).json({ error: 'Code invalide' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name, password: hashedPassword, role: 'CHILD', familyId: family.id,
        age: parseInt(age), avatar: name.charAt(0).toUpperCase(), color: '#835500'
      }
    });
    const token = generateToken(user.id);
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, avatar: user.avatar, color: user.color, age: user.age } });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { OR: [{ email: email }, { name: email }] } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Identifiants invalides' });
    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, avatar: user.avatar, color: user.color, age: user.age } });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const u = req.user;
  res.json({ user: { id: u.id, name: u.name, role: u.role, familyId: u.familyId, balance: u.balance, avatar: u.avatar, color: u.color, age: u.age } });
});

// ── Family & Members ──────────────────────────────────────────────────────

app.get('/api/family', authenticateToken, async (req: any, res) => {
  const family = await prisma.family.findUnique({
    where: { id: req.user.familyId },
    include: { 
      users: { select: { id: true, name: true, role: true, avatar: true, color: true, balance: true, age: true } },
      rules: true
    }
  });
  res.json({ family });
});

app.put('/api/family/rules', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { rules } = req.body;
  
  try {
    // On supprime les anciennes règles et on recrée les nouvelles pour simplifier la mise à jour
    await prisma.$transaction([
      prisma.rule.deleteMany({ where: { familyId: req.user.familyId } }),
      prisma.rule.createMany({
        data: (rules || []).map((r: any) => ({
          title: r.title,
          amount: parseFloat(r.amount),
          familyId: req.user.familyId
        }))
      })
    ]);
    const updatedFamily = await prisma.family.findUnique({
      where: { id: req.user.familyId },
      include: { rules: true }
    });
    res.json({ rules: updatedFamily?.rules });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ── Chores CRUD ───────────────────────────────────────────────────────────

app.get('/api/chores', authenticateToken, async (req: any, res) => {
  const chores = await prisma.chore.findMany({
    where: { assignee: { familyId: req.user.familyId } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ chores });
});

app.post('/api/chores', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Action réservée aux parents' });
  const { title, description, reward, assigneeId, deadline } = req.body;
  const chore = await prisma.chore.create({
    data: { title, description, reward: parseFloat(reward), assigneeId, deadline, status: 'PENDING' }
  });
  res.status(201).json({ chore });
});

app.patch('/api/chores/:id/submit', authenticateToken, async (req: any, res) => {
  const { note, proofImageUrl } = req.body;
  const chore = await prisma.chore.update({
    where: { id: req.params.id },
    data: { status: 'SUBMITTED', note, proofImageUrl }
  });
  res.json({ chore });
});

app.patch('/api/chores/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  
  const chore = await prisma.chore.findUnique({ where: { id: req.params.id } });
  if (!chore) return res.status(404).json({ error: 'Corvée non trouvée' });

  const [updatedChore, transaction, updatedUser] = await prisma.$transaction([
    prisma.chore.update({ where: { id: chore.id }, data: { status: 'COMPLETED' } }),
    prisma.transaction.create({
      data: { childId: chore.assigneeId, amount: chore.reward, type: 'CHORE', description: `Corvée : ${chore.title}` }
    }),
    prisma.user.update({
      where: { id: chore.assigneeId },
      data: { balance: { increment: chore.reward } }
    })
  ]);

  res.json({ chore: updatedChore, balance: updatedUser.balance });
});

app.patch('/api/chores/:id/reject', authenticateToken, async (req: any, res) => {
  const { reason } = req.body;
  const chore = await prisma.chore.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', rejectionReason: reason }
  });
  res.json({ chore });
});

// ── Goals & Savings ───────────────────────────────────────────────────────

app.get('/api/goals', authenticateToken, async (req: any, res) => {
  const goals = await prisma.goal.findMany({
    where: { familyId: req.user.familyId },
    include: { participants: true }
  });
  res.json({ goals });
});

app.post('/api/goals', authenticateToken, async (req: any, res) => {
  const { title, target, icon, isShared } = req.body;
  const goal = await prisma.goal.create({
    data: { title, target: parseFloat(target), icon, isShared: !!isShared, familyId: req.user.familyId }
  });
  // Auto-participate creator
  await prisma.goalParticipant.create({
    data: { goalId: goal.id, childId: req.user.id }
  });
  res.status(201).json({ goal });
});

app.post('/api/goals/:id/fund', authenticateToken, async (req: any, res) => {
  const { amount } = req.body;
  const val = parseFloat(amount);
  if (req.user.balance < val) return res.status(400).json({ error: 'Solde insuffisant' });

  const [updatedGoal, updatedUser] = await prisma.$transaction([
    prisma.goal.update({ where: { id: req.params.id }, data: { current: { increment: val } } }),
    prisma.user.update({ where: { id: req.user.id }, data: { balance: { decrement: val } } }),
    prisma.transaction.create({
      data: { childId: req.user.id, amount: -val, type: 'GOAL_FUNDING', description: `Épargne pour objectif` }
    }),
    prisma.goalParticipant.upsert({
      where: { goalId_childId: { goalId: req.params.id, childId: req.user.id } },
      update: { contributedAmount: { increment: val } },
      create: { goalId: req.params.id, childId: req.user.id, contributedAmount: val }
    })
  ]);
  res.json({ goal: updatedGoal, balance: updatedUser.balance });
});

// ── Transactions ──────────────────────────────────────────────────────────

app.get('/api/transactions', authenticateToken, async (req: any, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { childId: req.user.id },
    orderBy: { date: 'desc' }
  });
  res.json({ transactions });
});

// ── Family Children ───────────────────────────────────────────────────────

app.get('/api/family/children', authenticateToken, async (req: any, res) => {
  try {
    const children = await prisma.user.findMany({
      where: { familyId: req.user.familyId, role: 'CHILD' },
      select: { id: true, name: true, avatar: true, color: true, balance: true, age: true }
    });
    res.json({ children });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Rules / Sanctions ─────────────────────────────────────────────────────

app.post('/api/rules/:id/apply', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { childId } = req.body;
  try {
    const rule = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!rule) return res.status(404).json({ error: 'Règle non trouvée' });

    const [transaction, updatedUser] = await prisma.$transaction([
      prisma.transaction.create({
        data: { childId, amount: -rule.amount, type: 'PENALTY', description: `Sanction : ${rule.title}` }
      }),
      prisma.user.update({
        where: { id: childId },
        data: { balance: { decrement: rule.amount } }
      })
    ]);
    res.json({ transaction, balance: updatedUser.balance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Expenses ──────────────────────────────────────────────────────────────

app.get('/api/expenses', authenticateToken, async (req: any, res) => {
  try {
    let where: any = {};
    if (req.user.role === 'CHILD') {
      where.childId = req.user.id;
    } else {
      // Parent sees all expenses for their family
      where.child = { familyId: req.user.familyId };
    }
    const expenses = await prisma.expenseRequest.findMany({
      where,
      include: { child: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ expenses });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/expenses/request', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CHILD') return res.status(403).json({ error: 'Réservé aux enfants' });
  const { title, description, amount, expenseType, reference } = req.body;
  try {
    const expense = await prisma.expenseRequest.create({
      data: { childId: req.user.id, title, description, amount: parseFloat(amount), expenseType, reference }
    });
    res.status(201).json({ expense });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/expenses/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { approvedAmount, parentNote } = req.body;
  try {
    const expense = await prisma.expenseRequest.findUnique({ where: { id: req.params.id } });
    if (!expense) return res.status(404).json({ error: 'Demande non trouvée' });
    const finalAmount = parseFloat(approvedAmount) || expense.amount;

    const [updatedExpense] = await prisma.$transaction([
      prisma.expenseRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approvedAmount: finalAmount, parentNote }
      }),
      prisma.transaction.create({
        data: { childId: expense.childId, amount: -finalAmount, type: 'EXPENSE_APPROVED', description: `Dépense approuvée : ${expense.title}`, expenseId: expense.id }
      }),
      prisma.user.update({
        where: { id: expense.childId },
        data: { balance: { decrement: finalAmount } }
      })
    ]);
    res.json({ expense: updatedExpense });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/expenses/:id/reject', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { parentNote } = req.body;
  try {
    const expense = await prisma.expenseRequest.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', parentNote }
    });
    res.json({ expense });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/expenses/deduct', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { childId, amount, description } = req.body;
  try {
    const val = parseFloat(amount);
    const [transaction, updatedUser] = await prisma.$transaction([
      prisma.transaction.create({
        data: { childId, amount: -val, type: 'EXPENSE_DEDUCTION', description: description || 'Déduction parent' }
      }),
      prisma.user.update({
        where: { id: childId },
        data: { balance: { decrement: val } }
      })
    ]);
    res.json({ transaction, balance: updatedUser.balance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`🚀 API PocketMoney sur http://localhost:${port}`));
}

export default app;
