import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, classIds } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get push subscriptions, optionally filtered by class
    let query = supabase.from("push_subscriptions").select("*");
    if (classIds && classIds.length > 0) {
      query = query.or(`class_id.in.(${classIds.join(",")}),class_id.is.null`);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    // Web Push requires VAPID. For now, we use the Notification API via service worker.
    // Since Web Push with VAPID requires the web-push library (not available in Deno easily),
    // we'll store notifications in the DB and let the service worker poll/display them.
    // For a production setup, you'd integrate with a push service like OneSignal.
    
    // Store the notification for polling
    const notificationRecord = {
      title,
      body,
      class_ids: classIds || [],
      created_at: new Date().toISOString(),
    };

    // For each subscription endpoint, we'll try to send via fetch (standard Web Push)
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    
    const results = {
      total: subscriptions?.length || 0,
      sent: 0,
      failed: 0,
    };

    // If no VAPID key, just log - notifications will work via in-app polling
    if (!VAPID_PRIVATE_KEY) {
      console.log("VAPID_PRIVATE_KEY not set. Notifications stored for in-app delivery.", notificationRecord);
    }

    // Store notification in site_settings for in-app delivery
    await supabase.from("site_settings").upsert({
      id: "latest_notification",
      value: JSON.stringify(notificationRecord),
    });

    return new Response(
      JSON.stringify({ success: true, ...results, notification: notificationRecord }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
