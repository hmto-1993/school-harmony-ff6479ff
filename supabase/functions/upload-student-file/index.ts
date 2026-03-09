import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const studentId = formData.get("student_id") as string;
    const activityId = formData.get("activity_id") as string;
    const classId = formData.get("class_id") as string;
    const file = formData.get("file") as File;

    if (!studentId || !activityId || !classId || !file) {
      return new Response(
        JSON.stringify({ error: "جميع الحقول مطلوبة" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "حجم الملف يتجاوز 5 ميجابايت" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "نوع الملف غير مدعوم" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify student exists
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id, class_id")
      .eq("id", studentId)
      .single();

    if (studentErr || !student) {
      return new Response(
        JSON.stringify({ error: "الطالب غير مسجل" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify activity exists and allows uploads for this class
    const { data: target } = await supabase
      .from("activity_class_targets")
      .select("allow_student_uploads")
      .eq("activity_id", activityId)
      .eq("class_id", classId)
      .single();

    if (!target?.allow_student_uploads) {
      return new Response(
        JSON.stringify({ error: "رفع الملفات غير مسموح لهذا النشاط" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload file
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = `student-uploads/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from("activities")
      .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      return new Response(
        JSON.stringify({ error: "فشل رفع الملف: " + uploadErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage.from("activities").getPublicUrl(filePath);

    // Record submission
    await supabase.from("student_file_submissions").insert({
      activity_id: activityId,
      student_id: studentId,
      class_id: classId,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
    });

    return new Response(
      JSON.stringify({ success: true, file_url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
