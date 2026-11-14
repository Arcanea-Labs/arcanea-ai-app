-- Production migration 20260324022321_add_daily_nudge_cron on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- Daily Personalized Nudge Notification
-- Runs at 8am UTC, sends one notification per active user
-- based on their gate alignment, streak, and activity
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_daily_nudges()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  nudge_title text;
  nudge_body text;
  nudge_link text;
  gate_names text[] := ARRAY['Foundation','Flow','Fire','Heart','Voice','Sight','Crown','Starweave','Unity','Source'];
  guardian_names text[] := ARRAY['Lyssandria','Leyla','Draconia','Maylinn','Alera','Lyria','Aiyami','Elara','Ino','Shinkami'];
  next_gate text;
  next_guardian text;
BEGIN
  FOR r IN
    SELECT id, display_name, gates_open, active_gate, streak_days, xp,
           magic_rank, last_active_at
    FROM public.profiles
    WHERE last_active_at > now() - interval '14 days'  -- Only active users
      OR streak_days > 0  -- Or users with active streaks
  LOOP
    -- Determine next gate
    IF r.gates_open < 10 THEN
      next_gate := gate_names[r.gates_open + 1];
      next_guardian := guardian_names[r.gates_open + 1];
    ELSE
      next_gate := 'Source';
      next_guardian := 'Shinkami';
    END IF;

    -- Generate nudge based on streak and gate status
    IF r.streak_days > 0 AND r.streak_days % 7 = 0 THEN
      -- Weekly streak milestone
      nudge_title := r.streak_days || '-day streak! ' || next_guardian || ' honors your dedication.';
      nudge_body := 'Your consistency opens pathways. The ' || next_gate || ' Gate resonates with your commitment.';
      nudge_link := '/academy/gates';
    ELSIF r.streak_days > 0 THEN
      -- Active streak encouragement
      nudge_title := next_guardian || ' sees your ' || r.streak_days || '-day flame burning.';
      nudge_body := 'Keep creating. The ' || next_gate || ' Gate draws nearer with each day of practice.';
      nudge_link := '/chat';
    ELSIF r.last_active_at < now() - interval '3 days' THEN
      -- Re-engagement nudge
      nudge_title := next_guardian || ' awaits your return to the ' || next_gate || ' Gate.';
      nudge_body := 'Three days of silence. Your creative spark needs tending. Even a small creation keeps the Gates open.';
      nudge_link := '/chat';
    ELSE
      -- Daily inspiration
      nudge_title := 'The ' || next_gate || ' Gate whispers today.';
      nudge_body := next_guardian || ' suggests: create something aligned with ' || 
        CASE (r.gates_open + 1) % 5
          WHEN 1 THEN 'Earth — something grounded and real.'
          WHEN 2 THEN 'Water — something flowing and emotional.'
          WHEN 3 THEN 'Fire — something bold and transformative.'
          WHEN 4 THEN 'Wind — something free and expressive.'
          ELSE 'Spirit — something transcendent and visionary.'
        END;
      nudge_link := '/chat';
    END IF;

    -- Insert notification (skip if one was already sent today)
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT r.id, 'system', nudge_title, nudge_body, nudge_link
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = r.id
        AND type = 'system'
        AND created_at > now() - interval '20 hours'
    );
  END LOOP;
END;
$$;

-- Schedule: daily at 8:00 AM UTC
SELECT cron.schedule(
  'daily-creator-nudge',
  '0 8 * * *',
  $$ SELECT public.generate_daily_nudges(); $$
);
