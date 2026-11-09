import { afterEach, describe, expect, it, vi } from 'vitest';
import { readAuthCookie } from '../src/authCookie';
import {
  goalAmountSchema,
  parseBody,
  registerChildSchema,
  splitSettingsSchema,
  submitChoreSchema,
} from '../src/validation';
import { assertTestDatabase } from './support/testDatabase';
import { assertStrongSecret } from '../src/config';

describe('readAuthCookie', () => {
  it.each([
    ['pm_session=abc', 'abc'],
    ['autre=1; pm_session=abc; encore=2', 'abc'],
    ['  pm_session = abc ', 'abc'],
    ['pm_session=a=b=c', 'a=b=c'],
  ])('lit %s', (header, expected) => {
    expect(readAuthCookie(header)).toBe(expected);
  });

  it.each([[undefined], [''], ['autre=1'], ['xpm_session=abc']])('ne trouve rien dans %j', header => {
    expect(readAuthCookie(header)).toBeUndefined();
  });
});

describe('validation des montants', () => {
  it.each([[1], [0.01], ['1.5'], [' 2 '], [1_000_000]])('accepte %j', amount => {
    expect(goalAmountSchema.safeParse({ amount }).success).toBe(true);
  });

  it.each([
    [0],
    [-0.01],
    [1.001],
    [1_000_000.01],
    ['1e3'],
    ['0x10'],
    ['12abc'],
    [''],
    [null],
    [true],
    [[]],
    [{}],
    [Infinity],
    [NaN],
  ])('refuse %j', amount => {
    expect(goalAmountSchema.safeParse({ amount }).success).toBe(false);
  });

  it('convertit les chaînes en nombres', () => {
    expect(goalAmountSchema.parse({ amount: '3.50' })).toEqual({ amount: 3.5 });
  });
});

describe('validation des preuves photo', () => {
  it.each(['data:image/png;base64,QUJD', 'data:image/webp;base64,QUJD', 'https://example.test/a.jpg', '', null])(
    'accepte %j',
    proofImageUrl => {
      expect(submitChoreSchema.safeParse({ proofImageUrl }).success).toBe(true);
    },
  );

  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml;base64,QUJD',
    'data:image/png;base64,<script>',
    'ftp://example.test/a',
  ])('refuse %s', proofImageUrl => {
    expect(submitChoreSchema.safeParse({ proofImageUrl }).success).toBe(false);
  });

  it('transforme un champ vide en null', () => {
    expect(submitChoreSchema.parse({ proofImageUrl: '' }).proofImageUrl).toBeNull();
  });
});

describe('parseBody', () => {
  const response = () => {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
  };

  it('renvoie les données et retire les champs inconnus', () => {
    const res = response();
    const parsed = parseBody(goalAmountSchema, { body: { amount: 1, balance: 9999 } }, res as never);
    expect(parsed).toEqual({ amount: 1 });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('répond 400 avec un message lisible', () => {
    const res = response();
    expect(parseBody(goalAmountSchema, { body: {} }, res as never)).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Champ requis : montant' });
  });

  it.each([[undefined], ['texte'], [[]]])('refuse un corps %j', body => {
    const res = response();
    expect(parseBody(goalAmountSchema, { body }, res as never)).toBeNull();
    expect(res.json).toHaveBeenCalledWith({ error: 'Corps de requête invalide' });
  });
});

describe('autres schémas', () => {
  it("accepte l'âge en chaîne", () => {
    expect(registerChildSchema.parse({ name: 'Zoé', password: 'password', inviteCode: 'ABC', age: '9' }).age).toBe(9);
  });

  it('traite un pourcentage vide comme 0', () => {
    expect(splitSettingsSchema.parse({ splitSavePct: '', splitSpendPct: 100, splitGivePct: '' })).toMatchObject({
      splitSavePct: 0,
      splitGivePct: 0,
    });
  });
});

describe('garde-fou de la base de test', () => {
  it('refuse toute base dont le nom ne contient pas « test »', () => {
    expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/pocketmoney')).toThrow();
    expect(assertTestDatabase('postgresql://u:p@localhost:5432/pocketmoney_test')).toContain('_test');
  });
});

describe('configuration de démarrage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const importServer = () => {
    vi.resetModules();
    return import('../src/server');
  };

  it('refuse de démarrer en production sans JWT_SECRET', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', '');
    await expect(importServer()).rejects.toThrow(/JWT_SECRET/);
  });

  it('refuse de démarrer en production sans CLIENT_URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CLIENT_URL', '');
    await expect(importServer()).rejects.toThrow(/CLIENT_URL/);
  });

  it('refuse SameSite=None sans HTTPS', async () => {
    vi.stubEnv('COOKIE_SAMESITE', 'none');
    await expect(importServer()).rejects.toThrow(/https/);
  });

  it.each([['-1'], ['abc']])('refuse TRUST_PROXY_HOPS=%s', async hops => {
    vi.stubEnv('TRUST_PROXY_HOPS', hops);
    await expect(importServer()).rejects.toThrow(/TRUST_PROXY_HOPS/);
  });

  it('refuse un fuseau horaire invalide', async () => {
    vi.stubEnv('APP_TIMEZONE', 'Mars/Olympus');
    await expect(importServer()).rejects.toThrow();
  });
});

describe('assertStrongSecret', () => {
  it.each(['change-me-in-production', 'your-super-secret-jwt-key-change-in-production', 'court'])('refuse %s', value => {
    expect(() => assertStrongSecret('JWT_SECRET', value)).toThrow();
  });

  it('accepte un secret généré', () => {
    expect(() => assertStrongSecret('JWT_SECRET', 'a1'.repeat(32))).not.toThrow();
  });
});
