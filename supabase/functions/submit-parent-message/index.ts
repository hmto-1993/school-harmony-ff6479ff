import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_MESSAGES_PER_IP = 10;
const WINDOW_MINUTES = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { student_id, class_id, message_type, subject, body, parent_name, parent_phone, session_token, session_issued_at } = await req.json();

    // Validate required fields
    if (!student_id || !subject?.trim() || !body?.trim() || !parent_name?.trim()) {
      return new Response(
        JSON.stringify({ error: "جميع الحقول المطلوبة يجب تعبئتها" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate lengths
    if (body.length > 2000 || subject.length > 500 || parent_name.length > 200) {
      return new Response(
        JSON.stringify({ error: "تجاوز الحد المسموح لطول النص" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify HMAC session token (student/parent session)
    if (!session_token || !session_issued_at) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify student exists
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id")
      .eq("id", student_id)
      .single();

    if (studentErr || !student) {
      return new Response(
        JSON.stringify({ error: "الطالب غير موجود" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify HMAC token
    const data = `${student_id}:${session_issued_at}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(serviceRoleKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
    const expectedToken = btoa(String.fromCharCode(...new Uint8Array(signature)));

    if (session_token !== expectedToken) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") || "unknown";

    // Simple rate limit: check recent messages from this student
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("parent_messages")
      .select("*", { count: "exact", head: true })
      .eq("student_id", student_id)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= MAX_MESSAGES_PER_IP) {
      return new Response(
        JSON.stringify({ error: `تم تجاوز الحد المسموح من الرسائل. يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert message
    const { error: insertErr } = await supabase.from("parent_messages").insert({
      student_id,
      class_id: class_id || null,
      message_type: message_type || "message",
      subject: subject.trim().slice(0, 500),
      body: body.trim().slice(0, 2000),
      parent_name: parent_name.trim().slice(0, 200),
      parent_phone: (parent_phone || "").trim().slice(0, 20),
    });

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: "فشل إرسال الرسالة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Notify teacher in background
    const notifyUrl = `${supabaseUrl}/functions/v1/notify-parent-message`;
    fetch(notifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ student_id, class_id }),
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
