/**
 * Resolves the dynamic right-side header lines (per owner request):
 *   1. المملكة العربية السعودية (ثابت)
 *   2. وزارة التعليم (ثابت)
 *   3. الإدارة العامة للتعليم بمنطقة: <education_department>
 *   4. <school_name>
 *
 * Reads from tenant-scoped site_settings (education_department, school_name).
 * Used by ReportPrintHeader (print), PrintPreviewDialog and the settings live preview
 * to keep all three in sync.
 */
import { supabase } from "@/integrations/supabase/client";
import { expandScopedSettingIds, resolveScopedSettings } from "@/lib/site-settings-scope";

export async function fetchDynamicRightLines(): Promise<string[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let orgId: string | null = null;
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      orgId = (prof?.organization_id as string | null) ?? null;
    }
    const ids = expandScopedSettingIds(["education_department", "school_name"], orgId);
    const { data: rows } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ids);
    const map = resolveScopedSettings(rows as any, orgId);
    const department = (map.get("education_department") || "").trim();
    const schoolName = (map.get("school_name") || "").trim();
    return [
      "المملكة العربية السعودية",
      "وزارة التعليم",
      department ? `الإدارة العامة للتعليم بمنطقة: ${department}` : "الإدارة العامة للتعليم بمنطقة: ............",
      schoolName || "............",
    ];
  } catch {
    return [
      "المملكة العربية السعودية",
      "وزارة التعليم",
      "الإدارة العامة للتعليم بمنطقة: ............",
      "............",
    ];
  }
}
