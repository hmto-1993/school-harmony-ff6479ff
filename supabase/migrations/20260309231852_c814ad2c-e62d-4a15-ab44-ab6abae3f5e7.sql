-- Create table to track student login attempts for rate limiting
CREATE TABLE IF NOT EXISTS public.student_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  national_id text NOT NULL,
  ip_address text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.student_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) should write to this table
-- No public/anon/authenticated access needed

-- Index for fast lookups by national_id and time
CREATE INDEX idx_login_attempts_national_id_time ON public.student_login_attempts (national_id, attempted_at DESC);

-- Index for cleanup of old records
CREATE INDEX idx_login_attempts_attempted_at ON public.student_login_attempts (attempted_at);