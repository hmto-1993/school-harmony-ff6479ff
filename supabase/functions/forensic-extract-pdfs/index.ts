import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function processFile(f: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
  const sb = createClient(url, key);
  try {
    const { data, error } = await sb.storage.from("reports").download(f);
    if (error || !data) {
      await sb.from("recovery_action_log").insert({ action: "forensic_pdf_extract_error", details: { file: f, error: error?.message } });
      return;
    }
    const buf = new Uint8Array(await data.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract every student record. Return ONLY a JSON array. Fields per row: full_name, national_id, academic_number, class_name, total_score, attendance_present, attendance_absent, attendance_late, attendance_excused, behavior_notes. Include EVERY row even partial." },
          { role: "user", content: [
            { type: "text", text: "Extract ALL students from this PDF. JSON array only." },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${b64}` } },
          ]},
        ],
        temperature: 0,
        max_tokens: 16000,
      }),
    });
    const j = await ai.json();
    const content = j.choices?.[0]?.message?.content || "";
    let parsed: any = null;
    const m = content.match(/\[[\s\S]*\]/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch {} }

    await sb.from("recovery_action_log").insert({
      action: "forensic_pdf_extract",
      details: { file: f, size: buf.length, count: Array.isArray(parsed) ? parsed.length : 0, students: parsed, raw_preview: parsed ? null : content.slice(0, 1000) },
    });
  } catch (e: any) {
    await sb.from("recovery_action_log").insert({ action: "forensic_pdf_extract_error", details: { file: f, error: String(e?.message || e) } });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const files: string[] = body.files || ["shared/report_1773552090763.pdf", "shared/report_1773402540754.pdf"];

  // Fire-and-forget background tasks
  // @ts-ignore EdgeRuntime is available in Supabase Edge runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    for (const f of files) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processFile(f));
    }
  } else {
    files.forEach((f) => { processFile(f); });
  }

  return new Response(JSON.stringify({ scheduled: files }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
