import { describe, it, expect } from 'vitest';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  createEventSchema,
} from '@shared/eventSchemas';

describe('Wizard Step Validation', () => {
  const futureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().split('T')[0];
  };

  describe('Step 1: Type & Name', () => {
    it('accepts valid wedding, birthday, community event types', () => {
      expect(step1Schema.safeParse({ type: 'wedding', name: 'My Wedding' }).success).toBe(true);
      expect(step1Schema.safeParse({ type: 'birthday', name: 'My Birthday' }).success).toBe(true);
      expect(step1Schema.safeParse({ type: 'community', name: 'Campus Fest' }).success).toBe(true);
    });

    it('rejects unsupported event types', () => {
      const res = step1Schema.safeParse({ type: 'conference', name: 'Tech Talk' });
      expect(res.success).toBe(false);
      expect(res.error.issues[0].message).toContain('valid event type');
    });

    it('rejects empty or whitespace-only names', () => {
      const res = step1Schema.safeParse({ type: 'wedding', name: '   ' });
      expect(res.success).toBe(false);
    });
  });

  describe('Step 2: Date, City, Guest Count', () => {
    it('accepts a future date, valid city, and guest count', () => {
      const res = step2Schema.safeParse({
        event_date: futureDate(),
        city: 'Jaipur',
        guest_count: 250,
      });
      expect(res.success).toBe(true);
    });

    it('rejects past dates', () => {
      const res = step2Schema.safeParse({
        event_date: '2022-01-01',
        city: 'Jaipur',
        guest_count: 250,
      });
      expect(res.success).toBe(false);
      expect(res.error.issues[0].message).toContain('must be in the future');
    });

    it('rejects guest counts < 1 or > 10,000', () => {
      expect(
        step2Schema.safeParse({
          event_date: futureDate(),
          city: 'Jaipur',
          guest_count: 0,
        }).success,
      ).toBe(false);

      expect(
        step2Schema.safeParse({
          event_date: futureDate(),
          city: 'Jaipur',
          guest_count: 10001,
        }).success,
      ).toBe(false);
    });
  });

  describe('Step 3: Budget & Vibe', () => {
    it('accepts valid budget and vibe', () => {
      const res = step3Schema.safeParse({
        budget_total: 500000,
        vibe: 'Traditional',
      });
      expect(res.success).toBe(true);
    });

    it('rejects budget below ₹1,000', () => {
      const res = step3Schema.safeParse({
        budget_total: 500,
        vibe: 'Modern',
      });
      expect(res.success).toBe(false);
      expect(res.error.issues[0].message).toContain('at least ₹1,000');
    });
  });

  describe('Step 4 & Full Schema', () => {
    it('accepts valid special needs and generates complete event plan', () => {
      const full = {
        type: 'wedding',
        name: 'Aarav & Meera',
        event_date: futureDate(),
        city: 'Bengaluru',
        guest_count: 150,
        budget_total: 600000,
        vibe: 'Eco-friendly',
        special_needs: {
          tags: ['vegetarian_only', 'outdoor'],
          notes: 'Prefer compostable cutlery and live shehnai.',
        },
      };

      const res = createEventSchema.safeParse(full);
      expect(res.success).toBe(true);
    });
  });
});
