import { describe, it, expect } from 'vitest';
import {
  normalizeBudgetCategories,
  getDeterministicFallbackPlan,
} from '../services/aiPlanService.js';

describe('Budget Normalization', () => {
  it('forces category amounts to sum exactly to totalBudget', () => {
    const rawCategories = [
      { name: 'Venue', planned_amount: 33333 },
      { name: 'Catering', planned_amount: 33333 },
      { name: 'Decor', planned_amount: 33333 },
    ];
    const total = 100000;

    const normalized = normalizeBudgetCategories(rawCategories, total);
    const sum = normalized.reduce((acc, c) => acc + c.planned_amount, 0);

    expect(sum).toBe(total);
  });

  it('handles Indian wedding realistic amounts with fractional divisions', () => {
    const rawCategories = [
      { name: 'Venue & Stays', planned_amount: 350000 },
      { name: 'Catering & Food', planned_amount: 300000 },
      { name: 'Photography', planned_amount: 120000 },
      { name: 'Decor & Flowers', planned_amount: 100000 },
      { name: 'Attire & Makeup', planned_amount: 80000 },
      { name: 'Music & DJ', planned_amount: 50000 },
    ];
    const targetTotal = 750345; // Odd total budget

    const normalized = normalizeBudgetCategories(rawCategories, targetTotal);
    const sum = normalized.reduce((acc, c) => acc + c.planned_amount, 0);

    expect(sum).toBe(targetTotal);
    normalized.forEach((c) => {
      expect(c.planned_amount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(c.planned_amount)).toBe(true);
    });
  });

  it('handles empty categories gracefully', () => {
    expect(normalizeBudgetCategories([], 50000)).toEqual([]);
  });

  it('handles zero budget safely', () => {
    const raw = [{ name: 'Venue', planned_amount: 1000 }];
    const normalized = normalizeBudgetCategories(raw, 0);
    expect(normalized[0].planned_amount).toBe(0);
  });

  it('preserves category count and attaches sort_order', () => {
    const raw = [
      { name: 'A', planned_amount: 10 },
      { name: 'B', planned_amount: 20 },
      { name: 'C', planned_amount: 30 },
    ];
    const normalized = normalizeBudgetCategories(raw, 300);
    expect(normalized).toHaveLength(3);
    expect(normalized[0].sort_order).toBe(0);
    expect(normalized[1].sort_order).toBe(1);
    expect(normalized[2].sort_order).toBe(2);
  });
});

describe('Fallback Plan Generator', () => {
  it('generates valid wedding fallback plan with exact budget sum', () => {
    const event = {
      type: 'wedding',
      budget_total: 500000,
      city: 'Udaipur',
      guest_count: 250,
    };
    const plan = getDeterministicFallbackPlan(event);

    expect(plan).toHaveProperty('summary');
    expect(plan.budget_categories.length).toBeGreaterThanOrEqual(5);
    expect(plan.tasks.length).toBeGreaterThanOrEqual(5);
    expect(plan.vendors.length).toBeGreaterThanOrEqual(4);

    const sum = plan.budget_categories.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(500000);
  });

  it('generates valid birthday fallback plan with exact budget sum', () => {
    const event = {
      type: 'birthday',
      budget_total: 50000,
      city: 'Bengaluru',
      guest_count: 40,
    };
    const plan = getDeterministicFallbackPlan(event);

    expect(plan.summary).toContain('birthday');
    expect(plan.budget_categories.length).toBeGreaterThanOrEqual(4);

    const sum = plan.budget_categories.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(50000);
  });

  it('generates valid community fallback plan with exact budget sum', () => {
    const event = {
      type: 'community',
      budget_total: 150000,
      city: 'Pune',
      guest_count: 300,
    };
    const plan = getDeterministicFallbackPlan(event);

    expect(plan.summary).toContain('community');
    const sum = plan.budget_categories.reduce((acc, c) => acc + c.planned_amount, 0);
    expect(sum).toBe(150000);
  });
});
