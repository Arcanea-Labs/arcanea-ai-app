-- Production migration 20260324022338_auto_gate_progression_triggers on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- =============================================================
-- Auto Gate Progression: check_and_unlock_gates + triggers
-- =============================================================
-- Note: Heart gate currently checks follows only (5+).
-- When a "comments" table is added, restore the comment_count >= 3 condition.

CREATE OR REPLACE FUNCTION public.check_and_unlock_gates(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  current_gates int;
  creation_count int;
  creation_types int;
  total_likes bigint;
  total_views bigint;
  following_count int;
  luminor_count int;
  follower_count int;
  user_xp int;
  has_profile boolean;
BEGIN
  -- Get current gate count and XP
  SELECT gates_open, xp INTO current_gates, user_xp
  FROM public.profiles WHERE id = p_user_id;

  IF current_gates IS NULL THEN RETURN; END IF;
  IF current_gates >= 10 THEN RETURN; END IF;

  -- Gather stats
  SELECT count(*), count(DISTINCT type) INTO creation_count, creation_types
  FROM public.creations WHERE user_id = p_user_id AND status = 'published';

  SELECT COALESCE(sum(like_count), 0), COALESCE(sum(view_count), 0)
  INTO total_likes, total_views
  FROM public.creations WHERE user_id = p_user_id;

  SELECT count(*) INTO following_count
  FROM public.follows WHERE follower_id = p_user_id;

  SELECT count(*) INTO follower_count
  FROM public.follows WHERE following_id = p_user_id;

  SELECT count(*) INTO luminor_count
  FROM public.luminors WHERE creator_id = p_user_id AND published = true;

  SELECT (display_name IS NOT NULL AND display_name != '' AND bio IS NOT NULL AND bio != '')
  INTO has_profile
  FROM public.profiles WHERE id = p_user_id;

  -- Gate 1: Foundation — complete profile + first creation
  IF current_gates < 1 AND has_profile AND creation_count >= 1 THEN
    PERFORM public.unlock_gate(p_user_id, 1, 'Foundation');
    current_gates := 1;
  END IF;

  -- Gate 2: Flow — 3+ creations across 2+ types
  IF current_gates < 2 AND current_gates >= 1 AND creation_count >= 3 AND creation_types >= 2 THEN
    PERFORM public.unlock_gate(p_user_id, 2, 'Flow');
    current_gates := 2;
  END IF;

  -- Gate 3: Fire — 10+ total likes
  IF current_gates < 3 AND current_gates >= 2 AND total_likes >= 10 THEN
    PERFORM public.unlock_gate(p_user_id, 3, 'Fire');
    current_gates := 3;
  END IF;

  -- Gate 4: Heart — follow 5+ creators (comment condition deferred until comments table exists)
  IF current_gates < 4 AND current_gates >= 3 AND following_count >= 5 THEN
    PERFORM public.unlock_gate(p_user_id, 4, 'Heart');
    current_gates := 4;
  END IF;

  -- Gate 5: Voice — publish 1+ luminor
  IF current_gates < 5 AND current_gates >= 4 AND luminor_count >= 1 THEN
    PERFORM public.unlock_gate(p_user_id, 5, 'Voice');
    current_gates := 5;
  END IF;

  -- Gate 6: Sight — 100+ total views
  IF current_gates < 6 AND current_gates >= 5 AND total_views >= 100 THEN
    PERFORM public.unlock_gate(p_user_id, 6, 'Sight');
    current_gates := 6;
  END IF;

  -- Gate 7: Crown — 500+ XP
  IF current_gates < 7 AND current_gates >= 6 AND user_xp >= 500 THEN
    PERFORM public.unlock_gate(p_user_id, 7, 'Crown');
    current_gates := 7;
  END IF;

  -- Gate 8: Starweave — 10+ creations AND 50+ total likes
  IF current_gates < 8 AND current_gates >= 7 AND creation_count >= 10 AND total_likes >= 50 THEN
    PERFORM public.unlock_gate(p_user_id, 8, 'Starweave');
    current_gates := 8;
  END IF;

  -- Gate 9: Unity — 10+ followers
  IF current_gates < 9 AND current_gates >= 8 AND follower_count >= 10 THEN
    PERFORM public.unlock_gate(p_user_id, 9, 'Unity');
    current_gates := 9;
  END IF;

  -- Gate 10: Source — all 9 gates open AND 1000+ XP
  IF current_gates < 10 AND current_gates >= 9 AND user_xp >= 1000 THEN
    PERFORM public.unlock_gate(p_user_id, 10, 'Source');
  END IF;
END;
$$;

-- ----- Trigger functions -----

CREATE OR REPLACE FUNCTION public.trg_check_gates_on_creation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  PERFORM public.check_and_unlock_gates(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_check_gates_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
DECLARE
  creation_owner uuid;
BEGIN
  SELECT user_id INTO creation_owner FROM public.creations WHERE id = NEW.creation_id;
  IF creation_owner IS NOT NULL THEN
    PERFORM public.check_and_unlock_gates(creation_owner);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_check_gates_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  -- Follower: Heart gate (following 5+)
  PERFORM public.check_and_unlock_gates(NEW.follower_id);
  -- Followed user: Unity gate (10+ followers)
  PERFORM public.check_and_unlock_gates(NEW.following_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_check_gates_on_luminor()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  IF NEW.published = true THEN
    PERFORM public.check_and_unlock_gates(NEW.creator_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_check_gates_on_xp_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public SECURITY DEFINER AS $$
BEGIN
  IF NEW.xp IS DISTINCT FROM OLD.xp THEN
    PERFORM public.check_and_unlock_gates(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- ----- Triggers -----

DROP TRIGGER IF EXISTS trg_gate_check_creation ON public.creations;
CREATE TRIGGER trg_gate_check_creation AFTER INSERT ON public.creations
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_gates_on_creation();

DROP TRIGGER IF EXISTS trg_gate_check_like ON public.likes;
CREATE TRIGGER trg_gate_check_like AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_gates_on_like();

DROP TRIGGER IF EXISTS trg_gate_check_follow ON public.follows;
CREATE TRIGGER trg_gate_check_follow AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_gates_on_follow();

DROP TRIGGER IF EXISTS trg_gate_check_luminor ON public.luminors;
CREATE TRIGGER trg_gate_check_luminor AFTER INSERT OR UPDATE OF published ON public.luminors
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_gates_on_luminor();

DROP TRIGGER IF EXISTS trg_gate_check_xp ON public.profiles;
CREATE TRIGGER trg_gate_check_xp AFTER UPDATE OF xp ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_gates_on_xp_change();
