import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  generateIdeasSchema,
  assistantMessageSchema,
} from '../schemas/step4Schemas.js';
import {
  getDeterministicIdeas,
  buildAssistantContext,
  generateIdeasForKind,
} from '../services/aiIdeasAndAssistantService.js';

describe('Step 4 Backend Features & Security Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Gemini API offline in test'));
  });

  describe('1. Ideas Generation Schema & Curated Fallback', () => {
    it('validates idea categories strictly and rejects unknown kinds', () => {
      const valid = generateIdeasSchema.safeParse({ kind: 'theme', refine: 'Make it cheaper' });
      expect(valid.success).toBe(true);

      const invalidKind = generateIdeasSchema.safeParse({ kind: 'spaceship' });
      expect(invalidKind.success).toBe(false);
      expect(invalidKind.error.issues[0].message).toMatch(/invalid option|expected one of/i);
    });

    it('returns deterministic curated ideas when Gemini is unavailable', async () => {
      const mockEvent = {
        id: 'ev-1',
        name: 'Priya & Rohan Sangeet',
        type: 'wedding',
        vibe: 'Festive & Royal',
        city: 'Jaipur',
        guest_count: 200,
        budget_total: 1000000,
      };

      const ideas = await generateIdeasForKind(mockEvent, 'theme');
      expect(ideas).toBeDefined();
      expect(Array.isArray(ideas)).toBe(true);
      expect(ideas.length).toBeGreaterThanOrEqual(3);
      expect(ideas[0]).toHaveProperty('title');
      expect(ideas[0]).toHaveProperty('body');
      expect(ideas[0]).toHaveProperty('estimated_cost_inr');
      expect(typeof ideas[0].estimated_cost_inr).toBe('number');
    });

    it('applies refine directives (cheaper, traditional, fun) correctly in curated library', () => {
      const mockEvent = {
        id: 'ev-2',
        name: 'Kabir 1st Birthday',
        type: 'birthday',
        guest_count: 50,
        budget_total: 100000,
      };

      const standardIdeas = getDeterministicIdeas(mockEvent, 'theme');
      const cheapIdeas = getDeterministicIdeas(mockEvent, 'theme', 'Make it cheaper');

      expect(cheapIdeas[0].title).toMatch(/Budget-Friendly/i);
      expect(cheapIdeas[0].estimated_cost_inr).toBeLessThan(standardIdeas[0].estimated_cost_inr);
    });
  });

  describe('2. Assistant Request Validation', () => {
    it('enforces maximum 500 characters for user message', () => {
      const validMsg = assistantMessageSchema.safeParse({
        message: 'Can I reallocate 20000 from decor to catering?',
        history: [],
      });
      expect(validMsg.success).toBe(true);

      const tooLongMsg = assistantMessageSchema.safeParse({
        message: 'A'.repeat(501),
        history: [],
      });
      expect(tooLongMsg.success).toBe(false);
      expect(tooLongMsg.error.issues[0].message).toMatch(/cannot exceed 500 characters/i);
    });

    it('enforces maximum 6 turns of conversation history', () => {
      const turns = Array.from({ length: 7 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Turn ${i}`,
      }));

      const rejected = assistantMessageSchema.safeParse({
        message: 'Hello',
        history: turns,
      });
      expect(rejected.success).toBe(false);
      expect(rejected.error.issues[0].message).toMatch(/cannot exceed 6 turns/i);
    });
  });

  describe('3. Assistant Context Builder & Event Data Isolation', () => {
    it('builds context strictly bound to the target event with no foreign leakage', () => {
      const targetEvent = {
        id: 'event-isolated-123',
        name: 'Diwali Mela',
        type: 'community',
        event_date: '2026-11-10',
        city: 'Ahmedabad',
        guest_count: 500,
        vibe: 'Vibrant & Cultural',
      };

      const contextData = {
        totalBudget: 400000,
        totalSpent: 150000,
        categoriesWithSpend: [
          { name: 'Stalls & Food', planned_amount: 200000, spent: 100000 },
          { name: 'Sound & Stage', planned_amount: 100000, spent: 50000 },
        ],
        tasks: [
          { id: 't1', title: 'Get municipal permission', status: 'done', due_date: '2026-10-20' },
          { id: 't2', title: 'Book generator backup', status: 'todo', due_date: '2026-10-15' },
        ],
        vendors: [
          { id: 'v1', name: 'DJ Soundwaves', status: 'booked' },
          { id: 'v2', name: 'Sharma Tent House', status: 'to_contact' },
        ],
      };

      const built = buildAssistantContext(targetEvent, contextData);

      expect(built.event_id).toBe('event-isolated-123');
      expect(built.event_name).toBe('Diwali Mela');
      expect(built.financials.total_budget_inr).toBe(400000);
      expect(built.financials.total_spent_inr).toBe(150000);
      expect(built.financials.remaining_inr).toBe(250000);
      expect(built.timeline.open_tasks).toBe(1);
      expect(built.timeline.overdue_tasks).toBe(1);
      expect(built.vendors.booked).toBe(1);
      expect(built.vendors.to_contact).toBe(1);

      // Verify no leak of credentials, secrets, or internal user tokens
      expect(built).not.toHaveProperty('created_by');
      expect(built).not.toHaveProperty('user_id');
      expect(built).not.toHaveProperty('share_token');
    });
  });

  describe('4. Shared Plan Endpoint Security (Zero Leakage)', () => {
    it('returns ONLY safe public fields and excludes all budget and contact data', async () => {
      const fakeShareToken = 'abcdef1234567890abcdef1234567890';

      vi.spyOn(supabaseAdmin, 'from').mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'ev-share-1',
                name: 'Ananya & Vikram Wedding',
                type: 'wedding',
                event_date: '2026-12-15',
                city: 'Udaipur',
                guest_count: 250,
                vibe: 'Grand Heritage',
                // Sensitive internal fields that should NOT be in response
                budget_total: 2500000,
                created_by: 'secret-user-guid-999',
                notes: 'Strictly confidential family budget discussion',
              },
              error: null,
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { title: 'Book Mehendi Artist', due_date: '2026-11-20', category: 'Decor', status: 'done' },
                { title: 'Sangeet Choreography Practice', due_date: '2026-12-01', category: 'Entertainment', status: 'todo' },
              ],
              error: null,
            }),
          };
        }
        if (table === 'vendors') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                { name: 'Royal Palace Caterers', category: 'Catering', status: 'booked' },
              ],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
        };
      });

      const res = await request(app).get(`/api/shared/${fakeShareToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const returnedEvent = res.body.data.event;
      expect(returnedEvent.name).toBe('Ananya & Vikram Wedding');
      expect(returnedEvent.city).toBe('Udaipur');
      expect(returnedEvent.guest_count).toBe(250);

      // SECURITY CRITICAL ASSERTIONS: Sensitive data must NEVER be present
      expect(returnedEvent).not.toHaveProperty('budget_total');
      expect(returnedEvent).not.toHaveProperty('created_by');
      expect(returnedEvent).not.toHaveProperty('notes');
      expect(res.body.data).not.toHaveProperty('expenses');
      expect(res.body.data).not.toHaveProperty('budget_categories');

      // Tasks and vendors must only contain sanitized fields
      expect(res.body.data.tasks[0]).toHaveProperty('title');
      expect(res.body.data.tasks[0]).not.toHaveProperty('assigned_to');
      expect(res.body.data.vendors[0]).toHaveProperty('name');
      expect(res.body.data.vendors[0]).not.toHaveProperty('phone');
      expect(res.body.data.vendors[0]).not.toHaveProperty('email');
      expect(res.body.data.vendors[0]).not.toHaveProperty('quoted_amount');
    });

    it('returns 404 for missing or short token', async () => {
      const res = await request(app).get('/api/shared/short');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Share Token Rotation', () => {
    it('rotates share token on authenticated owner request', async () => {
      vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'owner-user-1', email: 'owner@utsav.app' } },
        error: null,
      });

      vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            // getOwnedEvent check
            data: { id: 'event-rot-1', created_by: 'owner-user-1', name: 'My Event' },
            error: null,
          })
          .mockResolvedValueOnce({
            // update check
            data: { id: 'event-rot-1', share_token: 'new-rotated-token-1234567890' },
            error: null,
          }),
      });

      const res = await request(app)
        .post('/api/events/event-rot-1/regenerate-share-token')
        .set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('share_token');
      expect(typeof res.body.data.share_token).toBe('string');
    });
  });
});
