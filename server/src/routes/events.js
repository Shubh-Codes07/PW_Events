import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { createEventSchema } from '../../../shared/eventSchemas.js';
import { generatePlan } from '../services/aiPlanService.js';
import { getOwnedEvent, aiLimiter } from './eventHelpers.js';
import { budgetRouter } from './budget.js';
import { tasksRouter } from './tasks.js';
import { vendorsRouter } from './vendors.js';
import { ideasRouter } from './ideas.js';
import { assistantRouter } from './assistant.js';

export { getOwnedEvent, aiLimiter };
export const eventsRouter = Router();

/**
 * Mount focused sub-routers
 */
eventsRouter.use(budgetRouter);
eventsRouter.use(tasksRouter);
eventsRouter.use(vendorsRouter);
eventsRouter.use(ideasRouter);
eventsRouter.use(assistantRouter);

/**
 * POST /api/events
 * Creates a new event, invokes the AI plan generator, persists the plan items,
 * and returns the full event with budget, timeline, and vendors.
 */
eventsRouter.post('/', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const validation = createEventSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid event data',
          code: 'VALIDATION_ERROR',
          details: validation.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      });
    }

    const eventInput = validation.data;
    const userId = req.user.id;

    // Abuse protection: Cap each account at 10 events
    const { count, error: countError } = await supabaseAdmin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId);

    if (!countError && count !== null && count >= 10) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'Event limit reached (maximum 10 events per account).',
          code: 'EVENT_LIMIT_REACHED',
        },
      });
    }

    const shareToken = crypto.randomBytes(24).toString('hex');
    const memoryToken = crypto.randomBytes(24).toString('hex');

    // 1. Call AI plan service
    const plan = await generatePlan(eventInput);

    // 2. Insert event record (ignoring any client-supplied IDs or owner_id)
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        owner_id: userId,
        name: eventInput.name,
        type: eventInput.type,
        event_date: eventInput.event_date,
        city: eventInput.city,
        guest_count: eventInput.guest_count,
        budget_total: eventInput.budget_total,
        vibe: eventInput.vibe,
        special_needs: eventInput.special_needs,
        share_token: shareToken,
        memory_token: memoryToken,
        uploads_enabled: true,
        require_approval: false,
      })
      .select()
      .single();

    if (eventError) {
      console.error('[EVENT INSERT ERROR]:', eventError);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create event in database',
          code: 'DATABASE_ERROR',
        },
      });
    }

    // 3. Insert budget categories
    const categoriesToInsert = (plan.budget_categories || []).map((cat, idx) => ({
      event_id: event.id,
      name: cat.name,
      planned_amount: cat.planned_amount,
      sort_order: idx,
    }));

    let insertedCategories = [];
    if (categoriesToInsert.length > 0) {
      const { data: catData, error: catError } = await supabaseAdmin
        .from('budget_categories')
        .insert(categoriesToInsert)
        .select();

      if (catError) {
        console.error('[CATEGORIES INSERT ERROR]:', catError);
      } else {
        insertedCategories = catData || [];
      }
    }

    // 4. Insert tasks
    const tasksToInsert = (plan.tasks || []).map((t) => ({
      event_id: event.id,
      title: t.title,
      due_date: t.due_date,
      category: t.category || 'General',
      status: 'todo',
      priority: t.priority || 1,
    }));

    let insertedTasks = [];
    if (tasksToInsert.length > 0) {
      const { data: taskData, error: taskError } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (taskError) {
        console.error('[TASKS INSERT ERROR]:', taskError);
      } else {
        insertedTasks = taskData || [];
      }
    }

    // 5. Insert initial vendors
    const vendorsToInsert = (plan.vendors || []).map((v) => ({
      event_id: event.id,
      category: v.category,
      name: `${v.category} (To be decided)`,
      status: 'to_contact',
    }));

    let insertedVendors = [];
    if (vendorsToInsert.length > 0) {
      const { data: venData, error: venError } = await supabaseAdmin
        .from('vendors')
        .insert(vendorsToInsert)
        .select();

      if (venError) {
        console.error('[VENDORS INSERT ERROR]:', venError);
      } else {
        insertedVendors = venData || [];
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        event,
        summary: plan.summary,
        budget_categories: insertedCategories,
        tasks: insertedTasks,
        vendors: insertedVendors,
        expenses: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events
 * Lists all events owned by the authenticated user.
 */
eventsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('owner_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Could not fetch events', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({
      success: true,
      data: events || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/events/:id
 * Retrieves a single event owned by the user with all associated categories, tasks, vendors, and expenses.
 */
eventsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found or access denied', code: 'NOT_FOUND' },
      });
    }

    const [categoriesRes, tasksRes, vendorsRes, expensesRes] = await Promise.all([
      supabaseAdmin
        .from('budget_categories')
        .select('*')
        .eq('event_id', event.id)
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('event_id', event.id)
        .order('due_date', { ascending: true }),
      supabaseAdmin
        .from('vendors')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('expenses')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false }),
    ]);

    return res.json({
      success: true,
      data: {
        event,
        budget_categories: categoriesRes.data || [],
        tasks: tasksRes.data || [],
        vendors: vendorsRes.data || [],
        expenses: expensesRes.data || [],
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events/:id/regenerate-share-token
 * Rotates the unguessable public share token for this event.
 */
eventsRouter.post('/:id/regenerate-share-token', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const newShareToken = crypto.randomBytes(24).toString('hex');

    const { data: updated, error } = await supabaseAdmin
      .from('events')
      .update({ share_token: newShareToken })
      .eq('id', event.id)
      .select('id, share_token')
      .single();

    if (error || !updated) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to rotate share token', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({ success: true, data: { share_token: updated.share_token } });
  } catch (err) {
    next(err);
  }
});
