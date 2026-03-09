import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate a deterministic but fake email from national_id
 * so the response shape is identical for found/not-found cases.
 */
function fakePlaceholderEmail(nationalId: string): string {
  // Use a hash-like transform so it looks like a real masked email
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

    const uniformMessage = "إذا كان رقم الهوية مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني";

    // Look up profile by national_id
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("national_id", national_id)
      .single();

    if (error || !profile) {
      // Return a fake email so response shape is identical — signIn will fail naturally
      return new Response(
        JSON.stringify({ email: fakePlaceholderEmail(national_id), message: uniformMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);

    if (!user?.email) {
      return new Response(
        JSON.stringify({ email: fakePlaceholderEmail(national_id), message: uniformMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
