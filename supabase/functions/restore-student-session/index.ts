import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function verifySessionToken(
  token: string, studentId: string, issuedAt: number, secret: string
): Promise<boolean> {
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return false;
  const data = `${studentId}:${issuedAt}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return token === expected;
}

async function generateSessionToken(studentId: string, issuedAt: number, secret: string): Promise<string> {
  const data = `${studentId}:${issuedAt}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { student_id, session_token, session_issued_at, login_type } = await req.json();
    const userType = login_type === "parent" ? "parent" : "student";

    if (!student_id || !session_token || !session_issued_at) {
      return new Response(
        JSON.stringify({ error: "بيانات الجلسة غير مكتملة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the HMAC token
    const isValid = await verifySessionToken(session_token, student_id, session_issued_at, serviceRoleKey);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "الجلسة منتهية أو غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch student data
    const { data: student, error } = await supabase
      .from("students")
      .select("id, full_name, class_id, national_id, academic_number")
      .eq("id", student_id)
      .single();

    if (error || !student) {
      return new Response(
        JSON.stringify({ error: "الطالب غير موجود" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch visibility settings
    const { data: visSettings } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["student_show_grades", "student_show_attendance", "student_show_behavior", "student_hidden_categories", "student_show_daily_grades", "student_show_classwork_icons", "student_classwork_icons_count", "student_show_activities", "student_show_library", "student_show_honor_roll", "student_show_absence_warning", "student_show_national_id"]);

    const visibility: Record<string, boolean> = { grades: true, attendance: true, behavior: true, activities: true, library: true, honorRoll: true, absenceWarning: true, nationalId: true };
    let hiddenCategories: { p1: string[]; p2: string[] } = { p1: [], p2: [] };
    const evalSettings = { showDaily: true, showClasswork: true, iconsCount: 10 };
    (visSettings || []).forEach((s: any) => {
      if (s.id === "student_show_grades") visibility.grades = s.value !== "false";
      if (s.id === "student_show_attendance") visibility.attendance = s.value !== "false";
      if (s.id === "student_show_behavior") visibility.behavior = s.value !== "false";
      if (s.id === "student_show_activities") visibility.activities = s.value !== "false";
      if (s.id === "student_show_library") visibility.library = s.value !== "false";
      if (s.id === "student_show_honor_roll") visibility.honorRoll = s.value !== "false";
      if (s.id === "student_show_absence_warning") visibility.absenceWarning = s.value !== "false";
      if (s.id === "student_show_national_id") visibility.nationalId = s.value !== "false";
      if (s.id === "student_show_daily_grades") evalSettings.showDaily = s.value !== "false";
      if (s.id === "student_show_classwork_icons") evalSettings.showClasswork = s.value !== "false";
      if (s.id === "student_classwork_icons_count" && s.value) evalSettings.iconsCount = Number(s.value) || 10;
      if (s.id === "student_hidden_categories" && s.value) {
        try {
          const parsed = JSON.parse(s.value);
          if (Array.isArray(parsed)) hiddenCategories = { p1: parsed, p2: parsed };
          else hiddenCategories = { p1: parsed.p1 || [], p2: parsed.p2 || [] };
        } catch { hiddenCategories = { p1: [], p2: [] }; }
      }
    });

    // Fetch class info
    let className = null;
    if (student.class_id) {
      const { data: cls } = await supabase
        .from("classes")
        .select("name, grade, section")
        .eq("id", student.class_id)
        .single();
      className = cls;
    }

    // Fetch data based on visibility
    let grades: any[] = [];
    if (visibility.grades) {
      const { data: gradesData } = await supabase
        .from("grades")
        .select("score, period, category_id, date, note, grade_categories(name, max_score, weight, category_group, is_deduction)")
        .eq("student_id", student.id);
      grades = (gradesData || []).filter((g: any) => {
        const catName = g.grade_categories?.name;
        if (!catName) return true;
        const period = g.period === 2 ? "p2" : "p1";
        return !hiddenCategories[period].includes(catName);
      });
    }

    const behaviors = visibility.behavior
      ? (await supabase.from("behavior_records").select("type, note, date").eq("student_id", student.id).order("date", { ascending: false }).limit(20)).data || []
      : [];

    const attendance = visibility.attendance
      ? (await supabase.from("attendance_records").select("status, date, notes").eq("student_id", student.id).order("date", { ascending: false }).limit(30)).data || []
      : [];

    // Issue a fresh session token
    const newIssuedAt = Date.now();
    const newToken = await generateSessionToken(student.id, newIssuedAt, serviceRoleKey);

    return new Response(
      JSON.stringify({
        student: {
          id: student.id,
          full_name: student.full_name,
          national_id: student.national_id,
          academic_number: student.academic_number,
          class_id: student.class_id,
          class: className,
        },
        grades,
        behaviors,
        attendance,
        visibility,
        evalSettings,
        session_token: newToken,
        session_issued_at: newIssuedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});