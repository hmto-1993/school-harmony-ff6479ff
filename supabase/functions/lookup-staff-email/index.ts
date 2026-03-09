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

    // Look up profile by national_id
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("national_id", national_id)
      .single();

    const uniformResponse = {
      message: "إذا كان رقم الهوية مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني",
    };

    if (error || !profile) {
      return new Response(
        JSON.stringify(uniformResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);

    if (!user?.email) {
      return new Response(
        JSON.stringify(uniformResponse),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger password reset server-side (optional: actual reset email)
    // Return the same uniform response regardless — no email field exposed
    return new Response(
      JSON.stringify(uniformResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
