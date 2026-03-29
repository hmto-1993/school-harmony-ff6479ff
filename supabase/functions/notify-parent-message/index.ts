import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { class_id, student_name, subject, message_type } = await req.json();

    if (!class_id || !student_name || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typeLabel = message_type === "appointment" ? "طلب موعد" : "رسالة";
    const title = `📩 ${typeLabel} جديد من ولي أمر`;
    const body = `${typeLabel} من ولي أمر الطالب ${student_name}: ${subject}`;

    // Find teacher push subscriptions for this class (user_type = 'teacher')
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_type", "teacher");

    // Store as latest notification for in-app delivery
    await supabase.from("site_settings").upsert({
      id: "latest_parent_message_notification",
      value: JSON.stringify({
        title,
        body,
        class_id,
        created_at: new Date().toISOString(),
      }),
    });

    return new Response(
      JSON.stringify({ success: true, notified: subscriptions?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
