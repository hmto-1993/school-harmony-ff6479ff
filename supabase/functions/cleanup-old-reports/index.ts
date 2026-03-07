import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendNotification(supabase: any, title: string, body: string) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ title, body, classIds: [] }),
    });
  } catch (e) {
    console.error("Failed to send notification:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // List all files in the reports bucket
    const { data: files, error: listError } = await supabase.storage
      .from("reports")
      .list("", { limit: 1000 });

    if (listError) throw listError;

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: "No files found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const oldFiles = files.filter((file) => {
      if (!file.created_at) return false;
      return new Date(file.created_at) < sevenDaysAgo;
    });

    if (oldFiles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: "No old files to delete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Notify before starting cleanup
    await sendNotification(
      supabase,
      "🗑️ بدء تنظيف التقارير",
      `جاري حذف ${oldFiles.length} ملف تقرير أقدم من 7 أيام...`
    );

    const filePaths = oldFiles.map((f) => f.name);

    const { error: removeError } = await supabase.storage
      .from("reports")
      .remove(filePaths);

    if (removeError) throw removeError;

    console.log(`Deleted ${filePaths.length} old report files`);

    // Notify after completion
    await sendNotification(
      supabase,
      "✅ اكتمل تنظيف التقارير",
      `تم حذف ${filePaths.length} ملف تقرير قديم بنجاح. تم توفير مساحة التخزين.`
    );

    return new Response(
      JSON.stringify({
        success: true,
        deleted: filePaths.length,
        files: filePaths,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);

    // Notify on failure
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    await sendNotification(
      supabase,
      "❌ فشل تنظيف التقارير",
      `حدث خطأ أثناء حذف التقارير القديمة: ${error.message}`
    );

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
