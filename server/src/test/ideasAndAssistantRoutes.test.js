import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { supabaseAdmin } from '../lib/supabase.js';

describe('Ideas and Assistant Routes', () => {
  const mockUser = {
    id: 'user-ideas-123',
    email: 'planner@utsav.app',
  };

  const mockEvent = {
    id: 'event-ideas-456',
    owner_id: mockUser.id,
    name: 'Diwali Gala 2026',
    type: 'community',
    event_date: '2026-11-10',
    city: 'Bengaluru',
    guest_count: 150,
    budget_total: 300000,
    vibe: 'Traditional & Warm',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Gemini API offline in test'));

    // Mock authentication
    vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('GET /api/events/:id/ideas', () => {
    it('returns 404 if event is not found or user is not owner', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      });

      const res = await request(app)
        .get(`/api/events/${mockEvent.id}/ideas`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns list of ideas for owned event', async () => {
      const mockIdeas = [
        { id: 'idea-1', title: 'Terracotta Diyas', saved: true, kind: 'decor' },
        { id: 'idea-2', title: 'Live Sitar & Flute', saved: false, kind: 'entertainment' },
      ];

      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'ideas') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            then: (resolve) => resolve({ data: mockIdeas, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const res = await request(app)
        .get(`/api/events/${mockEvent.id}/ideas`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].title).toBe('Terracotta Diyas');
    });
  });

  describe('POST /api/events/:id/ideas/generate', () => {
    it('rejects invalid idea kind with 400 validation error', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
      });

      const res = await request(app)
        .post(`/api/events/${mockEvent.id}/ideas/generate`)
        .set('Authorization', 'Bearer valid-jwt')
        .send({ kind: 'invalid_unsupported_kind' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('generates and persists ideas for valid kind using curated fallback when AI is offline', async () => {
      const insertedRows = [
        { id: 'gen-1', title: 'Community Feast', body: 'Khichdi counter', saved: false },
      ];

      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'ideas') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockResolvedValue({ data: insertedRows, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const res = await request(app)
        .post(`/api/events/${mockEvent.id}/ideas/generate`)
        .set('Authorization', 'Bearer valid-jwt')
        .send({ kind: 'menu', refine: 'Make it traditional' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].title).toBe('Community Feast');
    });
  });

  describe('PATCH & DELETE /api/events/:id/ideas/:ideaId', () => {
    it('toggles idea saved state via PATCH', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'ideas') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'idea-1', saved: true },
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      const res = await request(app)
        .patch(`/api/events/${mockEvent.id}/ideas/idea-1`)
        .set('Authorization', 'Bearer valid-jwt')
        .send({ saved: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.saved).toBe(true);
    });

    it('deletes an idea via DELETE', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'ideas') {
          const chain = {};
          chain.delete = vi.fn().mockReturnValue(chain);
          chain.eq = vi.fn().mockReturnValue(chain);
          chain.then = (resolve) => resolve({ error: null });
          return chain;
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      const res = await request(app)
        .delete(`/api/events/${mockEvent.id}/ideas/idea-1`)
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Idea deleted');
    });
  });

  describe('POST /api/events/:id/assistant', () => {
    it('rejects user message exceeding 500 characters', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
      });

      const res = await request(app)
        .post(`/api/events/${mockEvent.id}/assistant`)
        .set('Authorization', 'Bearer valid-jwt')
        .send({
          message: 'X'.repeat(501),
          history: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('gathers event context and returns assistant fallback response when AI is offline', async () => {
      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
          };
        }
        if (table === 'budget_categories') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'cat-1', name: 'Decor', planned_amount: 50000 }],
              error: null,
            }),
          };
        }
        if (table === 'expenses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'exp-1', category_id: 'cat-1', amount: 20000 }],
              error: null,
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 't-1', title: 'Book priest', status: 'todo' }],
              error: null,
            }),
          };
        }
        if (table === 'vendors') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'v-1', name: 'Shree Caterers', status: 'booked' }],
              error: null,
            }),
          };
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
      });

      const res = await request(app)
        .post(`/api/events/${mockEvent.id}/assistant`)
        .set('Authorization', 'Bearer valid-jwt')
        .send({
          message: 'How is my decor budget doing?',
          history: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('reply');
      expect(typeof res.body.data.reply).toBe('string');
      expect(res.body.data.reply.length).toBeGreaterThan(10);
    });
  });
});
