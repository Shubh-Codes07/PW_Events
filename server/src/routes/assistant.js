import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { assistantMessageSchema } from '../schemas/step4Schemas.js';
import { chatWithAssistant } from '../services/aiIdeasAndAssistantService.js';
import { getOwnedEvent, aiLimiter } from './eventHelpers.js';

export const assistantRouter = Router({ mergeParams: true });

/* =======================================================================
   STEP 4: FLOATING AI ASSISTANT CHAT
   ======================================================================= */

assistantRouter.post('/:id/assistant', requireAuth, aiLimiter, async (req, res, next) => {
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

