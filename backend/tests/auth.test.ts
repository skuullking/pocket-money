import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  anonymous,
  as,
  createFamily,
  nextIp,
  ORIGIN,
  PASSWORD,
  prisma,
  sessionCookie,
  useCleanDatabase,
} from './support/helpers';

useCleanDatabase();

const newParent = (overrides = {}) => ({
  name: 'Sarah',
  email: 'sarah@example.test',
  password: PASSWORD,
  familyName: 'Dupont',
  ...overrides,
});

const cookieOf = (res: { headers: Record<string, unknown> }) =>
  ((res.headers['set-cookie'] as unknown as string[] | undefined) ?? [])[0] ?? '';

describe('inscription', () => {
  it('crée une famille, ses règles et une session parent', async () => {
    const res = await anonymous()
      .post('/api/auth/register/parent/create')
      .send(newParent({ rules: [{ title: 'Retard', amount: 2 }] }))
      .expect(201);

    expect(res.body.user).toMatchObject({ name: 'Sarah', role: 'PARENT' });
    expect(res.body.user.password).toBeUndefined();
    expect(cookieOf(res)).toMatch(/^pm_session=.+HttpOnly/i);
    expect(await prisma.rule.count({ where: { familyId: res.body.user.familyId } })).toBe(1);
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: res.body.user.id } });
    expect(stored.password).not.toBe(PASSWORD);
  });

  it('refuse un email déjà pris', async () => {
    await anonymous().post('/api/auth/register/parent/create').send(newParent()).expect(201);
    const res = await anonymous()
      .post('/api/auth/register/parent/create')
      .send(newParent({ name: 'Autre' }))
      .expect(409);
    expect(res.body.error).toBe('Cet email est déjà utilisé');
  });

  it.each([
    ['email invalide', { email: 'pas-un-email' }],
    ['mot de passe trop court', { password: '12345' }],
    ['mot de passe trop long pour bcrypt', { password: 'x'.repeat(73) }],
    ['nom vide', { name: '   ' }],
    ['règle négative', { rules: [{ title: 'x', amount: -1 }] }],
  ])('refuse : %s', async (_label, overrides) => {
    await anonymous().post('/api/auth/register/parent/create').send(newParent(overrides)).expect(400);
  });

  it('un second parent rejoint la famille par code', async () => {
    const { family } = await createFamily();
    const res = await anonymous()
      .post('/api/auth/register/parent/join')
      .send({ name: 'Paul', email: 'paul@example.test', password: PASSWORD, inviteCode: family.inviteCode })
      .expect(201);
    expect(res.body.user).toMatchObject({ role: 'PARENT', familyId: family.id });
  });

  it('un enfant rejoint la famille par code, avec un solde nul', async () => {
    const { family } = await createFamily();
    const res = await anonymous()
      .post('/api/auth/register/child')
      .send({ name: 'Zoé', password: PASSWORD, inviteCode: family.inviteCode, age: '9' })
      .expect(201);
    expect(res.body.user).toMatchObject({ role: 'CHILD', balance: 0, age: 9, avatar: 'Z' });
  });

  it('refuse un code famille inconnu', async () => {
    await anonymous()
      .post('/api/auth/register/child')
      .send({ name: 'Zoé', password: PASSWORD, inviteCode: 'NOPE', age: 9 })
      .expect(404);
    await anonymous()
      .post('/api/auth/register/parent/join')
      .send({ name: 'Paul', email: 'paul@example.test', password: PASSWORD, inviteCode: 'NOPE' })
      .expect(404);
  });

  it("refuse un prénom déjà pris dans la famille, l'autorise ailleurs", async () => {
    const { family } = await createFamily();
    const other = await createFamily('Martin', []);
    const child = { name: 'Alice', password: PASSWORD, age: 9 };
    await anonymous()
      .post('/api/auth/register/child')
      .send({ ...child, inviteCode: family.inviteCode })
      .expect(409);
    await anonymous()
      .post('/api/auth/register/child')
      .send({ ...child, inviteCode: other.family.inviteCode })
      .expect(201);
  });

  it.each([[0], [100], ['abc'], [undefined]])("refuse l'âge %j", async age => {
    const { family } = await createFamily();
    await anonymous()
      .post('/api/auth/register/child')
      .send({ name: 'Zoé', password: PASSWORD, inviteCode: family.inviteCode, age })
      .expect(400);
  });

  it('limite les inscriptions par IP', async () => {
    const ip = nextIp();
    for (let i = 0; i < 10; i += 1) {
      await anonymous(ip).post('/api/auth/register/parent/create').send({}).expect(400);
    }
    await anonymous(ip).post('/api/auth/register/parent/create').send({}).expect(429);
  });
});

describe('connexion', () => {
  it('connecte un parent par email et pose un cookie httpOnly', async () => {
    const { parent } = await createFamily();
    const res = await anonymous().post('/api/auth/login').send({ email: parent.email, password: PASSWORD }).expect(200);
    expect(res.body.user.id).toBe(parent.id);
    expect(res.body.user.password).toBeUndefined();
    expect(cookieOf(res)).toMatch(/HttpOnly/i);
    expect(cookieOf(res)).toMatch(/SameSite=Lax/i);
  });

  it('connecte un enfant par prénom et code famille', async () => {
    const { family, child } = await createFamily();
    const res = await anonymous()
      .post('/api/auth/login')
      .send({ email: child.name, inviteCode: family.inviteCode, password: PASSWORD })
      .expect(200);
    expect(res.body.user.id).toBe(child.id);
  });

  it('distingue deux enfants de même prénom grâce au code famille', async () => {
    const dupont = await createFamily();
    const martin = await createFamily('Martin');
    const res = await anonymous()
      .post('/api/auth/login')
      .send({ email: 'Alice', inviteCode: martin.family.inviteCode, password: PASSWORD })
      .expect(200);
    expect(res.body.user.id).toBe(martin.child.id);
    expect(res.body.user.id).not.toBe(dupont.child.id);
  });

  it("refuse le prénom d'un enfant sans code famille", async () => {
    const { child } = await createFamily();
    await anonymous().post('/api/auth/login').send({ email: child.name, password: PASSWORD }).expect(401);
  });

  it('un parent ne peut pas se connecter via la voie enfant', async () => {
    const { family, parent } = await createFamily();
    await anonymous()
      .post('/api/auth/login')
      .send({ email: parent.name, inviteCode: family.inviteCode, password: PASSWORD })
      .expect(401);
  });

  it('donne la même réponse pour un mauvais mot de passe et un compte inconnu', async () => {
    const { parent } = await createFamily();
    const wrong = await anonymous()
      .post('/api/auth/login')
      .send({ email: parent.email, password: 'mauvais' })
      .expect(401);
    const unknown = await anonymous()
      .post('/api/auth/login')
      .send({ email: 'x@example.test', password: 'mauvais' })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(cookieOf(wrong)).toBe('');
  });

  it('bloque après 10 échecs depuis la même IP', async () => {
    const { parent } = await createFamily();
    const ip = nextIp();
    for (let i = 0; i < 10; i += 1) {
      await anonymous(ip).post('/api/auth/login').send({ email: parent.email, password: 'mauvais' }).expect(401);
    }
    await anonymous(ip).post('/api/auth/login').send({ email: parent.email, password: PASSWORD }).expect(429);
  });

  it('ne compte pas les connexions réussies dans la limite', async () => {
    const { parent } = await createFamily();
    const ip = nextIp();
    for (let i = 0; i < 12; i += 1) {
      await anonymous(ip).post('/api/auth/login').send({ email: parent.email, password: PASSWORD }).expect(200);
    }
  });
});

describe('session', () => {
  it("/me renvoie l'utilisateur sans son mot de passe", async () => {
    const { child } = await createFamily();
    const res = await as(child).get('/api/auth/me').expect(200);
    expect(res.body.user).toMatchObject({ id: child.id, balance: 20 });
    expect(res.body.user.password).toBeUndefined();
  });

  it('refuse une requête sans cookie', async () => {
    await anonymous().get('/api/auth/me').expect(401);
  });

  it("n'accepte pas le JWT dans un en-tête Authorization", async () => {
    const { parent } = await createFamily();
    const token = sessionCookie(parent.id).split('=')[1];
    await anonymous().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
  });

  it.each([
    ['signé avec un autre secret', (id: string) => jwt.sign({ userId: id }, 'mauvais-secret')],
    ['non signé (alg none)', (id: string) => jwt.sign({ userId: id }, '', { algorithm: 'none' })],
    ['expiré', (id: string) => jwt.sign({ userId: id }, process.env.JWT_SECRET as string, { expiresIn: -10 })],
    ['illisible', () => 'pas-un-jwt'],
  ])('refuse un token %s', async (_label, forge) => {
    const { parent } = await createFamily();
    await anonymous()
      .get('/api/auth/me')
      .set('Cookie', `pm_session=${forge(parent.id)}`)
      .expect(400);
  });

  it("refuse le token d'un compte supprimé", async () => {
    const { parent } = await createFamily();
    const cookie = sessionCookie(parent.id);
    await prisma.user.delete({ where: { id: parent.id } });
    await anonymous().get('/api/auth/me').set('Cookie', cookie).expect(404);
  });

  it('la déconnexion efface le cookie', async () => {
    const res = await anonymous().post('/api/auth/logout').expect(200);
    expect(cookieOf(res)).toMatch(/^pm_session=;/);
  });
});

describe('CSRF et CORS', () => {
  it("refuse une écriture venant d'une autre origine", async () => {
    const { parent, child } = await createFamily();
    await as(parent)
      .post('/api/expenses/deduct')
      .set('Origin', 'https://evil.example')
      .send({ childId: child.id, amount: 1 })
      .expect(403);
  });

  it('accepte une écriture venant du front', async () => {
    const { parent, child } = await createFamily();
    await as(parent)
      .post('/api/expenses/deduct')
      .set('Origin', ORIGIN)
      .send({ childId: child.id, amount: 1 })
      .expect(200);
  });

  it("n'autorise CORS que pour le front, avec cookies", async () => {
    const res = await anonymous().get('/api/health').set('Origin', ORIGIN).expect(200);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});

describe('réinitialisation du mot de passe', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Sans RESEND_API_KEY, le serveur écrit le lien dans les logs.
  const requestToken = async (email: string) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await anonymous().post('/api/auth/forgot-password').send({ email }).expect(200);
    const line = log.mock.calls.flat().join(' ');
    log.mockRestore();
    return line.match(/token=([a-f0-9]+)/)?.[1];
  };

  it('change le mot de passe avec un lien valide, une seule fois', async () => {
    const { parent } = await createFamily();
    const token = await requestToken(parent.email as string);
    expect(token).toBeTruthy();

    await anonymous().post('/api/auth/reset-password').send({ token, newPassword: 'nouveau-mdp' }).expect(200);

    await anonymous().post('/api/auth/login').send({ email: parent.email, password: 'nouveau-mdp' }).expect(200);
    await anonymous().post('/api/auth/login').send({ email: parent.email, password: PASSWORD }).expect(401);
    await anonymous().post('/api/auth/reset-password').send({ token, newPassword: 'encore-autre' }).expect(400);
  });

  it('ne stocke que le hash du token', async () => {
    const { parent } = await createFamily();
    const token = await requestToken(parent.email as string);
    const stored = await prisma.passwordResetToken.findFirstOrThrow();
    expect(stored.tokenHash).not.toBe(token);
    expect(stored.tokenHash).toBe(
      createHash('sha256')
        .update(token as string)
        .digest('hex'),
    );
  });

  it('refuse un lien expiré', async () => {
    const { parent } = await createFamily();
    const token = await requestToken(parent.email as string);
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await anonymous().post('/api/auth/reset-password').send({ token, newPassword: 'nouveau-mdp' }).expect(400);
  });

  it('refuse un lien inconnu et un mot de passe trop court', async () => {
    await anonymous()
      .post('/api/auth/reset-password')
      .send({ token: 'inconnu', newPassword: 'nouveau-mdp' })
      .expect(400);
    await anonymous().post('/api/auth/reset-password').send({ token: 'inconnu', newPassword: '123' }).expect(400);
  });

  it('ne révèle pas si un compte existe', async () => {
    const { parent } = await createFamily();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const known = await anonymous().post('/api/auth/forgot-password').send({ email: parent.email }).expect(200);
    const unknown = await anonymous().post('/api/auth/forgot-password').send({ email: 'x@example.test' }).expect(200);
    expect(known.body).toEqual(unknown.body);
  });

  it('limite les demandes par IP', async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i += 1) {
      await anonymous(ip).post('/api/auth/forgot-password').send({ email: 'x@example.test' }).expect(200);
    }
    await anonymous(ip).post('/api/auth/forgot-password').send({ email: 'x@example.test' }).expect(429);
  });
});

describe('santé', () => {
  it('répond sur / et /api/health', async () => {
    expect((await anonymous().get('/').expect(200)).body.status).toBe('ok');
    expect((await anonymous().get('/api/health').expect(200)).body.status).toBe('ok');
  });
});
