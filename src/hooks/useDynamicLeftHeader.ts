import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DynamicLeftHeaderData {
  academicYear: string;
  semester: string;
  grade: string;
  subject: string;
}

const SEMESTER_LABELS: Record<string, string> = {
  "1": "الفصل الأول",
  "2": "الفصل الثاني",
  "3": "الفصل الثالث",
  first: "الفصل الأول",
  second: "الفصل الثاني",
  third: "الفصل الثالث",
};

function readSelectedClassId(): string | null {
  try {
    const raw = localStorage.getItem("selected_class");
    if (!raw) return null;
    // usePersistedState stores JSON-encoded values
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" && parsed ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Returns dynamic data shown in the LEFT block of the print header:
 *   - السنة الدراسية   (from academic_calendar / default_academic_year)
 *   - الفصل الدراسي    (from academic_calendar.semester)
 *   - الصف             (from classes row of currently selected class)
 *   - المادة           (from site_settings.subject_name, fallback profile.specialty)
 *
 * Tenant-scoped automatically via existing RLS / scoped settings.
 */
export function useDynamicLeftHeader(): DynamicLeftHeaderData {
  const [data, setData] = useState<DynamicLeftHeaderData>({
    academicYear: "",
    semester: "",
    grade: "",
    subject: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const selectedClassId = readSelectedClassId();

        // Fetch all four sources in parallel.
        const [calendarRes, classRes, subjectRes, profileRes, defaultYearRes] = await Promise.all([
          supabase
            .from("academic_calendar")
            .select("academic_year, semester")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          selectedClassId
            ? supabase.from("classes").select("grade, name, section").eq("id", selectedClassId).maybeSingle()
            : Promise.resolve({ data: null } as any),
          supabase
            .from("site_settings")
            .select("id, value")
            .ilike("id", "%subject_name")
            .limit(5),
          user
            ? supabase.from("profiles").select("specialty").eq("user_id", user.id).maybeSingle()
            : Promise.resolve({ data: null } as any),
          supabase
            .from("site_settings")
            .select("id, value")
            .ilike("id", "%default_academic_year")
            .limit(5),
        ]);

        if (cancelled) return;

        const cal: any = calendarRes.data;
        const cls: any = classRes.data;

        // Academic year: calendar > scoped default > global default
        let academicYear = cal?.academic_year || "";
        if (!academicYear && defaultYearRes.data) {
          const rows = defaultYearRes.data as Array<{ id: string; value: string }>;
          const scoped = rows.find(r => r.id.startsWith("org:"));
          academicYear = (scoped?.value || rows[0]?.value || "").toString();
        }

        // Semester
        const rawSem = (cal?.semester || "").toString().trim();
        const semester = SEMESTER_LABELS[rawSem] || rawSem || "";

        // Grade (from selected class)
        let grade = "";
        if (cls) {
          grade = cls.grade || cls.name || "";
          if (cls.section) grade = `${grade} / ${cls.section}`;
        }

        // Subject: prefer scoped subject_name, fallback to profile specialty
        let subject = "";
        if (subjectRes.data) {
          const rows = subjectRes.data as Array<{ id: string; value: string }>;
          const scoped = rows.find(r => r.id.startsWith("org:"));
          subject = (scoped?.value || rows.find(r => r.id === "subject_name")?.value || "").toString();
        }
        if (!subject && profileRes.data) {
          subject = ((profileRes.data as any).specialty || "").toString();
        }

        setData({ academicYear, semester, grade, subject });
      } catch {
        /* ignore — leave empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

/** Build the array of label/value pairs to render in the left header block. */
export function buildLeftHeaderLines(d: DynamicLeftHeaderData): Array<{ label: string; value: string }> {
  return [
    { label: "السنة الدراسية", value: d.academicYear || "—" },
    { label: "الفصل الدراسي", value: d.semester || "—" },
    { label: "الصف", value: d.grade || "—" },
    { label: "المادة", value: d.subject || "—" },
  ];
}
