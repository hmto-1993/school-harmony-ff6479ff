import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const sb = createClient(url, key);

    const body = await req.json().catch(() => ({}));
    const f = body.file as string;
    if (!f) return new Response(JSON.stringify({ error: "file required" }), { status: 400, headers: corsHeaders });

    const { data, error } = await sb.storage.from("reports").download(f);
    if (error || !data) return new Response(JSON.stringify({ error: error?.message }), { status: 500, headers: corsHeaders });
    const buf = new Uint8Array(await data.arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);

    const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract every student record. Return ONLY a JSON array. Fields per row: full_name, national_id, academic_number, class_name, total_score, attendance_present, attendance_absent, attendance_late, attendance_excused, behavior_notes. Include EVERY row." },
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

    if (Array.isArray(parsed) && parsed.length) {
      // Save raw to recovery_action_log
      await sb.from("recovery_action_log").insert({
        action: "forensic_pdf_extract",
        details: { file: f, count: parsed.length, students: parsed },
      });
    }

    return new Response(JSON.stringify({ file: f, size: buf.length, count: Array.isArray(parsed) ? parsed.length : 0, students: parsed, raw_preview: parsed ? null : content.slice(0, 800) }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
