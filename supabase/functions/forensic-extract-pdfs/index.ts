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
    // Strip code fences and try to parse
    const cleaned = content.replace(/```json|```/g, "").trim();
    try { parsed = JSON.parse(cleaned); } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }

    await sb.from("recovery_action_log").insert({
      action: "forensic_pdf_extract",
      details: { file: f, size: buf.length, count: Array.isArray(parsed) ? parsed.length : 0, students: parsed, raw_full: parsed ? null : content },
    });
  } catch (e: any) {
    await sb.from("recovery_action_log").insert({ action: "forensic_pdf_extract_error", details: { file: f, error: String(e?.message || e) } });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Require authenticated admin/owner caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const sbAuth = createClient(sbUrl, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: u, error: uerr } = await sbAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (uerr || !u?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbAdmin = createClient(sbUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleRow } = await sbAdmin
    .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
  const { data: prof } = await sbAdmin
    .from("profiles").select("role").eq("user_id", u.user.id).maybeSingle();
  const isAdmin = !!roleRow || prof?.role === "owner";
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const files: string[] = Array.isArray(body.files) ? body.files.filter((f: unknown) => typeof f === "string") : [];
  if (files.length === 0) {
    return new Response(JSON.stringify({ error: "No files provided" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
