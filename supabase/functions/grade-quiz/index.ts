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
    const { activity_id, student_id, answers, session_token, session_issued_at } = await req.json();

    if (!activity_id || !student_id || !answers || typeof answers !== "object") {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const isValid = await verifySessionToken(session_token, student_id, session_issued_at, serviceRoleKey);
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check if already submitted
    const { data: existing } = await supabase
      .from("quiz_submissions")
      .select("id")
      .eq("activity_id", activity_id)
      .eq("student_id", student_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Quiz already submitted" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch questions with correct answers (server-side only)
    const { data: questions, error: qErr } = await supabase
      .from("quiz_questions")
      .select("id, correct_answer")
      .eq("activity_id", activity_id);

    if (qErr || !questions?.length) {
      return new Response(
        JSON.stringify({ error: "Quiz not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Grade server-side
    let score = 0;
    const total = questions.length;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) score++;
    });

    // Save submission
    const { error: insertErr } = await supabase.from("quiz_submissions").insert({
      activity_id,
      student_id,
      answers,
      score,
      total,
    });

    if (insertErr) {
      return new Response(
        JSON.stringify({ error: "Failed to save submission" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ score, total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
