import { describe, expect, it } from 'vitest';
import {
  as,
  balanceOf,
  createChore,
  createExpense,
  createFamily,
  createGoal,
  createRule,
  getGoal,
  getParticipant,
  transactionsOf,
  useCleanDatabase,
} from './support/helpers';

useCleanDatabase();

const CONCURRENT = 10;
const inParallel = <T>(send: () => PromiseLike<T>) => Promise.all(Array.from({ length: CONCURRENT }, send));

describe("flux d'argent sous requêtes simultanées", () => {
  it('MONEY-8 : financer en parallèle ne fait jamais passer le solde sous 0', async () => {
    const { family, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 10 }]);
    const goal = await createGoal(family.id, [{ childId: child.id }]);
    // Ouvre les connexions du pool : à froid, les requêtes s'exécutent l'une après l'autre.
    await inParallel(() => as(child).get('/api/goals'));

    await inParallel(() => as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 10 }));

    expect(await balanceOf(child.id)).toBe(0);
    expect((await getGoal(goal.id)).current).toBe(10);
  });

  it('MONEY-8 : retirer en parallèle ne rend pas plus que le montant épargné', async () => {
    const { family, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 0 }]);
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 10 }]);

    await inParallel(() => as(child).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 10 }));

    expect(await balanceOf(child.id)).toBe(10);
    expect((await getParticipant(goal.id, child.id))?.contributedAmount).toBe(0);
  });

  it('MONEY-8 : des sanctions simultanées sont toutes débitées', async () => {
    const { family, parent, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 100 }]);
    const rule = await createRule(family.id, 1);

    await inParallel(() => as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }));

    expect(await balanceOf(child.id)).toBe(90);
    expect(await transactionsOf(child.id)).toHaveLength(10);
  });

  it("MONEY-6 : approuver en parallèle ne débite une dépense qu'une fois", async () => {
    const { parent, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 100 }]);
    const expense = await createExpense(child.id, 10);

    const results = await inParallel(() => as(parent).put(`/api/expenses/${expense.id}/approve`).send({}));

    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(results.filter(r => r.status === 409)).toHaveLength(9);
    expect(await transactionsOf(child.id)).toHaveLength(1);
    expect(await balanceOf(child.id)).toBe(90);
  });

  it("une déduction simultanée à un crédit ne l'efface pas", async () => {
    const { family, parent, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 100 }]);
    const rule = await createRule(family.id, 1);
    const chores = await Promise.all(Array.from({ length: CONCURRENT }, () => createChore(child.id, { reward: 2 })));

    await Promise.all([
      ...chores.map(chore => as(parent).patch(`/api/chores/${chore.id}/approve`)),
      ...chores.map(() => as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id })),
    ]);

    expect(await balanceOf(child.id)).toBe(110);
  });
});
