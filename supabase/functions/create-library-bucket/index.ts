import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if bucket exists first
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.id === "library");

    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket("library", {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
      });

      if (error) {
        // Fallback: try creating without options
        const { error: error2 } = await supabaseAdmin.storage.createBucket("library");
        if (error2 && !error2.message?.includes("already exists")) {
          throw error2;
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
