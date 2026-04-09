-- 002_fix_schema.sql
-- Fixes leaderboard_cache column names to match application code,
-- and adds the profiles and badge_events tables.

-- ── Fix leaderboard_cache ──────────────────────────────────────────────────
-- 001_initial_schema.sql used different column names. These alters bring the
-- schema in line with what the application actually queries and writes.

ALTER TABLE public.leaderboard_cache RENAME COLUMN total_xp TO xp;
ALTER TABLE public.leaderboard_cache RENAME COLUMN current_streak TO streak;
ALTER TABLE public.leaderboard_cache DROP COLUMN IF EXISTS quiz_accuracy;
ALTER TABLE public.leaderboard_cache DROP COLUMN IF EXISTS lessons_completed;
ALTER TABLE public.leaderboard_cache DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.leaderboard_cache ADD COLUMN IF NOT EXISTS last_activity_date date;
ALTER TABLE public.leaderboard_cache ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Recreate indexes on renamed columns
CREATE INDEX IF NOT EXISTS leaderboard_cache_xp_idx ON public.leaderboard_cache (xp DESC);
CREATE INDEX IF NOT EXISTS leaderboard_cache_streak_idx ON public.leaderboard_cache (streak DESC);

-- ── profiles ──────────────────────────────────────────────────────────────
-- Stores per-user earned badge IDs as a JSONB array.
-- Keyed by user id (same as auth.users id).
CREATE TABLE IF NOT EXISTS public.profiles (
  id               uuid PRIMARY KEY REFERENCES public.users ON DELETE CASCADE,
  earned_badge_ids jsonb NOT NULL DEFAULT '[]'
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: read own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: upsert own" ON public.profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "profiles: admin" ON public.profiles
  FOR ALL USING (public.current_user_role() = 'admin');

-- ── badge_events ──────────────────────────────────────────────────────────
-- Append-only log of individual badge award events.
CREATE TABLE IF NOT EXISTS public.badge_events (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   uuid NOT NULL REFERENCES public.users ON DELETE CASCADE,
  badge_id  text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_events: insert own" ON public.badge_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "badge_events: read own" ON public.badge_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "badge_events: admin" ON public.badge_events
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE INDEX IF NOT EXISTS badge_events_user_id_idx ON public.badge_events (user_id);
