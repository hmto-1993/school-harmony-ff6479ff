import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, new_email, new_password, new_phone } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updates: any = { email_confirm: true };
    if (new_email) updates.email = new_email;
    if (new_password) updates.password = new_password;
    if (new_phone) updates.phone = new_phone;

    const { data, error } = await supabase.auth.admin.updateUserById(user_id, updates);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, user: { id: data.user?.id, email: data.user?.email, phone: data.user?.phone } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
