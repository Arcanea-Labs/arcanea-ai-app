-- Production migration 20260409103337_agents_credits_base on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.

-- Arcanea Agents: Credits + Marketplace + Tasks (base tables needed for registry protocol)

CREATE TABLE IF NOT EXISTS public.credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100,
  lifetime_earned INTEGER NOT NULL DEFAULT 100,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_agents (
  id TEXT PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,
  spec JSONB NOT NULL,
  price_credits INTEGER NOT NULL DEFAULT 10,
  element TEXT,
  gate_alignment TEXT,
  icon TEXT DEFAULT '🤖',
  color TEXT,
  gradient TEXT,
  capabilities TEXT[] DEFAULT '{}',
  rating NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  revenue_earned INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  is_certified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES public.marketplace_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON public.agent_tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON public.agent_tasks(status) WHERE status IN ('pending', 'running');
CREATE INDEX IF NOT EXISTS idx_marketplace_agents_category ON public.marketplace_agents(category) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_agents_featured ON public.marketplace_agents(is_featured) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent ON public.agent_reviews(agent_id);

-- RLS
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY credits_select ON public.credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY credits_insert ON public.credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY credits_update ON public.credits FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY tasks_select ON public.agent_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tasks_insert ON public.agent_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_update ON public.agent_tasks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY agents_select ON public.marketplace_agents FOR SELECT USING (is_published = true);
CREATE POLICY agents_insert ON public.marketplace_agents FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY agents_update ON public.marketplace_agents FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY agents_delete ON public.marketplace_agents FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY reviews_select ON public.agent_reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert ON public.agent_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY reviews_update ON public.agent_reviews FOR UPDATE USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credits_updated_at BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER marketplace_agents_updated_at BEFORE UPDATE ON public.marketplace_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION initialize_user_credits(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance, lifetime_earned)
  VALUES (p_user_id, 100, 100)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
