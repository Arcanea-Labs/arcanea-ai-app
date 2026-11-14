-- Production migration 20260322031748_add_subscription_fields_to_profiles on Supabase project hcfhyssdzphudaqatxbk.
-- Mirrored verbatim from supabase_migrations.schema_migrations on 2026-11-08. Read-only record; do not edit.


-- Add subscription tracking to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'spark' 
    CHECK (subscription_tier IN ('spark', 'creator', 'studio')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
  ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
