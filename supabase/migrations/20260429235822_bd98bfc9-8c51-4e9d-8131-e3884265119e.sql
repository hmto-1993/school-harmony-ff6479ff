SET session_replication_role = 'replica';
UPDATE public.site_settings SET value = '' WHERE id = 'school_logo_url';
SET session_replication_role = 'origin';