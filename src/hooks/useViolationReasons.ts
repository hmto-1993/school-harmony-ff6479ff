import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ViolationReason {
  label: string;
  defaultScore: number;
}

const DEFAULT_REASONS: ViolationReason[] = [
  { label: "تأخير", defaultScore: 1 },
  { label: "نوم", defaultScore: 1 },
  { label: "حديث", defaultScore: 1 },
  { label: "أكل", defaultScore: 1 },
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
