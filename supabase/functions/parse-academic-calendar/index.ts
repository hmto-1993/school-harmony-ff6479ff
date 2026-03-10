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
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await authSupabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // --- End auth check ---

    const { text, source_type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert at extracting academic calendar data from school documents (Arabic or English).
Extract the following information and return it as a JSON object using tool calling:
- start_date: The first day of academic instruction (YYYY-MM-DD format, convert Hijri dates to Gregorian if needed)
- total_weeks: Total number of academic weeks in the semester
- exam_dates: Array of exam periods, each with:
  - date: Start date of the exam period (YYYY-MM-DD)
  - label: Arabic label for the exam (e.g. "اختبارات منتصف الفصل")
  - type: Either "midterm" or "final"
- semester: "first", "second", or "third"
- academic_year: e.g. "1446-1447"

If you cannot find specific information, make reasonable estimates based on Saudi academic calendars.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract academic calendar data from the following ${source_type} content:\n\n${text}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_calendar",
              description: "Extract structured academic calendar data",
              parameters: {
                type: "object",
                properties: {
                  start_date: { type: "string", description: "YYYY-MM-DD" },
                  total_weeks: { type: "number" },
                  exam_dates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string" },
                        label: { type: "string" },
                        type: { type: "string", enum: ["midterm", "final"] },
                      },
                      required: ["date", "label", "type"],
                    },
                  },
                  semester: { type: "string", enum: ["first", "second", "third"] },
                  academic_year: { type: "string" },
                },
                required: ["start_date", "total_weeks", "exam_dates", "semester", "academic_year"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_calendar" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const calendarData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(calendarData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-academic-calendar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
