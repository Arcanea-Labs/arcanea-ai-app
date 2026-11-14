-- Production migration 20260404142505_claw_events_table on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Cross-claw event pipeline table
CREATE TABLE IF NOT EXISTS public.claw_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text        NOT NULL,
  source_claw     text        NOT NULL,
  target_claw     text        NOT NULL,
  action          text        NOT NULL,
  payload         jsonb       DEFAULT '{}',
  result          jsonb       DEFAULT '{}',
  status          text        DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  emitted_at      timestamptz DEFAULT now(),
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claw_events_target_status ON public.claw_events (target_claw, status);
CREATE INDEX IF NOT EXISTS idx_claw_events_source ON public.claw_events (source_claw);
CREATE INDEX IF NOT EXISTS idx_claw_events_type ON public.claw_events (event_type);

ALTER TABLE public.claw_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claw_events_auth_all" ON public.claw_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "claw_events_service_all" ON public.claw_events FOR ALL TO service_role USING (true) WITH CHECK (true);
