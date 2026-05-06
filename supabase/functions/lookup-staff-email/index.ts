import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

const uniformMessage =
  "إذا كان رقم الهوية مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني";

/**
 * SECURITY: This endpoint NEVER returns a real email address.
 * For password reset flows, it sends the reset email server-side and returns
 * a uniform success response regardless of whether the national_id exists.
 * For staff login, use the `staff-login` edge function instead.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { national_id, redirect_to } = body || {};

    if (!national_id || typeof national_id !== "string") {
      return new Response(
        JSON.stringify({ error: "رقم الهوية مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Rate limiting
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("student_login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .like("national_id", "staff_lookup:%")
      .gte("attempted_at", windowStart);

    if ((count ?? 0) >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({
          error: `تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة`,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("national_id", national_id)
      .maybeSingle();

    let success = false;

    if (profile?.user_id) {
      const { data: userRes } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = userRes?.user?.email;
      if (email) {
        // Send reset email server-side; never expose the address to the client.
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof redirect_to === "string" ? redirect_to : undefined,
        });
        success = true;
      }
    }

    await supabase.from("student_login_attempts").insert({
      national_id: `staff_lookup:${national_id}`,
      ip_address: ip,
      success,
    });

    // Uniform response — no email, no enumeration signal
    return new Response(
      JSON.stringify({ message: uniformMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ message: uniformMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
