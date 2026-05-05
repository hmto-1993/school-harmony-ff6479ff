import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { endpoint, p256dh, auth, student_id, class_id, user_type, hmac_token } = body;

    // Validate required fields
    if (!endpoint || !p256dh || !auth) {
      return new Response(JSON.stringify({ error: "Missing required push subscription fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
      return new Response(JSON.stringify({ error: "Invalid field types" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate endpoint is a valid URL
    try {
      new URL(endpoint);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid endpoint URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resolvedUserType = student_id ? "student" : "teacher";

    // For teacher subscriptions, verify JWT auth
    if (resolvedUserType === "teacher") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // For student subscriptions, cryptographically verify HMAC session token
    if (resolvedUserType === "student") {
      const session_issued_at = body.session_issued_at;
      if (!student_id || !hmac_token || !session_issued_at) {
        return new Response(JSON.stringify({ error: "Missing student credentials" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { verifyStudentSession } = await import("../_shared/student-session.ts");
      const ok = await verifyStudentSession(
        hmac_token,
        student_id,
        Number(session_issued_at),
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      if (!ok) {
        return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verify student still exists
      const { data: student, error: studentError } = await supabaseAdmin
        .from("students")
        .select("id, class_id")
        .eq("id", student_id)
        .single();
      if (studentError || !student) {
        return new Response(JSON.stringify({ error: "Student not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Upsert the subscription using service role (bypasses RLS)
    const { error: upsertError } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          endpoint,
          p256dh,
          auth,
          student_id: student_id || null,
          class_id: class_id || null,
          user_type: resolvedUserType,
        },
        { onConflict: "endpoint" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: "Failed to save subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("subscribe-push error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
