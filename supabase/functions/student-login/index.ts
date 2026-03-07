import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { national_id } = await req.json();

    if (!national_id) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية الوطنية مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify student by national_id only
    const { data: student, error } = await supabase
      .from("students")
      .select("id, full_name, class_id, national_id, academic_number, parent_phone")
      .eq("national_id", national_id)
      .single();

    if (error || !student) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية الوطنية غير مسجل" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log student login
    await supabase.from("student_logins").insert({
      student_id: student.id,
      class_id: student.class_id,
    });

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

    return new Response(
      JSON.stringify({
        student: {
          id: student.id,
          full_name: student.full_name,
          national_id: student.national_id,
          class_id: student.class_id,
          class: className,
        },
        grades,
        behaviors,
        attendance,
        visibility,
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