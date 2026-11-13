import type { Response } from 'express';
import { z } from 'zod';

const MAX_AMOUNT = 1_000_000;
const DECIMAL = /^-?\d+(\.\d+)?$/;
// Environ 500 Ko une fois décodés. Les photos sont stockées en base : le front les
// compresse pour tenir sous ce plafond (voir frontend/src/proofImage.js).
const MAX_PROOF_IMAGE_CHARS = 700_000;

// Les messages remontent tels quels dans les toasts du frontend (`data.error`).
const missing = (label: string) => `Champ requis : ${label}`;
const invalid = (label: string) => `Champ invalide : ${label}`;
const typeErrors = (label: string) => ({ required_error: missing(label), invalid_type_error: invalid(label) });

const text = (label: string, max = 200) =>
  z.string(typeErrors(label)).trim().min(1, missing(label)).max(max, `${label} : ${max} caractères maximum`);

const optionalText = (label: string, max = 2000) =>
  z.string(typeErrors(label)).trim().max(max, `${label} : ${max} caractères maximum`).nullish();

// Pas de contrainte UUID : les données du seed ont des ids lisibles (`user-alice`).
const id = (label: string) => z.string(typeErrors(label)).min(1, missing(label)).max(100, invalid(label));

const flag = (label: string) => z.boolean(typeErrors(label)).optional();

const choice = <T extends [string, ...string[]]>(label: string, values: T) =>
  z.enum(values, { errorMap: () => ({ message: invalid(label) }) });

// Les formulaires envoient souvent des chaînes (`<input type="number">`). Contrairement
// à parseFloat ou z.coerce, seule une écriture décimale complète est acceptée :
// ni "12abc" → 12, ni "" / null / true → 0 ou 1.
const toNumber = (value: unknown) => {
  if (value === '') return undefined;
  return typeof value === 'string' && DECIMAL.test(value.trim()) ? Number(value) : value;
};

const numeric = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(toNumber, schema);

const money = (label: string, min: number) =>
  numeric(
    z.number(typeErrors(label))
      .finite(invalid(label))
      .min(min, invalid(label))
      .max(MAX_AMOUNT, `${label} : ${MAX_AMOUNT} maximum`)
      .refine(value => Math.round(value * 100) / 100 === value, `${label} : 2 décimales maximum`),
  );

const positiveAmount = (label: string) => money(label, 0.01);
const nonNegativeAmount = (label: string) => money(label, 0);

const blankAsNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(value => (value === '' ? null : value), schema.nullish());

// Le formulaire de répartition traite un champ vidé comme 0 dans son total.
const percent = (label: string) =>
  z.preprocess(
    value => (value === '' ? 0 : value),
    numeric(z.number(typeErrors(label)).finite(invalid(label)).min(0, invalid(label)).max(100, invalid(label))),
  );

const weekday = numeric(
  z.number(typeErrors('jour de la semaine'))
    .int(invalid('jour de la semaine'))
    .min(0, invalid('jour de la semaine'))
    .max(6, invalid('jour de la semaine')),
);

const email = z.string(typeErrors('email')).trim().max(254, invalid('email')).email(invalid('email'));

// Même minimum que l'ancienne vérification de reset-password. Le maximum
// correspond à la limite de bcrypt, qui ignore silencieusement la suite.
const newPassword = z.string(typeErrors('mot de passe'))
  .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
  .max(72, 'Le mot de passe doit contenir au plus 72 caractères');

const inviteCode = text('code famille', 20);

// Une case à cocher : seul un `true` explicite vaut acceptation.
const accepted = (message: string) => z.literal(true, { errorMap: () => ({ message }) });
const consentShape = {
  acceptTerms: accepted("Accepte les conditions d'utilisation et la politique de confidentialité"),
  parentalConsent: accepted('Le consentement parental est requis'),
};

const body = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape, { required_error: 'Corps de requête invalide', invalid_type_error: 'Corps de requête invalide' });

// ── Auth ─────────────────────────────────────────────────────────────────

export const registerParentCreateSchema = body({
  name: text('nom', 100),
  email,
  password: newPassword,
  familyName: text('nom de la famille', 100),
  ...consentShape,
  rules: z.array(
    body({ title: text('motif'), amount: nonNegativeAmount('montant') }),
    typeErrors('règles'),
  ).max(50, 'règles : 50 maximum').optional(),
});

export const registerParentJoinSchema = body({
  name: text('nom', 100),
  email,
  password: newPassword,
  inviteCode,
  ...consentShape,
});

export const registerChildSchema = body({
  name: text('prénom', 100),
  password: newPassword,
  inviteCode,
  age: numeric(z.number(typeErrors('âge')).int(invalid('âge')).min(1, invalid('âge')).max(99, invalid('âge'))),
});

// `email` contient le prénom des enfants, qui fournissent alors `inviteCode` : pas
// de contrôle de format. Pas de minimum de mot de passe non plus, les comptes
// existants doivent rester accessibles.
export const loginSchema = body({
  email: z.string(typeErrors('identifiant')).trim().min(1, missing('identifiant')).max(254, invalid('identifiant')),
  inviteCode: inviteCode.optional(),
  password: z.string(typeErrors('mot de passe')).min(1, missing('mot de passe')).max(1024, invalid('mot de passe')),
});

export const forgotPasswordSchema = body({ email });

export const resetPasswordSchema = body({
  token: z.string(typeErrors('lien')).min(1, missing('lien')).max(200, invalid('lien')),
  newPassword,
});

export const resetChildPasswordSchema = body({ newPassword });

export const consentSchema = body(consentShape);

export const demoSwitchSchema = body({
  userId: z.string(typeErrors('compte')).uuid(invalid('compte')),
});

export const deleteFamilySchema = body({
  password: z.string(typeErrors('mot de passe')).min(1, missing('mot de passe')).max(1024, invalid('mot de passe')),
});

// ── Règles ───────────────────────────────────────────────────────────────

const ruleShape = {
  title: text('motif'),
  description: optionalText('description'),
  amount: nonNegativeAmount('montant'),
  active: flag('actif'),
};

export const createRuleSchema = body(ruleShape);
export const updateRuleSchema = body(ruleShape).partial();
export const applyRuleSchema = body({ childId: id('enfant') });

// ── Corvées ──────────────────────────────────────────────────────────────

const choreShape = {
  title: text('titre'),
  description: optionalText('description'),
  reward: nonNegativeAmount('récompense'),
  assigneeId: id('enfant'),
  deadline: text('échéance', 100),
};

export const createChoreSchema = body(choreShape);
export const updateChoreSchema = body(choreShape).partial();

export const submitChoreSchema = body({
  note: optionalText('note'),
  // Rendue dans un <img> côté parent : uniquement une image encodée ou une URL web.
  proofImageUrl: blankAsNull(
    z.string(typeErrors('photo'))
      .max(MAX_PROOF_IMAGE_CHARS, 'Photo trop volumineuse')
      .regex(/^(data:image\/(jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$|https?:\/\/)/i, invalid('photo')),
  ),
});

export const rejectChoreSchema = body({ reason: optionalText('raison') });

const choreTemplateShape = {
  title: text('titre'),
  description: optionalText('description'),
  reward: nonNegativeAmount('récompense'),
  assigneeId: id('enfant'),
  frequency: choice('fréquence', ['DAILY', 'WEEKLY']),
  weekday: weekday.optional(),
};

export const createChoreTemplateSchema = body(choreTemplateShape).refine(
  template => template.frequency !== 'WEEKLY' || template.weekday !== undefined,
  { message: missing('jour de la semaine'), path: ['weekday'] },
);

export const updateChoreTemplateSchema = body({ ...choreTemplateShape, active: flag('actif') }).partial();

// ── Objectifs ────────────────────────────────────────────────────────────

export const createGoalSchema = body({
  title: text('titre'),
  target: positiveAmount('objectif'),
  icon: text('icône', 50),
  isShared: flag('partagé'),
});

export const goalAmountSchema = body({ amount: positiveAmount('montant') });

// ── Dépenses ─────────────────────────────────────────────────────────────

export const requestExpenseSchema = body({
  title: text('titre'),
  description: optionalText('description'),
  amount: positiveAmount('montant'),
  expenseType: choice('type de dépense', ['ONLINE', 'CASH', 'OTHER']),
  reference: optionalText('référence', 200),
});

export const approveExpenseSchema = body({
  approvedAmount: blankAsNull(positiveAmount('montant')),
  parentNote: optionalText('note'),
});

export const rejectExpenseSchema = body({ parentNote: optionalText('note') });

export const deductExpenseSchema = body({
  childId: id('enfant'),
  amount: positiveAmount('montant'),
  description: optionalText('description', 200),
});

// ── Réglages enfant ──────────────────────────────────────────────────────

export const childSettingsSchema = body({
  maxExpensePerRequest: blankAsNull(nonNegativeAmount('limite par demande')),
  maxExpensePerWeek: blankAsNull(nonNegativeAmount('limite par semaine')),
  frozen: flag('gel du compte'),
});

export const allowanceSchema = body({
  amount: nonNegativeAmount('montant'),
  frequency: choice('fréquence', ['WEEKLY', 'MONTHLY']),
  active: flag('actif'),
});

export const splitSettingsSchema = body({
  splitEnabled: flag('répartition'),
  splitSavePct: percent('épargne'),
  splitSpendPct: percent('dépense'),
  splitGivePct: percent('don'),
});

// Appelée dans le handler, après le contrôle de rôle : un utilisateur sans droit
// reçoit 403 quel que soit le contenu de sa requête. Renvoie null si la réponse
// 400 est déjà envoyée. Seuls les champs des schémas sont conservés.
export const parseBody = <S extends z.ZodTypeAny>(
  schema: S,
  req: { body?: unknown },
  res: Response,
): z.output<S> | null => {
  const result = schema.safeParse(req.body);
  if (result.success) return result.data;
  res.status(400).json({ error: result.error.issues[0].message });
  return null;
};
