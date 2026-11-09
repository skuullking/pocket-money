import { describe, expect, it } from 'vitest';
import {
  as,
  balanceOf,
  createChore,
  createFamily,
  daysAgo,
  getUser,
  prisma,
  setSettings,
  transactionsOf,
  useCleanDatabase,
} from './support/helpers';

useCleanDatabase();

const split = (save: number, spend: number, give: number, enabled = true) => ({
  splitEnabled: enabled,
  splitSavePct: save,
  splitSpendPct: spend,
  splitGivePct: give,
});

const approveReward = async (reward: number, percents: ReturnType<typeof split>) => {
  const { parent, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 0 }]);
  await setSettings(child.id, percents);
  const chore = await createChore(child.id, { reward });
  await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);
  return getUser(child.id);
};

describe('répartition épargne / dépense / don', () => {
  it('répartit selon les pourcentages', async () => {
    expect(await approveReward(20, split(50, 25, 25))).toMatchObject({
      balance: 20,
      saveBalance: 10,
      spendBalance: 5,
      giveBalance: 5,
    });
  });

  it('met tout en dépense quand elle est désactivée, même avec des pourcentages', async () => {
    expect(await approveReward(20, split(50, 25, 25, false))).toMatchObject({
      balance: 20,
      saveBalance: 0,
      spendBalance: 20,
      giveBalance: 0,
    });
  });

  it("absorbe le reste d'arrondi dans la dépense", async () => {
    expect(await approveReward(10, split(33.33, 33.34, 33.33))).toMatchObject({
      saveBalance: 3.33,
      giveBalance: 3.33,
      spendBalance: 3.34,
    });
  });

  it.each([
    [0.01, 33.33, 33.34, 33.33],
    [0.03, 50, 25, 25],
    [1.99, 12.5, 75, 12.5],
    [7.77, 10, 60, 30],
    [99.99, 33.33, 33.34, 33.33],
    [1234.56, 1, 98, 1],
  ])('conserve chaque centime sur %f € (%f/%f/%f)', async (reward, save, spend, give) => {
    const user = await approveReward(reward, split(save, spend, give));
    expect(user.balance).toBe(reward);
    expect(user.spendBalance).toBeGreaterThanOrEqual(0);
    expect(user.saveBalance + user.spendBalance + user.giveBalance).toBeCloseTo(reward, 2);
  });

  it("ne touche pas les compartiments lors d'une déduction : balance reste la seule cagnotte", async () => {
    const { parent, child } = await createFamily('Dupont', [{ name: 'Alice', balance: 0 }]);
    await setSettings(child.id, split(50, 50, 0));
    const chore = await createChore(child.id, { reward: 10 });
    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);

    await as(parent).post('/api/expenses/deduct').send({ childId: child.id, amount: 4 }).expect(200);

    expect(await getUser(child.id)).toMatchObject({ balance: 6, saveBalance: 5, spendBalance: 5 });
  });

  describe('réglage', () => {
    it('enregistre des pourcentages totalisant 100', async () => {
      const { parent, child } = await createFamily();
      const res = await as(parent)
        .put(`/api/children/${child.id}/split-settings`)
        .send(split(40, 40, 20))
        .expect(200);
      expect(res.body.settings).toMatchObject(split(40, 40, 20));
    });

    it('traite un champ vide comme 0', async () => {
      const { parent, child } = await createFamily();
      await as(parent)
        .put(`/api/children/${child.id}/split-settings`)
        .send({ splitEnabled: true, splitSavePct: '', splitSpendPct: 100, splitGivePct: '' })
        .expect(200);
    });

    it.each([
      [50, 30, 10],
      [50, 50, 10],
      [0, 0, 0],
    ])('refuse %i/%i/%i', async (save, spend, give) => {
      const { parent, child } = await createFamily();
      await as(parent)
        .put(`/api/children/${child.id}/split-settings`)
        .send(split(save, spend, give))
        .expect(400);
    });

    it.each([
      [-10, 100, 10],
      [101, 0, -1],
      ['x', 50, 50],
    ])('refuse les valeurs invalides %j/%j/%j', async (save, spend, give) => {
      const { parent, child } = await createFamily();
      await as(parent)
        .put(`/api/children/${child.id}/split-settings`)
        .send({ splitEnabled: true, splitSavePct: save, splitSpendPct: spend, splitGivePct: give })
        .expect(400);
    });

    it('est réservé aux parents de la famille', async () => {
      const { child } = await createFamily();
      const other = await createFamily('Martin');
      await as(child)
        .put(`/api/children/${child.id}/split-settings`)
        .send(split(50, 50, 0))
        .expect(403);
      await as(other.parent)
        .put(`/api/children/${child.id}/split-settings`)
        .send(split(50, 50, 0))
        .expect(404);
    });
  });
});

describe('argent de poche récurrent', () => {
  const schedule = (childId: string, data: Record<string, unknown> = {}) =>
    prisma.allowanceSchedule.create({ data: { childId, amount: 5, frequency: 'WEEKLY', ...data } as never });

  it('verse le premier paiement au chargement de la famille', async () => {
    const { parent, child } = await createFamily();
    await schedule(child.id);

    await as(parent).get('/api/family').expect(200);

    expect(await balanceOf(child.id)).toBe(25);
    expect((await transactionsOf(child.id))[0]).toMatchObject({ amount: 5, type: 'ALLOWANCE' });
  });

  it('ne verse pas deux fois dans la même période', async () => {
    const { parent, child } = await createFamily();
    await schedule(child.id);
    await as(parent).get('/api/family').expect(200);
    await as(parent).get('/api/family').expect(200);
    expect(await balanceOf(child.id)).toBe(25);
  });

  it("ne verse qu'une fois sous des chargements simultanés", async () => {
    const { parent, child } = await createFamily();
    await schedule(child.id);
    await Promise.all(Array.from({ length: 8 }, () => as(parent).get('/api/family')));
    expect(await balanceOf(child.id)).toBe(25);
    expect(await transactionsOf(child.id)).toHaveLength(1);
  });

  it.each([
    ['WEEKLY', 7, 30],
    ['MONTHLY', 30, 25],
  ])('%s : verse après %i jours', async (frequency, days, expected) => {
    const { parent, child } = await createFamily();
    await schedule(child.id, { frequency, amount: frequency === 'WEEKLY' ? 10 : 5, lastPaidAt: daysAgo(days) });
    await as(parent).get('/api/family').expect(200);
    expect(await balanceOf(child.id)).toBe(expected);
  });

  it.each([
    ['WEEKLY', 5],
    ['MONTHLY', 28],
  ])('%s : ne verse pas après %i jours', async (frequency, days) => {
    const { parent, child } = await createFamily();
    await schedule(child.id, { frequency, lastPaidAt: daysAgo(days) });
    await as(parent).get('/api/family').expect(200);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('ne verse rien pour un calendrier inactif', async () => {
    const { parent, child } = await createFamily();
    await schedule(child.id, { active: false });
    await as(parent).get('/api/family').expect(200);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('applique la répartition', async () => {
    const { parent, child } = await createFamily();
    await setSettings(child.id, split(50, 50, 0));
    await schedule(child.id, { amount: 10 });
    await as(parent).get('/api/family').expect(200);
    expect(await getUser(child.id)).toMatchObject({ balance: 30, saveBalance: 5, spendBalance: 5 });
  });

  it("ne déclenche pas le paiement d'une autre famille", async () => {
    const { parent } = await createFamily();
    const other = await createFamily('Martin');
    await schedule(other.child.id);
    await as(parent).get('/api/family').expect(200);
    expect(await balanceOf(other.child.id)).toBe(20);
  });

  describe('réglage', () => {
    it('crée puis met à jour le calendrier', async () => {
      const { parent, child } = await createFamily();
      const url = `/api/children/${child.id}/allowance`;
      await as(parent).put(url).send({ amount: 5, frequency: 'WEEKLY' }).expect(200);
      const res = await as(parent).put(url).send({ amount: 8, frequency: 'MONTHLY', active: false }).expect(200);
      expect(res.body.allowance).toMatchObject({ amount: 8, frequency: 'MONTHLY', active: false });
      expect((await as(parent).get(url).expect(200)).body.allowance.amount).toBe(8);
    });

    it.each([[{ amount: -1, frequency: 'WEEKLY' }], [{ amount: 5, frequency: 'DAILY' }], [{ frequency: 'WEEKLY' }]])(
      'refuse %j',
      async body => {
        const { parent, child } = await createFamily();
        await as(parent).put(`/api/children/${child.id}/allowance`).send(body).expect(400);
      },
    );

    it('est réservé aux parents de la famille', async () => {
      const { child } = await createFamily();
      const other = await createFamily('Martin');
      const url = `/api/children/${child.id}/allowance`;
      await as(child).put(url).send({ amount: 5, frequency: 'WEEKLY' }).expect(403);
      await as(other.parent).put(url).send({ amount: 5, frequency: 'WEEKLY' }).expect(404);
      await as(other.parent).get(url).expect(404);
    });
  });
});
