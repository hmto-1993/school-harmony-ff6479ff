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

    // Forensic recovery — temporary open access; delete this function after use.

    const files = ["shared/report_1773552090763.pdf", "shared/report_1773402540754.pdf"];
    const results: any[] = [];
    for (const f of files) {
      const { data, error } = await sb.storage.from("reports").download(f);
      if (error || !data) { results.push({ file: f, error: error?.message }); continue; }
      const buf = new Uint8Array(await data.arrayBuffer());
      // base64
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const b64 = btoa(bin);

      const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: "Extract every student record from this PDF. Return JSON array only with fields: full_name, national_id, academic_number, class_name, grade_level, total_score, attendance_present, attendance_absent, attendance_late, attendance_excused, behavior_notes. Include EVERY row even if some fields are missing. No prose." },
            { role: "user", content: [
              { type: "text", text: "Extract ALL students from this report PDF. Return only a JSON array." },
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
      results.push({ file: f, size: buf.length, count: Array.isArray(parsed) ? parsed.length : 0, students: parsed, raw: parsed ? null : content.slice(0, 500) });
    }
    return new Response(JSON.stringify({ results }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
