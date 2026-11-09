import { afterEach, describe, expect, it, vi } from 'vitest';
import { as, createExpense, createFamily, daysAgo, prisma, setSettings, useCleanDatabase } from './support/helpers';

useCleanDatabase();

const request = (amount: number | string, overrides = {}) => ({
  title: 'Livre',
  amount,
  expenseType: 'CASH',
  ...overrides,
});

const spend = (childId: string, amount: number, type = 'EXPENSE_APPROVED', date = new Date()) =>
  prisma.transaction.create({ data: { childId, amount: -amount, type, description: 'Achat', date } });

describe('demande de dépense', () => {
  it('crée une demande en attente sans bouger le solde', async () => {
    const { child } = await createFamily();
    const res = await as(child)
      .post('/api/expenses/request')
      .send(request(8.5, { reference: 'amazon.fr' }))
      .expect(201);
    expect(res.body.expense).toMatchObject({ status: 'PENDING', amount: 8.5, childId: child.id });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: child.id } })).balance).toBe(20);
  });

  it('est réservée aux enfants', async () => {
    const { parent } = await createFamily();
    await as(parent).post('/api/expenses/request').send(request(5)).expect(403);
  });

  it.each([[0], [-1], ['abc'], [2.345]])('refuse le montant %j', async amount => {
    const { child } = await createFamily();
    await as(child).post('/api/expenses/request').send(request(amount)).expect(400);
  });

  it('refuse un type inconnu', async () => {
    const { child } = await createFamily();
    await as(child)
      .post('/api/expenses/request')
      .send(request(5, { expenseType: 'CRYPTO' }))
      .expect(400);
  });

  it("isole les demandes : l'enfant voit les siennes, le parent celles de sa famille", async () => {
    const {
      parent,
      children: [alice, bob],
    } = await createFamily('Dupont', [{ name: 'Alice' }, { name: 'Bob' }]);
    const other = await createFamily('Martin');
    await createExpense(alice.id);
    await createExpense(bob.id);
    await createExpense(other.child.id);
    expect((await as(alice).get('/api/expenses').expect(200)).body.expenses).toHaveLength(1);
    expect((await as(parent).get('/api/expenses').expect(200)).body.expenses).toHaveLength(2);
  });
});

describe('gel du compte et plafond par demande', () => {
  it('refuse toute demande sur un compte gelé', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { frozen: true });
    await as(child).post('/api/expenses/request').send(request(1)).expect(403);
    expect(await prisma.expenseRequest.count()).toBe(0);
  });

  it('accepte exactement le plafond et refuse au-delà', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerRequest: 10 });
    await as(child).post('/api/expenses/request').send(request(10)).expect(201);
    await as(child).post('/api/expenses/request').send(request(10.01)).expect(400);
  });

  it("n'applique aucune limite sans réglages", async () => {
    const { child } = await createFamily();
    await as(child).post('/api/expenses/request').send(request(100_000)).expect(201);
  });
});

describe('limite hebdomadaire', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepte une demande qui atteint exactement la limite', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 20 });
    await spend(child.id, 15);
    await as(child).post('/api/expenses/request').send(request(5)).expect(201);
  });

  it('refuse une demande qui dépasse la limite', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 20 });
    await spend(child.id, 15);
    const res = await as(child).post('/api/expenses/request').send(request(5.01)).expect(400);
    expect(res.body.error).toContain('limite hebdomadaire');
  });

  it('compte aussi les déductions faites par le parent', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 20 });
    await spend(child.id, 20, 'EXPENSE_DEDUCTION');
    await as(child).post('/api/expenses/request').send(request(0.01)).expect(400);
  });

  it.each(['PENALTY', 'GOAL_FUNDING'])('ne compte pas les transactions %s', async type => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 20 });
    await spend(child.id, 20, type);
    await as(child).post('/api/expenses/request').send(request(20)).expect(201);
  });

  it('ne compte pas les dépenses antérieures à la semaine', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 20 });
    await spend(child.id, 20, 'EXPENSE_APPROVED', daysAgo(8));
    await as(child).post('/api/expenses/request').send(request(20)).expect(201);
  });

  it("ne compte pas les dépenses d'un autre enfant", async () => {
    const {
      children: [alice, bob],
    } = await createFamily('Dupont', [{ name: 'Alice' }, { name: 'Bob' }]);
    await setSettings(alice.id, { maxExpensePerWeek: 20 });
    await spend(bob.id, 20);
    await as(alice).post('/api/expenses/request').send(request(20)).expect(201);
  });

  it('commence le dimanche à minuit, heure du serveur', async () => {
    // Mercredi 11 novembre 2026 : la semaine en cours a débuté le dimanche 8.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 11, 12) });
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 20 });

    await spend(child.id, 20, 'EXPENSE_APPROVED', new Date(2026, 10, 7, 23, 59));
    await as(child).post('/api/expenses/request').send(request(20)).expect(201);
    await prisma.expenseRequest.deleteMany();

    await spend(child.id, 1, 'EXPENSE_APPROVED', new Date(2026, 10, 8, 0, 0));
    await as(child).post('/api/expenses/request').send(request(20)).expect(400);
  });

  it("cumule les dépenses approuvées via l'API avec la limite", async () => {
    const { parent, child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 10 });
    const expense = await as(child).post('/api/expenses/request').send(request(8)).expect(201);
    await as(parent).put(`/api/expenses/${expense.body.expense.id}/approve`).send({}).expect(200);
    await as(child).post('/api/expenses/request').send(request(2.01)).expect(400);
    await as(child).post('/api/expenses/request').send(request(2)).expect(201);
  });

  it('MONEY-10 : plusieurs demandes en attente ne contournent pas la limite', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 10 });

    await as(child).post('/api/expenses/request').send(request(10));
    const second = await as(child).post('/api/expenses/request').send(request(10));

    expect(second.status).toBe(400);
  });
});

describe('limite hebdomadaire et demandes en attente', () => {
  it('une demande refusée libère la limite', async () => {
    const { parent, child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 10 });
    const first = await as(child).post('/api/expenses/request').send(request(10)).expect(201);
    await as(parent).put(`/api/expenses/${first.body.expense.id}/reject`).send({}).expect(200);
    await as(child).post('/api/expenses/request').send(request(10)).expect(201);
  });

  it('additionne dépenses approuvées et demandes en attente', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 20 });
    await spend(child.id, 10);
    await createExpense(child.id, 5);
    await as(child).post('/api/expenses/request').send(request(5.01)).expect(400);
    await as(child).post('/api/expenses/request').send(request(5)).expect(201);
  });

  it('une demande approuvée ne compte pas deux fois', async () => {
    const { parent, child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 10 });
    const first = await as(child).post('/api/expenses/request').send(request(6)).expect(201);
    await as(parent).put(`/api/expenses/${first.body.expense.id}/approve`).send({}).expect(200);
    await as(child).post('/api/expenses/request').send(request(4)).expect(201);
  });

  it('des demandes simultanées ne dépassent pas la limite', async () => {
    const { child } = await createFamily();
    await setSettings(child.id, { maxExpensePerWeek: 10 });
    const results = await Promise.all(
      Array.from({ length: 8 }, () => as(child).post('/api/expenses/request').send(request(10))),
    );
    expect(results.filter(r => r.status === 201)).toHaveLength(1);
    expect(await prisma.expenseRequest.count()).toBe(1);
  });

  it("les demandes en attente d'un autre enfant ne comptent pas", async () => {
    const {
      children: [alice, bob],
    } = await createFamily('Dupont', [{ name: 'Alice' }, { name: 'Bob' }]);
    await setSettings(alice.id, { maxExpensePerWeek: 10 });
    await createExpense(bob.id, 10);
    await as(alice).post('/api/expenses/request').send(request(10)).expect(201);
  });
});

describe("réglages de l'enfant", () => {
  it('enregistre les limites et le gel', async () => {
    const { parent, child } = await createFamily();
    const res = await as(parent)
      .put(`/api/children/${child.id}/settings`)
      .send({ maxExpensePerRequest: '15', maxExpensePerWeek: 40, frozen: true })
      .expect(200);
    expect(res.body.settings).toMatchObject({ maxExpensePerRequest: 15, maxExpensePerWeek: 40, frozen: true });
  });

  it('un champ vidé supprime la limite', async () => {
    const { parent, child } = await createFamily();
    await setSettings(child.id, { maxExpensePerRequest: 10 });
    const res = await as(parent)
      .put(`/api/children/${child.id}/settings`)
      .send({ maxExpensePerRequest: '' })
      .expect(200);
    expect(res.body.settings.maxExpensePerRequest).toBeNull();
  });

  it('crée des réglages par défaut à la lecture', async () => {
    const { parent, child } = await createFamily();
    const res = await as(parent).get(`/api/children/${child.id}/settings`).expect(200);
    expect(res.body.settings).toMatchObject({ frozen: false, splitEnabled: false, splitSpendPct: 100 });
  });

  it('est réservé aux parents de la famille', async () => {
    const { child } = await createFamily();
    const other = await createFamily('Martin');
    await as(child).put(`/api/children/${child.id}/settings`).send({ frozen: false }).expect(403);
    await as(other.parent).put(`/api/children/${child.id}/settings`).send({ frozen: true }).expect(404);
    await as(other.parent).get(`/api/children/${child.id}/settings`).expect(404);
  });

  it('refuse une limite négative', async () => {
    const { parent, child } = await createFamily();
    await as(parent).put(`/api/children/${child.id}/settings`).send({ maxExpensePerWeek: -1 }).expect(400);
  });
});
