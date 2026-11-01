import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { createEventSchema } from '../../../shared/eventSchemas.js';
import { generatePlan } from '../services/aiPlanService.js';
import {
  updateCategorySchema,
  batchUpdateCategoriesSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createTaskSchema,
  updateTaskSchema,
  createVendorSchema,
  updateVendorSchema,
  vendorEnquirySchema,
} from '../schemas/dashboardSchemas.js';
import {
  rescueBudget,
  draftVendorEnquiry,
} from '../services/aiRescueAndEnquiryService.js';
import {
  generateIdeasSchema,
  updateIdeaSchema,
  assistantMessageSchema,
} from '../schemas/step4Schemas.js';
import {
  generateIdeasForKind,
  chatWithAssistant,
} from '../services/aiIdeasAndAssistantService.js';

export const eventsRouter = Router();

// Stricter rate limit on AI-powered event creation & AI services, keyed by user ID or IP
const aiLimiter = rateLimit({
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
async function getOwnedEvent(eventId, userId) {
  const { data: event, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('owner_id', userId)
    .single();

  if (error || !event) return null;
  return event;
}

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
    const tasksToInsert = (plan.tasks || []).map((t, idx) => ({
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

/* =======================================================================
   EXPENSES CRUD
   ======================================================================= */

eventsRouter.get('/:id/expenses', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const { data: expenses, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch expenses', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({ success: true, data: expenses || [] });
  } catch (err) {
    next(err);
  }
});

eventsRouter.post('/:id/expenses', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = createExpenseSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        event_id: event.id,
        category_id: val.data.category_id || null,
        description: val.data.description,
        amount: val.data.amount,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to record expense', code: 'DATABASE_ERROR' },
      });
    }

    return res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
});

eventsRouter.patch('/:id/expenses/:expenseId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = updateExpenseSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('expenses')
      .update(val.data)
      .eq('id', req.params.expenseId)
      .eq('event_id', event.id)
      .select()
      .single();

    if (error || !updated) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found', code: 'NOT_FOUND' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

eventsRouter.delete('/:id/expenses/:expenseId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', req.params.expenseId)
      .eq('event_id', event.id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete expense', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/* =======================================================================
   BUDGET CATEGORIES UPDATES (SINGLE & BATCH REBALANCE)
   ======================================================================= */

eventsRouter.patch('/:id/categories/batch', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = batchUpdateCategoriesSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid category updates', code: 'VALIDATION_ERROR' },
      });
    }

    // Verify sum doesn't exceed event budget
    const newSum = val.data.categories.reduce((acc, c) => acc + c.planned_amount, 0);
    if (newSum > Number(event.budget_total) + 10) {
      // allow minor rounding tolerance
      return res.status(400).json({
        success: false,
        error: {
          message: `Total allocated planned amount (₹${newSum}) exceeds event budget (₹${event.budget_total})`,
          code: 'OVER_BUDGET_DISALLOWED',
        },
      });
    }

    // Update each category
    const updatePromises = val.data.categories.map((c) =>
      supabaseAdmin
        .from('budget_categories')
        .update({ planned_amount: c.planned_amount })
        .eq('id', c.id)
        .eq('event_id', event.id)
        .select()
        .single(),
    );

    const results = await Promise.all(updatePromises);
    const updatedCategories = results.map((r) => r.data).filter(Boolean);

    return res.json({ success: true, data: updatedCategories });
  } catch (err) {
    next(err);
  }
});

eventsRouter.patch('/:id/categories/:categoryId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = updateCategorySchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('budget_categories')
      .update(val.data)
      .eq('id', req.params.categoryId)
      .eq('event_id', event.id)
      .select()
      .single();

    if (error || !updated) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found', code: 'NOT_FOUND' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/* =======================================================================
   TASKS CRUD
   ======================================================================= */

eventsRouter.post('/:id/tasks', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = createTaskSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        event_id: event.id,
        title: val.data.title,
        due_date: val.data.due_date || null,
        category: val.data.category,
        priority: val.data.priority,
        status: val.data.status,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to create task', code: 'DATABASE_ERROR' },
      });
    }

    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

eventsRouter.patch('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = updateTaskSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('tasks')
      .update(val.data)
      .eq('id', req.params.taskId)
      .eq('event_id', event.id)
      .select()
      .single();

    if (error || !updated) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found', code: 'NOT_FOUND' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

eventsRouter.delete('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', req.params.taskId)
      .eq('event_id', event.id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete task', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

/* =======================================================================
   VENDORS CRUD
   ======================================================================= */

eventsRouter.post('/:id/vendors', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = createVendorSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .insert({
        event_id: event.id,
        name: val.data.name,
        category: val.data.category,
        status: val.data.status,
        quote_amount: val.data.quote_amount || null,
        phone: val.data.phone || null,
        email: val.data.email || null,
        notes: val.data.notes || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to create vendor', code: 'DATABASE_ERROR' },
      });
    }

    return res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
});

eventsRouter.patch('/:id/vendors/:vendorId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = updateVendorSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('vendors')
      .update(val.data)
      .eq('id', req.params.vendorId)
      .eq('event_id', event.id)
      .select()
      .single();

    if (error || !updated) {
      return res.status(404).json({
        success: false,
        error: { message: 'Vendor not found', code: 'NOT_FOUND' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

eventsRouter.delete('/:id/vendors/:vendorId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const { error } = await supabaseAdmin
      .from('vendors')
      .delete()
      .eq('id', req.params.vendorId)
      .eq('event_id', event.id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete vendor', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({ success: true, message: 'Vendor deleted' });
  } catch (err) {
    next(err);
  }
});

/* =======================================================================
   AI ROUTES: BUDGET RESCUE & VENDOR ENQUIRY
   ======================================================================= */

/**
 * POST /api/events/:id/budget-rescue
 * Analyzes planned vs actual spent amounts, calling Gemini for actionable tradeoffs
 * and rebalancing adjustments.
 */
eventsRouter.post('/:id/budget-rescue', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    // Fetch categories and expenses
    const [catRes, expRes] = await Promise.all([
      supabaseAdmin
        .from('budget_categories')
        .select('*')
        .eq('event_id', event.id),
      supabaseAdmin
        .from('expenses')
        .select('*')
        .eq('event_id', event.id),
    ]);

    const categories = catRes.data || [];
    const expenses = expRes.data || [];

    // Compute spent per category
    const categoriesWithSpend = categories.map((cat) => {
      const catSpent = expenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return {
        id: cat.id,
        name: cat.name,
        planned_amount: Number(cat.planned_amount || 0),
        spent: catSpent,
      };
    });

    const rescueResult = await rescueBudget(event, categoriesWithSpend);

    return res.json({
      success: true,
      data: rescueResult,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/events/:id/vendors/:vendorId/enquiry
 * Drafts an enquiry message in English, Hindi, or Kannada.
 */
eventsRouter.post(
  '/:id/vendors/:vendorId/enquiry',
  requireAuth,
  aiLimiter,
  async (req, res, next) => {
    try {
      const event = await getOwnedEvent(req.params.id, req.user.id);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: { message: 'Event not found', code: 'NOT_FOUND' },
        });
      }

      const { data: vendor, error } = await supabaseAdmin
        .from('vendors')
        .select('*')
        .eq('id', req.params.vendorId)
        .eq('event_id', event.id)
        .single();

      if (error || !vendor) {
        return res.status(404).json({
          success: false,
          error: { message: 'Vendor not found', code: 'NOT_FOUND' },
        });
      }

      const val = vendorEnquirySchema.safeParse(req.body);
      const language = val.success ? val.data.language : 'en';

      const draft = await draftVendorEnquiry(event, vendor, language);

      return res.json({
        success: true,
        data: draft,
      });
    } catch (err) {
      next(err);
    }
  },
);

/* =======================================================================
   STEP 4: IDEAS (GENERATION, LIST, TOGGLE SAVE, DELETE)
   ======================================================================= */

eventsRouter.get('/:id/ideas', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const { data: ideas, error } = await supabaseAdmin
      .from('ideas')
      .select('*')
      .eq('event_id', event.id)
      .order('saved', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch ideas', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({ success: true, data: ideas || [] });
  } catch (err) {
    next(err);
  }
});

eventsRouter.post('/:id/ideas/generate', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = generateIdeasSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    const { kind, refine } = val.data;

    // Generate ideas using Gemini or deterministic library
    const generated = await generateIdeasForKind(event, kind, refine);

    // Format ideas for insertion into database
    const rowsToInsert = generated.map((idea) => {
      const bodyWithCost =
        idea.estimated_cost_inr && idea.estimated_cost_inr > 0
          ? `${idea.body}\n\nEstimated Cost: ₹${idea.estimated_cost_inr.toLocaleString('en-IN')}`
          : idea.body;

      return {
        event_id: event.id,
        kind,
        title: idea.title,
        body: bodyWithCost,
        saved: false,
      };
    });

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('ideas')
      .insert(rowsToInsert)
      .select();

    if (insertError) {
      console.error('[IDEAS INSERT ERROR]:', insertError);
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to save generated ideas', code: 'DATABASE_ERROR' },
      });
    }

    return res.status(201).json({
      success: true,
      data: inserted || [],
    });
  } catch (err) {
    next(err);
  }
});

eventsRouter.patch('/:id/ideas/:ideaId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = updateIdeaSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid payload', code: 'VALIDATION_ERROR' },
      });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('ideas')
      .update({ saved: val.data.saved })
      .eq('id', req.params.ideaId)
      .eq('event_id', event.id)
      .select()
      .single();

    if (error || !updated) {
      return res.status(404).json({
        success: false,
        error: { message: 'Idea not found', code: 'NOT_FOUND' },
      });
    }

    return res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

eventsRouter.delete('/:id/ideas/:ideaId', requireAuth, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const { error } = await supabaseAdmin
      .from('ideas')
      .delete()
      .eq('id', req.params.ideaId)
      .eq('event_id', event.id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: { message: 'Failed to delete idea', code: 'DATABASE_ERROR' },
      });
    }

    return res.json({ success: true, message: 'Idea deleted' });
  } catch (err) {
    next(err);
  }
});

/* =======================================================================
   STEP 4: FLOATING AI ASSISTANT CHAT
   ======================================================================= */

eventsRouter.post('/:id/assistant', requireAuth, aiLimiter, async (req, res, next) => {
  try {
    const event = await getOwnedEvent(req.params.id, req.user.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: { message: 'Event not found', code: 'NOT_FOUND' },
      });
    }

    const val = assistantMessageSchema.safeParse(req.body);
    if (!val.success) {
      return res.status(400).json({
        success: false,
        error: { message: val.error.issues[0].message, code: 'VALIDATION_ERROR' },
      });
    }

    // Load actual current context from database
    const [catRes, expRes, tasksRes, venRes] = await Promise.all([
      supabaseAdmin.from('budget_categories').select('*').eq('event_id', event.id),
      supabaseAdmin.from('expenses').select('*').eq('event_id', event.id),
      supabaseAdmin.from('tasks').select('*').eq('event_id', event.id),
      supabaseAdmin.from('vendors').select('*').eq('event_id', event.id),
    ]);

    const categories = catRes.data || [];
    const expenses = expRes.data || [];
    const tasks = tasksRes.data || [];
    const vendors = venRes.data || [];

    const totalBudget = Number(event.budget_total) || 0;
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const categoriesWithSpend = categories.map((cat) => {
      const catSpent = expenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return {
        name: cat.name,
        planned_amount: cat.planned_amount,
        spent: catSpent,
      };
    });

    const contextData = {
      totalBudget,
      totalSpent,
      categoriesWithSpend,
      tasks,
      vendors,
    };

    const reply = await chatWithAssistant(
      event,
      contextData,
      val.data.message,
      val.data.history,
    );

    return res.json({ success: true, data: reply });
  } catch (err) {
    next(err);
  }
});

/* =======================================================================
   STEP 4: SHARE TOKEN ROTATION
   ======================================================================= */

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

