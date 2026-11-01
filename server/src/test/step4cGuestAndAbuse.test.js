import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { supabaseAdmin } from '../lib/supabase.js';

describe('Step 4c Server Abuse Protection & Anonymous Auth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Anonymous Token Acceptance', () => {
    it('accepts valid anonymous tokens via requireAuth and attaches user to request', async () => {
      // Mock Supabase getUser returning an anonymous user
      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: 'anon-user-uuid-1234',
            is_anonymous: true,
            role: 'authenticated',
          },
        },
        error: null,
      });

      // Mock fetching events for this user (empty list)
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const res = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer valid-anonymous-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Cross-User Event Access Isolation for Anonymous Accounts', () => {
    it('strictly denies anonymous user access to other users\' events with 404', async () => {
      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: 'anon-user-alice',
            is_anonymous: true,
          },
        },
        error: null,
      });

      // Mock getOwnedEvent returning null because owner_id !== 'anon-user-alice'
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Row not found') }),
      });

      const res = await request(app)
        .get('/api/events/bob-private-event-id')
        .set('Authorization', 'Bearer valid-anon-token');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('3. Event Creation Abuse Cap (10 Events Limit)', () => {
    it('rejects event creation with 429 when user already owns 10 events', async () => {
      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: 'frequent-creator-id',
            is_anonymous: true,
          },
        },
        error: null,
      });

      // Mock counting existing events to return 10
      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      const eventDate = futureDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer valid-jwt')
        .send({
          type: 'birthday',
          name: '11th Celebration Attempt',
          event_date: eventDate,
          city: 'Mumbai',
          guest_count: 50,
          budget_total: 100000,
          vibe: 'Modern',
          special_needs: { tags: [], notes: '' },
        });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EVENT_LIMIT_REACHED');
      expect(res.body.error.message).toMatch(/maximum 10 events/i);
    });

    it('allows event creation when user owns fewer than 10 events', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Mock AI offline in test'));

      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: 'new-user-id',
            is_anonymous: true,
          },
        },
        error: null,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      const eventDate = futureDate.toISOString().split('T')[0];

      // Mock count returning 2 events
      let fromCallCount = 0;
      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          fromCallCount++;
          if (fromCallCount === 1) {
            // Count query
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
            };
          }
          // Insert query
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'new-ev-id',
                name: 'Legitimate 3rd Event',
                owner_id: 'new-user-id',
              },
              error: null,
            }),
          };
        }
        // categories, tasks, vendors
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer valid-jwt')
        .send({
          type: 'birthday',
          name: 'Legitimate 3rd Event',
          event_date: eventDate,
          city: 'Mumbai',
          guest_count: 50,
          budget_total: 100000,
          vibe: 'Modern',
          special_needs: { tags: [], notes: '' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event.id).toBe('new-ev-id');
    });

    it('proceeds with event creation and sets authenticated user as owner if count query errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Mock AI offline in test'));

      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: {
          user: {
            id: 'resilient-user-id',
            is_anonymous: true,
          },
        },
        error: null,
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      const eventDate = futureDate.toISOString().split('T')[0];

      let fromCallCount = 0;
      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          fromCallCount++;
          if (fromCallCount === 1) {
            // Count query returns database error
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockResolvedValue({ count: null, error: new Error('Count timeout') }),
            };
          }
          // Insert query
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'degraded-ev-id',
                name: 'Degraded Count Event',
                owner_id: 'resilient-user-id',
              },
              error: null,
            }),
          };
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      });

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer valid-jwt')
        .send({
          type: 'community',
          name: 'Degraded Count Event',
          event_date: eventDate,
          city: 'Delhi',
          guest_count: 80,
          budget_total: 150000,
          vibe: 'Traditional',
          special_needs: { tags: [], notes: '' },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event.id).toBe('degraded-ev-id');
      expect(res.body.data.event.owner_id).toBe('resilient-user-id');
    });
  });
});
