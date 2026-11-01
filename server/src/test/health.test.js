import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('GET /api/health', () => {
  it('returns 200 OK with service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'utsav-api');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('returns 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
