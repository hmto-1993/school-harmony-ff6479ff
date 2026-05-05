import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

// Allowlist of buckets this helper may serve. Anything else is rejected.
const ALLOWED_BUCKETS = new Set(["reports", "library", "shared", "letterheads"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    // Require authenticated staff caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const sbAuth = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: u, error: uerr } = await sbAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uerr || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { bucket, path } = await req.json();
    if (typeof bucket !== "string" || typeof path !== "string" || !bucket || !path) {
      return new Response(JSON.stringify({ error: "Invalid bucket/path" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return new Response(JSON.stringify({ error: "Bucket not allowed" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    // Reject path traversal
    if (path.includes("..") || path.startsWith("/")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await sb.storage.from(bucket).download(path);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const buf = new Uint8Array(await data.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return new Response(JSON.stringify({ base64: btoa(bin), size: buf.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
