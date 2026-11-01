import { z } from 'zod';

export const ideaKinds = ['theme', 'decor', 'menu', 'game', 'gift', 'invitation'];

export const generateIdeasSchema = z.object({
  kind: z.enum(ideaKinds, {
    errorMap: () => ({ message: 'Please select a valid idea category' }),
  }),
  refine: z.string().trim().max(100).optional(),
});

export const updateIdeaSchema = z.object({
  saved: z.boolean(),
});

export const assistantMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(500, 'Message cannot exceed 500 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'model']),
        content: z.string().trim().max(1000),
      }),
    )
    .max(6, 'History cannot exceed 6 turns')
    .default([]),
});

export const ideasOutputSchema = z.object({
  ideas: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        body: z.string().trim().min(1),
        estimated_cost_inr: z.coerce.number().min(0).default(0),
      }),
    )
    .min(3, 'At least 3 ideas required'),
});
