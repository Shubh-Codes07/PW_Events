import { z } from 'zod';

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  planned_amount: z.coerce.number().min(0).optional(),
});

export const batchUpdateCategoriesSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string().uuid(),
        planned_amount: z.coerce.number().min(0),
      }),
    )
    .min(1),
});

export const createExpenseSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1, 'Description is required').max(300),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
});

export const updateExpenseSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1).max(300).optional(),
  amount: z.coerce.number().positive().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(300),
  due_date: z.string().nullable().optional(),
  category: z.string().trim().max(100).default('General'),
  priority: z.coerce.number().int().default(1),
  status: z.enum(['todo', 'done']).default('todo'),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  due_date: z.string().nullable().optional(),
  category: z.string().trim().max(100).optional(),
  priority: z.coerce.number().int().optional(),
  status: z.enum(['todo', 'done']).optional(),
});

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, 'Vendor name is required').max(200),
  category: z.string().trim().min(1, 'Category is required').max(100),
  status: z
    .enum(['to_contact', 'contacted', 'quote_received', 'booked'])
    .default('to_contact'),
  quote_amount: z.coerce.number().min(0).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  email: z.string().trim().email().nullable().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const vendorEnquirySchema = z.object({
  language: z.enum(['en', 'hi', 'kn']).default('en'),
});

export const budgetRescueOutputSchema = z.object({
  summary: z.string().min(1),
  adjustments: z.array(
    z.object({
      category: z.string(),
      action: z.enum(['reduce', 'increase']),
      amount: z.coerce.number().min(0),
      reason: z.string(),
    }),
  ),
  tradeoffs: z.array(z.string()),
});
