import { describe, expect, it } from 'vitest';
import {
  anonymous,
  as,
  balanceOf,
  createChore,
  createFamily,
  getUser,
  prisma,
  setSettings,
  transactionsOf,
  useCleanDatabase,
} from './support/helpers';

useCleanDatabase();

const choreOf = (id: string) => prisma.chore.findUniqueOrThrow({ where: { id } });

describe('approbation de corvée', () => {
  it('crédite la récompense, trace la transaction et termine la corvée', async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id, { reward: 7.5, title: 'Aspirateur' });

    const res = await as(parent).patch(`/api/chores/${chore.id}/approve`);

    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(27.5);
    expect(await balanceOf(child.id)).toBe(27.5);
    expect((await choreOf(chore.id)).status).toBe('COMPLETED');
    const [transaction, ...others] = await transactionsOf(child.id);
    expect(others).toHaveLength(0);
    expect(transaction).toMatchObject({ amount: 7.5, type: 'CHORE', description: 'Corvée : Aspirateur' });
  });

  it('ne crédite pas deux fois une corvée déjà approuvée', async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id);

    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);
    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(409);

    expect(await balanceOf(child.id)).toBe(25);
    expect(await transactionsOf(child.id)).toHaveLength(1);
  });

  it("ne crédite qu'une fois sous des approbations simultanées", async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id);

    const results = await Promise.all(
      Array.from({ length: 8 }, () => as(parent).patch(`/api/chores/${chore.id}/approve`)),
    );

    expect(results.filter(r => r.status === 200)).toHaveLength(1);
    expect(results.filter(r => r.status === 409)).toHaveLength(7);
    expect(await balanceOf(child.id)).toBe(25);
    expect(await transactionsOf(child.id)).toHaveLength(1);
  });

  it.each(['PENDING', 'REJECTED', 'COMPLETED'])('refuse une corvée au statut %s sans bouger le solde', async status => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id, { status });

    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(409);

    expect(await balanceOf(child.id)).toBe(20);
    expect((await choreOf(chore.id)).status).toBe(status);
  });

  it('accepte une récompense nulle sans modifier le solde', async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id, { reward: 0 });
    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it("interdit à un enfant d'approuver sa propre corvée", async () => {
    const { child } = await createFamily();
    const chore = await createChore(child.id);
    await as(child).patch(`/api/chores/${chore.id}/approve`).expect(403);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it("interdit à un parent d'une autre famille d'approuver", async () => {
    const { child } = await createFamily();
    const other = await createFamily('Martin');
    const chore = await createChore(child.id);
    await as(other.parent).patch(`/api/chores/${chore.id}/approve`).expect(404);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('exige une session', async () => {
    const { child } = await createFamily();
    const chore = await createChore(child.id);
    await anonymous().patch(`/api/chores/${chore.id}/approve`).expect(401);
  });

  it('renvoie 404 pour une corvée inconnue', async () => {
    const { parent } = await createFamily();
    await as(parent).patch('/api/chores/inconnue/approve').expect(404);
  });

  it('alimente le compartiment dépense quand la répartition est désactivée', async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id);
    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);
    expect(await getUser(child.id)).toMatchObject({ spendBalance: 5, saveBalance: 0, giveBalance: 0 });
  });

  it('applique la répartition configurée', async () => {
    const { parent, child } = await createFamily();
    await setSettings(child.id, { splitEnabled: true, splitSavePct: 50, splitSpendPct: 30, splitGivePct: 20 });
    const chore = await createChore(child.id, { reward: 10 });
    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);
    expect(await getUser(child.id)).toMatchObject({ balance: 30, saveBalance: 5, spendBalance: 3, giveBalance: 2 });
  });
});

describe('refus de corvée', () => {
  it('enregistre le motif sans bouger le solde', async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id);

    await as(parent).patch(`/api/chores/${chore.id}/reject`).send({ reason: 'Pas fini' }).expect(200);

    expect(await choreOf(chore.id)).toMatchObject({ status: 'REJECTED', rejectionReason: 'Pas fini' });
    expect(await balanceOf(child.id)).toBe(20);
    expect(await transactionsOf(child.id)).toHaveLength(0);
  });

  it("ne permet plus d'approuver une corvée refusée", async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id);
    await as(parent).patch(`/api/chores/${chore.id}/reject`).send({}).expect(200);
    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(409);
    expect(await balanceOf(child.id)).toBe(20);
  });

  it('ne permet pas de refuser une corvée déjà approuvée', async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id);
    await as(parent).patch(`/api/chores/${chore.id}/approve`).expect(200);
    await as(parent).patch(`/api/chores/${chore.id}/reject`).send({}).expect(409);
    expect((await choreOf(chore.id)).status).toBe('COMPLETED');
  });

  it('est réservé aux parents de la famille', async () => {
    const { child } = await createFamily();
    const other = await createFamily('Martin');
    const chore = await createChore(child.id);
    await as(child).patch(`/api/chores/${chore.id}/reject`).send({}).expect(403);
    await as(other.parent).patch(`/api/chores/${chore.id}/reject`).send({}).expect(404);
    expect((await choreOf(chore.id)).status).toBe('SUBMITTED');
  });
});

describe('soumission de corvée', () => {
  const photo = 'data:image/jpeg;base64,QUJD';

  it('passe la corvée à SUBMITTED avec la note et la preuve', async () => {
    const { child } = await createFamily();
    const chore = await createChore(child.id, { status: 'PENDING' });

    await as(child).patch(`/api/chores/${chore.id}/submit`).send({ note: 'Fait !', proofImageUrl: photo }).expect(200);

    expect(await choreOf(chore.id)).toMatchObject({ status: 'SUBMITTED', note: 'Fait !', proofImageUrl: photo });
  });

  it('refuse une double soumission', async () => {
    const { child } = await createFamily();
    const chore = await createChore(child.id, { status: 'PENDING' });
    await as(child).patch(`/api/chores/${chore.id}/submit`).send({}).expect(200);
    await as(child).patch(`/api/chores/${chore.id}/submit`).send({}).expect(409);
  });

  it("est réservée à l'enfant assigné", async () => {
    const { parent, child, children } = await createFamily('Dupont', [{ name: 'Alice' }, { name: 'Bob' }]);
    const other = await createFamily('Martin');
    const chore = await createChore(child.id, { status: 'PENDING' });
    await as(parent).patch(`/api/chores/${chore.id}/submit`).send({}).expect(403);
    await as(children[1]).patch(`/api/chores/${chore.id}/submit`).send({}).expect(403);
    await as(other.child).patch(`/api/chores/${chore.id}/submit`).send({}).expect(404);
  });

  it.each([
    ['script javascript:', 'javascript:alert(1)'],
    ['SVG (peut embarquer du script)', 'data:image/svg+xml;base64,QUJD'],
    ['type non image', 'data:text/html;base64,QUJD'],
  ])('refuse une preuve dangereuse : %s', async (_label, proofImageUrl) => {
    const { child } = await createFamily();
    const chore = await createChore(child.id, { status: 'PENDING' });
    await as(child).patch(`/api/chores/${chore.id}/submit`).send({ proofImageUrl }).expect(400);
    expect((await choreOf(chore.id)).status).toBe('PENDING');
  });

  it('refuse une photo au-delà du plafond', async () => {
    const { child } = await createFamily();
    const chore = await createChore(child.id, { status: 'PENDING' });
    const proofImageUrl = `data:image/jpeg;base64,${'A'.repeat(700_000)}`;
    await as(child).patch(`/api/chores/${chore.id}/submit`).send({ proofImageUrl }).expect(400);
  });

  it('répond 413 en JSON à un corps de plus de 1 Mo', async () => {
    const { child } = await createFamily();
    const chore = await createChore(child.id, { status: 'PENDING' });
    const res = await as(child)
      .patch(`/api/chores/${chore.id}/submit`)
      .send({ note: 'x'.repeat(1_100_000) });
    expect(res.status).toBe(413);
    expect(res.body.error).toBeTruthy();
  });
});

describe('gestion des corvées', () => {
  const valid = (assigneeId: string) => ({ title: 'Poubelles', reward: 2.5, assigneeId, deadline: '2026-12-31' });

  it('crée une corvée pour un enfant de la famille', async () => {
    const { parent, child } = await createFamily();
    const res = await as(parent).post('/api/chores').send(valid(child.id)).expect(201);
    expect(res.body.chore).toMatchObject({ status: 'PENDING', reward: 2.5, assigneeId: child.id });
  });

  it("refuse d'assigner une corvée hors de la famille ou à un parent", async () => {
    const { parent } = await createFamily();
    const other = await createFamily('Martin');
    await as(parent).post('/api/chores').send(valid(other.child.id)).expect(404);
    await as(parent).post('/api/chores').send(valid(parent.id)).expect(404);
  });

  it("n'interprète pas un objet comme un filtre Prisma", async () => {
    const { parent } = await createFamily();
    await as(parent)
      .post('/api/chores')
      .send({ ...valid('x'), assigneeId: { not: '' } })
      .expect(400);
  });

  it('est réservée aux parents', async () => {
    const { child } = await createFamily();
    await as(child).post('/api/chores').send(valid(child.id)).expect(403);
  });

  it.each([[-1], ['12abc'], [1.234], [1_000_001], [null], ['']])('refuse la récompense %j', async reward => {
    const { parent, child } = await createFamily();
    await as(parent)
      .post('/api/chores')
      .send({ ...valid(child.id), reward })
      .expect(400);
  });

  it('accepte un montant numérique envoyé en chaîne', async () => {
    const { parent, child } = await createFamily();
    const res = await as(parent)
      .post('/api/chores')
      .send({ ...valid(child.id), reward: '3.50' })
      .expect(201);
    expect(res.body.chore.reward).toBe(3.5);
  });

  it('modifie une corvée de la famille', async () => {
    const { parent, child } = await createFamily();
    const chore = await createChore(child.id, { status: 'PENDING' });
    const res = await as(parent).patch(`/api/chores/${chore.id}`).send({ title: 'Nouveau', reward: 9 }).expect(200);
    expect(res.body.chore).toMatchObject({ title: 'Nouveau', reward: 9, deadline: chore.deadline });
  });

  it("supprime une corvée de la famille, pas celle d'une autre", async () => {
    const { parent, child } = await createFamily();
    const other = await createFamily('Martin');
    const chore = await createChore(child.id, { status: 'PENDING' });
    await as(other.parent).delete(`/api/chores/${chore.id}`).expect(404);
    await as(parent).delete(`/api/chores/${chore.id}`).expect(200);
    expect(await prisma.chore.count()).toBe(0);
  });

  it('ne liste que les corvées de la famille', async () => {
    const { parent, child } = await createFamily();
    const other = await createFamily('Martin');
    const mine = await createChore(child.id);
    await createChore(other.child.id);
    const res = await as(parent).get('/api/chores').expect(200);
    expect(res.body.chores.map((c: { id: string }) => c.id)).toEqual([mine.id]);
  });
});
