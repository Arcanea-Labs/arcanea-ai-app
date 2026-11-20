-- Production migration 20260322020355_add_notifications_and_utility_functions on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ============================================================
-- MIGRATION: Notifications Table + Utility Functions
-- ============================================================

-- ---- Notifications System ----
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'follow', 'comment', 'mention', 'achievement', 'system', 'council', 'gate_unlock')),
  title text NOT NULL,
  body text,
  link text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type text,
  entity_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (user_id = (select auth.uid()));

-- System can insert notifications (via service role)
CREATE POLICY "Service can insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO service_role;

-- ---- Mark notifications read ----
CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids uuid[])
RETURNS void LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE id = ANY(notification_ids)
    AND user_id = auth.uid();
END;
$$;

-- ---- Mark all notifications read ----
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid() AND read = false;
END;
$$;

-- ---- Auto-notify on like ----
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  creation_owner_id uuid;
  creation_title text;
  actor_name text;
BEGIN
  SELECT user_id, title INTO creation_owner_id, creation_title
  FROM public.creations WHERE id = NEW.creation_id;

  -- Don't notify self-likes
  IF creation_owner_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, actor_id, entity_type, entity_id, link)
  VALUES (
    creation_owner_id, 'like',
    COALESCE(actor_name, 'Someone') || ' liked your creation',
    creation_title,
    NEW.user_id, 'creation', NEW.creation_id,
    '/creations/' || NEW.creation_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- ---- Auto-notify on follow ----
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  actor_name text;
BEGIN
  SELECT display_name INTO actor_name FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, type, title, body, actor_id, entity_type, entity_id, link)
  VALUES (
    NEW.following_id, 'follow',
    COALESCE(actor_name, 'Someone') || ' started following you',
    NULL,
    NEW.follower_id, 'profile', NEW.follower_id,
    '/profile/' || NEW.follower_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- ---- Gate Unlock Achievement Function ----
CREATE OR REPLACE FUNCTION public.unlock_gate(
  p_user_id uuid,
  p_gate_number int,
  p_gate_name text
)
RETURNS void LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  current_gates int;
  new_rank text;
BEGIN
  SELECT gates_open INTO current_gates FROM public.profiles WHERE id = p_user_id;

  IF p_gate_number <= current_gates THEN RETURN; END IF;

  -- Determine new rank
  new_rank := CASE
    WHEN p_gate_number >= 9 THEN 'Luminor'
    WHEN p_gate_number >= 7 THEN 'Archmage'
    WHEN p_gate_number >= 5 THEN 'Master'
    WHEN p_gate_number >= 3 THEN 'Mage'
    ELSE 'Apprentice'
  END;

  UPDATE public.profiles
  SET gates_open = p_gate_number,
      magic_rank = new_rank,
      xp = xp + (p_gate_number * 100),
      updated_at = now()
  WHERE id = p_user_id;

  -- Notify user
  INSERT INTO public.notifications (user_id, type, title, body, entity_type, link)
  VALUES (
    p_user_id, 'gate_unlock',
    'Gate ' || p_gate_number || ' Unlocked: ' || p_gate_name,
    'You have ascended to ' || new_rank || ' rank!',
    'gate',
    '/academy/gates'
  );
END;
$$;

-- ---- Leaderboard Function ----
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  board_type text DEFAULT 'xp',
  result_limit int DEFAULT 20
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  magic_rank text,
  gates_open int,
  xp int,
  score bigint,
  rank bigint
)
LANGUAGE plpgsql SET search_path = public STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.display_name, p.avatar_url, p.magic_rank, p.gates_open, p.xp,
    CASE board_type
      WHEN 'xp' THEN p.xp::bigint
      WHEN 'creations' THEN (SELECT count(*) FROM public.creations c WHERE c.user_id = p.id AND c.status = 'published')
      WHEN 'likes' THEN (SELECT COALESCE(sum(c.like_count), 0) FROM public.creations c WHERE c.user_id = p.id)
      WHEN 'streak' THEN p.streak_days::bigint
      ELSE p.xp::bigint
    END as score,
    ROW_NUMBER() OVER (ORDER BY
      CASE board_type
        WHEN 'xp' THEN p.xp::bigint
        WHEN 'streak' THEN p.streak_days::bigint
        ELSE p.xp::bigint
      END DESC
    ) as rank
  FROM public.profiles p
  ORDER BY score DESC
  LIMIT result_limit;
END;
$$;

-- ---- Unread notification count ----
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS int LANGUAGE plpgsql SET search_path = public STABLE SECURITY DEFINER AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.notifications
  WHERE user_id = auth.uid() AND read = false;
  RETURN cnt;
END;
$$;
