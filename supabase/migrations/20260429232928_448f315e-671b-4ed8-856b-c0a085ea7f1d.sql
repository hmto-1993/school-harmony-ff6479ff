create or replace function public.guard_login_page_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_keys text[] := array[
    'school_name',
    'school_subtitle',
    'school_logo_url',
    'dashboard_title',
    'education_department'
  ];
  target_id text := coalesce(NEW.id, OLD.id);
begin
  if target_id = any(protected_keys) then
    if not public.is_primary_owner(auth.uid()) then
      raise exception 'صلاحيات غير كافية: إعدادات صفحة تسجيل الدخول مقصورة على المالك الأساسي'
        using errcode = '42501';
    end if;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_guard_login_page_settings on public.site_settings;
create trigger trg_guard_login_page_settings
before insert or update or delete on public.site_settings
for each row execute function public.guard_login_page_settings();