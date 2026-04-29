import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DynamicRightHeaderData {
  kingdom: string;        // ثابت
  ministry: string;       // ثابت
  educationDept: string;  // الإدارة العامة للتعليم بمنطقة …
  school: string;         // مدرسة …
}

/**
 * Returns dynamic data shown in the RIGHT block of the print header:
 *   - المملكة العربية السعودية              (constant)
 *   - وزارة التعليم                          (constant)
 *   - الإدارة العامة للتعليم بمنطقة : …     (from site_settings.education_department, scoped)
 *   - مدرسة : …                              (from site_settings.school_name, scoped, with profile.school fallback)
 *
 * Tenant-scoped automatically via scoped settings (org:<id>:<key>).
 */
export function useDynamicRightHeader(): DynamicRightHeaderData {
  const [data, setData] = useState<DynamicRightHeaderData>({
    kingdom: "المملكة العربية السعودية",
    ministry: "وزارة التعليم",
    educationDept: "",
    school: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const [settingsRes, profileRes] = await Promise.all([
          supabase
            .from("site_settings")
            .select("id, value")
            .or("id.ilike.%school_name,id.ilike.%education_department")
            .limit(20),
          user
            ? supabase.from("profiles").select("school").eq("user_id", user.id).maybeSingle()
            : Promise.resolve({ data: null } as any),
        ]);

        if (cancelled) return;

        const rows = (settingsRes.data || []) as Array<{ id: string; value: string | null }>;
        const pickScoped = (suffix: string): string => {
          const scoped = rows.find(r => r.id.startsWith("org:") && r.id.endsWith(":" + suffix));
          if (scoped?.value) return scoped.value;
          const global = rows.find(r => r.id === suffix);
          return global?.value || "";
        };

        let school = pickScoped("school_name");
        if (!school && profileRes.data) school = ((profileRes.data as any).school || "").toString();

        const educationDept = pickScoped("education_department");

        setData({
          kingdom: "المملكة العربية السعودية",
          ministry: "وزارة التعليم",
          educationDept,
          school,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return data;
}

/** Build the array of label/value pairs to render in the right header block. */
export function buildRightHeaderLines(d: DynamicRightHeaderData): Array<{ label?: string; value: string; bold?: boolean }> {
  return [
    { value: d.kingdom, bold: true },
    { value: d.ministry, bold: true },
    { label: "الإدارة العامة للتعليم بمنطقة", value: d.educationDept || "—" },
    { label: "مدرسة", value: d.school || "—" },
  ];
}
