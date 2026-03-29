import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

async function generateSessionToken(studentId: string, issuedAt: number, secret: string): Promise<string> {
  const data = `${studentId}:${issuedAt}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { national_id, login_type } = await req.json();
    const userType = login_type === "parent" ? "parent" : "student";

    // Validate national_id: must be non-empty string of digits only, 10 chars
    if (!national_id || typeof national_id !== "string" || !/^\d{10}$/.test(national_id)) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية الوطنية غير صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get client IP for logging
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || "unknown";

    // Rate limiting: check recent failed attempts by national_id AND by IP
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    
    const [{ count: idCount }, { count: ipCount }] = await Promise.all([
      supabase
        .from("student_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("national_id", national_id)
        .eq("success", false)
        .gte("attempted_at", windowStart),
      supabase
        .from("student_login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", ip)
        .eq("success", false)
        .gte("attempted_at", windowStart),
    ]);

    if ((idCount ?? 0) >= MAX_ATTEMPTS || (ipCount ?? 0) >= MAX_ATTEMPTS * 3) {
      return new Response(
        JSON.stringify({ error: `تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify student by national_id only
    const { data: student, error } = await supabase
      .from("students")
      .select("id, full_name, class_id, national_id, academic_number")
      .eq("national_id", national_id)
      .single();

    if (error || !student) {
      // Log failed attempt
      await supabase.from("student_login_attempts").insert({
        national_id,
        ip_address: ip,
        success: false,
      });

      return new Response(
        JSON.stringify({ error: "رقم الهوية الوطنية غير مسجل" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful attempt
    await supabase.from("student_login_attempts").insert({
      national_id,
      ip_address: ip,
      success: true,
    });

    // Log student login
    await supabase.from("student_logins").insert({
      student_id: student.id,
      class_id: student.class_id,
      login_type: userType,
    });

    // Generate HMAC session token for subsequent authenticated calls
    const issuedAt = Date.now();
    const sessionToken = await generateSessionToken(student.id, issuedAt, serviceRoleKey);

    // Fetch visibility settings
    const { data: visSettings } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["student_show_grades", "student_show_attendance", "student_show_behavior", "student_hidden_categories"]);

    const visibility: Record<string, boolean> = {
      grades: true,
      attendance: true,
      behavior: true,
    };
    let hiddenCategories: { p1: string[]; p2: string[] } = { p1: [], p2: [] };
    (visSettings || []).forEach((s: any) => {
      if (s.id === "student_show_grades") visibility.grades = s.value !== "false";
      if (s.id === "student_show_attendance") visibility.attendance = s.value !== "false";
      if (s.id === "student_show_behavior") visibility.behavior = s.value !== "false";
      if (s.id === "student_hidden_categories" && s.value) {
        try {
          const parsed = JSON.parse(s.value);
          if (Array.isArray(parsed)) {
            hiddenCategories = { p1: parsed, p2: parsed };
          } else {
            hiddenCategories = { p1: parsed.p1 || [], p2: parsed.p2 || [] };
          }
        } catch { hiddenCategories = { p1: [], p2: [] }; }
      }
    });

    // Fetch student's class info
    let className = null;
    if (student.class_id) {
      const { data: cls } = await supabase
        .from("classes")
        .select("name, grade, section")
        .eq("id", student.class_id)
        .single();
      className = cls;
    }

    // Conditionally fetch data based on visibility settings
    let grades: any[] = [];
    if (visibility.grades) {
      const { data: gradesData } = await supabase
        .from("grades")
        .select("score, period, category_id, grade_categories(name, max_score, weight)")
        .eq("student_id", student.id);
      // Filter out hidden categories per period
      grades = (gradesData || []).filter((g: any) => {
        const catName = g.grade_categories?.name;
        if (!catName) return true;
        const period = g.period === 2 ? "p2" : "p1";
        return !hiddenCategories[period].includes(catName);
      });
    }

    const behaviors = visibility.behavior
      ? (await supabase
          .from("behavior_records")
          .select("type, note, date")
          .eq("student_id", student.id)
          .order("date", { ascending: false })
          .limit(20)).data || []
      : [];

    const attendance = visibility.attendance
      ? (await supabase
          .from("attendance_records")
          .select("status, date, notes")
          .eq("student_id", student.id)
          .order("date", { ascending: false })
          .limit(30)).data || []
      : [];

    // Clean up old attempts (older than 24 hours) in background
    const cleanupCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase.from("student_login_attempts").delete().lt("attempted_at", cleanupCutoff).then(() => {});

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
        session_token: sessionToken,
        session_issued_at: issuedAt,
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
