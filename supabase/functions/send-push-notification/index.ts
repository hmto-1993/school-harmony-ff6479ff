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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await authSupabase.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller has admin or teacher role
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "teacher"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body, classIds } = await req.json();

    // Validate classIds: only well-formed UUIDs allowed (prevents PostgREST filter injection)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let safeIds: string[] = [];
    if (Array.isArray(classIds) && classIds.length > 0) {
      if (!classIds.every((id: unknown) => typeof id === "string" && UUID_RE.test(id))) {
        return new Response(JSON.stringify({ error: "Invalid classIds" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      safeIds = classIds as string[];
    }

    // Get push subscriptions, optionally filtered by class (parameterized via .in)
    let query = supabase.from("push_subscriptions").select("*");
    if (safeIds.length > 0) {
      const orFilter = `class_id.is.null,class_id.in.(${safeIds.join(",")})`;
      query = query.or(orFilter);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    const notificationRecord = {
      title,
      body,
      class_ids: classIds || [],
      created_at: new Date().toISOString(),
    };

    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    const results = {
      total: subscriptions?.length || 0,
      sent: 0,
      failed: 0,
    };

    if (!VAPID_PRIVATE_KEY) {
      console.log("VAPID_PRIVATE_KEY not set. Notifications stored for in-app delivery.", notificationRecord);
    }

    // Store notification in site_settings for in-app delivery
    await supabase.from("site_settings").upsert({
      id: "latest_notification",
      value: JSON.stringify(notificationRecord),
    });

    return new Response(
      JSON.stringify({ success: true, ...results, notification: notificationRecord }),
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
