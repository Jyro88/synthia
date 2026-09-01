-- Live Judge migration for Synthia
-- Adds the soft per-user rate limit table used by the judge-combination Edge
-- Function. Run this in your Supabase SQL editor.

-- One row per novel-combination evaluation a user triggers (approved or
-- rejected). The Edge Function counts rows within a rolling time window per
-- user_id before allowing another live Judge call -- see RATE_LIMIT_MAX /
-- RATE_LIMIT_WINDOW_MS in supabase/functions/judge-combination/index.ts.
CREATE TABLE judge_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL, -- same id shape as user_discoveries.user_id (UUID or anon_*)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_judge_rate_limits_user_id_created_at ON judge_rate_limits(user_id, created_at);

-- Service-role only (the Edge Function uses the service-role key, which
-- bypasses RLS regardless) -- no public policies, same pattern as
-- combination_attempts.
ALTER TABLE judge_rate_limits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE judge_rate_limits IS 'Soft per-user rate limit for the live Judge Edge Function. Not read by the client app directly.';

-- Periodically prune old rows so this table doesn't grow unbounded -- safe to
-- run manually or on a schedule (e.g. a pg_cron job); rows older than the
-- rate-limit window are never read again.
-- DELETE FROM judge_rate_limits WHERE created_at < NOW() - INTERVAL '1 day';
