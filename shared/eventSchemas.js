import { z } from 'zod';

/**
 * Event Types supported by Utsav
 */
export const EVENT_TYPES = ['wedding', 'birthday', 'community'];

/**
 * Event Vibes
 */
export const EVENT_VIBES = ['Traditional', 'Modern', 'Minimal', 'Grand', 'Eco-friendly'];

/**
 * Special needs tags
 */
export const SPECIAL_NEEDS_TAGS = [
  'vegetarian_only',
  'kids_friendly',
  'elderly_guests',
  'accessibility_needs',
  'outdoor',
  'indoor',
];

/**
 * Step 1 Schema: Type & Name
 */
export const step1Schema = z.object({
  type: z.enum(EVENT_TYPES, {
    message: 'Please select a valid event type',
  }),
  name: z
    .string()
    .trim()
    .min(2, 'Event name must be at least 2 characters')
    .max(100, 'Event name cannot exceed 100 characters'),
});

/**
 * Step 2 Schema: Date, City, Guest Count
 */
export const step2Schema = z.object({
  event_date: z
    .string()
    .min(1, 'Please select an event date')
    .refine((val) => {
      const selected = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !isNaN(selected.getTime()) && selected > today;
    }, 'Event date must be in the future'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters'),
  guest_count: z.coerce
    .number({ invalid_type_error: 'Guest count must be a number' })
    .int('Guest count must be an integer')
    .min(1, 'Guest count must be at least 1')
    .max(10000, 'Guest count cannot exceed 10,000'),
});

/**
 * Step 3 Schema: Budget & Vibe
 */
export const step3Schema = z.object({
  budget_total: z.coerce
    .number({ invalid_type_error: 'Please enter a valid budget' })
    .min(1000, 'Total budget must be at least ₹1,000')
    .max(1000000000, 'Total budget cannot exceed ₹100 Crores'),
  vibe: z.enum(EVENT_VIBES, {
    message: 'Please select a vibe for your event',
  }),
});

/**
 * Step 4 Schema: Special Needs & Note
 */
export const step4Schema = z.object({
  special_needs: z
    .object({
      tags: z.array(z.string()).default([]),
      notes: z.string().trim().max(300, 'Notes cannot exceed 300 characters').default(''),
    })
    .default({ tags: [], notes: '' }),
});

/**
 * Full Event Creation Schema (combining all steps)
 */
export const createEventSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema);
