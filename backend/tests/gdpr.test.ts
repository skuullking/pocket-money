import { describe, expect, it } from 'vitest';
import { anonymous, as, createFamily, getUser, ORIGIN, PASSWORD, prisma, useCleanDatabase } from './support/helpers';

useCleanDatabase();

const addParent = async (familyId: string, email = 'second@example.test') => {
  const { password } = await prisma.user.findFirstOrThrow({ where: { familyId, role: 'PARENT' } });
  return prisma.user.create({ data: { name: 'Second', email, password, role: 'PARENT', familyId } });
};

const registerParent = (overrides = {}) =>
  anonymous()
    .post('/api/auth/register/parent/create')
    .send({
      name: 'Sarah',
      email: 'sarah@example.test',
      password: PASSWORD,
      familyName: 'Dupont',
      acceptTerms: true,
      parentalConsent: true,
      ...overrides,
    });

describe('consentement', () => {
  it('horodate les conditions et le consentement à l’inscription', async () => {
    const res = await registerParent().expect(201);
    const user = await getUser(res.body.user.id);
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);
    expect(user.parentalConsentAt).toBeInstanceOf(Date);
  });

  it.each([
    ['conditions refusées', { acceptTerms: false }],
    ['consentement refusé', { parentalConsent: false }],
    ['consentement absent', { parentalConsent: undefined }],
  ])('refuse l’inscription : %s', async (_label, overrides) => {
    await registerParent(overrides).expect(400);
  });

  it('bloque l’inscription d’un enfant tant qu’aucun parent n’a consenti, puis l’autorise', async () => {
    const { family, parent } = await createFamily();
    await prisma.user.update({ where: { id: parent.id }, data: { parentalConsentAt: null } });
    const child = { name: 'Zoé', password: PASSWORD, inviteCode: family.inviteCode, age: 9 };

    await anonymous().post('/api/auth/register/child').send(child).expect(403);
    await as(parent)
      .post('/api/account/consent')
      .set('Origin', ORIGIN)
      .send({ acceptTerms: true, parentalConsent: true })
      .expect(200);
    await anonymous().post('/api/auth/register/child').send(child).expect(201);
  });

  it('un enfant ne peut pas donner le consentement', async () => {
    const { child } = await createFamily();
    await as(child)
      .post('/api/account/consent')
      .set('Origin', ORIGIN)
      .send({ acceptTerms: true, parentalConsent: true })
      .expect(403);
  });
});

describe('export des données', () => {
  it('contient les données de la famille, sans mots de passe ni jetons', async () => {
    const { parent, child } = await createFamily();
    await prisma.passwordResetToken.create({
      data: { userId: parent.id, tokenHash: 'secret-hash', expiresAt: new Date() },
    });
    await prisma.transaction.create({
      data: { childId: child.id, amount: 5, type: 'CHORE', description: 'Vaisselle' },
    });

    const res = await as(parent).get('/api/account/export').expect(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const kid = res.body.family.users.find((u: { id: string }) => u.id === child.id);
    expect(kid.transactions).toHaveLength(1);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('"password"');
    expect(raw).not.toContain('secret-hash');
  });

  it('n’expose que la famille du demandeur', async () => {
    const { parent } = await createFamily('Dupont');
    const { child: other } = await createFamily('Martin');
    const res = await as(parent).get('/api/account/export').expect(200);
    expect(JSON.stringify(res.body)).not.toContain(other.id);
  });

  it('est réservé aux parents', async () => {
    const { child } = await createFamily();
    await as(child).get('/api/account/export').expect(403);
  });
});

describe('suppression du compte parent', () => {
  const remove = (actor: { id: string }, password = PASSWORD) =>
    as(actor).delete('/api/account').set('Origin', ORIGIN).send({ password });

  it('supprime un parent quand un autre reste, sans toucher à la famille', async () => {
    const { family, parent, child } = await createFamily();
    await addParent(family.id);
    await remove(parent).expect(200);
    expect(await prisma.user.findUnique({ where: { id: parent.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: child.id } })).not.toBeNull();
  });

  it('refuse de supprimer le dernier parent', async () => {
    const { parent } = await createFamily();
    await remove(parent).expect(409);
    expect(await prisma.user.findUnique({ where: { id: parent.id } })).not.toBeNull();
  });

  it('exige le bon mot de passe', async () => {
    const { family, parent } = await createFamily();
    await addParent(family.id);
    await remove(parent, 'mauvais').expect(403);
  });

  it('deux départs simultanés laissent un parent', async () => {
    const { family, parent } = await createFamily();
    const second = await addParent(family.id);
    await Promise.all([remove(parent), remove(second)]);
    expect(await prisma.user.count({ where: { familyId: family.id, role: 'PARENT' } })).toBe(1);
  });

  it('un enfant ne peut pas utiliser cette route', async () => {
    const { child } = await createFamily();
    await remove(child).expect(403);
  });
});
