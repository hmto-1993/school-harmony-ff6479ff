-- Platform features catalog (separate from beta_features)
CREATE TABLE IF NOT EXISTS public.platform_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Sparkles',
  category text NOT NULL DEFAULT 'general',
  required_tier public.subscription_tier_type NOT NULL DEFAULT 'basic',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view platform features"
  ON public.platform_features FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anonymous can view platform features"
  ON public.platform_features FOR SELECT TO anon USING (true);

CREATE POLICY "Only owner manages platform features"
  ON public.platform_features FOR ALL TO authenticated
  USING (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()))
  WITH CHECK (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid()));

CREATE TRIGGER trg_platform_features_updated
  BEFORE UPDATE ON public.platform_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_features;
ALTER TABLE public.platform_features REPLICA IDENTITY FULL;

-- RPC: set tier for a feature (owner only)
CREATE OR REPLACE FUNCTION public.set_platform_feature_tier(_feature_id uuid, _tier public.subscription_tier_type)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_super_owner(auth.uid()) OR public.is_primary_owner(auth.uid())) THEN
    RAISE EXCEPTION 'فقط المالك الرئيسي يمكنه تعديل تصنيف الميزات';
  END IF;
  UPDATE public.platform_features SET required_tier = _tier, updated_at = now() WHERE id = _feature_id;
  RETURN jsonb_build_object('success', true, 'feature_id', _feature_id, 'tier', _tier);
END $$;

-- Seed default platform features
INSERT INTO public.platform_features (feature_key, name, description, icon, category, required_tier, sort_order) VALUES
  ('dashboard', 'لوحة التحكم الذكية', 'إحصائيات ومؤشرات الأداء اليومية', 'LayoutDashboard', 'core', 'basic', 1),
  ('students', 'إدارة الطلاب', 'إضافة وتعديل بيانات الطلاب', 'Users', 'core', 'basic', 2),
  ('attendance', 'التحضير اليومي', 'رصد الحضور والغياب والتأخر', 'CalendarCheck', 'core', 'basic', 3),
  ('grades', 'رصد الدرجات', 'الدرجات اليومية والتقييم النهائي', 'GraduationCap', 'core', 'basic', 4),
  ('behavior', 'السلوك والمخالفات', 'رصد السلوك مع المخالفات الـ 18', 'Shield', 'core', 'basic', 5),
  ('reports_basic', 'التقارير الأساسية', 'تقارير الحضور والدرجات والسلوك', 'FileBarChart', 'reports', 'basic', 6),
  ('forms', 'مركز النماذج الإدارية', '17 نموذجاً جاهزاً قابلاً للتخصيص', 'FileText', 'core', 'basic', 7),
  ('library', 'مكتبة المصادر', 'رفع وعرض مصادر الفصول', 'Library', 'core', 'basic', 8),
  ('activities', 'الأنشطة والاختبارات', 'إنشاء أنشطة وكويزات تفاعلية', 'Activity', 'core', 'basic', 9),
  ('lesson_plans', 'تخطيط الدروس', 'تخطيط أسبوعي ويومي للحصص', 'BookOpen', 'core', 'basic', 10),
  ('whatsapp', 'قوالب واتساب', 'إرسال رسائل لأولياء الأمور', 'MessageCircle', 'communication', 'basic', 11),
  ('parent_portal', 'بوابة ولي الأمر', 'وصول الأولياء لبيانات أبنائهم', 'UserCheck', 'communication', 'basic', 12),
  ('student_portal', 'بوابة الطالب', 'لوحة تحكم خاصة للطالب', 'User', 'communication', 'basic', 13),
  ('radar_advanced', 'الرادار المطور (مؤثرات)', 'مؤثرات صوتية وبصرية احترافية للرادار', 'Radar', 'premium', 'premium', 14),
  ('ai_summaries', 'مساعد الصياغة بالذكاء الاصطناعي', 'ملخصات وتقارير ذكية بالـ AI', 'Sparkles', 'premium', 'premium', 15),
  ('visit_logs', 'سجل الزيارات', 'تتبع زيارات الطلاب وأولياء الأمور', 'LineChart', 'premium', 'premium', 16),
  ('comprehensive_reports', 'التقارير الشاملة', 'تقارير تحليلية متقدمة وتصدير PDF', 'FileSearch', 'premium', 'premium', 17),
  ('honor_roll', 'لوحة الشرف الذهبية', 'احتفالات التميز وشهادات تقدير', 'Trophy', 'premium', 'premium', 18),
  ('shared_views', 'روابط المشاركة', 'مشاركة تقارير عبر روابط آمنة', 'Share2', 'premium', 'premium', 19),
  ('sms', 'رسائل SMS', 'إرسال رسائل نصية لأولياء الأمور', 'MessageSquare', 'premium', 'premium', 20)
ON CONFLICT (feature_key) DO NOTHING;