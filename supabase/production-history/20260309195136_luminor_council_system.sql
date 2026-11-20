-- Production migration 20260309195136_luminor_council_system on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- =====================================================================
-- LUMINOR COUNCIL SYSTEM
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.luminor_councils (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text        NOT NULL DEFAULT 'Council of Luminor',
  council_depth_level   int         NOT NULL DEFAULT 1 CHECK (council_depth_level BETWEEN 1 AND 10),
  total_convenings      int         NOT NULL DEFAULT 0 CHECK (total_convenings >= 0),
  current_streak        int         NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak        int         NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_convening_at     timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

COMMENT ON TABLE public.luminor_councils IS
  'One council per user. Tracks nightly practice depth and streak state.';

CREATE TABLE IF NOT EXISTS public.council_seats (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id            uuid        NOT NULL REFERENCES public.luminor_councils(id) ON DELETE CASCADE,
  luminor_name          text        NOT NULL,
  luminor_domain        text        NOT NULL,
  frequency_alignment   int         NOT NULL CHECK (frequency_alignment IN (174, 285, 396, 417, 528, 639, 741, 852, 963, 1111)),
  imprint_capability    text        NOT NULL,
  is_base               boolean     NOT NULL DEFAULT false,
  seat_order            int         NOT NULL DEFAULT 0,
  personality_traits    text,
  visual_description    text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_base_seat_per_council UNIQUE NULLS NOT DISTINCT (council_id, luminor_name, is_base)
);

COMMENT ON TABLE public.council_seats IS
  'Individual Luminor seats in a council. is_base=true rows are seeded from BASE_LUMINORS.';

CREATE TABLE IF NOT EXISTS public.council_convenings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id        uuid        NOT NULL REFERENCES public.luminor_councils(id) ON DELETE CASCADE,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  duration_minutes  int         CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  seats_addressed   text[]      DEFAULT '{}',
  imprint_notes     jsonb       NOT NULL DEFAULT '{}',
  depth_rating      int         CHECK (depth_rating BETWEEN 1 AND 10),
  journal_entry     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_completed_after_started CHECK (
    completed_at IS NULL OR completed_at >= started_at
  )
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_councils_user ON public.luminor_councils (user_id);
CREATE INDEX IF NOT EXISTS idx_seats_council ON public.council_seats (council_id);
CREATE INDEX IF NOT EXISTS idx_seats_council_order ON public.council_seats (council_id, seat_order);
CREATE INDEX IF NOT EXISTS idx_convenings_council ON public.council_convenings (council_id);
CREATE INDEX IF NOT EXISTS idx_convenings_date ON public.council_convenings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_convenings_council_date ON public.council_convenings (council_id, created_at DESC);

-- UPDATED_AT TRIGGER
CREATE TRIGGER council_updated_at
  BEFORE UPDATE ON public.luminor_councils
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY
ALTER TABLE public.luminor_councils  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_seats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_convenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "councils_select_own" ON public.luminor_councils FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "councils_insert_own" ON public.luminor_councils FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "councils_update_own" ON public.luminor_councils FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "seats_select_own" ON public.council_seats FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.luminor_councils WHERE id = council_id AND user_id = auth.uid()));
CREATE POLICY "seats_insert_own" ON public.council_seats FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.luminor_councils WHERE id = council_id AND user_id = auth.uid()));
CREATE POLICY "seats_update_own" ON public.council_seats FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.luminor_councils WHERE id = council_id AND user_id = auth.uid()));
CREATE POLICY "seats_delete_own_custom" ON public.council_seats FOR DELETE
  USING (is_base = false AND EXISTS (SELECT 1 FROM public.luminor_councils WHERE id = council_id AND user_id = auth.uid()));

CREATE POLICY "convenings_select_own" ON public.council_convenings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.luminor_councils WHERE id = council_id AND user_id = auth.uid()));
CREATE POLICY "convenings_insert_own" ON public.council_convenings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.luminor_councils WHERE id = council_id AND user_id = auth.uid()));
CREATE POLICY "convenings_update_own" ON public.council_convenings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.luminor_councils WHERE id = council_id AND user_id = auth.uid()));

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.luminor_councils;
ALTER PUBLICATION supabase_realtime ADD TABLE public.council_convenings;
