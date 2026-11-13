import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  as,
  createChore,
  createFamily,
  createGoal,
  createRule,
  getGoal,
  nextIp,
  PASSWORD,
  prisma,
  useCleanDatabase,
} from './support/helpers';

useCleanDatabase();

describe('famille', () => {
  it('liste les membres sans exposer les mots de passe', async () => {
    const { parent } = await createFamily();
    const res = await as(parent).get('/api/family').expect(200);
    expect(res.body.family.users).toHaveLength(2);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });

  it('ne liste que les enfants de la famille', async () => {
    const { parent, child } = await createFamily();
    await createFamily('Martin');
    const res = await as(parent).get('/api/family/children').expect(200);
    expect(res.body.children.map((c: { id: string }) => c.id)).toEqual([child.id]);
  });

  it('renvoie les enfants triés par prénom, quel que soit leur ordre de création', async () => {
    const { parent } = await createFamily('Dupont', [{ name: 'Zoé' }, { name: 'Alice' }, { name: 'Malo' }]);
    const names = (list: { name: string; role?: string }[]) => list.filter(u => u.role !== 'PARENT').map(u => u.name);
    expect(names((await as(parent).get('/api/family').expect(200)).body.family.users)).toEqual([
      'Alice',
      'Malo',
      'Zoé',
    ]);
    expect(names((await as(parent).get('/api/family/children').expect(200)).body.children)).toEqual([
      'Alice',
      'Malo',
      'Zoé',
    ]);
  });

  it('un enfant ne voit que ses propres transactions', async () => {
    const {
      children: [alice, bob],
    } = await createFamily('Dupont', [{ name: 'Alice' }, { name: 'Bob' }]);
    await prisma.transaction.create({ data: { childId: bob.id, amount: 5, type: 'CHORE', description: 'x' } });
    expect((await as(alice).get('/api/transactions').expect(200)).body.transactions).toHaveLength(0);
    expect((await as(bob).get('/api/transactions').expect(200)).body.transactions).toHaveLength(1);
  });
});

describe("suppression d'un enfant", () => {
  it("efface l'enfant et ses données", async () => {
    const { parent, child } = await createFamily();
    await createChore(child.id);
    await prisma.transaction.create({ data: { childId: child.id, amount: 5, type: 'CHORE', description: 'x' } });

    await as(parent).delete(`/api/children/${child.id}`).expect(200);

    expect(await prisma.user.findUnique({ where: { id: child.id } })).toBeNull();
    expect(await prisma.chore.count()).toBe(0);
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("supprime son objectif personnel et retire sa part d'un objectif commun", async () => {
    const {
      family,
      parent,
      children: [alice, bob],
    } = await createFamily('Dupont', [{ name: 'Alice' }, { name: 'Bob' }]);
    const personal = await createGoal(family.id, [{ childId: alice.id, contributedAmount: 10 }]);
    const shared = await createGoal(
      family.id,
      [
        { childId: alice.id, contributedAmount: 10 },
        { childId: bob.id, contributedAmount: 5 },
      ],
      { isShared: true },
    );

    await as(parent).delete(`/api/children/${alice.id}`).expect(200);

    expect(await prisma.goal.findUnique({ where: { id: personal.id } })).toBeNull();
    expect((await getGoal(shared.id)).current).toBe(5);
  });

  it("garde intact le montant d'un objectif déjà acheté", async () => {
    const {
      family,
      parent,
      children: [alice, bob],
    } = await createFamily('Dupont', [{ name: 'Alice' }, { name: 'Bob' }]);
    const goal = await createGoal(
      family.id,
      [
        { childId: alice.id, contributedAmount: 60 },
        { childId: bob.id, contributedAmount: 40 },
      ],
      { isShared: true, status: 'COMPLETED' },
    );
    await as(parent).delete(`/api/children/${alice.id}`).expect(200);
    expect((await getGoal(goal.id)).current).toBe(100);
  });

  it('est réservée aux parents de la famille, et aux enfants', async () => {
    const { parent, child } = await createFamily();
    const other = await createFamily('Martin');
    await as(child).delete(`/api/children/${child.id}`).expect(403);
    await as(other.parent).delete(`/api/children/${child.id}`).expect(404);
    await as(parent).delete(`/api/children/${parent.id}`).expect(404);
    expect(await prisma.user.count()).toBe(4);
  });
});

describe("suppression d'une famille", () => {
  it('efface toute la famille, pas les autres', async () => {
    const { parent, child } = await createFamily();
    const other = await createFamily('Martin');
    await createChore(child.id);

    const res = await as(parent).delete('/api/family').send({ password: PASSWORD }).expect(200);

    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/^pm_session=;/);
    expect(await prisma.family.count()).toBe(1);
    expect(await prisma.chore.count()).toBe(0);
    expect(await prisma.user.count({ where: { familyId: other.family.id } })).toBe(2);
  });

  it('exige le bon mot de passe et un parent', async () => {
    const { parent, child } = await createFamily();
    await as(parent).delete('/api/family').send({ password: 'mauvais' }).expect(403);
    await as(parent).delete('/api/family').send({}).expect(400);
    await as(child).delete('/api/family').send({ password: PASSWORD }).expect(403);
    expect(await prisma.family.count()).toBe(1);
  });

  it('limite les tentatives de mot de passe', async () => {
    const { parent } = await createFamily();
    const ip = nextIp();
    for (let i = 0; i < 5; i += 1) {
      await as(parent, ip).delete('/api/family').send({ password: 'mauvais' }).expect(403);
    }
    await as(parent, ip).delete('/api/family').send({ password: PASSWORD }).expect(429);
    expect(await prisma.family.count()).toBe(1);
  });
});

describe('règles', () => {
  it('crée, modifie, liste et supprime une règle', async () => {
    const { parent } = await createFamily();
    const created = await as(parent).post('/api/rules').send({ title: 'Retard', amount: 2 }).expect(201);
    expect(created.body.rule.active).toBe(true);
    const id = created.body.rule.id;

    const updated = await as(parent).put(`/api/rules/${id}`).send({ amount: 3, active: false }).expect(200);
    expect(updated.body.rule).toMatchObject({ title: 'Retard', amount: 3, active: false });

    expect((await as(parent).get('/api/rules').expect(200)).body.rules).toHaveLength(1);
    await as(parent).delete(`/api/rules/${id}`).expect(200);
    expect(await prisma.rule.count()).toBe(0);
  });

  it.each([[-1], ['abc'], [1.111]])('refuse le montant %j (MONEY-4)', async amount => {
    const { parent } = await createFamily();
    await as(parent).post('/api/rules').send({ title: 'Retard', amount }).expect(400);
  });

  it('est réservé aux parents', async () => {
    const { family, child } = await createFamily();
    const rule = await createRule(family.id);
    await as(child).post('/api/rules').send({ title: 'x', amount: 1 }).expect(403);
    await as(child).put(`/api/rules/${rule.id}`).send({ amount: 1 }).expect(403);
    await as(child).delete(`/api/rules/${rule.id}`).expect(403);
  });

  it('protège les règles des autres familles', async () => {
    const { family } = await createFamily();
    const other = await createFamily('Martin');
    const rule = await createRule(family.id);
    await as(other.parent).put(`/api/rules/${rule.id}`).send({ amount: 1 }).expect(403);
    await as(other.parent).delete(`/api/rules/${rule.id}`).expect(403);
    expect((await as(other.parent).get('/api/rules').expect(200)).body.rules).toHaveLength(0);
  });

  it('renvoie 404 pour une règle inconnue', async () => {
    const { parent } = await createFamily();
    await as(parent).put('/api/rules/inconnue').send({ amount: 1 }).expect(404);
    await as(parent).delete('/api/rules/inconnue').expect(404);
  });

  it("l'historique ne contient que les sanctions de la famille", async () => {
    const { family, parent, child } = await createFamily();
    const other = await createFamily('Martin');
    const rule = await createRule(family.id, 1);
    await as(parent).post(`/api/rules/${rule.id}/apply`).send({ childId: child.id }).expect(200);
    expect((await as(parent).get('/api/family/penalty-history').expect(200)).body.history).toHaveLength(1);
    expect((await as(other.parent).get('/api/family/penalty-history').expect(200)).body.history).toHaveLength(0);
    await as(child).get('/api/family/penalty-history').expect(403);
  });
});

describe('corvées récurrentes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const template = (familyId: string, assigneeId: string, data: Record<string, unknown> = {}) =>
    prisma.choreTemplate.create({
      data: { familyId, assigneeId, title: 'Lit', reward: 1, frequency: 'DAILY', ...data } as never,
    });

  it('génère une corvée quotidienne une seule fois par jour', async () => {
    const { family, parent, child } = await createFamily();
    await template(family.id, child.id);
    await as(parent).get('/api/chores').expect(200);
    await as(parent).get('/api/chores').expect(200);
    expect(await prisma.chore.count()).toBe(1);
  });

  it("ne génère qu'une corvée sous des chargements simultanés", async () => {
    const { family, parent, child } = await createFamily();
    await template(family.id, child.id);
    await Promise.all(Array.from({ length: 8 }, () => as(parent).get('/api/chores')));
    expect(await prisma.chore.count()).toBe(1);
  });

  it("génère une corvée hebdomadaire seulement le bon jour, selon le fuseau de l'application", async () => {
    // Dimanche 8 novembre 2026, 23h30 UTC : on est déjà lundi 9 à Paris.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-08T23:30:00Z') });
    const { family, parent, child } = await createFamily();
    await template(family.id, child.id, { frequency: 'WEEKLY', weekday: 0, title: 'Dimanche' });
    await template(family.id, child.id, { frequency: 'WEEKLY', weekday: 1, title: 'Lundi' });

    const res = await as(parent).get('/api/chores').expect(200);

    expect(res.body.chores.map((c: { title: string; deadline: string }) => [c.title, c.deadline])).toEqual([
      ['Lundi', '2026-11-09'],
    ]);
  });

  it('ignore un modèle inactif', async () => {
    const { family, parent, child } = await createFamily();
    await template(family.id, child.id, { active: false });
    await as(parent).get('/api/chores').expect(200);
    expect(await prisma.chore.count()).toBe(0);
  });

  it("gère le cycle de vie d'un modèle", async () => {
    const { parent, child } = await createFamily();
    const body = { title: 'Lit', reward: 1, assigneeId: child.id, frequency: 'WEEKLY', weekday: 3 };
    const created = await as(parent).post('/api/chore-templates').send(body).expect(201);
    const id = created.body.template.id;

    const updated = await as(parent).patch(`/api/chore-templates/${id}`).send({ frequency: 'DAILY' }).expect(200);
    expect(updated.body.template).toMatchObject({ frequency: 'DAILY', weekday: null });

    expect((await as(parent).get('/api/chore-templates').expect(200)).body.templates).toHaveLength(1);
    await as(parent).delete(`/api/chore-templates/${id}`).expect(200);
  });

  it('exige un jour pour un modèle hebdomadaire', async () => {
    const { parent, child } = await createFamily();
    const body = { title: 'Lit', reward: 1, assigneeId: child.id, frequency: 'WEEKLY' };
    await as(parent).post('/api/chore-templates').send(body).expect(400);
    await as(parent)
      .post('/api/chore-templates')
      .send({ ...body, weekday: 7 })
      .expect(400);
  });

  it('protège les modèles des autres familles', async () => {
    const { family, child } = await createFamily();
    const other = await createFamily('Martin');
    const item = await template(family.id, child.id);
    await as(child).get('/api/chore-templates').expect(403);
    await as(other.parent).patch(`/api/chore-templates/${item.id}`).send({ reward: 9 }).expect(403);
    await as(other.parent).delete(`/api/chore-templates/${item.id}`).expect(403);
    await as(other.parent)
      .post('/api/chore-templates')
      .send({ title: 'x', reward: 1, assigneeId: child.id, frequency: 'DAILY' })
      .expect(404);
  });
});

describe('statistiques', () => {
  it('calcule les totaux de la famille', async () => {
    const { family, parent, child } = await createFamily();
    await createChore(child.id, { reward: 5 });
    const pending = await createChore(child.id, { status: 'PENDING' });
    const submitted = await prisma.chore.findFirstOrThrow({ where: { status: 'SUBMITTED' } });
    await as(parent).patch(`/api/chores/${submitted.id}/approve`).expect(200);
    const goal = await createGoal(family.id, [{ childId: child.id }]);
    await as(child).post(`/api/goals/${goal.id}/fund`).send({ amount: 4 }).expect(200);

    const res = await as(parent).get('/api/analytics/overview').expect(200);

    expect(pending.status).toBe('PENDING');
    expect(res.body.choreCounts).toEqual(
      expect.arrayContaining([
        { status: 'COMPLETED', count: 1 },
        { status: 'PENDING', count: 1 },
      ]),
    );
    expect(res.body.perChild[0]).toMatchObject({ balance: 21, earned: 5, spent: 4 });
    expect(res.body.savingsTrend.at(-1).cumulative).toBe(4);
  });

  it('est réservé aux parents', async () => {
    const { child } = await createFamily();
    await as(child).get('/api/analytics/overview').expect(403);
  });
});
