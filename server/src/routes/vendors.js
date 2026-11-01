import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import {
  createVendorSchema,
  updateVendorSchema,
  vendorEnquirySchema,
} from '../schemas/dashboardSchemas.js';
import { draftVendorEnquiry } from '../services/aiRescueAndEnquiryService.js';
import { getOwnedEvent, aiLimiter } from './eventHelpers.js';

export const vendorsRouter = Router({ mergeParams: true });

/* =======================================================================
   VENDORS CRUD
   ======================================================================= */

vendorsRouter.post('/:id/vendors', requireAuth, async (req, res, next) => {
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

vendorsRouter.patch('/:id/vendors/:vendorId', requireAuth, async (req, res, next) => {
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

vendorsRouter.delete('/:id/vendors/:vendorId', requireAuth, async (req, res, next) => {
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
   AI VENDOR ENQUIRY DRAFTING
   ======================================================================= */

vendorsRouter.post(
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

