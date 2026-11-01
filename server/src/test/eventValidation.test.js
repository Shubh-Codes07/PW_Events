import { describe, it, expect } from 'vitest';
import {
  createEventSchema,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
} from '../../../shared/eventSchemas.js';

describe('Event Schemas Validation', () => {
  const getFutureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  it('validates a complete valid event payload', () => {
    const validEvent = {
      type: 'wedding',
      name: 'Aditi & Karan Wedding',
      event_date: getFutureDate(),
      city: 'Mumbai',
      guest_count: 350,
      budget_total: 1500000,
      vibe: 'Traditional',
      special_needs: {
        tags: ['vegetarian_only', 'elderly_guests'],
        notes: 'Wheelchair access needed at banquet entry',
      },
    };

    const res = createEventSchema.safeParse(validEvent);
    expect(res.success).toBe(true);
  });

  it('fails Step 1 if type is invalid or name is too short', () => {
    const invalidType = step1Schema.safeParse({ type: 'concert', name: 'Music Fest' });
    expect(invalidType.success).toBe(false);

    const shortName = step1Schema.safeParse({ type: 'wedding', name: 'A' });
    expect(shortName.success).toBe(false);
  });

  it('fails Step 2 if date is in the past or guest count exceeds 10,000', () => {
    const pastDate = step2Schema.safeParse({
      event_date: '2020-01-01',
      city: 'Delhi',
      guest_count: 100,
    });
    expect(pastDate.success).toBe(false);

    const tooManyGuests = step2Schema.safeParse({
      event_date: getFutureDate(),
      city: 'Delhi',
      guest_count: 15000,
    });
    expect(tooManyGuests.success).toBe(false);
  });

  it('fails Step 3 if budget is under 1,000 or vibe is invalid', () => {
    const lowBudget = step3Schema.safeParse({
      budget_total: 500,
      vibe: 'Grand',
    });
    expect(lowBudget.success).toBe(false);

    const invalidVibe = step3Schema.safeParse({
      budget_total: 50000,
      vibe: 'Cyberpunk',
    });
    expect(invalidVibe.success).toBe(false);
  });

  it('validates Step 4 special needs notes character limit', () => {
    const longNote = 'A'.repeat(301);
    const res = step4Schema.safeParse({
      special_needs: {
        tags: ['outdoor'],
        notes: longNote,
      },
    });
    expect(res.success).toBe(false);
  });
});
