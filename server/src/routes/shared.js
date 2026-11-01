import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from '../lib/supabase.js';

export const sharedRouter = Router();

// Rate limiter for public shared views
const sharedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 views per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests. Please try again in a few minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * GET /api/shared/:token
 * Public read-only endpoint returning strictly whitelisted, safe fields for an event.
 * NEVER returns budget totals, expenses, vendor quote amounts, contact info (phone/email),
 * notes, or owner identities.
 */
sharedRouter.get('/:token', sharedLimiter, async (req, res, next) => {
  try {
    const token = req.params.token;
    if (!token || typeof token !== 'string' || token.length < 16) {
      return res.status(404).json({
        success: false,
        error: { message: 'Invalid or missing share link', code: 'NOT_FOUND' },
      });
    }

    // 1. Fetch event matching the unique unguessable share_token
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, name, type, event_date, city, guest_count, vibe')
      .eq('share_token', token)
      .single();

    if (eventError || !event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Shared plan not found or link has expired', code: 'NOT_FOUND' },
      });
    }

    // 2. Fetch associated tasks and vendors in parallel
    const [tasksRes, vendorsRes] = await Promise.all([
      supabaseAdmin
        .from('tasks')
        .select('title, due_date, category, status')
        .eq('event_id', event.id)
        .order('due_date', { ascending: true }),
      supabaseAdmin
        .from('vendors')
        .select('name, category, status')
        .eq('event_id', event.id)
        .order('category', { ascending: true }),
    ]);

    // 3. Return sanitized, safe response payload
    return res.json({
      success: true,
      data: {
        event: {
          name: event.name,
          type: event.type,
          event_date: event.event_date,
          city: event.city,
          guest_count: event.guest_count,
          vibe: event.vibe,
        },
        tasks: tasksRes.data || [],
        vendors: vendorsRes.data || [],
      },
    });
  } catch (err) {
    next(err);
  }
});
