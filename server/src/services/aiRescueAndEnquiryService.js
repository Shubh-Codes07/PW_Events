import { env } from '../config/env.js';
import {
  budgetRescueOutputSchema,
} from '../schemas/dashboardSchemas.js';

/**
 * Generates a deterministic Budget Rescue plan when Gemini is unavailable.
 * Reallocates planned funds from categories with the most headroom to cover deficits.
 */
export function getDeterministicBudgetRescue(event, categoriesWithSpend) {
  const totalBudget = Number(event.budget_total) || 0;

  // Identify categories exceeding their planned allocation
  const overBudgetCategories = categoriesWithSpend.filter(
    (c) => c.spent > c.planned_amount,
  );
  const underBudgetCategories = categoriesWithSpend.filter(
    (c) => c.planned_amount > c.spent,
  );

  const adjustments = [];
  const tradeoffs = [];

  if (overBudgetCategories.length === 0) {
    return {
      summary: 'All your budget categories are currently within planned limits. Great financial tracking!',
      adjustments: [],
      tradeoffs: ['Keep tracking actual vendor invoices as commitments are finalized.'],
    };
  }

  // Calculate total overspend
  let totalDeficit = overBudgetCategories.reduce(
    (acc, c) => acc + (c.spent - c.planned_amount),
    0,
  );

  // Available headroom in under-budget categories
  const totalHeadroom = underBudgetCategories.reduce(
    (acc, c) => acc + (c.planned_amount - c.spent),
    0,
  );

  // For each over-budget category, propose an increase to match spend
  overBudgetCategories.forEach((over) => {
    const needed = over.spent - over.planned_amount;
    adjustments.push({
      category: over.name,
      action: 'increase',
      amount: Math.round(needed),
      reason: `Current expenses have reached ₹${over.spent.toLocaleString('en-IN')}, exceeding the planned ₹${over.planned_amount.toLocaleString('en-IN')}.`,
    });
  });

  // Reallocate from categories with headroom
  if (totalHeadroom > 0) {
    underBudgetCategories
      .sort((a, b) => b.planned_amount - b.spent - (a.planned_amount - a.spent))
      .forEach((under) => {
        const available = under.planned_amount - under.spent;
        if (totalDeficit <= 0 || available <= 0) return;

        const deduction = Math.min(available, totalDeficit);
        totalDeficit -= deduction;

        adjustments.push({
          category: under.name,
          action: 'reduce',
          amount: Math.round(deduction),
          reason: `Reallocating unused headroom from ${under.name} where ₹${available.toLocaleString('en-IN')} remains unspent.`,
        });

        tradeoffs.push(
          `Trimming ₹${Math.round(deduction).toLocaleString('en-IN')} from ${under.name}; look for package deals or simpler options here.`,
        );
      });
  }

  if (totalDeficit > 0) {
    tradeoffs.push(
      `Your total expenditure exceeds the overall event budget of ₹${totalBudget.toLocaleString('en-IN')} by ₹${Math.round(totalDeficit).toLocaleString('en-IN')}. Consider reducing guest count or renegotiating non-essential decor.`,
    );
  }

  return {
    summary: `Budget Rescue generated: rebalancing ${adjustments.length} categories to absorb current overspends while protecting your core priorities.`,
    adjustments,
    tradeoffs: tradeoffs.length > 0 ? tradeoffs : ['Negotiate final vendor balances before payment releases.'],
  };
}

/**
 * AI-powered Budget Rescue service using Google Gemini with schema enforcement and deterministic fallback.
 */
export async function rescueBudget(event, categoriesWithSpend) {
  const prompt = `You are Utsav's AI Budget Rescue Specialist for Indian celebrations.
Analyze this event and current spending status to produce a rebalancing plan:
- Event: ${event.name} (${event.type})
- City: ${event.city}, Guests: ${event.guest_count}
- Total Budget: INR ₹${event.budget_total}
- Special Needs: ${JSON.stringify(event.special_needs || {})}

Category Spending Status:
${categoriesWithSpend
  .map(
    (c) =>
      `- ${c.name}: Planned ₹${c.planned_amount}, Spent ₹${c.spent}, Status: ${
        c.spent > c.planned_amount ? 'OVER BUDGET by ₹' + (c.spent - c.planned_amount) : 'Headroom ₹' + (c.planned_amount - c.spent)
      }`,
  )
  .join('\n')}

Task:
Produce a STRICT JSON object proposing concrete reallocations to bring over-budget categories back to a balanced state without exceeding the overall budget of ₹${event.budget_total}.
Schema:
{
  "summary": "2 sentences explaining the rescue strategy.",
  "adjustments": [
    {
      "category": "Category Name",
      "action": "reduce" or "increase",
      "amount": number,
      "reason": "Specific rationale"
    }
  ],
  "tradeoffs": [
    "Specific realistic compromise (e.g., opting for seasonal local flowers instead of exotic imports)"
  ]
}

CRITICAL: Return ONLY valid raw JSON without code blocks or extra text.`;

  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'placeholder-gemini-key') {
    try {
      const response = await callGeminiJson(prompt);
      const parsed = budgetRescueOutputSchema.safeParse(response);
      if (parsed.success) {
        return parsed.data;
      }
      console.warn('[BUDGET RESCUE]: Schema mismatch, falling back to deterministic rebalance.');
    } catch (err) {
      console.warn('[BUDGET RESCUE]: Gemini call failed:', err.message);
    }
  }

  return getDeterministicBudgetRescue(event, categoriesWithSpend);
}

/**
 * Fallback enquiry templates for vendor contact in English, Hindi, and Kannada.
 */
export function getDeterministicVendorEnquiry(event, vendor, language = 'en') {
  const dateStr = event.event_date ? new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'our upcoming date';
  const guests = event.guest_count || 100;
  const city = event.city || 'our city';
  const specialNotes = event.special_needs?.notes ? ` Specific requirements: ${event.special_needs.notes}.` : '';

  if (language === 'hi') {
    return {
      message: `नमस्ते ${vendor.name} जी,\n\nहम ${city} में ${dateStr} को अपने ${event.name} (${event.type}) के लिए ${vendor.category} सेवाओं के संबंध में संपर्क कर रहे हैं। हमारे कार्यक्रम में लगभग ${guests} अतिथि शामिल होंगे।${specialNotes}\n\nकृपया अपनी उपलब्धता और पैकेज/मूल्य सूची (quotation) साझा करें।\n\nसादर,\nआयोजक`,
    };
  }

  if (language === 'kn') {
    return {
      message: `ನಮಸ್ಕಾರ ${vendor.name},\n\nನಾವು ${city}ಯಲ್ಲಿ ${dateStr} ರಂದು ನಡೆಯಲಿರುವ ನಮ್ಮ ${event.name} (${event.type}) ಕಾರ್ಯಕ್ರಮಕ್ಕಾಗಿ ${vendor.category} ಸೇವೆಗಳ ಬಗ್ಗೆ ವಿಚಾರಿಸಲು ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇವೆ. ಅಂದಾಜು ${guests} ಅತಿಥಿಗಳು ಭಾಗವಹಿಸಲಿದ್ದಾರೆ.${specialNotes}\n\nದಯವಿಟ್ಟು ನಿಮ್ಮ ಲಭ್ಯತೆ ಮತ್ತು ಕೊಟೇಶನ್ ಹಂಚಿಕೊಳ್ಳಿ.\n\nಧನ್ಯವಾದಗಳು,\nಆಯೋಜಕರು`,
    };
  }

  return {
    message: `Hello ${vendor.name},\n\nWe are planning our ${event.name} (${event.type}) in ${city} on ${dateStr} for approximately ${guests} guests and would love to enquire about your ${vendor.category} services.${specialNotes}\n\nCould you please share your availability, service packages, and starting quote?\n\nLooking forward to hearing from you.\n\nWarm regards,\nEvent Organiser`,
  };
}

/**
 * AI-powered Vendor Enquiry generator using Gemini with multi-language support.
 */
export async function draftVendorEnquiry(event, vendor, language = 'en') {
  const langName = language === 'hi' ? 'Hindi' : language === 'kn' ? 'Kannada' : 'English';

  const prompt = `You are Utsav's event assistant. Draft a polite, professional, and culturally appropriate vendor enquiry message in ${langName}.
Event Details:
- Event: ${event.name} (${event.type})
- Date: ${event.event_date}
- City: ${event.city}
- Guests: ${event.guest_count}
- Special Notes: ${event.special_needs?.notes || 'None'}
Vendor:
- Name: ${vendor.name}
- Category: ${vendor.category}

Return a STRICT JSON object:
{
  "message": "The complete polite enquiry message text ready to be sent via WhatsApp or Email."
}`;

  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'placeholder-gemini-key') {
    try {
      const response = await callGeminiJson(prompt);
      if (response && typeof response.message === 'string' && response.message.trim().length > 0) {
        return { message: response.message.trim() };
      }
    } catch (err) {
      console.warn('[VENDOR ENQUIRY]: Gemini call failed, using template.', err.message);
    }
  }

  return getDeterministicVendorEnquiry(event, vendor, language);
}

/**
 * Generic Gemini JSON caller with error handling.
 */
async function callGeminiJson(prompt) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Gemini API responded with status ${response.status}`);
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty Gemini response');

  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}
