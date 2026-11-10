import { describe, it } from 'vitest';
import { anonymous, as, createFamily, ORIGIN, PASSWORD, useCleanDatabase } from './support/helpers';

useCleanDatabase();

const NEW_PASSWORD = 'nouveau-secret';
const reset = (actor: { id: string }, childId: string, newPassword: unknown = NEW_PASSWORD) =>
  as(actor).put(`/api/children/${childId}/password`).set('Origin', ORIGIN).send({ newPassword });

describe('rÃ©initialisation du mot de passe enfant', () => {
  it('le parent dÃ©finit un mot de passe avec lequel lâ€™enfant se connecte', async () => {
    const { parent, child, family } = await createFamily();
    await reset(parent, child.id).expect(200);

    const login = (password: string) =>
      anonymous().post('/api/auth/login').send({ email: child.name, inviteCode: family.inviteCode, password });
    await login(NEW_PASSWORD).expect(200);
    await login(PASSWORD).expect(401);
  });

  it('un enfant ne peut pas changer un mot de passe', async () => {
    const { child } = await createFamily();
    await reset(child, child.id).expect(403);
  });

  it('un parent ne peut pas viser lâ€™enfant dâ€™une autre famille', async () => {
    const { parent } = await createFamily('Dupont');
    const { child: other } = await createFamily('Martin');
    await reset(parent, other.id).expect(404);
  });

  it('un parent ne peut pas viser un autre parent via cette route', async () => {
    const { parent } = await createFamily();
    await reset(parent, parent.id).expect(404);
  });

  it.each([
    ['trop court', '12345'],
    ['trop long', 'x'.repeat(73)],
    ['absent', undefined],
  ])('refuse un mot de passe %s', async (_label, value) => {
    const { parent, child } = await createFamily();
    await as(parent)
      .put(`/api/children/${child.id}/password`)
      .set('Origin', ORIGIN)
      .send({ newPassword: value })
      .expect(400);
  });
});
