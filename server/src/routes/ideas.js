import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  generateIdeasSchema,
  updateIdeaSchema,
} from '../schemas/step4Schemas.js';
import { generateIdeasForKind } from '../services/aiIdeasAndAssistantService.js';
import { getOwnedEvent, aiLimiter } from './eventHelpers.js';

export const ideasRouter = Router({ mergeParams: true });

/* =======================================================================
   STEP 4: IDEAS (GENERATION, LIST, TOGGLE SAVE, DELETE)
   ======================================================================= */

ideasRouter.get('/:id/ideas', requireAuth, async (req, res, next) => {
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

ideasRouter.post('/:id/ideas/generate', requireAuth, aiLimiter, async (req, res, next) => {
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

ideasRouter.patch('/:id/ideas/:ideaId', requireAuth, async (req, res, next) => {
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

ideasRouter.delete('/:id/ideas/:ideaId', requireAuth, async (req, res, next) => {
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

