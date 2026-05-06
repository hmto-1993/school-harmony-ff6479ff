import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 8;
const WINDOW_MINUTES = 15;

/**
 * Staff login by national_id + password.
 * Resolves the email server-side and returns a Supabase session.
 * The email is NEVER returned to the client (prevents email enumeration).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { national_id, password } = await req.json().catch(() => ({}));

    if (!national_id || typeof national_id !== "string" || !password || typeof password !== "string") {
      return json({ error: "رقم الهوية وكلمة المرور مطلوبان" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    // Rate limit per IP
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count } = await admin
      .from("student_login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .like("national_id", "staff_login:%")
      .gte("attempted_at", windowStart);

    if ((count ?? 0) >= MAX_ATTEMPTS) {
      return json(
        { error: `تم تجاوز عدد المحاولات. يرجى المحاولة بعد ${WINDOW_MINUTES} دقيقة` },
        429,
      );
    }

    // Resolve staff profile
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .eq("national_id", national_id)
      .maybeSingle();

    let email: string | null = null;
    if (profile?.user_id) {
      const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id);
      email = userRes?.user?.email ?? null;
    }

    // Use anon client to attempt password sign-in (real auth)
    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    let session: any = null;
    let unconfirmed = false;
    let invalid = false;

    if (email) {
      const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        const msg = signInError.message || "";
        const code = (signInError as any)?.code || "";
        if (code === "email_not_confirmed" || /not confirmed|confirm/i.test(msg)) {
          unconfirmed = true;
          // Resend confirmation transparently
          await anon.auth.resend({ type: "signup", email });
        } else {
          invalid = true;
        }
      } else if (signInData?.session) {
        session = signInData.session;
      }
    } else {
      invalid = true;
    }

    await admin.from("student_login_attempts").insert({
      national_id: `staff_login:${national_id}`,
      ip_address: ip,
      success: !!session,
    });

    if (session) {
      return json({
        success: true,
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      });
    }

    if (unconfirmed) {
      return json({ error: "unconfirmed", message: "البريد الإلكتروني لم يُؤكَّد بعد" }, 200);
    }

    // Uniform error to avoid distinguishing "no such id" vs "wrong password"
    return json({ error: "رقم الهوية أو كلمة المرور غير صحيحة" }, 200);
  } catch (_err) {
    return json({ error: "حدث خطأ في الاتصال" }, 200);
  }
});
