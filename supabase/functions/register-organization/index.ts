// Edge function: register a new organization (school or individual teacher)
// Creates: auth user, organization, profile, user_role — atomically via service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  national_id?: string;
  phone?: string;
  organization_type: "school" | "individual";
  organization_name: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as RegisterPayload;
    const {
      email,
      password,
      full_name,
      national_id,
      phone,
      organization_type,
      organization_name,
    } = body;

    // ---- Input validation ----
    if (!email || !password || !full_name || !organization_name) {
      return new Response(
        JSON.stringify({ error: "جميع الحقول مطلوبة" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!["school", "individual"].includes(organization_type)) {
      return new Response(
        JSON.stringify({ error: "نوع المؤسسة غير صالح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- 1. Create auth user (auto-confirmed so they can sign in immediately) ----
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError || !authUser?.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || "فشل إنشاء الحساب" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authUser.user.id;

    // Helper: rollback the auth user on any failure below
    const rollback = async (msg: string) => {
      await admin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    };

    // ---- 2. Create organization ----
    const { data: org, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: organization_name,
        type: organization_type,
        owner_id: userId,
      })
      .select("id")
      .single();

    if (orgError || !org) {
      return await rollback(orgError?.message || "فشل إنشاء المؤسسة");
    }

    // ---- 3. Create profile (role = 'owner' for both flows; same backend structure) ----
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId,
      full_name,
      national_id: national_id || null,
      phone: phone || null,
      organization_id: org.id,
      role: "owner",
    });

    if (profileError) {
      await admin.from("organizations").delete().eq("id", org.id);
      return await rollback(profileError.message);
    }

    // ---- 4. App-level role assignment ----
    // School owner → admin (manages teachers/students)
    // Individual owner → admin + teacher (full self-management)
    const appRoles: Array<"admin" | "teacher"> = ["admin"];
    if (organization_type === "individual") {
      appRoles.push("teacher");
    }

    const { error: rolesError } = await admin
      .from("user_roles")
      .insert(appRoles.map((r) => ({ user_id: userId, role: r })));

    if (rolesError) {
      await admin.from("profiles").delete().eq("user_id", userId);
      await admin.from("organizations").delete().eq("id", org.id);
      return await rollback(rolesError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        organization_id: org.id,
        organization_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "خطأ غير متوقع" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
