-- Production migration 20260403161317_world_graph_foundation on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- ═══════════════════════════════════════════════════════
-- WORLD GRAPH FOUNDATION — The core invention of Arcanea
-- "A World is a first-class computational object"
-- ═══════════════════════════════════════════════════════

-- WORLDS: The root entity. Everything lives inside a World.
CREATE TABLE public.worlds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  description text,

  -- Ontology: rules, physics, magic systems
  elements jsonb DEFAULT '[]',
  laws jsonb DEFAULT '[]',
  systems jsonb DEFAULT '[]',

  -- Aesthetic: visual style for generation
  palette jsonb DEFAULT '{}',
  mood text,
  hero_image_url text,

  -- Fork graph
  forked_from_id uuid REFERENCES public.worlds(id) ON DELETE SET NULL,
  version text DEFAULT '0.1.0',
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  license text DEFAULT 'personal' CHECK (license IN ('personal', 'cc-by', 'commercial', 'open')),

  -- Marketplace
  marketplace_listed boolean DEFAULT false,
  marketplace_price integer,
  marketplace_downloads integer DEFAULT 0,

  -- Counters (denormalized for performance)
  character_count integer DEFAULT 0,
  creation_count integer DEFAULT 0,
  star_count integer DEFAULT 0,
  fork_count integer DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.worlds IS 'Living Worlds — forkable, shareable, AI-powered creative universes. The core invention of Arcanea.';

-- WORLD FACTIONS: groups with identity and territory
CREATE TABLE public.world_factions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  philosophy text,
  territory jsonb DEFAULT '{}',
  history text,
  visual_identity jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- WORLD CHARACTERS: each can become a conversational AI agent
CREATE TABLE public.world_characters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  title text,
  origin_class text,

  -- Personality engine
  personality jsonb NOT NULL DEFAULT '{}',
  backstory text,
  motivation text,

  -- Links
  faction_id uuid REFERENCES public.world_factions(id) ON DELETE SET NULL,
  relationships jsonb DEFAULT '[]',

  -- Visuals & audio
  portrait_url text,
  theme_music_url text,

  -- Agent configuration
  is_agent boolean DEFAULT false,
  agent_model text DEFAULT 'gemini',
  agent_system_prompt text,
  agent_memory_namespace text,
  agent_conversation_count integer DEFAULT 0,

  -- Classification
  element text,
  gate integer CHECK (gate >= 1 AND gate <= 10),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.world_characters IS 'Characters within a World. Each can become a conversational AI agent with persistent memory.';

-- WORLD LOCATIONS: places in the world
CREATE TABLE public.world_locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  region text,
  description text,
  significance text,
  image_url text,
  ambient_music_url text,
  coordinates jsonb,
  created_at timestamptz DEFAULT now()
);

-- WORLD EVENTS: timeline of the world's history
CREATE TABLE public.world_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  era text,
  date_in_world text,
  sort_order integer DEFAULT 0,
  location_id uuid REFERENCES public.world_locations(id) ON DELETE SET NULL,
  characters_involved uuid[] DEFAULT '{}',
  consequences text,
  created_at timestamptz DEFAULT now()
);

-- WORLD CREATIONS: unified content — text, image, music, code
CREATE TABLE public.world_creations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE NOT NULL,
  creator_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'image', 'music', 'code', 'document')),
  title text NOT NULL,
  content text,
  media_url text,
  thumbnail_url text,

  -- World Graph links
  linked_characters uuid[] DEFAULT '{}',
  linked_locations uuid[] DEFAULT '{}',
  linked_events uuid[] DEFAULT '{}',
  linked_factions uuid[] DEFAULT '{}',

  -- Generation metadata
  prompt text,
  model text,
  style text,

  -- Social
  likes integer DEFAULT 0,
  views integer DEFAULT 0,
  is_public boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

-- WORLD STARS: users who follow/star a world
CREATE TABLE public.world_stars (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, world_id)
);

-- WORLD FORKS: track the fork graph (like GitHub)
CREATE TABLE public.world_forks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_world_id uuid REFERENCES public.worlds(id) ON DELETE SET NULL,
  forked_world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
  forked_by uuid REFERENCES auth.users(id),
  changes_summary text,
  created_at timestamptz DEFAULT now()
);

-- WORLD COLLABORATORS: shared editing
CREATE TABLE public.world_collaborators (
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'admin')),
  invited_at timestamptz DEFAULT now(),
  PRIMARY KEY (world_id, user_id)
);

-- USER CREDITS: payment/credit ledger (LemonSqueezy pre-BV)
CREATE TABLE public.user_credits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance integer DEFAULT 5 NOT NULL,
  total_purchased integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'creator', 'pro', 'forge')),
  payment_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.user_credits IS 'Credit balance and subscription state. LemonSqueezy pre-BV, Stripe post-BV.';

-- CREDIT TRANSACTIONS: audit trail
CREATE TABLE public.credit_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'subscription', 'daily_free', 'spend', 'refund', 'earn')),
  description text,
  payment_provider_id text,
  world_id uuid REFERENCES public.worlds(id),
  created_at timestamptz DEFAULT now()
);

-- USER PROGRESSION: track progress through a World's gate system
CREATE TABLE public.user_progression (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  world_id uuid REFERENCES public.worlds(id) ON DELETE CASCADE,
  current_stage integer DEFAULT 1,
  current_rank text DEFAULT 'Apprentice',
  archetype text,
  stages_completed jsonb DEFAULT '{}',
  total_creations integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  title text,
  badges text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, world_id)
);

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════

ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;

-- Public worlds visible to all
CREATE POLICY "Public worlds are viewable" ON public.worlds
  FOR SELECT USING (visibility = 'public');

-- Creators manage their own worlds
CREATE POLICY "Creators manage own worlds" ON public.worlds
  FOR ALL USING (auth.uid() = creator_id);

-- Collaborators can view worlds they're invited to
CREATE POLICY "Collaborators can view worlds" ON public.worlds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.world_collaborators wc WHERE wc.world_id = id AND wc.user_id = auth.uid())
  );

-- Characters: public if world is public, or own world
CREATE POLICY "Characters follow world visibility" ON public.world_characters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND (w.visibility = 'public' OR w.creator_id = auth.uid()))
  );
CREATE POLICY "Creators manage own characters" ON public.world_characters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND w.creator_id = auth.uid())
  );

-- Factions: same pattern
CREATE POLICY "Factions follow world visibility" ON public.world_factions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND (w.visibility = 'public' OR w.creator_id = auth.uid()))
  );
CREATE POLICY "Creators manage own factions" ON public.world_factions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND w.creator_id = auth.uid())
  );

-- Locations: same pattern
CREATE POLICY "Locations follow world visibility" ON public.world_locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND (w.visibility = 'public' OR w.creator_id = auth.uid()))
  );
CREATE POLICY "Creators manage own locations" ON public.world_locations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND w.creator_id = auth.uid())
  );

-- Events: same pattern
CREATE POLICY "Events follow world visibility" ON public.world_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND (w.visibility = 'public' OR w.creator_id = auth.uid()))
  );
CREATE POLICY "Creators manage own events" ON public.world_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND w.creator_id = auth.uid())
  );

-- World creations: public if marked public, or own
CREATE POLICY "Public creations viewable" ON public.world_creations
  FOR SELECT USING (is_public = true);
CREATE POLICY "Creators manage own creations" ON public.world_creations
  FOR ALL USING (auth.uid() = creator_id);

-- Stars: users manage their own stars
CREATE POLICY "Users manage own stars" ON public.world_stars
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Stars are viewable" ON public.world_stars
  FOR SELECT USING (true);

-- Forks: anyone can view, users create their own
CREATE POLICY "Forks are viewable" ON public.world_forks
  FOR SELECT USING (true);
CREATE POLICY "Users create own forks" ON public.world_forks
  FOR INSERT WITH CHECK (auth.uid() = forked_by);

-- Collaborators: participants can view
CREATE POLICY "Collaborators can view membership" ON public.world_collaborators
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND w.creator_id = auth.uid()));
CREATE POLICY "World owners manage collaborators" ON public.world_collaborators
  FOR ALL USING (EXISTS (SELECT 1 FROM public.worlds w WHERE w.id = world_id AND w.creator_id = auth.uid()));

-- Credits: users see their own
CREATE POLICY "Users read own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Progression: users manage their own, public worlds visible
CREATE POLICY "Users manage own progression" ON public.user_progression
  FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════

CREATE INDEX idx_worlds_creator ON public.worlds(creator_id);
CREATE INDEX idx_worlds_visibility ON public.worlds(visibility) WHERE visibility = 'public';
CREATE INDEX idx_worlds_slug ON public.worlds(slug);
CREATE INDEX idx_worlds_marketplace ON public.worlds(marketplace_listed) WHERE marketplace_listed = true;
CREATE INDEX idx_world_characters_world ON public.world_characters(world_id);
CREATE INDEX idx_world_factions_world ON public.world_factions(world_id);
CREATE INDEX idx_world_locations_world ON public.world_locations(world_id);
CREATE INDEX idx_world_events_world ON public.world_events(world_id);
CREATE INDEX idx_world_creations_world ON public.world_creations(world_id);
CREATE INDEX idx_world_creations_creator ON public.world_creations(creator_id);
CREATE INDEX idx_world_creations_type ON public.world_creations(type);
CREATE INDEX idx_world_stars_world ON public.world_stars(world_id);
CREATE INDEX idx_user_credits_user ON public.user_credits(user_id);
CREATE INDEX idx_credit_transactions_user ON public.credit_transactions(user_id);
CREATE INDEX idx_user_progression_user_world ON public.user_progression(user_id, world_id);

-- ═══════════════════════════════════════════════════════
-- TRIGGERS: auto-update timestamps
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worlds_updated_at BEFORE UPDATE ON public.worlds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER world_characters_updated_at BEFORE UPDATE ON public.world_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_credits_updated_at BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_progression_updated_at BEFORE UPDATE ON public.user_progression
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
