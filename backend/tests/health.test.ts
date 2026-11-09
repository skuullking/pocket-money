import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $queryRaw = queryRaw;
  },
}));

import app from '../src/server';

describe('GET /api/health', () => {
  it('répond 200 quand la base répond', async () => {
    queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('répond 503 quand la base est injoignable', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connexion refusée'));
    const res = await request(app).get('/api/health').expect(503);
    expect(res.body.status).toBe('unavailable');
  });
});
