import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { AUTH_COOKIE, readAuthCookie } from './authCookie';
import { assertEmailConfig, assertStrongSecret } from './config';
import { initSocket, emitToFamily, emitToUser, disconnectFamily, disconnectUser, SocketEvents } from './socket';
import {
  allowanceSchema, applyRuleSchema, approveExpenseSchema, childSettingsSchema, createChoreSchema,
  createChoreTemplateSchema, createGoalSchema, createRuleSchema, deductExpenseSchema, deleteFamilySchema, forgotPasswordSchema,
  goalAmountSchema, loginSchema, parseBody, registerChildSchema, registerParentCreateSchema,
  registerParentJoinSchema, rejectChoreSchema, rejectExpenseSchema, requestExpenseSchema, resetPasswordSchema,
  splitSettingsSchema, submitChoreSchema, updateChoreSchema, updateChoreTemplateSchema, updateRuleSchema,
} from './validation';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
// Un JWT_SECRET absent ne doit JAMAIS retomber sur une valeur publique : des
// tokens signés avec un secret connu sont forgeables. En production on refuse
// de démarrer ; en dev on tolère un secret explicitement non-sûr (mais .env en
// fournit normalement un) avec un avertissement bruyant.
const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    if (process.env.NODE_ENV === 'production') assertStrongSecret('JWT_SECRET', secret);
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is required in production. Refusing to start: a missing secret ' +
      'would sign tokens with a public, forgeable value. Set JWT_SECRET in the environment.',
    );
  }
  console.warn(
    '[WARN] JWT_SECRET is not set — using an INSECURE development-only secret. ' +
    'Set JWT_SECRET before running outside local development.',
  );
  return 'dev-only-insecure-secret';
})();

// Seule l'origine du front est autorisée, pour l'API comme pour Socket.io. Le
// navigateur compare l'en-tête Origin (sans slash final) à cette valeur exacte.
const CLIENT_ORIGIN: string = (() => {
  const origin = process.env.CLIENT_URL?.replace(/\/+$/, '');
  if (origin) return origin;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CLIENT_URL is required in production. Refusing to start: CORS cannot be ' +
      'restricted to the frontend origin without it. Set CLIENT_URL in the environment.',
    );
  }
  return 'http://localhost:5173';
})();

if (process.env.NODE_ENV === 'production') assertEmailConfig(process.env);

// Nombre de proxys devant l'API. Sans cela, derrière nginx, tous les clients
// partageraient l'IP du proxy et donc le même compteur de rate limiting. Une
// valeur trop haute laisserait un client usurper son IP via X-Forwarded-For.
const TRUST_PROXY_HOPS = (() => {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.NODE_ENV === 'production' ? 1 : 0));
  if (!Number.isInteger(hops) || hops < 0) throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  return hops;
})();
app.set('trust proxy', TRUST_PROXY_HOPS);

// Le JWT vit dans un cookie httpOnly, hors de portée d'un script injecté. Secure
// suit le protocole du front, pour que le déploiement HTTP local reste possible.
const COOKIE_SECURE = CLIENT_ORIGIN.startsWith('https://');
const COOKIE_SAMESITE = (() => {
  const sameSite = process.env.COOKIE_SAMESITE ?? 'lax';
  if (sameSite !== 'lax' && sameSite !== 'strict' && sameSite !== 'none') {
    throw new Error('COOKIE_SAMESITE must be lax, strict or none.');
  }
  if (sameSite === 'none' && !COOKIE_SECURE) {
    throw new Error('COOKIE_SAMESITE=none requires an https:// CLIENT_URL: browsers reject it otherwise.');
  }
  return sameSite as 'lax' | 'strict' | 'none';
})();
const AUTH_COOKIE_OPTIONS = { httpOnly: true, secure: COOKIE_SECURE, sameSite: COOKIE_SAMESITE, path: '/' };
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // aligné sur l'expiration du JWT

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

// Le navigateur joint le cookie tout seul : on refuse les écritures venant d'un
// autre site (CSRF), y compris si SameSite=None. Sans en-tête Origin, la requête
// ne vient pas d'un navigateur en cross-site et ne porte donc pas le cookie d'une victime.
app.use('/api', (req, res, next) => {
  const { origin } = req.headers;
  if (origin && origin !== CLIENT_ORIGIN && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(403).json({ error: 'Origine non autorisée' });
  }
  next();
});

// Doit rester au-dessus du plafond des photos de preuve (validation.ts).
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.get('/', (req, res) => {
  res.json({ name: 'PocketMoney API', status: 'ok', version: '1.0.0' });
});
 
// ── Health Check ──────────────────────────────────────────────────────────
// Vérifie aussi la base : sans elle l'instance ne peut servir aucune requête utile.
app.get('/api/health', async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp });
  } catch {
    res.status(503).json({ status: 'unavailable', timestamp });
  }
});

// ── Helpers & Middlewares ──────────────────────────────────────────────────
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const setAuthCookie = (res: any, userId: string) => {
  res.cookie(AUTH_COOKIE, generateToken(userId), { ...AUTH_COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_MS });
};

// Sans RESEND_API_KEY (dev local uniquement : la production refuse de démarrer
// sans), le lien est affiché dans les logs pour tester le flux de bout en bout.
const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email non configuré] Lien de réinitialisation pour ${to} : ${resetUrl}`);
    return;
  }
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  // Le SDK Resend renvoie ses erreurs au lieu de les lever.
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'PocketMoney <onboarding@resend.dev>',
    to,
    subject: 'Réinitialise ton mot de passe PocketMoney',
    html: `<p>Bonjour,</p><p>Clique sur ce lien pour choisir un nouveau mot de passe (valable 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>`,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
};

// Sérialise les lecture-puis-écriture sur un compte jusqu'à la fin de la transaction.
const lockUser = (tx: any, id: string) => tx.$queryRaw`SELECT id FROM "User" WHERE id = ${id} FOR UPDATE`;

// Balance must never go below 0 (see backend/PLAN.md "Règle d'Or"). Deducts up to
// `amount` from a child's balance, clamping at 0, and returns how much was actually
// taken so the caller can record an accurate transaction and warn if it was capped.
const clampedDeduct = async (tx: any, childId: string, amount: number) => {
  await lockUser(tx, childId);
  const user = await tx.user.findUnique({ where: { id: childId } });
  if (!user) throw new Error('Utilisateur introuvable');
  const actual = Math.min(amount, user.balance);
  const updatedUser = await tx.user.update({
    where: { id: childId },
    data: { balance: user.balance - actual },
  });
  return { actual, capped: actual < amount, updatedUser };
};

// Le calendrier des corvées et de l'argent de poche suit un seul fuseau, quel que
// soit celui du serveur (UTC en Docker). Un fuseau invalide bloque le démarrage.
const appDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: process.env.APP_TIMEZONE || 'Europe/Paris',
  year: 'numeric', month: '2-digit', day: '2-digit',
});

// Date du calendrier sous la forme YYYY-MM-DD.
const appDate = (date: Date) => {
  const parts = Object.fromEntries(appDateFormat.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

// Les jours sont comptés sur les dates YYYY-MM-DD : les passages à l'heure d'été ne les décalent pas.
const utcMidnight = (dateStr: string) => new Date(`${dateStr}T00:00:00Z`);
const daysBetween = (from: string, to: string) => Math.round((utcMidnight(to).getTime() - utcMidnight(from).getTime()) / 86_400_000);

// Variation du solde depuis le début du mois calendaire, recalculée depuis les
// transactions : chaque mouvement du solde en crée une. 32 jours couvrent le mois
// en cours quel que soit le fuseau ; le tri exact se fait sur la date locale.
const monthDeltaOf = async (userId: string) => {
  const now = new Date();
  const month = appDate(now).slice(0, 7);
  const recent = await prisma.transaction.findMany({
    where: { childId: userId, date: { gte: new Date(now.getTime() - 32 * 86_400_000) } },
    select: { amount: true, date: true },
  });
  const total = recent.filter(t => appDate(t.date).startsWith(month)).reduce((sum, t) => sum + t.amount, 0);
  return Math.round(total * 100) / 100;
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
  const today = appDate(now);
  for (const s of schedules) {
    const periodDays = s.frequency === 'MONTHLY' ? 30 : 7;
    if (s.lastPaidAt && daysBetween(appDate(s.lastPaidAt), today) < periodDays) continue;
    await prisma.$transaction(async (tx: any) => {
      // Le `where` porte la date lue : de deux requêtes simultanées, une seule verse.
      const { count } = await tx.allowanceSchedule.updateMany({
        where: { id: s.id, active: true, lastPaidAt: s.lastPaidAt },
        data: { lastPaidAt: now },
      });
      if (count !== 1) return;
      await tx.user.update({ where: { id: s.childId }, data: { balance: { increment: s.amount } } });
      await tx.transaction.create({
        data: { childId: s.childId, amount: s.amount, type: 'ALLOWANCE', description: 'Argent de poche' }
      });
      await applySplit(tx, s.childId, s.amount);
    });
  }
};

// Corvées récurrentes : même principe d'évaluation paresseuse que l'argent de
// poche (voir processDueAllowances) — appelé à chaque GET /api/chores.
const generateDueChores = async (familyId: string) => {
  const templates = await prisma.choreTemplate.findMany({ where: { active: true, familyId } });
  const todayStr = appDate(new Date());
  const weekday = utcMidnight(todayStr).getUTCDay();
  for (const t of templates) {
    if (t.lastGeneratedDate === todayStr) continue;
    const isDue = t.frequency === 'DAILY' || (t.frequency === 'WEEKLY' && t.weekday === weekday);
    if (!isDue) continue;
    await prisma.$transaction(async (tx: any) => {
      // Le `where` porte la date lue : de deux requêtes simultanées, une seule crée la corvée.
      const { count } = await tx.choreTemplate.updateMany({
        where: { id: t.id, active: true, lastGeneratedDate: t.lastGeneratedDate },
        data: { lastGeneratedDate: todayStr },
      });
      if (count !== 1) return;
      await tx.chore.create({
        data: {
          title: t.title, description: t.description, reward: t.reward,
          assigneeId: t.assigneeId, deadline: todayStr, status: 'PENDING', templateId: t.id
        }
      });
    });
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
  const token = readAuthCookie(req.headers.cookie);
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

// Compteurs par IP, en mémoire : ils sont propres à chaque instance et repartent
// de zéro au redémarrage. Suffisant pour un serveur unique ; plusieurs instances
// (ou Vercel) demanderaient un store partagé.
const authLimiter = (limit: number, windowMinutes: number, error: string, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error },
  });

// Seuls les échecs comptent : une famille derrière la même IP peut se connecter librement.
const loginLimiter = authLimiter(10, 15, 'Trop de tentatives de connexion. Réessaie dans 15 minutes.', true);
const registerLimiter = authLimiter(10, 60, "Trop d'inscriptions depuis cette connexion. Réessaie plus tard.");
const forgotPasswordLimiter = authLimiter(5, 60, 'Trop de demandes de réinitialisation. Réessaie plus tard.');
const deleteFamilyLimiter = authLimiter(5, 15, 'Trop de tentatives. Réessaie dans 15 minutes.', true);

// Les conflits d'unicité remontent dans un toast : pas d'erreur Prisma brute.
const sendRegisterError = (error: any, res: any) => {
  if (error.code !== 'P2002') return res.status(400).json({ error: error.message });
  const message = error.meta?.target?.includes('email')
    ? 'Cet email est déjà utilisé'
    : 'Ce prénom est déjà utilisé dans cette famille';
  res.status(409).json({ error: message });
};

// ── Auth Endpoints ────────────────────────────────────────────────────────

// 1. Parent: Create Family + Initial Rules
app.post('/api/auth/register/parent/create', registerLimiter, async (req, res) => {
  const body = parseBody(registerParentCreateSchema, req, res);
  if (!body) return;
  const { name, email, password, familyName, rules } = body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const family = await prisma.family.create({
      data: {
        name: familyName,
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        rules: { create: rules ?? [] }
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

    setAuthCookie(res, user.id);
    res.status(201).json({ user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: user.monthDelta, avatar: user.avatar, color: user.color } });
  } catch (error: any) {
    sendRegisterError(error, res);
  }
});

app.post('/api/auth/register/parent/join', registerLimiter, async (req, res) => {
  const body = parseBody(registerParentJoinSchema, req, res);
  if (!body) return;
  const { name, email, password, inviteCode } = body;
  try {
    const family = await prisma.family.findUnique({ where: { inviteCode } });
    if (!family) return res.status(404).json({ error: 'Code invalide' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'PARENT', familyId: family.id }
    });
    setAuthCookie(res, user.id);
    res.status(201).json({ user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: user.monthDelta, avatar: user.avatar, color: user.color } });
  } catch (error: any) { sendRegisterError(error, res); }
});

app.post('/api/auth/register/child', registerLimiter, async (req, res) => {
  const body = parseBody(registerChildSchema, req, res);
  if (!body) return;
  const { name, password, inviteCode, age } = body;
  try {
    const family = await prisma.family.findUnique({ where: { inviteCode } });
    if (!family) return res.status(404).json({ error: 'Code invalide' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name, password: hashedPassword, role: 'CHILD', familyId: family.id,
        age, avatar: name.charAt(0).toUpperCase(), color: '#835500'
      }
    });
    setAuthCookie(res, user.id);
    res.status(201).json({ user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: user.monthDelta, avatar: user.avatar, color: user.color, age: user.age } });
  } catch (error: any) { sendRegisterError(error, res); }
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const body = parseBody(loginSchema, req, res);
  if (!body) return;
  const { email, inviteCode, password } = body;
  try {
    // Un prénom n'est unique que dans sa famille : sans code famille, seul l'email identifie un compte.
    const user = inviteCode
      ? await prisma.user.findFirst({ where: { name: email, role: 'CHILD', family: { inviteCode } } })
      : await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Identifiants invalides' });
    setAuthCookie(res, user.id);
    res.json({ user: { id: user.id, name: user.name, role: user.role, familyId: user.familyId, balance: user.balance, monthDelta: await monthDeltaOf(user.id), avatar: user.avatar, color: user.color, age: user.age } });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// Le cookie httpOnly est invisible pour le front : seul le serveur peut l'effacer.
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE, AUTH_COOKIE_OPTIONS);
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  const u = req.user;
  try {
    res.json({ user: { id: u.id, name: u.name, role: u.role, familyId: u.familyId, balance: u.balance, monthDelta: await monthDeltaOf(u.id), saveBalance: u.saveBalance, spendBalance: u.spendBalance, giveBalance: u.giveBalance, avatar: u.avatar, color: u.color, age: u.age, settings: u.settings } });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Récupération de mot de passe ─────────────────────────────────────────

app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const body = parseBody(forgotPasswordSchema, req, res);
  if (!body) return;
  const { email } = body;
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
      const resetUrl = `${CLIENT_ORIGIN}/reset-password?token=${rawToken}`;
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
  const body = parseBody(resetPasswordSchema, req, res);
  if (!body) return;
  const { token, newPassword } = body;
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
      users: { select: { id: true, name: true, role: true, avatar: true, color: true, balance: true, age: true, settings: true } },
      rules: true
    }
  });
  res.json({ family });
});

// Le mot de passe est redemandé : l'opération efface toutes les données de la
// famille (corvées, soldes, historique) par cascade, sans retour possible.
app.delete('/api/family', authenticateToken, deleteFamilyLimiter, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(deleteFamilySchema, req, res);
  if (!body) return;
  try {
    if (!(await bcrypt.compare(body.password, req.user.password))) {
      return res.status(403).json({ error: 'Mot de passe incorrect' });
    }
    await prisma.family.delete({ where: { id: req.user.familyId } });
    emitToFamily(req.user.familyId, SocketEvents.ACCOUNT_DELETED, {});
    disconnectFamily(req.user.familyId);
    res.clearCookie(AUTH_COOKIE, AUTH_COOKIE_OPTIONS);
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// L'historique de l'enfant part avec lui par cascade. Ses objectifs personnels
// disparaissent aussi, et sa part quitte les objectifs communs encore en cours.
app.delete('/api/children/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const childId = req.params.id;
  try {
    if (!(await isFamilyChild(childId, req.user.familyId))) {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    await prisma.$transaction(async (tx: any) => {
      const links = await tx.goalParticipant.findMany({
        where: { childId },
        include: { goal: { include: { participants: true } } },
      });
      for (const { goal, contributedAmount } of links) {
        if (!goal.isShared && goal.participants.length === 1) {
          await tx.goal.delete({ where: { id: goal.id } });
        } else if (goal.status === 'IN_PROGRESS' && contributedAmount > 0) {
          await tx.goal.update({ where: { id: goal.id }, data: { current: { decrement: contributedAmount } } });
          await tx.goal.updateMany({ where: { id: goal.id, current: { lt: 0 } }, data: { current: 0 } });
        }
      }
      await tx.user.delete({ where: { id: childId } });
    });
    emitToUser(childId, SocketEvents.ACCOUNT_DELETED, {});
    disconnectUser(childId);
    emitToFamily(req.user.familyId, SocketEvents.MEMBER_REMOVED, { childId });
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
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
  const body = parseBody(createRuleSchema, req, res);
  if (!body) return;
  const { title, description, amount, active } = body;
  try {
    const rule = await prisma.rule.create({
      data: { title, description, amount, active: active !== false, familyId: req.user.familyId }
    });
    res.status(201).json({ rule });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/rules/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(updateRuleSchema, req, res);
  if (!body) return;
  try {
    const existing = await prisma.rule.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Règle introuvable' });
    if (existing.familyId !== req.user.familyId) return res.status(403).json({ error: 'Interdit' });
    const { title, description, amount, active } = body;
    const rule = await prisma.rule.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        amount: amount ?? existing.amount,
        active: active ?? existing.active,
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

// Une corvée n'a pas de familyId : elle appartient à la famille de son assigné.
// `null` couvre aussi une corvée d'une autre famille, pour ne pas révéler son existence.
const findFamilyChore = (id: string, familyId: string) =>
  prisma.chore.findFirst({ where: { id, assignee: { familyId } } });

// Le typeof est indispensable : Prisma ignore un filtre `undefined` et
// interprète un objet ({ not: '' }) venu du body comme un opérateur.
const isFamilyChild = async (userId: unknown, familyId: string) => {
  if (typeof userId !== 'string') return false;
  const child = await prisma.user.findFirst({ where: { id: userId, familyId, role: 'CHILD' }, select: { id: true } });
  return child !== null;
};

// Le statut attendu est dans le `where` : de deux requêtes simultanées, une seule
// modifie la ligne, ce qu'une lecture suivie d'un update ne garantirait pas.
// `null` si la corvée n'est plus dans le statut attendu.
const transitionChore = async (db: any, id: string, from: string, data: object) => {
  const { count } = await db.chore.updateMany({ where: { id, status: from }, data });
  return count === 1 ? db.chore.findUniqueOrThrow({ where: { id } }) : null;
};

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
  const body = parseBody(createChoreTemplateSchema, req, res);
  if (!body) return;
  try {
    const { title, description, reward, assigneeId, frequency, weekday } = body;
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee || assignee.familyId !== req.user.familyId || assignee.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const template = await prisma.choreTemplate.create({
      data: {
        familyId: req.user.familyId, title, description, reward,
        assigneeId, frequency, weekday: frequency === 'WEEKLY' ? weekday : null,
      }
    });
    res.status(201).json({ template });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/chore-templates/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(updateChoreTemplateSchema, req, res);
  if (!body) return;
  try {
    const existing = await prisma.choreTemplate.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Modèle introuvable' });
    if (existing.familyId !== req.user.familyId) return res.status(403).json({ error: 'Interdit' });
    const { title, description, reward, assigneeId, frequency, weekday, active } = body;
    if (assigneeId != null && !(await isFamilyChild(assigneeId, req.user.familyId))) {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const nextFrequency = frequency ?? existing.frequency;
    const nextWeekday = nextFrequency === 'WEEKLY' ? weekday ?? existing.weekday : null;
    if (nextFrequency === 'WEEKLY' && nextWeekday === null) {
      return res.status(400).json({ error: 'Champ requis : jour de la semaine' });
    }
    const template = await prisma.choreTemplate.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        reward: reward ?? existing.reward,
        assigneeId: assigneeId ?? existing.assigneeId,
        frequency: nextFrequency,
        weekday: nextWeekday,
        active: active ?? existing.active,
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
  const body = parseBody(createChoreSchema, req, res);
  if (!body) return;
  try {
    const { title, description, reward, assigneeId, deadline } = body;
    if (!(await isFamilyChild(assigneeId, req.user.familyId))) {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const chore = await prisma.chore.create({
      data: { title, description, reward, assigneeId, deadline, status: 'PENDING' }
    });
    res.status(201).json({ chore });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/chores/:id/submit', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CHILD') return res.status(403).json({ error: 'Action réservée aux enfants' });
  const body = parseBody(submitChoreSchema, req, res);
  if (!body) return;
  const { note, proofImageUrl } = body;
  try {
    const existing = await findFamilyChore(req.params.id, req.user.familyId);
    if (!existing) return res.status(404).json({ error: 'Corvée non trouvée' });
    if (existing.assigneeId !== req.user.id) return res.status(403).json({ error: 'Interdit' });
    const chore = await transitionChore(prisma, existing.id, 'PENDING', { status: 'SUBMITTED', note, proofImageUrl });
    if (!chore) return res.status(409).json({ error: 'Cette corvée a déjà été soumise ou traitée' });
    emitToFamily(req.user.familyId, SocketEvents.CHORE_SUBMITTED, chore);
    res.json({ chore });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/chores/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });

  try {
    const chore = await findFamilyChore(req.params.id, req.user.familyId);
    if (!chore) return res.status(404).json({ error: 'Corvée non trouvée' });

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedChore = await transitionChore(tx, chore.id, 'SUBMITTED', { status: 'COMPLETED' });
      if (!updatedChore) return null;
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
    if (!result) return res.status(409).json({ error: "Cette corvée n'est pas en attente de validation" });

    const { updatedChore, updatedUser } = result;
    emitToUser(chore.assigneeId, SocketEvents.CHORE_APPROVED, updatedChore);
    emitToUser(chore.assigneeId, SocketEvents.BALANCE_UPDATED, { childId: chore.assigneeId, balance: updatedUser.balance });
    res.json({ chore: updatedChore, balance: updatedUser.balance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/chores/:id/reject', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(rejectChoreSchema, req, res);
  if (!body) return;
  const { reason } = body;
  try {
    const existing = await findFamilyChore(req.params.id, req.user.familyId);
    if (!existing) return res.status(404).json({ error: 'Corvée non trouvée' });
    const chore = await transitionChore(prisma, existing.id, 'SUBMITTED', { status: 'REJECTED', rejectionReason: reason });
    if (!chore) return res.status(409).json({ error: "Cette corvée n'est pas en attente de validation" });
    emitToUser(chore.assigneeId, SocketEvents.CHORE_REJECTED, chore);
    res.json({ chore });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.patch('/api/chores/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(updateChoreSchema, req, res);
  if (!body) return;
  try {
    const existing = await findFamilyChore(req.params.id, req.user.familyId);
    if (!existing) return res.status(404).json({ error: 'Corvée non trouvée' });
    const { title, description, reward, assigneeId, deadline } = body;
    if (assigneeId != null && !(await isFamilyChild(assigneeId, req.user.familyId))) {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const chore = await prisma.chore.update({
      where: { id: req.params.id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        reward: reward ?? existing.reward,
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
    const existing = await findFamilyChore(req.params.id, req.user.familyId);
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
  const body = parseBody(createGoalSchema, req, res);
  if (!body) return;
  const { title, target, icon, isShared } = body;
  const goal = await prisma.goal.create({
    data: { title, target, icon, isShared: !!isShared, familyId: req.user.familyId }
  });
  // Auto-participate creator
  await prisma.goalParticipant.create({
    data: { goalId: goal.id, childId: req.user.id }
  });
  res.status(201).json({ goal });
});

const GOAL_ALREADY_BOUGHT = 'Cet objectif est déjà acheté';

app.post('/api/goals/:id/fund', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CHILD') return res.status(403).json({ error: 'Réservé aux enfants' });
  const body = parseBody(goalAmountSchema, req, res);
  if (!body) return;
  const val = body.amount;

  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { participants: true } });
    if (!goal || goal.familyId !== req.user.familyId) return res.status(404).json({ error: 'Objectif introuvable' });
    const isParticipant = goal.participants.some(p => p.childId === req.user.id);
    if (!goal.isShared && !isParticipant) return res.status(403).json({ error: "Cet objectif n'est pas partagé avec toi" });

    // Une erreur levée annule toute la transaction ; le catch la renvoie en 400.
    const { updatedGoal, updatedUser } = await prisma.$transaction(async (tx: any) => {
      // Le statut et le solde sont dans le `where` : de deux requêtes simultanées,
      // la seconde voit le solde déjà débité. Toujours l'objectif avant le compte.
      const funded = await tx.goal.updateMany({
        where: { id: goal.id, status: 'IN_PROGRESS' },
        data: { current: { increment: val } },
      });
      if (funded.count !== 1) throw new Error(GOAL_ALREADY_BOUGHT);
      const debited = await tx.user.updateMany({
        where: { id: req.user.id, balance: { gte: val } },
        data: { balance: { decrement: val } },
      });
      if (debited.count !== 1) throw new Error('Solde insuffisant');
      await tx.transaction.create({
        data: { childId: req.user.id, amount: -val, type: 'GOAL_FUNDING', description: `Épargne pour objectif` }
      });
      await tx.goalParticipant.upsert({
        where: { goalId_childId: { goalId: goal.id, childId: req.user.id } },
        update: { contributedAmount: { increment: val } },
        create: { goalId: goal.id, childId: req.user.id, contributedAmount: val }
      });
      return {
        updatedGoal: await tx.goal.findUniqueOrThrow({ where: { id: goal.id } }),
        updatedUser: await tx.user.findUniqueOrThrow({ where: { id: req.user.id } }),
      };
    });
    emitToFamily(req.user.familyId, SocketEvents.GOAL_FUNDED, updatedGoal);
    res.json({ goal: updatedGoal, balance: updatedUser.balance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/goals/:id/withdraw', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'CHILD') return res.status(403).json({ error: 'Réservé aux enfants' });
  const body = parseBody(goalAmountSchema, req, res);
  if (!body) return;
  const val = body.amount;

  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id }, include: { participants: true } });
    if (!goal || goal.familyId !== req.user.familyId) return res.status(404).json({ error: 'Objectif introuvable' });
    if (!goal.participants.some(p => p.childId === req.user.id)) {
      return res.status(403).json({ error: "Tu n'as rien épargné sur cet objectif" });
    }

    const { updatedGoal, updatedUser } = await prisma.$transaction(async (tx: any) => {
      // Le verrou garantit que le plafond ci-dessous est calculé sur des montants à jour.
      await tx.$queryRaw`SELECT id FROM "Goal" WHERE id = ${goal.id} FOR UPDATE`;
      const current = await tx.goal.findUniqueOrThrow({ where: { id: goal.id } });
      if (current.status !== 'IN_PROGRESS') throw new Error(GOAL_ALREADY_BOUGHT);
      const participant = await tx.goalParticipant.findUniqueOrThrow({
        where: { goalId_childId: { goalId: goal.id, childId: req.user.id } },
      });
      const refund = Math.min(val, participant.contributedAmount, current.current);
      if (refund <= 0) throw new Error('Rien à retirer');

      await tx.goalParticipant.update({
        where: { id: participant.id },
        data: { contributedAmount: { decrement: refund } },
      });
      await tx.transaction.create({
        data: { childId: req.user.id, amount: refund, type: 'GOAL_WITHDRAWAL', description: `Retrait depuis un objectif` }
      });
      return {
        updatedGoal: await tx.goal.update({ where: { id: goal.id }, data: { current: { decrement: refund } } }),
        updatedUser: await tx.user.update({ where: { id: req.user.id }, data: { balance: { increment: refund } } }),
      };
    });
    res.json({ goal: updatedGoal, balance: updatedUser.balance });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/goals/:id/buy', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  try {
    const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
    if (!goal || goal.familyId !== req.user.familyId) return res.status(404).json({ error: 'Objectif introuvable' });
    // Le montant est dans le `where` : un retrait simultané ne peut pas invalider l'achat.
    const { count } = await prisma.goal.updateMany({
      where: { id: goal.id, current: { gte: goal.target } },
      data: { status: 'COMPLETED' },
    });
    if (count !== 1) return res.status(400).json({ error: "L'objectif n'est pas encore atteint" });
    res.json({ goal: await prisma.goal.findUniqueOrThrow({ where: { id: goal.id } }) });
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
  const body = parseBody(applyRuleSchema, req, res);
  if (!body) return;
  const { childId } = body;
  try {
    const rule = await prisma.rule.findFirst({ where: { id: req.params.id, familyId: req.user.familyId } });
    if (!rule) return res.status(404).json({ error: 'Règle non trouvée' });
    if (!rule.active) return res.status(400).json({ error: 'Cette règle est désactivée' });
    if (!(await isFamilyChild(childId, req.user.familyId))) return res.status(404).json({ error: 'Enfant introuvable' });

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
    const where: any = {};
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
  const body = parseBody(requestExpenseSchema, req, res);
  if (!body) return;
  const { title, description, amount: val, expenseType, reference } = body;
  try {
    const settings = await prisma.childSettings.findUnique({ where: { childId: req.user.id } });

    if (settings?.frozen) {
      return res.status(403).json({ error: 'Ton compte est gelé par un parent' });
    }
    if (settings?.maxExpensePerRequest != null && val > settings.maxExpensePerRequest) {
      return res.status(400).json({ error: `Le montant dépasse le maximum autorisé par demande (${settings.maxExpensePerRequest}€)` });
    }

    const expense = await prisma.$transaction(async (tx: any) => {
      if (settings?.maxExpensePerWeek != null) {
        // Sans verrou, des demandes simultanées passeraient toutes le contrôle.
        await lockUser(tx, req.user.id);
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const weeklySpend = await tx.transaction.aggregate({
          where: { childId: req.user.id, type: { in: ['EXPENSE_APPROVED', 'EXPENSE_DEDUCTION'] }, date: { gte: startOfWeek } },
          _sum: { amount: true }
        });
        // Les demandes en attente sont des dépenses à venir : elles consomment déjà la limite.
        const pending = await tx.expenseRequest.aggregate({
          where: { childId: req.user.id, status: 'PENDING' },
          _sum: { amount: true }
        });
        const committed = Math.abs(weeklySpend._sum.amount ?? 0) + (pending._sum.amount ?? 0);
        if (committed + val > settings.maxExpensePerWeek) {
          throw new Error(`Cette demande dépasserait ta limite hebdomadaire (${settings.maxExpensePerWeek}€)`);
        }
      }
      return tx.expenseRequest.create({
        data: { childId: req.user.id, title, description, amount: val, expenseType, reference }
      });
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
  const body = parseBody(childSettingsSchema, req, res);
  if (!body) return;
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const { maxExpensePerRequest, maxExpensePerWeek, frozen } = body;
    const data = {
      maxExpensePerRequest: maxExpensePerRequest ?? null,
      maxExpensePerWeek: maxExpensePerWeek ?? null,
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
  const body = parseBody(allowanceSchema, req, res);
  if (!body) return;
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const { amount: val, frequency, active } = body;
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
  const body = parseBody(splitSettingsSchema, req, res);
  if (!body) return;
  try {
    const child = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!child || child.familyId !== req.user.familyId || child.role !== 'CHILD') {
      return res.status(404).json({ error: 'Enfant introuvable' });
    }
    const { splitEnabled, splitSavePct: save, splitSpendPct: spend, splitGivePct: give } = body;
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

const EXPENSE_ALREADY_PROCESSED = 'Cette demande a déjà été traitée';

// `null` couvre aussi la demande d'une autre famille, pour ne pas révéler son existence.
const findFamilyExpense = (id: string, familyId: string) =>
  prisma.expenseRequest.findFirst({ where: { id, child: { familyId } } });

// Comme transitionChore : de deux requêtes simultanées, une seule traite la demande.
const transitionPendingExpense = async (db: any, id: string, data: object) => {
  const { count } = await db.expenseRequest.updateMany({ where: { id, status: 'PENDING' }, data });
  return count === 1 ? db.expenseRequest.findUniqueOrThrow({ where: { id } }) : null;
};

app.put('/api/expenses/:id/approve', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(approveExpenseSchema, req, res);
  if (!body) return;
  const { approvedAmount, parentNote } = body;
  try {
    const expense = await findFamilyExpense(req.params.id, req.user.familyId);
    if (!expense) return res.status(404).json({ error: 'Demande non trouvée' });
    const requestedAmount = approvedAmount ?? expense.amount;
    if (!(requestedAmount > 0)) return res.status(400).json({ error: 'Montant invalide' });

    const result = await prisma.$transaction(async (tx: any) => {
      if (!(await transitionPendingExpense(tx, expense.id, { status: 'APPROVED', parentNote }))) return null;
      const { actual, capped, updatedUser } = await clampedDeduct(tx, expense.childId, requestedAmount);
      const updatedExpense = await tx.expenseRequest.update({
        where: { id: expense.id },
        data: { approvedAmount: actual }
      });
      const transaction = await tx.transaction.create({
        data: { childId: expense.childId, amount: -actual, type: 'EXPENSE_APPROVED', description: `Dépense approuvée : ${expense.title}`, expenseId: expense.id }
      });
      return { updatedExpense, updatedUser, capped, transaction };
    });
    if (!result) return res.status(409).json({ error: EXPENSE_ALREADY_PROCESSED });
    emitToUser(expense.childId, SocketEvents.EXPENSE_APPROVED, result.updatedExpense);
    emitToUser(expense.childId, SocketEvents.BALANCE_UPDATED, { childId: expense.childId, balance: result.updatedUser.balance });
    res.json({ expense: result.updatedExpense, balance: result.updatedUser.balance, capped: result.capped });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.put('/api/expenses/:id/reject', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(rejectExpenseSchema, req, res);
  if (!body) return;
  const { parentNote } = body;
  try {
    const existing = await findFamilyExpense(req.params.id, req.user.familyId);
    if (!existing) return res.status(404).json({ error: 'Demande non trouvée' });
    const expense = await transitionPendingExpense(prisma, existing.id, { status: 'REJECTED', parentNote });
    if (!expense) return res.status(409).json({ error: EXPENSE_ALREADY_PROCESSED });
    emitToUser(expense.childId, SocketEvents.EXPENSE_REJECTED, expense);
    res.json({ expense });
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

app.post('/api/expenses/deduct', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'PARENT') return res.status(403).json({ error: 'Interdit' });
  const body = parseBody(deductExpenseSchema, req, res);
  if (!body) return;
  const { childId, amount: val, description } = body;
  try {
    if (!(await isFamilyChild(childId, req.user.familyId))) return res.status(404).json({ error: 'Enfant introuvable' });
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

// Le front affiche `error` dans un toast : pas de page HTML pour un corps trop gros.
app.use((err: any, req: any, res: any, next: any) => {
  if (err.type !== 'entity.too.large') return next(err);
  res.status(413).json({ error: 'Requête trop volumineuse' });
});

if (!process.env.VERCEL) {
  // http.createServer + initSocket (au lieu d'un simple app.listen) pour
  // activer les notifications temps réel (Socket.io). Note : les fonctions
  // serverless Vercel ne gardent pas de connexion WebSocket ouverte — ce
  // bloc entier est déjà exclu du déploiement Vercel via ce même garde-fou,
  // donc le temps réel ne fonctionne que sur le déploiement Docker/self-hosted.
  const httpServer = createServer(app);
  initSocket(httpServer, CLIENT_ORIGIN);
  httpServer.listen(port, () => console.log(`🚀 API PocketMoney sur http://localhost:${port}`));
}

export default app;
