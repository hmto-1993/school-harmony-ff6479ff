import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ summary: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { teacherName, schoolName, classes, attendanceRate, totalStudents } = await req.json();

    // Build a concise data summary for the AI
    const classDetails = (classes || []).map((c: any) => {
      const attRate = c.studentCount > 0 ? Math.round((c.attendance.present / c.studentCount) * 100) : 0;
      const lessonPct = c.lessonPlans.total > 0 ? Math.round((c.lessonPlans.completed / c.lessonPlans.total) * 100) : 0;
      return `- ${c.name}: ${c.studentCount} طالب، حضور ${attRate}%، خطط دروس ${lessonPct}% (${c.lessonPlans.completed}/${c.lessonPlans.total})، سلوك إيجابي ${c.behavior.positive} / سلبي ${c.behavior.negative}، غيابات كلية ${c.totalAbsences}`;
    }).join('\n');

    const prompt = `أنت محلل تعليمي خبير. لخّص أداء المعلم "${teacherName}" في مدرسة "${schoolName || 'غير محدد'}" بناءً على البيانات التالية:

إجمالي الطلاب: ${totalStudents}
نسبة الحضور اليوم: ${attendanceRate}%

تفاصيل الفصول:
${classDetails}

اكتب ملخصاً مهنياً موجزاً (3-5 جمل فقط) يغطي:
1. نقاط القوة البارزة
2. المجالات التي تحتاج تحسين
3. توصية واحدة محددة

الملخص يجب أن يكون بالعربية، مهني، ومباشر. لا تستخدم عناوين أو نقاط، اكتب فقرة واحدة متصلة.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'أنت محلل أداء تعليمي محترف. أجب بالعربية فقط.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      return new Response(JSON.stringify({ summary: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('summarize-teacher error:', e);
    return new Response(JSON.stringify({ summary: '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
