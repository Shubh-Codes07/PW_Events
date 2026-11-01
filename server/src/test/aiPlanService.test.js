import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePlan, planCache } from '../services/aiPlanService.js';
import { env } from '../config/env.js';

describe('AI Plan Service with Gemini mock', () => {
  const originalKey = env.GEMINI_API_KEY;
  const mockEvent = {
    type: 'wedding',
    name: 'Rohit & Simran Wedding',
    event_date: '2026-11-20',
    city: 'Jaipur',
    guest_count: 200,
    budget_total: 800000,
    vibe: 'Grand',
    special_needs: { tags: ['vegetarian_only'], notes: '' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterEach(() => {
    env.GEMINI_API_KEY = originalKey;
  });

  it('handles valid Gemini structured JSON response successfully', async () => {
    const geminiPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  summary: 'An opulent royal Jaipur celebration with heritage grandeur.',
                  budget_categories: [
                    { name: 'Palace Venue', planned_amount: 300000 },
                    { name: 'Royal Feast Catering', planned_amount: 250000 },
                    { name: 'Heritage Photography', planned_amount: 100000 },
                    { name: 'Floral Mandap', planned_amount: 100000 },
                    { name: 'Folk Music & DJ', planned_amount: 50000 },
                  ],
                  tasks: [
                    { title: 'Book palace banquet', days_before_event: 90, category: 'Venue', priority: 1 },
                    { title: 'Tasting menu signoff', days_before_event: 60, category: 'Catering', priority: 1 },
                    { title: 'Arrange folk dancers', days_before_event: 30, category: 'Music', priority: 2 },
                  ],
                  vendors: [
                    { category: 'Heritage Venue' },
                    { category: 'Royal Caterer' },
                    { category: 'Photographer' },
                  ],
                }),
              },
            ],
          },
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => geminiPayload,
      }),
    );

    const plan = await generatePlan(mockEvent);

    expect(plan.summary).toBe('An opulent royal Jaipur celebration with heritage grandeur.');
    expect(plan.budget_categories).toHaveLength(5);
    const sum = plan.budget_categories.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(800000);
    expect(plan.tasks[0]).toHaveProperty('due_date');
  });

  it('handles malformed JSON from Gemini and falls back safely to deterministic plan', async () => {
    // Return malformed JSON that fails JSON.parse on both tries
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Here is your plan: { incomplete json' }] } }],
        }),
      }),
    );

    const eventToPlan = { ...mockEvent, guest_count: 321 };
    const plan = await generatePlan(eventToPlan);

    // Should return fallback plan without throwing
    expect(plan).toBeDefined();
    expect(plan.budget_categories.length).toBeGreaterThanOrEqual(4);
    const sum = plan.budget_categories.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(800000);
  });

  it('handles Gemini HTTP 500 API errors gracefully using fallback plan', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal Gemini Server Error' } }),
      }),
    );

    const eventToPlan = { ...mockEvent, guest_count: 555 };
    const plan = await generatePlan(eventToPlan);

    expect(plan).toBeDefined();
    expect(plan.summary).toContain('wedding');
    const sum = plan.budget_categories.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(800000);
  });
});
