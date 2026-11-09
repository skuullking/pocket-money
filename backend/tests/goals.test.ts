import { describe, expect, it } from 'vitest';
import {
  as,
  balanceOf,
  createFamily,
  createGoal,
  getGoal,
  getParticipant,
  transactionsOf,
  useCleanDatabase,
} from './support/helpers';

useCleanDatabase();

const siblings = [
  { name: 'Alice', balance: 20 },
  { name: 'Bob', balance: 20 },
];

describe("financement d'objectif", () => {
  it("déplace l'argent du solde vers l'objectif et trace la transaction", async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id }]);

    const res = await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 7.5 }).expect(200);

    expect(res.body.balance).toBe(12.5);
    expect(res.body.goal.current).toBe(7.5);
    expect(await balanceOf(child.id)).toBe(12.5);
    expect((await getParticipant(goal.id, child.id))?.contributedAmount).toBe(7.5);
    expect((await transactionsOf(child.id))[0]).toMatchObject({ amount: -7.5, type: 'GOAL_FUNDING' });
  });

  it('accepte de verser exactement tout le solde', async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id }]);
    const res = await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 20 }).expect(200);
    expect(res.body.balance).toBe(0);
  });

  it('refuse un montant supérieur au solde', async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id }]);
    const res = await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 20.01 }).expect(400);
    expect(res.body.error).toBe('Solde insuffisant');
    expect(await balanceOf(child.id)).toBe(20);
    expect((await getGoal(goal.id)).current).toBe(0);
  });

  it.each([[0], [-5], ['-5'], ['abc'], [''], [null], [1.005], [true]])(
    'refuse le montant %j (MONEY-3)',
    async amount => {
      const { family, child } = await createFamily();
      const goal = await createGoal(family.id, [{ childId: child.id }]);
      await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount }).expect(400);
      expect(await balanceOf(child.id)).toBe(20);
      expect(await transactionsOf(child.id)).toHaveLength(0);
    },
  );

  it('est réservé aux enfants', async () => {
    const { family, parent, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id }]);
    await as(parent).post(`/api/goals/${goal.id}/fund`).send({ amount: 1 }).expect(403);
  });

  it("refuse l'objectif d'une autre famille", async () => {
    const { child } = await createFamily();
    const other = await createFamily('Martin');
    const goal = await createGoal(other.family.id, [{ childId: other.child.id }], { isShared: true });
    await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 1 }).expect(404);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it("refuse l'objectif personnel d'un frère ou d'une sœur (MONEY-2)", async () => {
    const {
      family,
      children: [alice, bob],
    } = await createFamily('Dupont', siblings);
    const goal = await createGoal(family.id, [{ childId: alice.id }]);
    await as(bob).post(`/api/goals/${goal.id}/fund`).send({ amount: 1 }).expect(403);
    expect(await balanceOf(bob.id)).toBe(20);
  });

  it('inscrit comme participant un enfant qui finance un objectif partagé', async () => {
    const {
      family,
      children: [alice, bob],
    } = await createFamily('Dupont', siblings);
    const goal = await createGoal(family.id, [{ childId: alice.id }], { isShared: true });
    await as(bob).post(`/api/goals/${goal.id}/fund`).send({ amount: 3 }).expect(200);
    expect((await getParticipant(goal.id, bob.id))?.contributedAmount).toBe(3);
  });

  it('additionne les versements successifs', async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id }]);
    await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 3 }).expect(200);
    await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 2 }).expect(200);
    expect((await getGoal(goal.id)).current).toBe(5);
    expect((await getParticipant(goal.id, child.id))?.contributedAmount).toBe(5);
  });

  it("MONEY-7 : un objectif déjà acheté ne peut plus recevoir d'argent", async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 100 }], { status: 'COMPLETED' });

    await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 5 }).expect(400);

    expect(await balanceOf(child.id)).toBe(20);
  });
});

describe("retrait d'objectif", () => {
  it("rend l'argent au solde et trace la transaction", async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 10 }]);

    const res = await as(child).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 4 }).expect(200);

    expect(res.body.balance).toBe(24);
    expect(res.body.goal.current).toBe(6);
    expect((await getParticipant(goal.id, child.id))?.contributedAmount).toBe(6);
    expect((await transactionsOf(child.id))[0]).toMatchObject({ amount: 4, type: 'GOAL_WITHDRAWAL' });
  });

  it('ramène le solde à sa valeur de départ après épargne puis retrait', async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id }]);
    await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 5 }).expect(200);
    await as(child).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 5 }).expect(200);
    expect(await balanceOf(child.id)).toBe(20);
    expect((await getGoal(goal.id)).current).toBe(0);
  });

  it("plafonne au montant épargné par l'enfant", async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 10 }]);
    const res = await as(child).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 500 }).expect(200);
    expect(res.body.balance).toBe(30);
    expect(res.body.goal.current).toBe(0);
  });

  it("ne permet pas de prendre la part d'un autre enfant", async () => {
    const {
      family,
      children: [alice, bob],
    } = await createFamily('Dupont', siblings);
    const goal = await createGoal(
      family.id,
      [
        { childId: alice.id, contributedAmount: 2 },
        { childId: bob.id, contributedAmount: 30 },
      ],
      { isShared: true },
    );

    const res = await as(alice).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 32 }).expect(200);

    expect(res.body.balance).toBe(22);
    expect((await getGoal(goal.id)).current).toBe(30);
    expect((await getParticipant(goal.id, bob.id))?.contributedAmount).toBe(30);
  });

  it("plafonne au contenu réel de l'objectif", async () => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 10 }], { current: 3 });
    const res = await as(child).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 10 }).expect(200);
    expect(res.body.balance).toBe(23);
    expect(res.body.goal.current).toBe(0);
  });

  it('refuse le retrait sans participation ou sans épargne', async () => {
    const {
      family,
      children: [alice, bob],
    } = await createFamily('Dupont', siblings);
    const goal = await createGoal(family.id, [{ childId: alice.id, contributedAmount: 0 }], { isShared: true });
    await as(bob).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 1 }).expect(403);
    await as(alice).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 1 }).expect(400);
  });

  it.each([[0], [-5], ['abc']])('refuse le montant %j', async amount => {
    const { family, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 10 }]);
    await as(child).post(`/api/goals/${goal.id}/withdraw`).send({ amount }).expect(400);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('est réservé aux enfants de la famille', async () => {
    const { family, parent, child } = await createFamily();
    const other = await createFamily('Martin');
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 10 }]);
    await as(parent).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 1 }).expect(403);
    await as(other.child).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 1 }).expect(404);
  });

  it("MONEY-7 : l'argent d'un objectif acheté ne peut plus être retiré", async () => {
    const { family, parent, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 100 }]);
    await as(parent).put(`/api/goals/${goal.id}/buy`).expect(200);

    await as(child).post(`/api/goals/${goal.id}/withdraw`).send({ amount: 100 }).expect(400);

    expect(await balanceOf(child.id)).toBe(20);
  });
});

describe("achat d'objectif", () => {
  it('termine un objectif atteint', async () => {
    const { family, parent, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 100 }]);
    const res = await as(parent).put(`/api/goals/${goal.id}/buy`).expect(200);
    expect(res.body.goal.status).toBe('COMPLETED');
  });

  it('refuse un objectif non atteint', async () => {
    const { family, parent, child } = await createFamily();
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 99.99 }]);
    await as(parent).put(`/api/goals/${goal.id}/buy`).expect(400);
    expect((await getGoal(goal.id)).status).toBe('IN_PROGRESS');
  });

  it('est réservé aux parents de la famille', async () => {
    const { family, child } = await createFamily();
    const other = await createFamily('Martin');
    const goal = await createGoal(family.id, [{ childId: child.id, contributedAmount: 100 }]);
    await as(child).put(`/api/goals/${goal.id}/buy`).expect(403);
    await as(other.parent).put(`/api/goals/${goal.id}/buy`).expect(404);
  });
});

describe('visibilité et création des objectifs', () => {
  it('cache à un enfant les objectifs personnels des autres (MONEY-2)', async () => {
    const {
      family,
      children: [alice, bob],
    } = await createFamily('Dupont', siblings);
    await createGoal(family.id, [{ childId: alice.id }], { title: 'Vélo Alice' });
    await createGoal(family.id, [{ childId: alice.id }], { title: 'Vacances', isShared: true });
    const res = await as(bob).get('/api/goals').expect(200);
    expect(res.body.goals.map((g: { title: string }) => g.title)).toEqual(['Vacances']);
  });

  it('montre tous les objectifs de la famille au parent, et seulement ceux-là', async () => {
    const { family, parent, child } = await createFamily();
    const other = await createFamily('Martin');
    await createGoal(family.id, [{ childId: child.id }]);
    await createGoal(other.family.id, [{ childId: other.child.id }]);
    const res = await as(parent).get('/api/goals').expect(200);
    expect(res.body.goals).toHaveLength(1);
  });

  it('crée un objectif et y inscrit son créateur', async () => {
    const { child } = await createFamily();
    const res = await as(child).post('/api/goals').send({ title: 'Console', target: 300, icon: '🎮' }).expect(201);
    expect(res.body.goal).toMatchObject({ current: 0, isShared: false, status: 'IN_PROGRESS' });
    expect(await getParticipant(res.body.goal.id, child.id)).not.toBeNull();
  });

  it.each([[0], [-1], ['abc']])('refuse la cible %j', async target => {
    const { child } = await createFamily();
    await as(child).post('/api/goals').send({ title: 'Console', target, icon: '🎮' }).expect(400);
  });
});
