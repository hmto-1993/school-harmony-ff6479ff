
ALTER TABLE public.shared_views 
ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone;
