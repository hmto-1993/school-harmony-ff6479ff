/**
 * Dynamic header line resolvers (read-only data binding).
 *
 * Right side (FROZEN, per owner request):
 *   1. المملكة العربية السعودية (ثابت)
 *   2. وزارة التعليم (ثابت)
 *   3. الإدارة العامة للتعليم بمنطقة: <education_department>
 *   4. <school_name>
 *
 * Left side (FROZEN, per owner request):
 *   1. السنة الدراسية: <default_academic_year | academic_calendar.academic_year>
 *   2. الفصل الدراسي: <academic_calendar.semester>
 *   3. الصف: <className from current report context>
 *   4. المادة: <subject_name | provided override>
 *
 * Missing values fall back to "............" to keep the header height stable.
 */
import { supabase } from "@/integrations/supabase/client";
import { expandScopedSettingIds, resolveScopedSettings } from "@/lib/site-settings-scope";

const DASH = "............";

/** Map English/numeric semester values to Arabic ordinals. */
function arabicizeSemester(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  const map: Record<string, string> = {
    "first": "الأول", "1": "الأول", "1st": "الأول", "one": "الأول",
    "الفصل الأول": "الأول", "الأول": "الأول",
    "second": "الثاني", "2": "الثاني", "2nd": "الثاني", "two": "الثاني",
    "الفصل الثاني": "الثاني", "الثاني": "الثاني",
    "third": "الثالث", "3": "الثالث", "3rd": "الثالث", "three": "الثالث",
    "الفصل الثالث": "الثالث", "الثالث": "الثالث",
  };
  return map[v] || raw;
}

async function getOrgId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: prof } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    return (prof?.organization_id as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function fetchDynamicRightLines(): Promise<string[]> {
  try {
    const orgId = await getOrgId();
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
      department ? `الإدارة العامة للتعليم بمنطقة ${department}` : `الإدارة العامة للتعليم بمنطقة ${DASH}`,
      schoolName || DASH,
    ];
  } catch {
    return [
      "المملكة العربية السعودية",
      "وزارة التعليم",
      `الإدارة العامة للتعليم بمنطقة ${DASH}`,
      DASH,
    ];
  }
}

export interface LeftHeaderContext {
  className?: string | null;
  subject?: string | null;
}

export async function fetchDynamicLeftLines(ctx: LeftHeaderContext = {}): Promise<string[]> {
  try {
    const orgId = await getOrgId();
    // 1) Academic year + subject from site_settings (tenant-scoped)
    const ids = expandScopedSettingIds(["default_academic_year", "subject_name"], orgId);
    const settingsPromise = supabase.from("site_settings").select("id, value").in("id", ids);
    // 2) Semester + fallback academic_year from academic_calendar
    const calendarPromise = supabase
      .from("academic_calendar")
      .select("semester, academic_year")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const [{ data: rows }, { data: cal }] = await Promise.all([settingsPromise, calendarPromise]);
    const map = resolveScopedSettings(rows as any, orgId);
    const academicYear = (map.get("default_academic_year") || (cal?.academic_year as string | undefined) || "").trim();
    const semesterRaw = ((cal?.semester as string | undefined) || "").trim();
    const semester = arabicizeSemester(semesterRaw);
    const subject = (ctx.subject || map.get("subject_name") || "").trim();
    const className = (ctx.className || "").trim();

    return [
      `السنة الدراسية: ${academicYear || DASH}`,
      `الفصل الدراسي: ${semester || DASH}`,
      `الصف: ${className || DASH}`,
      `المادة: ${subject || DASH}`,
    ];
  } catch {
    return [
      `السنة الدراسية: ${DASH}`,
      `الفصل الدراسي: ${DASH}`,
      `الصف: ${DASH}`,
      `المادة: ${DASH}`,
    ];
  }
}
