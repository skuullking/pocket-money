import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import crypto from 'crypto';
import { initSocket, emitToFamily, emitToUser, SocketEvents } from './socket';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/', (req, res) => {
  res.json({ name: 'PocketMoney API', status: 'ok', version: '1.0.0' });
});
 
// ── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Helpers & Middlewares ──────────────────────────────────────────────────
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Envoi d'email : bascule automatiquement sur un fournisseur réel dès que
// RESEND_API_KEY est configurée. Sans clé (ex. en dev local), le lien de
// réinitialisation est simplement affiché dans les logs serveur — le flux
// (génération/validation/expiration du token) reste testable de bout en
// bout sans dépendance externe, seul le transport email change.
const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email non configuré] Lien de réinitialisation pour ${to} : ${resetUrl}`);
    return;
  }
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'PocketMoney <onboarding@resend.dev>',
    to,
    subject: 'Réinitialise ton mot de passe PocketMoney',
    html: `<p>Bonjour,</p><p>Clique sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`,
  });
};

// Balance must never go below 0 (see backend/PLAN.md "Règle d'Or"). Deducts up to
// `amount` from a child's balance, clamping at 0, and returns how much was actually
// taken so the caller can record an accurate transaction and warn if it was capped.
const clampedDeduct = async (tx: any, childId: string, amount: number) => {
  const user = await tx.user.findUnique({ where: { id: childId } });
  if (!user) throw new Error('Utilisateur introuvable');
  const actual = Math.min(amount, user.balance);
  const updatedUser = await tx.user.update({
    where: { id: childId },
    data: { balance: user.balance - actual },
  });
  return { actual, capped: actual < amount, updatedUser };
};

// Argent de poche récurrent : évalué "paresseusement" (pas de node-cron — ne
// survivrait pas au déploiement serverless Vercel). Appelé à chaque
// chargement de GET /api/family : crédite tout paiement dû depuis la
// dernière fois, pas nécessairement à l'heure pile.
const processDueAllowances = async (familyId: string) => {
  const schedules = await prisma.allowanceSchedule.findMany({
    where: { active: true, child: { familyId } },
  });
  const now = new Date();
  for (const s of schedules) {
    const dueMs = s.frequency === 'MONTHLY' ? 30 * 24 * 3600 * 1000 : 7 * 24 * 3600 * 1000;
    if (!s.lastPaidAt || now.getTime() - s.lastPaidAt.getTime() >= dueMs) {
      await prisma.$transaction(async (tx: any) => {
        await tx.user.update({ where: { id: s.childId }, data: { balance: { increment: s.amount } } });
        await tx.transaction.create({
          data: { childId: s.childId, amount: s.amount, type: 'ALLOWANCE', description: 'Argent de poche' }
        });
        await tx.allowanceSchedule.update({ where: { id: s.id }, data: { lastPaidAt: now } });
        await applySplit(tx, s.childId, s.amount);
      });
    }
  }
};

// Corvées récurrentes : même principe d'évaluation paresseuse que l'argent de
// poche (voir processDueAllowances) — appelé à chaque GET /api/chores.
const generateDueChores = async (familyId: string) => {
  const templates = await prisma.choreTemplate.findMany({ where: { active: true, familyId } });
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekday = today.getDay();
  for (const t of templates) {
    if (t.lastGeneratedDate === todayStr) continue;
    const isDue = t.frequency === 'DAILY' || (t.frequency === 'WEEKLY' && t.weekday === weekday);
    if (!isDue) continue;
    await prisma.$transaction([
      prisma.chore.create({
        data: {
          title: t.title, description: t.description, reward: t.reward,
          assigneeId: t.assigneeId, deadline: todayStr, status: 'PENDING', templateId: t.id
        }
      }),
      prisma.choreTemplate.update({ where: { id: t.id }, data: { lastGeneratedDate: todayStr } }),
    ]);
  }
};

// Répartition Épargne/Dépense/Don : additive et informative uniquement (voir
// QA_TEST_PLAN.md Fonctionnalité 4) — n'affecte jamais `balance`, qui reste
// l'unique cagnotte dépensable déjà durcie contre le solde négatif.
const applySplit = async (tx: any, childId: string, amount: number) => {
  const settings = await tx.childSettings.findUnique({ where: { childId } });
  if (!settings?.splitEnabled) {
    await tx.user.update({ where: { id: childId }, data: { spendBalance: { increment: amount } } });
    return;
  }
  const save = Math.round(amount * settings.splitSavePct) / 100;
  const give = Math.round(amount * settings.splitGivePct) / 100;
  const spend = Math.round((amount - save - give) * 100) / 100; // reste d'arrondi absorbé ici
  await tx.user.update({
    where: { id: childId },
    data: { saveBalance: { increment: save }, giveBalance: { increment: give }, spendBalance: { increment: spend } }
  });
};

const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      include: { family: true, settings: true }
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
            amount: Math.max(0, parseFloat(r.amount) || 0),
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
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: user.monthDelta, avatar: user.avatar, color: user.color } });
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
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: user.monthDelta, avatar: user.avatar, color: user.color } });
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
    res.status(201).json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: user.monthDelta, avatar: user.avatar, color: user.color, age: user.age } });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { OR: [{ email: email }, { name: email }] } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Identifiants invalides' });
    const token = generateToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: user.monthDelta, avatar: user.avatar, color: user.color, age: user.age } });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const u = req.user;
  res.json({ user: { id: u.id, name: u.name, role: u.role, familyId: u.familyId, balance: u.balance, monthDelta: u.monthDelta, saveBalance: u.saveBalance, spendBalance: u.spendBalance, giveBalance: u.giveBalance, avatar: u.avatar, color: u.color, age: u.age, settings: u.settings } });
});

// ── Récupération de mot de passe ─────────────────────────────────────────

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  // Toujours 200 avec un message générique, que l'email existe ou non, pour
  // ne pas permettre d'énumérer les comptes enregistrés.
  const genericResponse = { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
  try {
    const user = await prisma.user.findFirst({ where: { email, role: 'PARENT' } });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email!, resetUrl);
    }
    res.json(genericResponse);
  } catch (error: any) {
    // Ne jamais révéler la cause exacte côté client — logguer seulement.
    console.error('[forgot-password]', error);
    res.json(genericResponse);
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Mot de passe invalide (6 caractères minimum)' });
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: new Date() } }
    });
    if (!resetToken) return res.status(400).json({ error: 'Lien invalide ou expiré' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    ]);
    res.json({ message: 'Mot de passe mis à jour.' });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Family & Members ──────────────────────────────────────────────────────

app.get('/api/family', authenticateToken, async (req: any, res) => {
  await processDueAllowances(req.user.familyId).catch(err => console.error('[processDueAllowances]', err));
  const family = await prisma.family.findUnique({
    where: { id: req.user.familyId },
    include: {
      users: { select: { id: true, name: true, role: true, avatar: true, color: true, balance: true, age: true, monthDelta: true, settings: true } },
      rules: true
    }
  });
  res.json({ family });
});

// ── Rules CRUD (chaque règle garde son identité — pas de remplacement en bloc) ─

app.get('/api/rules', authenticateToken, async (req: any, res) => {
  try {
    const rules = await prisma.rule.findMany({ where: { familyId: req.user.familyId }, orderBy: { title: 'asc' } });
    res.json({ rules });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/rules', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { title, description, amount, active } = req.body;
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Le motif est requis' });
  try {
    const rule = await prisma.rule.create({
      data: { title, description, amount: Math.max(0, parseFloat(amount) || 0), active: active !== false, familyId: req.user.familyId }
    });
    res.status(201).json({ rule });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/rules/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const existing = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Règle introuvable' });
    if (existing.familyId !== req.user.familyId) return res.status(403).json({ error: 'Interdit' });
    const { title, description, amount, active } = req.body;
    const rule = await prisma.rule.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        amount: amount !== undefined ? Math.max(0, parseFloat(amount) || 0) : existing.amount,
        active: active !== undefined ? !!active : existing.active,
      }
    });
    res.json({ rule });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/rules/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const existing = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Règle introuvable' });
    if (existing.familyId !== req.user.familyId) return res.status(403).json({ error: 'Interdit' });
    await prisma.rule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.get('/api/family/penalty-history', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const history = await prisma.transaction.findMany({
      where: { type: 'PENALTY', child: { familyId: req.user.familyId } },
      include: { child: { select: { id: true, name: true, avatar: true, color: true } } },
      orderBy: { date: 'desc' }
    });
    res.json({ history });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Chores CRUD ───────────────────────────────────────────────────────────

app.get('/api/chores', authenticateToken, async (req: any, res) => {
  await generateDueChores(req.user.familyId).catch(err => console.error('[generateDueChores]', err));
  const chores = await prisma.chore.findMany({
    where: { assignee: { familyId: req.user.familyId } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ chores });
});

// ── Chore Templates (corvées récurrentes) ─────────────────────────────────

app.get('/api/chore-templates', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const templates = await prisma.choreTemplate.findMany({ where: { familyId: req.user.familyId }, orderBy: { createdAt: 'desc' } });
    res.json({ templates });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/chore-templates', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const { title, description, reward, assigneeId, frequency, weekday } = req.body;
    if (!title || !assigneeId) return res.status(400).json({ error: 'Titre et enfant requis' });
    if (!['DAILY', 'WEEKLY'].includes(frequency)) return res.status(400).json({ error: 'Fréquence invalide' });
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee || assignee.familyId !== req.user.familyId || assignee.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const template = await prisma.choreTemplate.create({
      data: {
        familyId: req.user.familyId, title, description, reward: Math.max(0, parseFloat(reward) || 0),
        assigneeId, frequency, weekday: frequency === 'WEEKLY' ? parseInt(weekday) : null,
      }
    });
    res.status(201).json({ template });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/chore-templates/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const existing = await prisma.choreTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Modèle introuvable' });
    if (existing.familyId !== req.user.familyId) return res.status(403).json({ error: 'Interdit' });
    const { title, description, reward, assigneeId, frequency, weekday, active } = req.body;
    const template = await prisma.choreTemplate.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        reward: reward !== undefined ? Math.max(0, parseFloat(reward) || 0) : existing.reward,
        assigneeId: assigneeId ?? existing.assigneeId,
        frequency: frequency ?? existing.frequency,
        weekday: weekday !== undefined ? parseInt(weekday) : existing.weekday,
        active: active !== undefined ? !!active : existing.active,
      }
    });
    res.json({ template });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/chore-templates/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const existing = await prisma.choreTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Modèle introuvable' });
    if (existing.familyId !== req.user.familyId) return res.status(403).json({ error: 'Interdit' });
    await prisma.choreTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
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
  emitToFamily(req.user.familyId, SocketEvents.CHORE_SUBMITTED, chore);
  res.json({ chore });
});

app.patch('/api/chores/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  
  const chore = await prisma.chore.findUnique({ where: { id: req.params.id } });
  if (!chore) return res.status(404).json({ error: 'Corvée non trouvée' });

  const { updatedChore, updatedUser } = await prisma.$transaction(async (tx: any) => {
    const updatedChore = await tx.chore.update({ where: { id: chore.id }, data: { status: 'COMPLETED' } });
    await tx.transaction.create({
      data: { childId: chore.assigneeId, amount: chore.reward, type: 'CHORE', description: `Corvée : ${chore.title}` }
    });
    const updatedUser = await tx.user.update({
      where: { id: chore.assigneeId },
      data: { balance: { increment: chore.reward } }
    });
    await applySplit(tx, chore.assigneeId, chore.reward);
    return { updatedChore, updatedUser };
  });

  emitToUser(chore.assigneeId, SocketEvents.CHORE_APPROVED, updatedChore);
  emitToUser(chore.assigneeId, SocketEvents.BALANCE_UPDATED, { childId: chore.assigneeId, balance: updatedUser.balance });
  res.json({ chore: updatedChore, balance: updatedUser.balance });
});

app.patch('/api/chores/:id/reject', authenticateToken, async (req: any, res) => {
  const { reason } = req.body;
  const chore = await prisma.chore.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', rejectionReason: reason }
  });
  emitToUser(chore.assigneeId, SocketEvents.CHORE_REJECTED, chore);
  res.json({ chore });
});

app.patch('/api/chores/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const existing = await prisma.chore.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Corvée non trouvée' });
    const { title, description, reward, assigneeId, deadline } = req.body;
    const chore = await prisma.chore.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        reward: reward !== undefined ? parseFloat(reward) : existing.reward,
        assigneeId: assigneeId ?? existing.assigneeId,
        deadline: deadline ?? existing.deadline,
      }
    });
    res.json({ chore });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.delete('/api/chores/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const existing = await prisma.chore.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Corvée non trouvée' });
    await prisma.chore.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Goals & Savings ───────────────────────────────────────────────────────

app.get('/api/goals', authenticateToken, async (req: any, res) => {
  // Parents see every family goal. Children only see shared goals and the
  // personal goals they actually participate in — not their siblings' private ones.
  const where: any = { familyId: req.user.familyId };
  if (req.user.role === 'CHILD') {
    where.OR = [
      { isShared: true },
      { participants: { some: { childId: req.user.id } } },
    ];
  }
  const goals = await prisma.goal.findMany({
    where,
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
  if (req.user.role !== 'CHILD') return res.status(403).json({ error: 'Réservé aux enfants' });
  const { amount } = req.body;
  const val = parseFloat(amount);
  if (!(val > 0)) return res.status(400).json({ error: 'Le montant doit être positif' });

  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { participants: true } });
    if (!goal || goal.familyId !== req.user.familyId) return res.status(404).json({ error: 'Objectif introuvable' });
    const isParticipant = goal.participants.some(p => p.childId === req.user.id);
    if (!goal.isShared && !isParticipant) return res.status(403).json({ error: "Cet objectif n'est pas partagé avec toi" });
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
    emitToFamily(req.user.familyId, SocketEvents.GOAL_FUNDED, updatedGoal);
    res.json({ goal: updatedGoal, balance: updatedUser.balance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/goals/:id/withdraw', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CHILD') return res.status(403).json({ error: 'Réservé aux enfants' });
  const { amount } = req.body;
  const val = parseFloat(amount);
  if (!(val > 0)) return res.status(400).json({ error: 'Le montant doit être positif' });

  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { participants: true } });
    if (!goal || goal.familyId !== req.user.familyId) return res.status(404).json({ error: 'Objectif introuvable' });
    const participant = goal.participants.find(p => p.childId === req.user.id);
    if (!participant) return res.status(403).json({ error: "Tu n'as rien épargné sur cet objectif" });
    const refund = Math.min(val, participant.contributedAmount, goal.current);
    if (refund <= 0) return res.status(400).json({ error: 'Rien à retirer' });

    const [updatedGoal, updatedUser] = await prisma.$transaction([
      prisma.goal.update({ where: { id: req.params.id }, data: { current: { decrement: refund } } }),
      prisma.user.update({ where: { id: req.user.id }, data: { balance: { increment: refund } } }),
      prisma.transaction.create({
        data: { childId: req.user.id, amount: refund, type: 'GOAL_WITHDRAWAL', description: `Retrait depuis un objectif` }
      }),
      prisma.goalParticipant.update({
        where: { goalId_childId: { goalId: req.params.id, childId: req.user.id } },
        data: { contributedAmount: { decrement: refund } }
      })
    ]);
    res.json({ goal: updatedGoal, balance: updatedUser.balance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/goals/:id/buy', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
    if (!goal || goal.familyId !== req.user.familyId) return res.status(404).json({ error: 'Objectif introuvable' });
    if (goal.current < goal.target) return res.status(400).json({ error: "L'objectif n'est pas encore atteint" });
    const updatedGoal = await prisma.goal.update({ where: { id: req.params.id }, data: { status: 'COMPLETED' } });
    res.json({ goal: updatedGoal });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Transactions ──────────────────────────────────────────────────────────

app.get('/api/transactions', authenticateToken, async (req: any, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { childId: req.user.id },
    orderBy: { date: 'desc' }
  });
  res.json({ transactions });
});

// ── Analytics ─────────────────────────────────────────────────────────────

app.get('/api/analytics/overview', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const children = await prisma.user.findMany({
      where: { familyId: req.user.familyId, role: 'CHILD' },
      select: { id: true, name: true, avatar: true, color: true, balance: true }
    });
    const childIds = children.map(c => c.id);

    const choreCounts = await prisma.chore.groupBy({
      by: ['status'],
      where: { assigneeId: { in: childIds } },
      _count: { _all: true }
    });

    // Complétion hebdomadaire des 6 dernières semaines (calculée en JS —
    // pas de date-trunc natif sans SQL brut avec ce schéma).
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
    const recentChores = await prisma.chore.findMany({
      where: { assigneeId: { in: childIds }, createdAt: { gte: sixWeeksAgo } },
      select: { createdAt: true, status: true }
    });
    const weekBuckets: Record<string, { completed: number; total: number }> = {};
    for (const c of recentChores) {
      const weekStart = new Date(c.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weekBuckets[key]) weekBuckets[key] = { completed: 0, total: 0 };
      weekBuckets[key].total += 1;
      if (c.status === 'COMPLETED') weekBuckets[key].completed += 1;
    }
    const weeklyCompletion = Object.entries(weekBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({ week, ...v }));

    const spendingByCategory = await prisma.expenseRequest.groupBy({
      by: ['expenseType'],
      where: { childId: { in: childIds }, status: 'APPROVED' },
      _sum: { approvedAmount: true }
    });

    const savingsTx = await prisma.transaction.findMany({
      where: { childId: { in: childIds }, type: { in: ['GOAL_FUNDING', 'GOAL_WITHDRAWAL'] } },
      orderBy: { date: 'asc' },
      select: { date: true, amount: true }
    });
    // GOAL_FUNDING is stored as a negative Transaction.amount (money leaving
    // balance into the goal) and GOAL_WITHDRAWAL as positive (money leaving
    // the goal back to balance) — flip sign so the trend reads as "amount
    // currently saved in goals", increasing when funded, decreasing when withdrawn.
    let running = 0;
    const savingsTrend = savingsTx.map(t => {
      running += -t.amount;
      return { date: t.date, cumulative: Math.round(Math.max(0, running) * 100) / 100 };
    });

    const perChild = await Promise.all(children.map(async c => {
      const agg = await prisma.transaction.aggregate({
        where: { childId: c.id, amount: { gt: 0 } },
        _sum: { amount: true }
      });
      const spentAgg = await prisma.transaction.aggregate({
        where: { childId: c.id, amount: { lt: 0 } },
        _sum: { amount: true }
      });
      return {
        id: c.id, name: c.name, avatar: c.avatar, color: c.color,
        balance: c.balance,
        earned: agg._sum.amount || 0,
        spent: Math.abs(spentAgg._sum.amount || 0),
      };
    }));

    res.json({
      choreCounts: choreCounts.map(c => ({ status: c.status, count: c._count._all })),
      weeklyCompletion,
      spendingByCategory: spendingByCategory.map(s => ({ category: s.expenseType, total: s._sum.approvedAmount || 0 })),
      savingsTrend,
      perChild,
    });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Family Children ───────────────────────────────────────────────────────

app.get('/api/family/children', authenticateToken, async (req: any, res) => {
  try {
    const children = await prisma.user.findMany({
      where: { familyId: req.user.familyId, role: 'CHILD' },
      select: { id: true, name: true, avatar: true, color: true, balance: true, age: true, settings: true }
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

    const result = await prisma.$transaction(async (tx: any) => {
      const { actual, capped, updatedUser } = await clampedDeduct(tx, childId, rule.amount);
      const transaction = await tx.transaction.create({
        data: { childId, amount: -actual, type: 'PENALTY', description: `Sanction : ${rule.title}` }
      });
      return { transaction, updatedUser, capped };
    });
    emitToUser(childId, SocketEvents.PENALTY_APPLIED, result.transaction);
    emitToUser(childId, SocketEvents.BALANCE_UPDATED, { childId, balance: result.updatedUser.balance });
    res.json({ transaction: result.transaction, balance: result.updatedUser.balance, capped: result.capped });
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
  const val = parseFloat(amount);
  if (!(val > 0)) return res.status(400).json({ error: 'Montant invalide' });
  try {
    const settings = await prisma.childSettings.findUnique({ where: { childId: req.user.id } });

    if (settings?.frozen) {
      return res.status(403).json({ error: 'Ton compte est gelé par un parent' });
    }
    if (settings?.maxExpensePerRequest != null && val > settings.maxExpensePerRequest) {
      return res.status(400).json({ error: `Le montant dépasse le maximum autorisé par demande (${settings.maxExpensePerRequest}€)` });
    }
    if (settings?.maxExpensePerWeek != null) {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const weeklySpend = await prisma.transaction.aggregate({
        where: { childId: req.user.id, type: { in: ['EXPENSE_APPROVED', 'EXPENSE_DEDUCTION'] }, date: { gte: startOfWeek } },
        _sum: { amount: true }
      });
      const spent = Math.abs(weeklySpend._sum.amount ?? 0);
      if (spent + val > settings.maxExpensePerWeek) {
        return res.status(400).json({ error: `Cette demande dépasserait ta limite hebdomadaire (${settings.maxExpensePerWeek}€)` });
      }
    }

    const expense = await prisma.expenseRequest.create({
      data: { childId: req.user.id, title, description, amount: val, expenseType, reference }
    });
    emitToFamily(req.user.familyId, SocketEvents.EXPENSE_REQUESTED, expense);
    res.status(201).json({ expense });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Child Settings (limites de dépenses, gel de compte) ─────────────────────

app.get('/api/children/:id/settings', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const settings = await prisma.childSettings.upsert({
      where: { childId: req.params.id },
      update: {},
      create: { childId: req.params.id }
    });
    res.json({ settings });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/children/:id/settings', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const { maxExpensePerRequest, maxExpensePerWeek, frozen } = req.body;
    const data = {
      maxExpensePerRequest: maxExpensePerRequest === '' || maxExpensePerRequest == null ? null : Math.max(0, parseFloat(maxExpensePerRequest)),
      maxExpensePerWeek: maxExpensePerWeek === '' || maxExpensePerWeek == null ? null : Math.max(0, parseFloat(maxExpensePerWeek)),
      frozen: !!frozen,
    };
    const settings = await prisma.childSettings.upsert({
      where: { childId: req.params.id },
      update: data,
      create: { childId: req.params.id, ...data }
    });
    res.json({ settings });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Argent de poche récurrent ────────────────────────────────────────────

app.get('/api/children/:id/allowance', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const allowance = await prisma.allowanceSchedule.findUnique({ where: { childId: req.params.id } });
    res.json({ allowance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/children/:id/allowance', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const { amount, frequency, active } = req.body;
    const val = Math.max(0, parseFloat(amount) || 0);
    if (!['WEEKLY', 'MONTHLY'].includes(frequency)) return res.status(400).json({ error: 'Fréquence invalide' });
    const allowance = await prisma.allowanceSchedule.upsert({
      where: { childId: req.params.id },
      update: { amount: val, frequency, active: active !== false },
      create: { childId: req.params.id, amount: val, frequency, active: active !== false }
    });
    res.json({ allowance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Répartition Épargne / Dépense / Don ──────────────────────────────────

app.put('/api/children/:id/split-settings', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const { splitEnabled, splitSavePct, splitSpendPct, splitGivePct } = req.body;
    const save = Math.max(0, parseFloat(splitSavePct) || 0);
    const spend = Math.max(0, parseFloat(splitSpendPct) || 0);
    const give = Math.max(0, parseFloat(splitGivePct) || 0);
    if (Math.round(save + spend + give) !== 100) {
      return res.status(400).json({ error: 'Les trois pourcentages doivent totaliser 100%' });
    }
    const data = { splitEnabled: !!splitEnabled, splitSavePct: save, splitSpendPct: spend, splitGivePct: give };
    const settings = await prisma.childSettings.upsert({
      where: { childId: req.params.id },
      update: data,
      create: { childId: req.params.id, ...data }
    });
    res.json({ settings });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/expenses/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { approvedAmount, parentNote } = req.body;
  try {
    const expense = await prisma.expenseRequest.findUnique({ where: { id: req.params.id } });
    if (!expense) return res.status(404).json({ error: 'Demande non trouvée' });
    const requestedAmount = approvedAmount !== undefined && approvedAmount !== null && approvedAmount !== ''
      ? parseFloat(approvedAmount) : expense.amount;
    if (!(requestedAmount > 0)) return res.status(400).json({ error: 'Montant invalide' });

    const result = await prisma.$transaction(async (tx: any) => {
      const { actual, capped, updatedUser } = await clampedDeduct(tx, expense.childId, requestedAmount);
      const updatedExpense = await tx.expenseRequest.update({
        where: { id: req.params.id },
        data: { status: 'APPROVED', approvedAmount: actual, parentNote }
      });
      const transaction = await tx.transaction.create({
        data: { childId: expense.childId, amount: -actual, type: 'EXPENSE_APPROVED', description: `Dépense approuvée : ${expense.title}`, expenseId: expense.id }
      });
      return { updatedExpense, updatedUser, capped, transaction };
    });
    emitToUser(expense.childId, SocketEvents.EXPENSE_APPROVED, result.updatedExpense);
    emitToUser(expense.childId, SocketEvents.BALANCE_UPDATED, { childId: expense.childId, balance: result.updatedUser.balance });
    res.json({ expense: result.updatedExpense, balance: result.updatedUser.balance, capped: result.capped });
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
    emitToUser(expense.childId, SocketEvents.EXPENSE_REJECTED, expense);
    res.json({ expense });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/expenses/deduct', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const { childId, amount, description } = req.body;
  try {
    const val = parseFloat(amount);
    if (!(val > 0)) return res.status(400).json({ error: 'Montant invalide' });

    const result = await prisma.$transaction(async (tx: any) => {
      const { actual, capped, updatedUser } = await clampedDeduct(tx, childId, val);
      const transaction = await tx.transaction.create({
        data: { childId, amount: -actual, type: 'EXPENSE_DEDUCTION', description: description || 'Déduction parent' }
      });
      return { transaction, updatedUser, capped };
    });
    emitToUser(childId, SocketEvents.EXPENSE_DEDUCTED, result.transaction);
    emitToUser(childId, SocketEvents.BALANCE_UPDATED, { childId, balance: result.updatedUser.balance });
    res.json({ transaction: result.transaction, balance: result.updatedUser.balance, capped: result.capped });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

if (!process.env.VERCEL) {
  // http.createServer + initSocket (au lieu d'un simple app.listen) pour
  // activer les notifications temps réel (Socket.io). Note : les fonctions
  // serverless Vercel ne gardent pas de connexion WebSocket ouverte — ce
  // bloc entier est déjà exclu du déploiement Vercel via ce même garde-fou,
  // donc le temps réel ne fonctionne que sur le déploiement Docker/self-hosted.
  const httpServer = createServer(app);
  initSocket(httpServer);
  httpServer.listen(port, () => console.log(`🚀 API PocketMoney sur http://localhost:${port}`));
}

export default app;
