import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';

describe('requireAuth Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 if Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if Authorization header does not start with Bearer', async () => {
    const req = { headers: { authorization: 'Basic 12345' } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 if supabaseAdmin returns an error or no user', async () => {
    vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid JWT token'),
    });

    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next() on valid token', async () => {
    const mockUser = { id: 'usr-123', email: 'planner@example.com' };
    vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const req = { headers: { authorization: 'Bearer valid.jwt.token' } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
