import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from '../lib/supabase.js';

// Stricter rate limit on AI-powered event creation & AI services, keyed by user ID or IP
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 AI requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    return req.user?.id ? `user:${req.user.id}` : (req.ip || 'anonymous');
  },
  message: {
    success: false,
    error: {
      message: 'AI rate limit reached. Please wait a few minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Helper to verify event ownership. Returns the event if owned by user, otherwise null.
 */
export async function getOwnedEvent(eventId, userId) {
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('owner_id', userId)
    .single();

  if (error || !event) return null;
  return event;
}

