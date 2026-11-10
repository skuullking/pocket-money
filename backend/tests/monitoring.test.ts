import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique };
  },
}));

import { createErrorRateAlarm, isIncident, logger, scrubEvent, sendAlert } from '../src/monitoring';
import app from '../src/server';

const named = (name: string, code?: string) => Object.assign(new Error('secret interne'), { name, code });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isIncident', () => {
  it.each([
    [named('PrismaClientInitializationError')],
    [named('PrismaClientRustPanicError')],
    [named('PrismaClientKnownRequestError', 'P1001')],
    [named('PrismaClientKnownRequestError', 'P2024')],
  ])('%s est un incident', error => {
    expect(isIncident(error)).toBe(true);
  });

  it.each([[new Error('Solde insuffisant')], [named('PrismaClientKnownRequestError', 'P2025')]])(
    "%s n'en est pas un",
    error => {
      expect(isIncident(error)).toBe(false);
    },
  );
});

describe('confidentialité', () => {
  it('retire la requête et l’utilisateur des événements Sentry', () => {
    const event = scrubEvent({ request: { data: 'photo' }, user: { id: '1' }, message: 'boom' });
    expect(event).toEqual({ message: 'boom' });
  });

  it('écrit une ligne JSON', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    logger.info('démarrage', { port: 3001 });
    expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({
      level: 'info',
      message: 'démarrage',
      port: 3001,
    });
  });
});

describe('panne de base de données', () => {
  it('répond 500 sans détailler la cause au client', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    findUnique.mockRejectedValueOnce(named('PrismaClientInitializationError'));
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.200.0.1')
      .send({ email: 'a@example.test', password: 'x' })
      .expect(500);
    expect(JSON.stringify(res.body)).not.toContain('secret interne');
  });
});

describe('alerte sur les erreurs 5xx', () => {
  const MINUTE = 60_000;

  it('prévient une fois le seuil atteint, puis respecte le délai', () => {
    const alert = vi.fn();
    const record = createErrorRateAlarm(3, alert);
    record(0);
    record(MINUTE);
    expect(alert).not.toHaveBeenCalled();
    record(2 * MINUTE);
    expect(alert).toHaveBeenCalledTimes(1);
    record(3 * MINUTE);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('oublie les erreurs sorties de la fenêtre', () => {
    const alert = vi.fn();
    const record = createErrorRateAlarm(3, alert);
    record(0);
    record(MINUTE);
    record(10 * MINUTE);
    expect(alert).not.toHaveBeenCalled();
  });
});

describe('sendAlert', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('ne fait rien sans webhook', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('ALERT_WEBHOOK_URL', '');
    await sendAlert('panne');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('survit à un webhook injoignable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    vi.stubEnv('ALERT_WEBHOOK_URL', 'https://hooks.example.test/x');
    await expect(sendAlert('panne')).resolves.toBeUndefined();
  });
});
