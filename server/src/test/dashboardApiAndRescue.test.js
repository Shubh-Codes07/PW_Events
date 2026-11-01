import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  rescueBudget,
  getDeterministicBudgetRescue,
  draftVendorEnquiry,
  getDeterministicVendorEnquiry,
} from '../services/aiRescueAndEnquiryService.js';
import {
  createExpenseSchema,
  createTaskSchema,
  createVendorSchema,
} from '../schemas/dashboardSchemas.js';

describe('Server Ownership Checks & API Security', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects access to another user\'s event with 404', async () => {
    // Mock requireAuth to authenticate as user-A
    vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'user-A', email: 'userA@utsav.app' } },
      error: null,
    });

    // Mock supabaseAdmin query to return no event (event belongs to user-B)
    vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Row not found') }),
    });

    const res = await request(app)
      .get('/api/events/other-user-event-id')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('blocks expense creation on non-owned events', async () => {
    vi.spyOn(supabaseAdmin.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'user-A', email: 'userA@utsav.app' } },
      error: null,
    });

    vi.spyOn(supabaseAdmin, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Row not found') }),
    });

    const res = await request(app)
      .post('/api/events/not-my-event/expenses')
      .set('Authorization', 'Bearer valid-token')
      .send({ description: 'Flowers advance', amount: 5000 });

    expect(res.status).toBe(404);
  });
});

describe('Budget Rescue AI & Fallback Service', () => {
  const mockEvent = {
    id: 'ev-1',
    name: 'Ananya Wedding',
    type: 'wedding',
    city: 'Jaipur',
    guest_count: 300,
    budget_total: 1000000,
  };

  const categoriesWithSpend = [
    { id: 'c1', name: 'Venue', planned_amount: 350000, spent: 400000 }, // Over by 50k
    { id: 'c2', name: 'Catering', planned_amount: 300000, spent: 300000 },
    { id: 'c3', name: 'Decor', planned_amount: 150000, spent: 50000 }, // Headroom 100k
    { id: 'c4', name: 'Music', planned_amount: 100000, spent: 20000 }, // Headroom 80k
    { id: 'c5', name: 'Photos', planned_amount: 100000, spent: 80000 },
  ];

  it('generates a deterministic rebalance absorbing overspend from categories with headroom', () => {
    const plan = getDeterministicBudgetRescue(mockEvent, categoriesWithSpend);

    expect(plan).toHaveProperty('summary');
    expect(plan.adjustments.length).toBeGreaterThan(0);

    const increaseAdj = plan.adjustments.find((a) => a.action === 'increase');
    expect(increaseAdj.category).toBe('Venue');
    expect(increaseAdj.amount).toBe(50000);

    const reduceAdj = plan.adjustments.find((a) => a.action === 'reduce');
    expect(reduceAdj).toBeDefined();
    expect(reduceAdj.action).toBe('reduce');
  });

  it('falls back safely to deterministic rescue plan if Gemini fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Gemini API timeout')),
    );

    const plan = await rescueBudget(mockEvent, categoriesWithSpend);
    expect(plan).toBeDefined();
    expect(plan.adjustments.length).toBeGreaterThan(0);
  });
});

describe('Vendor Enquiry Multi-language Fallback', () => {
  const mockEvent = {
    name: 'Karan 30th Birthday',
    type: 'birthday',
    city: 'Bengaluru',
    guest_count: 50,
    event_date: '2026-12-15',
  };

  const mockVendor = {
    name: 'Bangalore Bakers',
    category: 'Bakery',
  };

  it('drafts English enquiry template', () => {
    const enquiry = getDeterministicVendorEnquiry(mockEvent, mockVendor, 'en');
    expect(enquiry.message).toContain('Bangalore Bakers');
    expect(enquiry.message).toContain('Bakery services');
  });

  it('drafts Hindi enquiry template', () => {
    const enquiry = getDeterministicVendorEnquiry(mockEvent, mockVendor, 'hi');
    expect(enquiry.message).toContain('नमस्ते Bangalore Bakers जी');
    expect(enquiry.message).toContain('Bakery');
  });

  it('drafts Kannada enquiry template', () => {
    const enquiry = getDeterministicVendorEnquiry(mockEvent, mockVendor, 'kn');
    expect(enquiry.message).toContain('ನಮಸ್ಕಾರ Bangalore Bakers');
  });
});

describe('Dashboard Schemas Validation', () => {
  it('validates expense creation', () => {
    expect(createExpenseSchema.safeParse({ description: 'Catering token', amount: 25000 }).success).toBe(true);
    expect(createExpenseSchema.safeParse({ description: '', amount: 100 }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ description: 'Fee', amount: -50 }).success).toBe(false);
  });

  it('validates task creation', () => {
    expect(createTaskSchema.safeParse({ title: 'Book photographer' }).success).toBe(true);
    expect(createTaskSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('validates vendor creation', () => {
    expect(createVendorSchema.safeParse({ name: 'Royal Caterers', category: 'Catering' }).success).toBe(true);
    expect(createVendorSchema.safeParse({ name: '', category: 'Catering' }).success).toBe(false);
  });
});
