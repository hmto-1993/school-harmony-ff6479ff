import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Generate a deterministic but fake email from national_id
 * so the response shape is identical for found/not-found cases.
 */
function fakePlaceholderEmail(nationalId: string): string {
  const prefix = nationalId.substring(0, 2);
  return `${prefix}***@***.com`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { national_id } = await req.json();

    if (!national_id) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get client IP for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("cf-connecting-ip") || "unknown";

    // Rate limiting: check recent attempts for this IP
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("student_login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .eq("success", false)
      .eq("national_id", `staff_lookup:${national_id}`)
      .gte("attempted_at", windowStart);

    if ((count ?? 0) >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ error: `تم تجاوز الحد المسموح من المحاولات. يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uniformMessage = "إذا كان رقم الهوية مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني";

    // Look up profile by national_id
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("national_id", national_id)
      .single();

    if (error || !profile) {
      // Log failed attempt for rate limiting
      await supabase.from("student_login_attempts").insert({
        national_id: `staff_lookup:${national_id}`,
        ip_address: ip,
        success: false,
      });

      return new Response(
        JSON.stringify({ email: fakePlaceholderEmail(national_id), message: uniformMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);

    if (!user?.email) {
      await supabase.from("student_login_attempts").insert({
        national_id: `staff_lookup:${national_id}`,
        ip_address: ip,
        success: false,
      });

      return new Response(
        JSON.stringify({ email: fakePlaceholderEmail(national_id), message: uniformMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful lookup
    await supabase.from("student_login_attempts").insert({
      national_id: `staff_lookup:${national_id}`,
      ip_address: ip,
      success: true,
    });

    // Return real email for login — client uses this for signInWithPassword
    return new Response(
      JSON.stringify({ email: user.email, message: uniformMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
