import { afterEach, describe, expect, it, vi } from 'vitest';

const respond = (body, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });

const loadApi = async apiUrl => {
  vi.resetModules();
  vi.stubEnv('VITE_API_URL', apiUrl ?? '');
  return import('../src/api');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('fetchAPI', () => {
  it('envoie le cookie de session et du JSON', async () => {
    const { goalsAPI } = await loadApi('https://api.test/api');
    const fetchMock = respond({ goal: {} });
    vi.stubGlobal('fetch', fetchMock);

    await goalsAPI.fundGoal('g1', { amount: 5 });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/goals/g1/fund');
    expect(options).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ amount: 5 }),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('renvoie les données de la réponse', async () => {
    const { authAPI } = await loadApi();
    vi.stubGlobal('fetch', respond({ user: { id: 'u1' } }));
    await expect(authAPI.getMe()).resolves.toEqual({ user: { id: 'u1' } });
  });

  it("remonte le message d'erreur du serveur", async () => {
    const { goalsAPI } = await loadApi();
    vi.stubGlobal('fetch', respond({ error: 'Solde insuffisant' }, false));
    await expect(goalsAPI.fundGoal('g1', { amount: 5 })).rejects.toThrow('Solde insuffisant');
  });

  it('a un message par défaut', async () => {
    const { goalsAPI } = await loadApi();
    vi.stubGlobal('fetch', respond({}, false));
    await expect(goalsAPI.getGoals()).rejects.toThrow('Something went wrong');
  });
});

describe('routes appelées', () => {
  it.each([
    ['choresAPI', 'approveChore', ['c1'], '/chores/c1/approve', 'PATCH'],
    ['choresAPI', 'rejectChore', ['c1', { reason: 'x' }], '/chores/c1/reject', 'PATCH'],
    ['choresAPI', 'submitChore', ['c1', {}], '/chores/c1/submit', 'PATCH'],
    ['goalsAPI', 'withdrawGoal', ['g1', { amount: 1 }], '/goals/g1/withdraw', 'POST'],
    ['goalsAPI', 'buyGoal', ['g1'], '/goals/g1/buy', 'PUT'],
    ['expensesAPI', 'approve', ['e1', {}], '/expenses/e1/approve', 'PUT'],
    ['expensesAPI', 'reject', ['e1', {}], '/expenses/e1/reject', 'PUT'],
    ['expensesAPI', 'deduct', [{}], '/expenses/deduct', 'POST'],
    ['rulesAPI', 'applyPenalty', ['r1', { childId: 'c1' }], '/rules/r1/apply', 'POST'],
    ['childSettingsAPI', 'update', ['c1', {}], '/children/c1/settings', 'PUT'],
    ['childSettingsAPI', 'updateSplit', ['c1', {}], '/children/c1/split-settings', 'PUT'],
    ['allowanceAPI', 'update', ['c1', {}], '/children/c1/allowance', 'PUT'],
    ['familyAPI', 'removeChild', ['c1'], '/children/c1', 'DELETE'],
    ['familyAPI', 'deleteFamily', ['pw'], '/family', 'DELETE'],
  ])('%s.%s', async (group, method, args, path, httpMethod) => {
    const api = await loadApi('https://api.test/api');
    const fetchMock = respond({});
    vi.stubGlobal('fetch', fetchMock);

    await api[group][method](...args);

    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.test/api${path}`);
    expect(fetchMock.mock.calls[0][1].method).toBe(httpMethod);
  });
});

describe('SOCKET_URL', () => {
  it.each([
    ['https://api.test/api', 'https://api.test'],
    ['https://api.test/api/', 'https://api.test'],
    ['/api', undefined],
  ])('pour %s vaut %s', async (apiUrl, expected) => {
    const { SOCKET_URL } = await loadApi(apiUrl);
    expect(SOCKET_URL).toBe(expected);
  });
});
