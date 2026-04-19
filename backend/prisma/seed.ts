import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data in dependency order
  await prisma.goalParticipant.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.expenseRequest.deleteMany();
  await prisma.chore.deleteMany();
  await prisma.childSettings.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.family.deleteMany();

  // Create family
  const family = await prisma.family.create({
    data: {
      id: 'family-dupont',
      name: 'Famille Dupont',
      inviteCode: 'DUPONT2024',
    },
  });

  console.log('Created family:', family.name);

  // Hash password for parent
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create parent
  const parent = await prisma.user.create({
    data: {
      id: 'user-sarah',
      familyId: family.id,
      role: 'PARENT',
      name: 'Sarah Dupont',
      email: 'sarah@dupont.fr',
      password: hashedPassword,
      avatar: '👩',
      color: '#2E75B6',
      balance: 0,
      monthDelta: 0,
    },
  });

  console.log('Created parent:', parent.name);

  const childPassword = await bcrypt.hash('password123', 10);

  // Create children
  const alice = await prisma.user.create({
    data: {
      id: 'user-alice',
      familyId: family.id,
      role: 'CHILD',
      name: 'Alice',
      password: childPassword,
      age: 12,
      avatar: '🌸',
      color: '#FF6B9D',
      balance: 45.50,
      monthDelta: 12.00,
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: 'user-bob',
      familyId: family.id,
      role: 'CHILD',
      name: 'Bob',
      password: childPassword,
      age: 9,
      avatar: '🚀',
      color: '#7B61FF',
      balance: 23.00,
      monthDelta: -5.00,
    },
  });

  const claire = await prisma.user.create({
    data: {
      id: 'user-claire',
      familyId: family.id,
      role: 'CHILD',
      name: 'Claire',
      password: childPassword,
      age: 7,
      avatar: '🦋',
      color: '#B9FF4B',
      balance: 15.75,
      monthDelta: 8.50,
    },
  });

  console.log('Created children: Alice, Bob, Claire');

  // Create ChildSettings for each child
  await prisma.childSettings.createMany({
    data: [
      {
        childId: alice.id,
        maxExpensePerRequest: 50.00,
        maxExpensePerWeek: 150.00,
        frozen: false,
      },
      {
        childId: bob.id,
        maxExpensePerRequest: 30.00,
        maxExpensePerWeek: 100.00,
        frozen: false,
      },
      {
        childId: claire.id,
        maxExpensePerRequest: 20.00,
        maxExpensePerWeek: 75.00,
        frozen: false,
      },
    ],
  });

  console.log('Created child settings');

  // Create rules
  await prisma.rule.createMany({
    data: [
      {
        id: 'rule-1',
        familyId: family.id,
        title: 'Téléphone à table',
        description: 'Utiliser le téléphone pendant les repas',
        amount: 2.00,
        active: true,
      },
      {
        id: 'rule-2',
        familyId: family.id,
        title: 'Couchage tardif',
        description: "Se coucher après l'heure autorisée",
        amount: 1.50,
        active: true,
      },
      {
        id: 'rule-3',
        familyId: family.id,
        title: 'Chambre non rangée',
        description: 'Ne pas ranger sa chambre après rappel',
        amount: 1.00,
        active: true,
      },
      {
        id: 'rule-4',
        familyId: family.id,
        title: 'Devoirs non faits',
        description: 'Ne pas faire ses devoirs à temps',
        amount: 3.00,
        active: false,
      },
    ],
  });

  console.log('Created rules');

  // Dates
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  // Create chores
  await prisma.chore.createMany({
    data: [
      {
        id: 'chore-1',
        title: 'Faire la vaisselle',
        description: 'Laver et ranger toute la vaisselle du soir',
        reward: 3.00,
        assigneeId: alice.id,
        deadline: tomorrow.toISOString().split('T')[0],
        status: 'PENDING',
      },
      {
        id: 'chore-2',
        title: "Passer l'aspirateur",
        description: "Passer l'aspirateur dans le salon et les chambres",
        reward: 5.00,
        assigneeId: alice.id,
        deadline: nextWeek.toISOString().split('T')[0],
        status: 'SUBMITTED',
        note: "J'ai tout passé, même sous les meubles !",
      },
      {
        id: 'chore-3',
        title: 'Sortir les poubelles',
        description: 'Sortir les poubelles le soir avant 20h',
        reward: 2.00,
        assigneeId: bob.id,
        deadline: tomorrow.toISOString().split('T')[0],
        status: 'PENDING',
      },
      {
        id: 'chore-4',
        title: 'Ranger sa chambre',
        description: 'Ranger et nettoyer sa chambre complètement',
        reward: 4.00,
        assigneeId: bob.id,
        deadline: yesterday.toISOString().split('T')[0],
        status: 'COMPLETED',
      },
      {
        id: 'chore-5',
        title: 'Arroser les plantes',
        description: 'Arroser toutes les plantes de la maison',
        reward: 1.50,
        assigneeId: claire.id,
        deadline: nextWeek.toISOString().split('T')[0],
        status: 'PENDING',
      },
      {
        id: 'chore-6',
        title: 'Mettre la table',
        description: 'Mettre la table pour le dîner chaque soir',
        reward: 1.00,
        assigneeId: claire.id,
        deadline: tomorrow.toISOString().split('T')[0],
        status: 'REJECTED',
        rejectionReason: 'Tu as oublié les couverts à dessert',
      },
      {
        id: 'chore-7',
        title: 'Tondre la pelouse',
        description: 'Tondre la pelouse du jardin',
        reward: 8.00,
        assigneeId: alice.id,
        deadline: nextWeek.toISOString().split('T')[0],
        status: 'PENDING',
      },
    ],
  });

  console.log('Created chores');

  // Transaction dates
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Create transactions
  await prisma.transaction.createMany({
    data: [
      // Alice
      {
        childId: alice.id,
        amount: 4.00,
        type: 'CHORE',
        description: 'Ranger sa chambre',
        date: twoWeeksAgo,
      },
      {
        childId: alice.id,
        amount: 10.00,
        type: 'ALLOWANCE',
        description: 'Argent de poche mensuel',
        date: oneWeekAgo,
      },
      {
        childId: alice.id,
        amount: -8.50,
        type: 'EXPENSE_APPROVED',
        description: 'Achat livre scolaire',
        date: threeDaysAgo,
      },
      // Bob
      {
        childId: bob.id,
        amount: 2.00,
        type: 'CHORE',
        description: 'Sortir les poubelles',
        date: twoWeeksAgo,
      },
      {
        childId: bob.id,
        amount: 8.00,
        type: 'ALLOWANCE',
        description: 'Argent de poche mensuel',
        date: oneWeekAgo,
      },
      {
        childId: bob.id,
        amount: -2.00,
        type: 'PENALTY',
        description: 'Téléphone à table - sanction',
        date: threeDaysAgo,
      },
      // Claire
      {
        childId: claire.id,
        amount: 1.50,
        type: 'CHORE',
        description: 'Arroser les plantes',
        date: twoWeeksAgo,
      },
      {
        childId: claire.id,
        amount: 6.00,
        type: 'ALLOWANCE',
        description: 'Argent de poche mensuel',
        date: oneWeekAgo,
      },
    ],
  });

  console.log('Created transactions');

  // Create expense requests
  await prisma.expenseRequest.createMany({
    data: [
      {
        id: 'expense-1',
        childId: alice.id,
        title: 'Livre Harry Potter',
        description: 'Tome 7 de la série',
        amount: 12.99,
        expenseType: 'ONLINE',
        reference: 'amazon.fr/dp/XXX',
        status: 'PENDING',
      },
      {
        id: 'expense-2',
        childId: alice.id,
        title: 'Fournitures scolaires',
        description: 'Cahiers et stylos pour la rentrée',
        amount: 8.50,
        expenseType: 'CASH',
        status: 'APPROVED',
        approvedAmount: 8.50,
        parentNote: 'Approuvé, bon courage pour la rentrée !',
      },
      {
        id: 'expense-3',
        childId: bob.id,
        title: 'Jeu de cartes Pokémon',
        description: 'Booster pack x3',
        amount: 15.00,
        expenseType: 'ONLINE',
        status: 'REJECTED',
        parentNote: "Tu en as déjà trop, économise plutôt !",
      },
      {
        id: 'expense-4',
        childId: claire.id,
        title: 'Peintures pour atelier',
        description: 'Nouvelles peintures acryliques',
        amount: 9.90,
        expenseType: 'CASH',
        status: 'PENDING',
      },
    ],
  });

  console.log('Created expense requests');

  // Create goals
  const vacationGoal = await prisma.goal.create({
    data: {
      id: 'goal-1',
      familyId: family.id,
      title: 'Vacances à la mer',
      target: 200.00,
      current: 67.50,
      icon: '🏖️',
      isShared: true,
      status: 'IN_PROGRESS',
    },
  });

  const bikeGoal = await prisma.goal.create({
    data: {
      id: 'goal-2',
      familyId: family.id,
      title: 'Nouveau vélo',
      target: 150.00,
      current: 45.00,
      icon: '🚲',
      isShared: false,
      status: 'IN_PROGRESS',
    },
  });

  const gameGoal = await prisma.goal.create({
    data: {
      id: 'goal-3',
      familyId: family.id,
      title: 'Console de jeux',
      target: 300.00,
      current: 300.00,
      icon: '🎮',
      isShared: true,
      status: 'COMPLETED',
    },
  });

  console.log('Created goals');

  // Create goal participants
  await prisma.goalParticipant.createMany({
    data: [
      { goalId: vacationGoal.id, childId: alice.id, contributedAmount: 30.00 },
      { goalId: vacationGoal.id, childId: bob.id, contributedAmount: 22.50 },
      { goalId: vacationGoal.id, childId: claire.id, contributedAmount: 15.00 },
      { goalId: bikeGoal.id, childId: alice.id, contributedAmount: 45.00 },
      { goalId: gameGoal.id, childId: bob.id, contributedAmount: 180.00 },
      { goalId: gameGoal.id, childId: claire.id, contributedAmount: 120.00 },
    ],
  });

  console.log('Created goal participants');
  console.log('\nSeeding complete!');
  console.log('\nLogin credentials:');
  console.log('  Parent: sarah@dupont.fr / password123');
  console.log('  Child Alice ID: user-alice');
  console.log('  Child Bob ID: user-bob');
  console.log('  Child Claire ID: user-claire');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
