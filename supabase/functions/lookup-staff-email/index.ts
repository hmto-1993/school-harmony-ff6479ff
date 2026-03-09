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

    if (error || !profile) {
      return new Response(
        JSON.stringify({ error: "رقم الهوية غير مسجل" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);

    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على بيانات المستخدم" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obfuscate email: show first 2 chars + *** + domain
    const [localPart, domain] = user.email.split("@");
    const maskedLocal = localPart.length > 2
      ? localPart.substring(0, 2) + "***"
      : localPart[0] + "***";
    const maskedEmail = `${maskedLocal}@${domain}`;

    return new Response(
      JSON.stringify({ email: maskedEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
