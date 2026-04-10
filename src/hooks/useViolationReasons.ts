import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ViolationReason {
  label: string;
  defaultScore: number;
}

const DEFAULT_REASONS: ViolationReason[] = [
  { label: "تأخر عن دخول الحصة", defaultScore: 1 },
  { label: "نوم أثناء الشرح", defaultScore: 2 },
  { label: "حديث جانبي مع الزملاء", defaultScore: 1 },
  { label: "أكل أو شرب أثناء الحصة", defaultScore: 1 },
  { label: "استخدام الجوال", defaultScore: 2 },
  { label: "عدم إحضار الكتاب أو الدفتر", defaultScore: 1 },
  { label: "عدم حل الواجب", defaultScore: 1 },
  { label: "إصدار أصوات مزعجة", defaultScore: 2 },
  { label: "مقاطعة المعلم", defaultScore: 1 },
  { label: "إثارة الفوضى", defaultScore: 2 },
  { label: "عدم المشاركة في الأنشطة", defaultScore: 1 },
  { label: "الانشغال عن الدرس", defaultScore: 1 },
  { label: "الخروج بدون إذن", defaultScore: 2 },
  { label: "عدم الالتزام بالمقعد", defaultScore: 1 },
  { label: "العبث بممتلكات الفصل", defaultScore: 2 },
  { label: "عدم إحضار الأدوات المطلوبة", defaultScore: 1 },
  { label: "التنمر على زميل", defaultScore: 3 },
  { label: "استخدام ألفاظ غير لائقة", defaultScore: 3 },
];

const SETTING_ID = "violation_reasons";

export function useViolationReasons() {
  const [reasons, setReasons] = useState<ViolationReason[]>(DEFAULT_REASONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", SETTING_ID)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setReasons(parsed);
            }
          } catch {}
        }
        setLoading(false);
      });
  }, []);

  const saveReasons = useCallback(async (newReasons: ViolationReason[]) => {
    setReasons(newReasons);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: SETTING_ID, value: JSON.stringify(newReasons) });
    if (error) {
      toast({ title: "خطأ", description: "فشل حفظ أسباب المخالفات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث أسباب المخالفات بنجاح" });
    }
  }, []);

  return { reasons, loading, saveReasons, DEFAULT_REASONS };
}
