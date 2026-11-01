-- =============================================================
-- Utsav — Initial schema migration
-- =============================================================

-- -------------------------------------------------------
-- 1. EVENTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  type          text NOT NULL CHECK (type IN ('wedding', 'birthday', 'community')),
  event_date    date,
  city          text CHECK (city IS NULL OR char_length(city) <= 100),
  guest_count   integer CHECK (guest_count IS NULL OR (guest_count BETWEEN 1 AND 10000)),
  budget_total  numeric(14,2) CHECK (budget_total IS NULL OR budget_total >= 0),
  vibe          text CHECK (vibe IS NULL OR char_length(vibe) <= 500),
  special_needs jsonb DEFAULT '{}'::jsonb,
  share_token   text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  memory_token  text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  uploads_enabled   boolean NOT NULL DEFAULT true,
  require_approval  boolean NOT NULL DEFAULT false,
  memories_expires_at timestamptz
);

CREATE INDEX idx_events_owner_id ON public.events(owner_id);
CREATE INDEX idx_events_share_token ON public.events(share_token);
CREATE INDEX idx_events_memory_token ON public.events(memory_token);

-- -------------------------------------------------------
-- 2. BUDGET CATEGORIES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  planned_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),
  sort_order    integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_budget_categories_event_id ON public.budget_categories(event_id);

-- -------------------------------------------------------
-- 3. EXPENSES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id   uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  description   text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 300),
  amount        numeric(14,2) NOT NULL CHECK (amount >= 0)
);

CREATE INDEX idx_expenses_event_id ON public.expenses(event_id);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);

-- -------------------------------------------------------
-- 4. TASKS (timeline milestones)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  due_date      date,
  category      text CHECK (category IS NULL OR char_length(category) <= 100),
  status        text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
  priority      integer DEFAULT 0
);

CREATE INDEX idx_tasks_event_id ON public.tasks(event_id);

-- -------------------------------------------------------
-- 5. VENDORS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category      text CHECK (category IS NULL OR char_length(category) <= 100),
  name          text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  status        text NOT NULL DEFAULT 'to_contact'
    CHECK (status IN ('to_contact', 'contacted', 'quote_received', 'booked')),
  quote_amount  numeric(14,2) CHECK (quote_amount IS NULL OR quote_amount >= 0),
  phone         text CHECK (phone IS NULL OR char_length(phone) <= 20),
  email         text CHECK (email IS NULL OR char_length(email) <= 200),
  notes         text CHECK (notes IS NULL OR char_length(notes) <= 2000)
);

CREATE INDEX idx_vendors_event_id ON public.vendors(event_id);

-- -------------------------------------------------------
-- 6. IDEAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ideas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  kind          text NOT NULL
    CHECK (kind IN ('theme', 'decor', 'menu', 'game', 'gift', 'invitation')),
  title         text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body          text CHECK (body IS NULL OR char_length(body) <= 5000),
  saved         boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_ideas_event_id ON public.ideas(event_id);

-- -------------------------------------------------------
-- 7. MEMORIES (guest uploads)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  uploader_name text CHECK (uploader_name IS NULL OR char_length(uploader_name) <= 100),
  caption       text CHECK (caption IS NULL OR char_length(caption) <= 500),
  alt_text      text CHECK (alt_text IS NULL OR char_length(alt_text) <= 300),
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved')),
  media_type    text NOT NULL CHECK (char_length(media_type) BETWEEN 1 AND 50),
  size_bytes    bigint NOT NULL CHECK (size_bytes > 0)
);

CREATE INDEX idx_memories_event_id ON public.memories(event_id);

-- -------------------------------------------------------
-- 8. ROW LEVEL SECURITY
-- -------------------------------------------------------

-- Helper: check if the current user owns the event
CREATE OR REPLACE FUNCTION public.owns_event(ev_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = ev_id AND owner_id = auth.uid()
  );
$$;

-- EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select ON public.events
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY events_insert ON public.events
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY events_update ON public.events
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY events_delete ON public.events
  FOR DELETE USING (owner_id = auth.uid());

-- BUDGET CATEGORIES
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_categories_select ON public.budget_categories
  FOR SELECT USING (public.owns_event(event_id));

CREATE POLICY budget_categories_insert ON public.budget_categories
  FOR INSERT WITH CHECK (public.owns_event(event_id));

CREATE POLICY budget_categories_update ON public.budget_categories
  FOR UPDATE USING (public.owns_event(event_id))
  WITH CHECK (public.owns_event(event_id));

CREATE POLICY budget_categories_delete ON public.budget_categories
  FOR DELETE USING (public.owns_event(event_id));

-- EXPENSES
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_select ON public.expenses
  FOR SELECT USING (public.owns_event(event_id));

CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT WITH CHECK (public.owns_event(event_id));

CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE USING (public.owns_event(event_id))
  WITH CHECK (public.owns_event(event_id));

CREATE POLICY expenses_delete ON public.expenses
  FOR DELETE USING (public.owns_event(event_id));

-- TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (public.owns_event(event_id));

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT WITH CHECK (public.owns_event(event_id));

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE USING (public.owns_event(event_id))
  WITH CHECK (public.owns_event(event_id));

CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE USING (public.owns_event(event_id));

-- VENDORS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendors_select ON public.vendors
  FOR SELECT USING (public.owns_event(event_id));

CREATE POLICY vendors_insert ON public.vendors
  FOR INSERT WITH CHECK (public.owns_event(event_id));

CREATE POLICY vendors_update ON public.vendors
  FOR UPDATE USING (public.owns_event(event_id))
  WITH CHECK (public.owns_event(event_id));

CREATE POLICY vendors_delete ON public.vendors
  FOR DELETE USING (public.owns_event(event_id));

-- IDEAS
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY ideas_select ON public.ideas
  FOR SELECT USING (public.owns_event(event_id));

CREATE POLICY ideas_insert ON public.ideas
  FOR INSERT WITH CHECK (public.owns_event(event_id));

CREATE POLICY ideas_update ON public.ideas
  FOR UPDATE USING (public.owns_event(event_id))
  WITH CHECK (public.owns_event(event_id));

CREATE POLICY ideas_delete ON public.ideas
  FOR DELETE USING (public.owns_event(event_id));

-- MEMORIES — no direct access for guests or public.
-- All guest/public access goes through backend using tokens.
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY memories_select ON public.memories
  FOR SELECT USING (public.owns_event(event_id));

CREATE POLICY memories_insert ON public.memories
  FOR INSERT WITH CHECK (public.owns_event(event_id));

CREATE POLICY memories_update ON public.memories
  FOR UPDATE USING (public.owns_event(event_id))
  WITH CHECK (public.owns_event(event_id));

CREATE POLICY memories_delete ON public.memories
  FOR DELETE USING (public.owns_event(event_id));

-- -------------------------------------------------------
-- 9. STORAGE BUCKET — private, no public access
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-memories', 'event-memories', false)
ON CONFLICT (id) DO NOTHING;
