INSERT INTO public.site_settings (id, value) VALUES
  ('school_name', 'منصة المتميز التعليمية'),
  ('school_subtitle', 'نظام إدارة المدارس والفصول الدراسية'),
  ('dashboard_title', 'لوحة تحكم منصة المتميز')
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;