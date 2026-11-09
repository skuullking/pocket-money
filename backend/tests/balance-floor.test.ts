import { describe, expect, it } from 'vitest';
import {
  as,
  balanceOf,
  createExpense,
  createFamily,
  createRule,
  prisma,
  transactionsOf,
  useCleanDatabase,
} from './support/helpers';

useCleanDatabase();

describe('plancher du solde à 0 — sanctions', () => {
  it('débite le montant complet quand le solde suffit', async () => {
    const { parent, child, family } = await createFamily();
    const rule = await createRule(family.id, 5);

    const res = await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(200);

    expect(res.body).toMatchObject({ balance: 15, capped: false });
    expect(await balanceOf(child.id)).toBe(15);
    expect((await transactionsOf(child.id))[0]).toMatchObject({ amount: -5, type: 'PENALTY' });
  });

  it('plafonne à 0 et enregistre le montant réellement déduit', async () => {
    const { parent, child, family } = await createFamily('Dupont', [{ name: 'Alice', balance: 3.5 }]);
    const rule = await createRule(family.id, 999);

    const res = await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(200);

    expect(res.body).toMatchObject({ balance: 0, capped: true });
    expect(await balanceOf(child.id)).toBe(0);
    expect((await transactionsOf(child.id))[0].amount).toBe(-3.5);
  });

  it('ne plafonne pas quand le montant égale exactement le solde', async () => {
    const { parent, child, family } = await createFamily('Dupont', [{ name: 'Alice', balance: 5 }]);
    const rule = await createRule(family.id, 5);
    const res = await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(200);
    expect(res.body).toMatchObject({ balance: 0, capped: false });
  });

  it('reste à 0 sur un solde déjà vide', async () => {
    const { parent, child, family } = await createFamily('Dupont', [{ name: 'Alice', balance: 0 }]);
    const rule = await createRule(family.id, 10);
    const res = await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(200);
    expect(res.body).toMatchObject({ balance: 0, capped: true });
    expect(await balanceOf(child.id)).toBe(0);
  });

  it('ne descend jamais sous 0 après une série de sanctions', async () => {
    const { parent, child, family } = await createFamily('Dupont', [{ name: 'Alice', balance: 7 }]);
    const rule = await createRule(family.id, 3);
    for (let i = 0; i < 4; i += 1) {
      await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(200);
    }
    expect(await balanceOf(child.id)).toBe(0);
    const total = (await transactionsOf(child.id)).reduce((sum, t) => sum + t.amount, 0);
    expect(total).toBe(-7);
  });

  it('est réservé aux parents', async () => {
    const { child, family } = await createFamily();
    const rule = await createRule(family.id, 5);
    await as(child).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(403);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('renvoie 404 pour une règle inconnue et 400 sans enfant', async () => {
    const { parent, child, family } = await createFamily();
    const rule = await createRule(family.id, 5);
    await as(parent).post('/api/rules/inconnue/apply').send({ childId: child.id }).expect(404);
    await as(parent).post(`/api/rules/${rule.id}/apply`).send({}).expect(400);
  });

  it("ne garde aucune trace si l'enfant n'existe pas", async () => {
    const { parent, family } = await createFamily();
    const rule = await createRule(family.id, 5);
    await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: 'inconnu' }).expect(404);
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("MONEY-5 : un parent ne peut pas sanctionner l'enfant d'une autre famille", async () => {
    const { family: attackerFamily, parent: attacker } = await createFamily('Martin');
    const { child: victim } = await createFamily();
    const rule = await createRule(attackerFamily.id, 15);

    await as(attacker).post(`/api/rules/${rule.id}/apply`).send({ childId: victim.id }).expect(404);

    expect(await balanceOf(victim.id)).toBe(20);
  });

  it("MONEY-5 : un parent ne peut pas utiliser la règle d'une autre famille", async () => {
    const { parent, child } = await createFamily();
    const other = await createFamily('Martin');
    const foreignRule = await createRule(other.family.id, 5);

    await as(parent).post(`/api/rules/${foreignRule.id}/apply`).send({ childId: child.id }).expect(404);

    expect(await balanceOf(child.id)).toBe(20);
  });

  it("MONEY-9 : une règle désactivée ne s'applique plus", async () => {
    const { parent, child, family } = await createFamily();
    const rule = await createRule(family.id, 5, { active: false });

    await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(400);

    expect(await balanceOf(child.id)).toBe(20);
  });
});

describe('plancher du solde à 0 — déduction directe', () => {
  it('débite le montant demandé', async () => {
    const { parent, child } = await createFamily();
    const res = await as(parent)
      .post('/api/expenses/deduct')
      .send({ childId: child.id, amount: 4.25, description: 'Cinéma' })
      .expect(200);
    expect(res.body).toMatchObject({ balance: 15.75, capped: false });
    expect((await transactionsOf(child.id))[0]).toMatchObject({
      amount: -4.25,
      type: 'EXPENSE_DEDUCTION',
      description: 'Cinéma',
    });
  });

  it('plafonne à 0', async () => {
    const { parent, child } = await createFamily();
    const res = await as(parent).post('/api/expenses/deduct').send({ childId: child.id, amount: 100 }).expect(200);
    expect(res.body).toMatchObject({ balance: 0, capped: true });
    expect((await transactionsOf(child.id))[0].amount).toBe(-20);
  });

  it.each([[0], [-5], ['abc'], [1.999]])('refuse le montant %j', async amount => {
    const { parent, child } = await createFamily();
    await as(parent).post('/api/expenses/deduct').send({ childId: child.id, amount }).expect(400);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('est réservée aux parents', async () => {
    const { child } = await createFamily();
    await as(child).post('/api/expenses/deduct').send({ childId: child.id, amount: 1 }).expect(403);
  });

  it("MONEY-5 : un parent ne peut pas débiter l'enfant d'une autre famille", async () => {
    const { parent: attacker } = await createFamily('Martin');
    const { child: victim } = await createFamily();

    await as(attacker).post('/api/expenses/deduct').send({ childId: victim.id, amount: 20 }).expect(404);

    expect(await balanceOf(victim.id)).toBe(20);
  });
});

describe('plancher du solde à 0 — dépenses approuvées', () => {
  it('débite le montant de la demande', async () => {
    const { parent, child } = await createFamily();
    const expense = await createExpense(child.id, 6);

    const res = await as(parent).put(`/api/expenses/${expense.id}/approve`).send({ parentNote: 'OK' }).expect(200);

    expect(res.body).toMatchObject({ balance: 14, capped: false });
    expect(res.body.expense).toMatchObject({ status: 'APPROVED', approvedAmount: 6, parentNote: 'OK' });
    expect((await transactionsOf(child.id))[0]).toMatchObject({
      amount: -6,
      type: 'EXPENSE_APPROVED',
      expenseId: expense.id,
    });
  });

  it('accepte un montant ajusté par le parent', async () => {
    const { parent, child } = await createFamily();
    const expense = await createExpense(child.id, 10);
    const res = await as(parent)
      .put(`/api/expenses/${expense.id}/approve`)
      .send({ approvedAmount: '4.50' })
      .expect(200);
    expect(res.body.expense.approvedAmount).toBe(4.5);
    expect(await balanceOf(child.id)).toBe(15.5);
  });

  it('plafonne à 0 et enregistre le montant réellement approuvé', async () => {
    const { parent, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 2 }]);
    const expense = await createExpense(child.id, 50);
    const res = await as(parent).put(`/api/expenses/${expense.id}/approve`).send({}).expect(200);
    expect(res.body).toMatchObject({ balance: 0, capped: true });
    expect(res.body.expense.approvedAmount).toBe(2);
  });

  it('refuse un montant négatif ou nul', async () => {
    const { parent, child } = await createFamily();
    const expense = await createExpense(child.id, 5);
    await as(parent).put(`/api/expenses/${expense.id}/approve`).send({ approvedAmount: -5 }).expect(400);
    await as(parent).put(`/api/expenses/${expense.id}/approve`).send({ approvedAmount: 0 }).expect(400);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('est réservée aux parents', async () => {
    const { child } = await createFamily();
    const expense = await createExpense(child.id, 5);
    await as(child).put(`/api/expenses/${expense.id}/approve`).send({}).expect(403);
    await as(child).put(`/api/expenses/${expense.id}/reject`).send({}).expect(403);
  });

  it('renvoie 404 pour une demande inconnue', async () => {
    const { parent } = await createFamily();
    await as(parent).put('/api/expenses/inconnue/approve').send({}).expect(404);
  });

  it('un refus ne bouge pas le solde', async () => {
    const { parent, child } = await createFamily();
    const expense = await createExpense(child.id, 5);
    const res = await as(parent).put(`/api/expenses/${expense.id}/reject`).send({ parentNote: 'Non' }).expect(200);
    expect(res.body.expense).toMatchObject({ status: 'REJECTED', parentNote: 'Non' });
    expect(await balanceOf(child.id)).toBe(20);
  });

  it("MONEY-6 : une dépense déjà approuvée n'est pas débitée deux fois", async () => {
    const { parent, child } = await createFamily();
    const expense = await createExpense(child.id, 5);

    await as(parent).put(`/api/expenses/${expense.id}/approve`).send({}).expect(200);
    await as(parent).put(`/api/expenses/${expense.id}/approve`).send({}).expect(409);

    expect(await balanceOf(child.id)).toBe(15);
  });

  it('MONEY-6 : une dépense refusée ne peut plus être approuvée', async () => {
    const { parent, child } = await createFamily();
    const expense = await createExpense(child.id, 5, { status: 'REJECTED' });

    await as(parent).put(`/api/expenses/${expense.id}/approve`).send({}).expect(409);

    expect(await balanceOf(child.id)).toBe(20);
  });

  it('MONEY-6 : une dépense approuvée ne peut plus être refusée', async () => {
    const { parent, child } = await createFamily();
    const expense = await createExpense(child.id, 5, { status: 'APPROVED', approvedAmount: 5 });

    await as(parent).put(`/api/expenses/${expense.id}/reject`).send({}).expect(409);

    expect((await prisma.expenseRequest.findUniqueOrThrow({ where: { id: expense.id } })).status).toBe('APPROVED');
  });

  it("MONEY-5 : un parent ne peut pas approuver la dépense d'une autre famille", async () => {
    const { parent: attacker } = await createFamily('Martin');
    const { child: victim } = await createFamily();
    const expense = await createExpense(victim.id, 20);

    await as(attacker).put(`/api/expenses/${expense.id}/approve`).send({}).expect(404);

    expect(await balanceOf(victim.id)).toBe(20);
  });

  it("MONEY-5 : un parent ne peut pas refuser la dépense d'une autre famille", async () => {
    const { parent: attacker } = await createFamily('Martin');
    const { child: victim } = await createFamily();
    const expense = await createExpense(victim.id, 20);

    await as(attacker).put(`/api/expenses/${expense.id}/reject`).send({}).expect(404);

    expect((await prisma.expenseRequest.findUniqueOrThrow({ where: { id: expense.id } })).status).toBe('PENDING');
  });
});
