import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

async function verifySessionToken(
  token: string,
  studentId: string,
  issuedAt: number,
  secret: string
): Promise<boolean> {
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return false;
  const data = `${studentId}:${issuedAt}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return token === expected;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_id, activity_ids, session_token, session_issued_at } = await req.json();

    if (!student_id || !activity_ids || !Array.isArray(activity_ids)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!session_token || !session_issued_at) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isValid = await verifySessionToken(session_token, student_id, session_issued_at, serviceRoleKey);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const { data: subs } = await supabase
      .from("quiz_submissions")
      .select("activity_id")
      .eq("student_id", student_id)
      .in("activity_id", activity_ids.length ? activity_ids : ["__none__"]);

    const completedIds = (subs || []).map((s: any) => s.activity_id);

    return new Response(
      JSON.stringify({ completed_ids: completedIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
