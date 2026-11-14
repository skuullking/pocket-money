// Mode démo : chaque visiteur reçoit sa propre famille, déjà remplie, supprimée
// au bout de DEMO_TTL_HOURS. Rien n'est partagé entre visiteurs, donc personne ne
// peut abîmer la démo d'un autre. Le nettoyage est paresseux, comme le reste de
// l'app (pas de cron) : il a lieu à chaque création de démo.
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

export const DEMO_TTL_HOURS = 24;
// Plafond de familles de démo vivantes : la démo ne doit pas pouvoir remplir la base.
export const DEMO_MAX_LIVE = Number(process.env.DEMO_MAX_LIVE ?? 500);

export const demoEnabled = () => process.env.DEMO_ENABLED === 'true';

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export const purgeExpiredDemos = (prisma: PrismaClient) =>
  prisma.family.deleteMany({ where: { demoExpiresAt: { lt: new Date() } } });

export const countLiveDemos = (prisma: PrismaClient) =>
  prisma.family.count({ where: { demoExpiresAt: { not: null } } });

// Crée une famille complète : un parent, deux enfants et de quoi parcourir chaque
// écran (corvées à valider, dépense en attente, objectif partagé, règles, versement
// récurrent, historique). Renvoie le parent, connecté par l'appelant.
export const createDemoFamily = async (prisma: PrismaClient, today: string) => {
  // Personne ne se connecte avec ce mot de passe : on change de compte par /api/demo/switch.
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 4);
  const tag = crypto.randomUUID();

  return prisma.$transaction(async (tx) => {
    const family = await tx.family.create({
      data: {
        name: 'Famille Martin',
        inviteCode: `DEMO${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        demoExpiresAt: new Date(Date.now() + DEMO_TTL_HOURS * 3_600_000),
        rules: {
          create: [
            { title: 'Téléphone à table', description: 'Utiliser le téléphone pendant les repas', amount: 2 },
            { title: 'Chambre non rangée', description: 'Ne pas ranger sa chambre après un rappel', amount: 1 },
            { title: 'Devoirs en retard', description: 'Ne pas faire ses devoirs à temps', amount: 3, active: false },
          ],
        },
      },
    });

    const parent = await tx.user.create({
      data: {
        name: 'Camille', email: `demo-${tag}@demo.invalid`, password, role: 'PARENT', familyId: family.id,
        avatar: 'C', color: '#6D3FD1', termsAcceptedAt: new Date(), parentalConsentAt: new Date(),
      },
    });
    const lea = await tx.user.create({
      data: {
        name: 'Léa', password, role: 'CHILD', familyId: family.id, age: 11, avatar: '🦊', color: '#E8A317',
        balance: 32.5, spendBalance: 20.5, saveBalance: 9, giveBalance: 3,
        settings: { create: { maxExpensePerRequest: 25, maxExpensePerWeek: 40, splitEnabled: true, splitSavePct: 30, splitSpendPct: 60, splitGivePct: 10 } },
        allowanceSchedule: { create: { amount: 10, frequency: 'WEEKLY', lastPaidAt: daysFromNow(-3) } },
      },
    });
    const hugo = await tx.user.create({
      data: {
        name: 'Hugo', password, role: 'CHILD', familyId: family.id, age: 8, avatar: '🚀', color: '#3E8E7E',
        balance: 14, spendBalance: 14,
        settings: { create: { maxExpensePerRequest: 15, maxExpensePerWeek: 20 } },
        allowanceSchedule: { create: { amount: 5, frequency: 'WEEKLY', lastPaidAt: daysFromNow(-3) } },
      },
    });

    await tx.chore.createMany({
      data: [
        { title: "Passer l'aspirateur", description: 'Salon et couloir', reward: 4, assigneeId: lea.id, deadline: isoDay(daysFromNow(1)), status: 'SUBMITTED', note: "C'est fait, même sous le canapé !" },
        { title: 'Vider le lave-vaisselle', reward: 1.5, assigneeId: hugo.id, deadline: today, status: 'SUBMITTED', note: 'Tout est rangé' },
        { title: 'Faire la vaisselle', description: 'Laver et ranger la vaisselle du soir', reward: 3, assigneeId: lea.id, deadline: isoDay(daysFromNow(2)), status: 'PENDING' },
        { title: 'Arroser les plantes', reward: 1, assigneeId: hugo.id, deadline: isoDay(daysFromNow(3)), status: 'PENDING' },
        { title: 'Laver la voiture', description: "L'extérieur, avec papa", reward: 6, assigneeId: lea.id, deadline: isoDay(daysFromNow(5)), status: 'PENDING' },
        { title: 'Ranger sa chambre', reward: 2, assigneeId: hugo.id, deadline: isoDay(daysFromNow(-2)), status: 'COMPLETED' },
        { title: 'Mettre la table', reward: 1, assigneeId: hugo.id, deadline: isoDay(daysFromNow(-1)), status: 'REJECTED', rejectionReason: 'Il manquait les verres' },
      ],
    });

    await tx.choreTemplate.create({
      data: {
        familyId: family.id, title: 'Sortir les poubelles', reward: 1, assigneeId: hugo.id,
        frequency: 'WEEKLY', weekday: 1, lastGeneratedDate: today,
      },
    });

    await tx.expenseRequest.createMany({
      data: [
        { childId: lea.id, title: 'Roman graphique', description: 'Le tome 3 de ma série', amount: 12.9, expenseType: 'ONLINE', status: 'PENDING' },
        { childId: hugo.id, title: 'Cartes à collectionner', amount: 6, expenseType: 'CASH', status: 'APPROVED', approvedAmount: 6, parentNote: 'Ok, mais une seule pochette' },
      ],
    });

    await tx.transaction.createMany({
      data: [
        { childId: lea.id, amount: 10, type: 'ALLOWANCE', description: 'Argent de poche', date: daysFromNow(-10) },
        { childId: lea.id, amount: 6, type: 'CHORE', description: 'Laver la voiture', date: daysFromNow(-8) },
        { childId: lea.id, amount: -5, type: 'GOAL_FUNDING', description: 'Objectif : Vélo', date: daysFromNow(-6) },
        { childId: lea.id, amount: 10, type: 'ALLOWANCE', description: 'Argent de poche', date: daysFromNow(-3) },
        { childId: lea.id, amount: 3, type: 'CHORE', description: 'Faire la vaisselle', date: daysFromNow(-1) },
        { childId: hugo.id, amount: 5, type: 'ALLOWANCE', description: 'Argent de poche', date: daysFromNow(-10) },
        { childId: hugo.id, amount: -6, type: 'EXPENSE_APPROVED', description: 'Cartes à collectionner', date: daysFromNow(-7) },
        { childId: hugo.id, amount: -2, type: 'PENALTY', description: 'Téléphone à table', date: daysFromNow(-5) },
        { childId: hugo.id, amount: 5, type: 'ALLOWANCE', description: 'Argent de poche', date: daysFromNow(-3) },
        { childId: hugo.id, amount: 2, type: 'CHORE', description: 'Ranger sa chambre', date: daysFromNow(-2) },
      ],
    });

    await tx.goal.create({
      data: {
        familyId: family.id, title: 'Vélo', target: 120, current: 45, icon: '🚲',
        participants: { create: [{ childId: lea.id, contributedAmount: 45 }] },
      },
    });
    await tx.goal.create({
      data: {
        familyId: family.id, title: 'Sortie au parc d’attractions', target: 80, current: 28, icon: '🎢', isShared: true,
        participants: { create: [{ childId: lea.id, contributedAmount: 18 }, { childId: hugo.id, contributedAmount: 10 }] },
      },
    });

    return { family, parent, children: [lea, hugo] };
  });
};
