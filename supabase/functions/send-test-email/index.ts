import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { to, subject, html } = await req.json().catch(() => ({}));
    const recipient = to || "mms.sms.93@hotmail.com";
    const subj = subject || "بريد اختبار من نظام المتميز";
    const body = html || `
      <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc;">
        <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
          <h1 style="color:#1e40af;margin:0 0 16px 0;font-size:24px;">✅ بريد اختباري</h1>
          <p style="color:#334155;font-size:16px;line-height:1.7;">
            مرحباً،<br/><br/>
            هذا بريد اختبار مُرسَل من <strong>نظام المتميز</strong> للتحقق من عمل البنية التحتية للبريد الإلكتروني.
          </p>
          <div style="background:#eff6ff;border-right:4px solid #3b82f6;padding:12px 16px;margin:20px 0;border-radius:6px;">
            <p style="margin:0;color:#1e3a8a;font-size:14px;">
              📧 المرسل: alpha.almtmez.com<br/>
              🕐 الوقت: ${new Date().toLocaleString("ar-SA")}
            </p>
          </div>
          <p style="color:#64748b;font-size:13px;margin-top:24px;">
            إذا وصلك هذا البريد فالنظام يعمل بشكل صحيح ✨
          </p>
        </div>
      </div>
    `;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get or create unsubscribe token for recipient
    let { data: tokenRow } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", recipient)
      .maybeSingle();
    if (!tokenRow) {
      const newToken = crypto.randomUUID();
      const { data: inserted } = await supabase
        .from("email_unsubscribe_tokens")
        .insert({ email: recipient, token: newToken })
        .select("token")
        .single();
      tokenRow = inserted;
    }
    const unsubToken = tokenRow!.token;
    const unsubUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-email-unsubscribe?token=${unsubToken}`;

    const payload = {
      to: recipient,
      from: "نظام المتميز <noreply@alpha.almtmez.com>",
      subject: subj,
      html: body + `<div style="text-align:center;margin-top:20px;font-size:12px;color:#94a3b8;"><a href="${unsubUrl}" style="color:#94a3b8;">إلغاء الاشتراك</a></div>`,
      text: "بريد اختبار من نظام المتميز - إذا وصلك هذا البريد فالنظام يعمل بشكل صحيح",
      purpose: "transactional",
      idempotency_key: `test-${Date.now()}`,
      unsubscribe_token: unsubToken,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    };

    const { data, error } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message, details: error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم وضع البريد في الطابور للإرسال إلى ${recipient}`,
        msg_id: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
