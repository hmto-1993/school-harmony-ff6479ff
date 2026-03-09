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
    const { student_id, notification_id, file_url, file_name, reason } = await req.json();

    if (!student_id || !notification_id || !file_url || !file_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the student exists
    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id")
      .eq("id", student_id)
      .single();

    if (studentErr || !student) {
      return new Response(
        JSON.stringify({ error: "Student not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the notification belongs to this student
    const { data: notification, error: notifErr } = await supabase
      .from("notifications")
      .select("id, student_id")
      .eq("id", notification_id)
      .eq("student_id", student_id)
      .single();

    if (notifErr || !notification) {
      return new Response(
        JSON.stringify({ error: "Notification not found or does not belong to this student" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the excuse submission
    const { data: excuse, error: insertErr } = await supabase
      .from("excuse_submissions")
      .insert({
        notification_id,
        student_id,
        file_url,
        file_name,
        reason: reason || "",
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update notification status
    await supabase.from("notifications").update({ status: "excuse_pending" }).eq("id", notification_id);

    return new Response(
      JSON.stringify({ success: true, excuse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
