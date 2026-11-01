import { z } from 'zod';
import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Strict schema for Gemini AI plan responses
 */
export const planOutputSchema = z.object({
  summary: z.string().default('Your personalized event plan has been created.'),
  budget_categories: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Category name required'),
        planned_amount: z.coerce.number().min(0, 'Planned amount must be >= 0'),
      }),
    )
    .min(3, 'At least 3 budget categories required'),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'Task title required'),
        days_before_event: z.coerce
          .number()
          .int()
          .min(0, 'Days before event must be non-negative'),
        category: z.string().default('General'),
        priority: z.coerce.number().int().default(1),
      }),
    )
    .min(3, 'At least 3 milestone tasks required'),
  vendors: z
    .array(
      z.object({
        category: z.string().trim().min(1, 'Vendor category required'),
      }),
    )
    .min(2, 'At least 2 vendor categories required'),
});

/**
 * Normalizes budget categories so their sum EXACTLY equals totalBudget.
 * Pure function, handles rounding discrepancies by adjusting the largest category.
 *
 * @param {Array<{ name: string, planned_amount: number }>} categories
 * @param {number} totalBudget
 * @returns {Array<{ name: string, planned_amount: number, sort_order: number }>}
 */
export function normalizeBudgetCategories(categories, totalBudget) {
  if (!categories || categories.length === 0) return [];
  const target = Math.round(Number(totalBudget) || 0);
  if (target <= 0) {
    return categories.map((c, i) => ({
      name: c.name,
      planned_amount: 0,
      sort_order: i,
    }));
  }

  const currentSum = categories.reduce(
    (acc, c) => acc + (Number(c.planned_amount) || 0),
    0,
  );

  let allocated = categories.map((c, i) => {
    const rawRatio = currentSum > 0 ? (Number(c.planned_amount) || 0) / currentSum : 1 / categories.length;
    return {
      name: c.name,
      planned_amount: Math.round(rawRatio * target),
      sort_order: i,
    };
  });

  const allocatedSum = allocated.reduce((acc, c) => acc + c.planned_amount, 0);
  const diff = target - allocatedSum;

  if (diff !== 0 && allocated.length > 0) {
    // Adjust the largest category to absorb the rounding difference
    let largestIndex = 0;
    for (let i = 1; i < allocated.length; i++) {
      if (allocated[i].planned_amount > allocated[largestIndex].planned_amount) {
        largestIndex = i;
      }
    }
    allocated[largestIndex].planned_amount = Math.max(0, allocated[largestIndex].planned_amount + diff);
  }

  return allocated;
}

/**
 * Calculates due date given an event date string and days before event.
 * E.g. "2026-12-25" - 30 days -> "2026-11-25"
 *
 * @param {string} eventDateStr
 * @param {number} daysBefore
 * @returns {string} YYYY-MM-DD
 */
export function calculateDueDate(eventDateStr, daysBefore) {
  if (!eventDateStr) return new Date().toISOString().split('T')[0];
  const target = new Date(eventDateStr);
  if (isNaN(target.getTime())) return new Date().toISOString().split('T')[0];

  const calculated = new Date(target.getTime() - (Number(daysBefore) || 0) * 86400000);
  return calculated.toISOString().split('T')[0];
}

/**
 * Deterministic fallback plan templates per event type.
 * Guarantees that users always receive a robust, tailored plan even if Gemini fails or is offline.
 *
 * @param {Object} event
 * @returns {Object} Validated plan object
 */
export function getDeterministicFallbackPlan(event) {
  const type = event.type || 'wedding';
  const total = Number(event.budget_total) || 100000;

  if (type === 'wedding') {
    const rawCategories = [
      { name: 'Venue & Stays', planned_amount: Math.round(total * 0.35) },
      { name: 'Catering & Beverages', planned_amount: Math.round(total * 0.30) },
      { name: 'Photography & Cinema', planned_amount: Math.round(total * 0.12) },
      { name: 'Decor, Mandap & Florals', planned_amount: Math.round(total * 0.10) },
      { name: 'Attire & Bridal Makeup', planned_amount: Math.round(total * 0.08) },
      { name: 'Music, DJ & Sound', planned_amount: Math.round(total * 0.05) },
    ];

    const tasks = [
      { title: 'Finalize & book wedding venue / banquet hall', days_before_event: 120, category: 'Venue', priority: 1 },
      { title: 'Tasting session & finalize catering menu', days_before_event: 90, category: 'Catering', priority: 1 },
      { title: 'Book candid photographer & videographer team', days_before_event: 75, category: 'Photography', priority: 2 },
      { title: 'Design & send digital invitations to guests', days_before_event: 60, category: 'Invitations', priority: 2 },
      { title: 'Curate sangeet playlist and sound requirements', days_before_event: 30, category: 'Entertainment', priority: 3 },
      { title: 'Final venue walkthrough and setup check', days_before_event: 7, category: 'Coordination', priority: 1 },
    ];

    const vendors = [
      { category: 'Venue' },
      { category: 'Catering' },
      { category: 'Photography' },
      { category: 'Decor' },
      { category: 'Makeup Artist' },
      { category: 'DJ & Sound' },
    ];

    return {
      summary: `A culturally rich and organized wedding celebration planned for ${event.guest_count || 100} guests in ${event.city || 'your city'}.`,
      budget_categories: normalizeBudgetCategories(rawCategories, total),
      tasks,
      vendors,
    };
  }

  if (type === 'birthday') {
    const rawCategories = [
      { name: 'Party Venue / Hall', planned_amount: Math.round(total * 0.30) },
      { name: 'Food & Mocktails', planned_amount: Math.round(total * 0.35) },
      { name: 'Theme Decor & Balloons', planned_amount: Math.round(total * 0.15) },
      { name: 'Custom Cake & Desserts', planned_amount: Math.round(total * 0.10) },
      { name: 'Games & Entertainment', planned_amount: Math.round(total * 0.10) },
    ];

    const tasks = [
      { title: 'Reserve party lawn or banquet room', days_before_event: 30, category: 'Venue', priority: 1 },
      { title: 'Design party theme and send e-invites', days_before_event: 20, category: 'Invitations', priority: 2 },
      { title: 'Order custom birthday cake and cupcakes', days_before_event: 14, category: 'Bakery', priority: 1 },
      { title: 'Arrange balloon arch, props, and lighting', days_before_event: 7, category: 'Decor', priority: 2 },
      { title: 'Organize host/anchor, party games, and return gifts', days_before_event: 5, category: 'Entertainment', priority: 3 },
    ];

    const vendors = [
      { category: 'Party Venue' },
      { category: 'Caterer' },
      { category: 'Cake Artist' },
      { category: 'Balloon Decorator' },
      { category: 'Game Host / Magician' },
    ];

    return {
      summary: `A vibrant and joyous birthday party structured for fun, celebration, and seamless hospitality.`,
      budget_categories: normalizeBudgetCategories(rawCategories, total),
      tasks,
      vendors,
    };
  }

  // Community Event
  const rawCategories = [
    { name: 'Venue & Ground Permissions', planned_amount: Math.round(total * 0.30) },
    { name: 'Community Meals & Refreshments', planned_amount: Math.round(total * 0.35) },
    { name: 'Stage, PA Sound & Mic Setup', planned_amount: Math.round(total * 0.20) },
    { name: 'Seating, Tents & Crowd Barricades', planned_amount: Math.round(total * 0.10) },
    { name: 'Signage, Posters & Supplies', planned_amount: Math.round(total * 0.05) },
  ];

  const tasks = [
    { title: 'Obtain local authorities / campus venue approvals', days_before_event: 45, category: 'Permissions', priority: 1 },
    { title: 'Contract sound engineering, stage & lighting vendor', days_before_event: 30, category: 'AV & Stage', priority: 1 },
    { title: 'Finalize community feast menu & drinking water stations', days_before_event: 20, category: 'Food', priority: 1 },
    { title: 'Broadcast announcements and volunteer registration', days_before_event: 14, category: 'Outreach', priority: 2 },
    { title: 'Conduct volunteer dry run and safety briefing', days_before_event: 2, category: 'Operations', priority: 1 },
  ];

  const vendors = [
    { category: 'Venue Authority' },
    { category: 'Sound & Stage Vendor' },
    { category: 'Community Caterer' },
    { category: 'Tent & Seating Supplier' },
  ];

  return {
    summary: `An engaging and well-coordinated community event planned for maximum participation and smooth operations.`,
    budget_categories: normalizeBudgetCategories(rawCategories, total),
    tasks,
    vendors,
  };
}

/**
 * In-memory LRU Cache for AI plans
 */
class SimpleLRUCache {
  constructor(max = 100, ttlMs = 3600000) {
    this.max = max;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

export const planCache = new SimpleLRUCache();

/**
 * Computes a hash key from event characteristics for caching
 */
export function getEventHash(event) {
  const normalized = {
    type: event.type,
    guest_count: event.guest_count,
    budget_total: event.budget_total,
    vibe: event.vibe,
    city: event.city?.toLowerCase()?.trim(),
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

/**
 * Main service method: Generates an AI-powered event plan using Google Gemini,
 * with structured JSON enforcement, retry on schema mismatch, and deterministic fallback.
 *
 * @param {Object} event
 * @returns {Promise<Object>}
 */
export async function generatePlan(event) {
  const cacheKey = getEventHash(event);
  const cached = planCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const prompt = `You are Utsav, an expert Indian event and wedding planning assistant.
Plan an event with these exact specifications:
- Event Type: ${event.type}
- Event Name: ${event.name}
- Date: ${event.event_date}
- City: ${event.city}
- Expected Guests: ${event.guest_count}
- Total Budget: INR ₹${event.budget_total}
- Vibe / Aesthetic: ${event.vibe}
- Special Needs / Accommodations: ${JSON.stringify(event.special_needs || {})}

Return a STRICT JSON object with these EXACT keys:
{
  "summary": "Two sentences describing the tailored plan and tone.",
  "budget_categories": [
    { "name": "Category Name", "planned_amount": 0 }
  ],
  "tasks": [
    { "title": "Milestone title", "days_before_event": 60, "category": "Category", "priority": 1 }
  ],
  "vendors": [
    { "category": "Vendor Type" }
  ]
}

CRITICAL RULES:
1. Provide between 5 and 7 realistic budget categories reflective of Indian celebrations (e.g. Venue, Catering, Photography, Decor, Music, etc.).
2. The sum of planned_amount should approximately match the total budget of ₹${event.budget_total}.
3. days_before_event should be realistic integer days before the event (between 3 and 180).
4. Provide 5 to 8 milestone tasks and 4 to 6 vendor categories.
5. Output ONLY valid raw JSON with NO markdown code fences, NO preamble, NO postscript.`;

  let parsedPlan = null;

  // Try calling Gemini API if key is present
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'placeholder-gemini-key') {
    try {
      parsedPlan = await callGeminiWithRetry(prompt);
    } catch (err) {
      console.warn('[AI PLAN SERVICE]: Gemini call failed, falling back to deterministic template.', err.message);
    }
  }

  // If Gemini failed, returned invalid structure, or was omitted: use deterministic fallback
  if (!parsedPlan) {
    parsedPlan = getDeterministicFallbackPlan(event);
  }

  // Post-process: Force category amounts to sum EXACTLY to event.budget_total
  parsedPlan.budget_categories = normalizeBudgetCategories(
    parsedPlan.budget_categories,
    event.budget_total,
  );

  // Post-process: Convert days_before_event into real ISO due_date values
  parsedPlan.tasks = parsedPlan.tasks.map((task) => ({
    ...task,
    due_date: calculateDueDate(event.event_date, task.days_before_event),
  }));

  // Store in cache
  planCache.set(cacheKey, parsedPlan);

  return parsedPlan;
}

/**
 * Helper calling Gemini with 1 retry on parse or validation failure.
 */
async function callGeminiWithRetry(prompt, retryError = null) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const finalPrompt = retryError
    ? `${prompt}\n\nIMPORTANT: Your previous output failed schema validation with: ${retryError}. Fix this and return ONLY valid JSON matching the exact schema.`
    : prompt;

  const body = {
    contents: [
      {
        parts: [{ text: finalPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Gemini API returned status ${response.status}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Empty response from Gemini');
  }

  // Parse JSON
  let rawJson;
  try {
    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    rawJson = JSON.parse(cleaned);
  } catch (parseErr) {
    if (!retryError) {
      return callGeminiWithRetry(prompt, parseErr.message);
    }
    throw parseErr;
  }

  // Validate with Zod
  const validation = planOutputSchema.safeParse(rawJson);
  if (!validation.success) {
    if (!retryError) {
      const errStr = validation.error.issues.map((i) => i.message).join('; ');
      return callGeminiWithRetry(prompt, errStr);
    }
    throw new Error(`Validation failed: ${validation.error.message}`);
  }

  return validation.data;
}
