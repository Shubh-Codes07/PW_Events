# Utsav 🎊

**GenAI-powered celebration & event planning assistant** — built for the Google PromptWars Challenge 5.

Utsav helps first-time family organisers, students, and community groups plan weddings, birthdays, and community events with AI-powered budgets, timelines, vendor checklists, personalised ideas, and a guest Memory Wall.

## Tech Stack

| Layer | Technology |
| ----------- | ----------------------------------------- |
| Frontend | React 18 · Vite · React Router · CSS Modules |
| Backend | Node.js · Express |
| Database | Supabase (Postgres + Auth + Storage) |
| AI | Google Gemini API (server-only) |
| Validation | Zod (shared) |
| Testing | Vitest · Supertest |

## ⚡ How to Evaluate in 60 Seconds (No Signup Needed)

1. **Open the App**: Click **"Try the demo"** in the top navigation or on the login page for instant one-click guest access.
2. **Complete the Wizard (4 quick steps)**: Choose an event type (Wedding, Birthday, or Community), enter city and guest count, set a budget in ₹, and generate your customized celebration plan.
3. **Explore Key Capabilities**:
   - **💰 Budget**: View ₹ allocations with Indian digit grouping, record expenses, and test the **"Budget Rescue"** engine on overspent categories.
   - **📅 Timeline**: Browse chronological milestones, toggle completion, and check next best actions.
   - **🤝 Vendors**: Review booked partners and generate multi-lingual enquiry drafts in English, Hindi, and Kannada.
   - **💡 Ideas**: Explore tailored themes, decor, menus, and gifts with **"Make it cheaper"** / **"More traditional"** AI refinement.
   - **🤖 Assistant**: Click the floating assistant in the bottom right to ask questions with real-time awareness of your event status.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Supabase](https://supabase.com) project (with **Anonymous sign-ins** enabled under Authentication > Providers)
- A [Google AI Studio](https://aistudio.google.com) Gemini API key

### 1. Install dependencies

```bash
# Client
cd client && npm install

# Server
cd ../server && npm install
```

### 2. Set up environment variables

```bash
# Copy example files
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Fill in the values — see comments in each `.env.example`.

### 3. Apply database migrations

Run each SQL file in `supabase/migrations/` against your Supabase project, in order, via the Supabase SQL Editor or the CLI:

```bash
supabase db push
```

### 4. Run locally

```bash
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 5. Run tests

```bash
# Run all tests
npm test

# Run with code coverage
npm run coverage
```

## Testing

Utsav includes comprehensive unit, integration, and security test suites across both client and server:

### Test Commands

```bash
# Run all client and server test suites
npm test

# Run client tests only
npm run test:client
# or cd client && npm test

# Run server tests only
npm run test:server
# or cd server && npm test

# Run test coverage reports (vitest --coverage)
npm run coverage
# or within individual workspaces:
cd client && npm run coverage
cd server && npm run coverage
```

### What Is Covered

- **Guest / Anonymous Access & Abuse Prevention**: Seamless one-click anonymous authentication, strict cross-account isolation, and per-user 10-event creation cap enforcement with graceful database degradation.
- **Shared Plan Security & Token Rotation**: Read-only public plan access via cryptographic share tokens with strict field whitelisting (never exposing owner IDs, memory keys, or internal IDs) and secure token revocation/rotation.
- **Centralized Error Handling**: Express middleware verifying operational vs unexpected 500 error sanitization, stack trace concealment in production, and structured JSON logs.
- **AI Plan Generation & Curated Fallbacks**: Resilience against Gemini API timeouts, HTTP 500 errors, and malformed JSON with deterministic, culturally authentic fallbacks across wedding, birthday, and community event types.
- **Ideas & Floating Assistant Endpoints**: Context assembly, validation constraints, save/toggle state management, and offline AI fallbacks.
- **Client Pages & User Workflows**:
  - **Landing Page**: Unauthenticated CTAs, instant one-click guest evaluation flow, celebration category highlights, and feature breakdown.
  - **Timeline Page**: Chronological milestone rendering, category-based filtering, quick milestone creation, completion toggling, and editing modal.
  - **Vendors Page**: Category grouping, vendor creation modal, booking status updates, and multilingual Gemini WhatsApp enquiry drafting.
  - **Overview Page**: Celebration countdown, ₹ digit formatting, Next-Best-Action completion, and read-only share link modal with token regeneration.
  - **Budget & Rescue**: Real-time allocation, expense tracking, and the AI Budget Rescue modal flow.

## Project Structure

```
├── client/           # React + Vite frontend
├── server/           # Express API backend
├── supabase/
│   └── migrations/   # Postgres migration SQL files
├── .eslintrc.json
├── .prettierrc
└── README.md
```

## Deployment

### Environment Variables Reference

#### Frontend (`client/.env`)

| Variable | Description | Exposed to Browser? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (`https://xyz.supabase.co`) | Yes (public) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous public key | Yes (public, protected by RLS) |
| `VITE_API_URL` | Backend Express API base URL (e.g. `https://api.yourdomain.com/api` or `http://localhost:3001/api`) | Yes (public) |

#### Backend (`server/.env`)

| Variable | Description | Exposed to Browser? |
| --- | --- | --- |
| `PORT` | HTTP port for the Express application (default: `3001`) | **No (server-only)** |
| `CORS_ORIGIN` | Allowed frontend origin(s). Supports comma-separated list in production (e.g., `http://localhost:5173,https://utsav.vercel.app`) | **No (server-only)** |
| `SUPABASE_URL` | Supabase project URL | **No (server-only)** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret key (bypasses RLS for secure admin tasks) | **No (server-only, STRICTLY CONFIDENTIAL)** |
| `GEMINI_API_KEY` | Google Gemini API key for structured AI planning & assistant | **No (server-only, STRICTLY CONFIDENTIAL)** |
| `GEMINI_MODEL` | Google Gemini model name (default: `gemini-2.5-flash`) | **No (server-only)** |

### Supabase Auth Redirect URL Configuration

For magic link email authentication to work across both local development and production deployments:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to **Authentication > URL Configuration**.
2. Set **Site URL** to your production frontend (e.g., `https://utsav.vercel.app`).
3. Under **Redirect URLs**, add both local and production callback URLs:
   - `http://localhost:5173/**`
   - `https://your-production-domain.vercel.app/**`

### Production Hosting Recommendations

- **Frontend (Client)**: Deploy to Vercel or Netlify. The included `client/vercel.json` provides standard SPA fallback rewrites for client-side routing (`/dashboard/...`, `/plan/:shareToken`).
- **Backend (Server)**: Deploy to Render, Railway, Fly.io, or Google Cloud Run. `app.set('trust proxy', 1)` is already enabled to ensure IP-based rate limiting functions correctly behind reverse proxies.

## License

MIT

