import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  phone: string;
  message: string;
}

function formatPhone(phone: string): string {
  let formatted = phone.replace(/[\s\-\+]/g, "");
  if (formatted.startsWith("0")) {
    formatted = "966" + formatted.slice(1);
  }
  if (!formatted.startsWith("966")) {
    formatted = "966" + formatted;
  }
  return formatted;
}

async function sendViaMsegat(phone: string, message: string, settings: Record<string, string>) {
  const username = settings["sms_provider_username"] || Deno.env.get("MSEGAT_USERNAME");
  const apiKey = settings["sms_provider_api_key"] || Deno.env.get("MSEGAT_API_KEY");
  const sender = settings["sms_provider_sender"] || Deno.env.get("MSEGAT_SENDER_NAME");

  if (!username || !apiKey || !sender) {
    throw new Error("بيانات MSEGAT غير مكتملة");
  }

  const response = await fetch("https://www.msegat.com/gw/sendsms.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: username,
      apiKey: apiKey,
      numbers: formatPhone(phone),
      userSender: sender,
      msg: message,
      msgEncoding: "UTF8",
    }),
  });

  const result = await response.json();
  console.log("MSEGAT response:", JSON.stringify(result));

  if (result.code === "1" || result.code === 1) {
    return { success: true, message: "تم إرسال الرسالة بنجاح", result };
  } else {
    return { success: false, error: result.message || "فشل إرسال الرسالة", result };
  }
}

async function sendViaUnifonic(phone: string, message: string, settings: Record<string, string>) {
  const appSid = settings["sms_provider_api_key"];
  const sender = settings["sms_provider_sender"];

  if (!appSid) {
    throw new Error("بيانات Unifonic غير مكتملة (App SID مطلوب)");
  }

  const formattedPhone = formatPhone(phone);

  const params = new URLSearchParams({
    AppSid: appSid,
    Recipient: formattedPhone,
    Body: message,
    ...(sender ? { SenderID: sender } : {}),
  });

  const response = await fetch("https://el.cloud.unifonic.com/rest/SMS/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const result = await response.json();
  console.log("Unifonic response:", JSON.stringify(result));

  if (result.success === true || result.Success === "true" || result.errorCode === "ER-00") {
    return { success: true, message: "تم إرسال الرسالة بنجاح", result };
  } else {
    return { success: false, error: result.message || result.Message || "فشل إرسال الرسالة", result };
  }
}

async function sendViaTaqnyat(phone: string, message: string, settings: Record<string, string>) {
  const bearer = settings["sms_provider_api_key"];
  const sender = settings["sms_provider_sender"];

  if (!bearer || !sender) {
    throw new Error("بيانات Taqnyat غير مكتملة");
  }

  const formattedPhone = formatPhone(phone);

  const response = await fetch("https://api.taqnyat.sa/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      recipients: [formattedPhone],
      body: message,
      sender: sender,
    }),
  });

  const result = await response.json();
  console.log("Taqnyat response:", JSON.stringify(result));

  if (result.statusCode === 201 || result.statusCode === 200) {
    return { success: true, message: "تم إرسال الرسالة بنجاح", result };
  } else {
    return { success: false, error: result.message || "فشل إرسال الرسالة", result };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authSupabase.auth.getUser(token);
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller has teacher or admin role
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.user.id)
      .in("role", ["admin", "teacher"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient role" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settingsData } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", [
        "sms_provider",
        "sms_provider_username",
        "sms_provider_api_key",
        "sms_provider_sender",
      ]);

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: any) => {
      settings[s.id] = s.value;
    });

    const provider = settings["sms_provider"] || "msegat";

    const { phone, message } = (await req.json()) as SMSRequest;

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    switch (provider) {
      case "unifonic":
        result = await sendViaUnifonic(phone, message, settings);
        break;
      case "taqnyat":
        result = await sendViaTaqnyat(phone, message, settings);
        break;
      case "msegat":
      default:
        result = await sendViaMsegat(phone, message, settings);
        break;
    }

    const status = result.success ? 200 : 400;
    return new Response(JSON.stringify(result), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SMS Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
