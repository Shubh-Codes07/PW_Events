import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  updateCategorySchema,
  batchUpdateCategoriesSchema,
  createExpenseSchema,
  updateExpenseSchema,
} from '../schemas/dashboardSchemas.js';
import { rescueBudget } from '../services/aiRescueAndEnquiryService.js';
import { getOwnedEvent, aiLimiter } from './eventHelpers.js';

export const budgetRouter = Router({ mergeParams: true });

/* =======================================================================
   EXPENSES CRUD
   ======================================================================= */

budgetRouter.get('/:id/expenses', requireAuth, async (req, res, next) => {
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

budgetRouter.post('/:id/expenses', requireAuth, async (req, res, next) => {
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

budgetRouter.patch('/:id/expenses/:expenseId', requireAuth, async (req, res, next) => {
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

budgetRouter.delete('/:id/expenses/:expenseId', requireAuth, async (req, res, next) => {
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

budgetRouter.patch('/:id/categories/batch', requireAuth, async (req, res, next) => {
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

budgetRouter.patch('/:id/categories/:categoryId', requireAuth, async (req, res, next) => {
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
   AI BUDGET RESCUE
   ======================================================================= */

budgetRouter.post('/:id/budget-rescue', requireAuth, aiLimiter, async (req, res, next) => {
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

