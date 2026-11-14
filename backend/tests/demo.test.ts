import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { anonymous, as, createFamily, ORIGIN, prisma, useCleanDatabase } from './support/helpers';

useCleanDatabase();

const sessionFrom = (res: { headers: Record<string, unknown> }) => {
  const cookies = res.headers['set-cookie'] as string[];
  return cookies.find(c => c.startsWith('pm_session='))!.split(';')[0];
};

const startDemo = (ip?: string) => anonymous(ip).post('/api/demo').set('Origin', ORIGIN);

describe('mode démo', () => {
  beforeEach(() => {
    process.env.DEMO_ENABLED = 'true';
  });
  afterEach(() => {
    delete process.env.DEMO_ENABLED;
  });

  it('est désactivé sans DEMO_ENABLED', async () => {
    delete process.env.DEMO_ENABLED;
    const res = await anonymous().get('/api/demo').expect(200);
    expect(res.body).toEqual({ enabled: false });
    await startDemo().expect(404);
    expect(await prisma.family.count()).toBe(0);
  });

  it('crée une famille remplie et connecte le parent', async () => {
    const res = await startDemo().expect(201);
    expect(res.body.user.role).toBe('PARENT');
    expect(res.body.children.map((c: { name: string }) => c.name)).toEqual(['Léa', 'Hugo']);

    const family = await prisma.family.findUniqueOrThrow({ where: { id: res.body.user.familyId } });
    const hoursLeft = (family.demoExpiresAt!.getTime() - Date.now()) / 3_600_000;
    expect(hoursLeft).toBeGreaterThan(23);
    expect(hoursLeft).toBeLessThanOrEqual(24);

    const cookie = sessionFrom(res);
    const chores = await anonymous().get('/api/chores').set('Cookie', cookie).expect(200);
    expect(chores.body.chores.some((c: { status: string }) => c.status === 'SUBMITTED')).toBe(true);
    const me = await anonymous().get('/api/auth/me').set('Cookie', cookie).expect(200);
    expect(me.body.user.name).toBe('Camille');
  });

  it('respecte la règle du solde : aucun enfant de démo sous 0', async () => {
    const res = await startDemo().expect(201);
    const children = await prisma.user.findMany({ where: { familyId: res.body.user.familyId, role: 'CHILD' } });
    for (const child of children) expect(child.balance).toBeGreaterThanOrEqual(0);
  });

  it('chaque visiteur a sa propre famille', async () => {
    const a = await startDemo().expect(201);
    const b = await startDemo().expect(201);
    expect(a.body.user.familyId).not.toBe(b.body.user.familyId);
    await anonymous()
      .get('/api/family')
      .set('Cookie', sessionFrom(a))
      .expect(200)
      .then(r => expect(r.body.family.id).toBe(a.body.user.familyId));
  });

  it('permet de passer sur un enfant de sa famille de démo', async () => {
    const res = await startDemo().expect(201);
    const lea = res.body.children[0];
    const switched = await anonymous()
      .post('/api/demo/switch')
      .set('Origin', ORIGIN)
      .set('Cookie', sessionFrom(res))
      .send({ userId: lea.id })
      .expect(200);
    expect(switched.body.user).toMatchObject({ id: lea.id, role: 'CHILD' });
    const me = await anonymous().get('/api/auth/me').set('Cookie', sessionFrom(switched)).expect(200);
    expect(me.body.user.name).toBe('Léa');
  });

  it('refuse de passer sur un membre d’une autre famille', async () => {
    const res = await startDemo().expect(201);
    const { child } = await createFamily();
    await anonymous()
      .post('/api/demo/switch')
      .set('Origin', ORIGIN)
      .set('Cookie', sessionFrom(res))
      .send({ userId: child.id })
      .expect(404);
  });

  it('une vraie famille ne peut pas changer de compte sans mot de passe', async () => {
    const { parent, child } = await createFamily();
    await as(parent).post('/api/demo/switch').set('Origin', ORIGIN).send({ userId: child.id }).expect(403);
  });

  it('purge les démos expirées, jamais les vraies familles', async () => {
    const real = await createFamily();
    const old = await startDemo().expect(201);
    await prisma.family.update({
      where: { id: old.body.user.familyId },
      data: { demoExpiresAt: new Date(Date.now() - 1000) },
    });

    await anonymous().get('/api/auth/me').set('Cookie', sessionFrom(old)).expect(401);
    await startDemo().expect(201);

    expect(await prisma.family.findUnique({ where: { id: old.body.user.familyId } })).toBeNull();
    expect(await prisma.user.count({ where: { familyId: old.body.user.familyId } })).toBe(0);
    expect(await prisma.family.findUnique({ where: { id: real.family.id } })).not.toBeNull();
  });

  it('limite le nombre de démos par IP', async () => {
    for (let i = 0; i < 5; i += 1) await startDemo('10.200.0.1').expect(201);
    await startDemo('10.200.0.1').expect(429);
  });
});
