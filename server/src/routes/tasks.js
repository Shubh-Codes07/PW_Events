import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  createTaskSchema,
  updateTaskSchema,
} from '../schemas/dashboardSchemas.js';
import { getOwnedEvent } from './eventHelpers.js';

export const tasksRouter = Router({ mergeParams: true });

/* =======================================================================
   TASKS CRUD
   ======================================================================= */

tasksRouter.post('/:id/tasks', requireAuth, async (req, res, next) => {
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

tasksRouter.patch('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
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

tasksRouter.delete('/:id/tasks/:taskId', requireAuth, async (req, res, next) => {
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

