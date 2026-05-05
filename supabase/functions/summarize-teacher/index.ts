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
    // Require authenticated caller (any logged-in staff user)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ summary: '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { teacherName, schoolName, classes, attendanceRate, totalStudents, focus = 'comprehensive' } = await req.json();

    // Sanitize string inputs to mitigate prompt injection (clip length, strip control chars)
    const clean = (v: unknown, max = 200) =>
      String(v ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').slice(0, max);
    const safeTeacher = clean(teacherName, 120);
    const safeSchool = clean(schoolName, 200);

    // Build data summary based on focus
    const classDetails = (classes || []).map((c: any) => {
      const attRate = c.studentCount > 0 ? Math.round((c.attendance.present / c.studentCount) * 100) : 0;
      const lessonPct = c.lessonPlans.total > 0 ? Math.round((c.lessonPlans.completed / c.lessonPlans.total) * 100) : 0;

      if (focus === 'attendance') {
        return `- ${c.name}: ${c.studentCount} طالب، حضور اليوم ${attRate}%، حاضر ${c.attendance.present}، غائب ${c.attendance.absent}، متأخر ${c.attendance.late}، غيابات كلية (30 يوم) ${c.totalAbsences}، أكثر الطلاب غياباً: ${(c.topAbsentees || []).slice(0, 3).map((s: any) => `${s.name} (${s.count})`).join('، ') || 'لا يوجد'}`;
      }
      if (focus === 'grades') {
        return `- ${c.name}: ${c.studentCount} طالب، سلوك إيجابي ${c.behavior.positive} / سلبي ${c.behavior.negative}`;
      }
      // comprehensive
      return `- ${c.name}: ${c.studentCount} طالب، حضور ${attRate}%، خطط دروس ${lessonPct}% (${c.lessonPlans.completed}/${c.lessonPlans.total})، سلوك إيجابي ${c.behavior.positive} / سلبي ${c.behavior.negative}، غيابات ${c.totalAbsences}`;
    }).join('\n');

    const focusInstructions: Record<string, string> = {
      attendance: `ركّز تحليلك بالكامل على الحضور والغياب والتأخر. حلل أنماط الغياب، وحدد الفصول الأكثر تأثراً، واقترح إجراءات لتحسين نسب الحضور. لا تتحدث عن الدرجات أو خطط الدروس.`,
      grades: `ركّز تحليلك بالكامل على مستوى الطلاب الأكاديمي والسلوك. حلل التوزيع بين السلوك الإيجابي والسلبي وأثره على الأداء، واقترح استراتيجيات لرفع المستوى. لا تتحدث عن الحضور أو خطط الدروس.`,
      comprehensive: `قدم تحليلاً شاملاً يغطي الحضور والدرجات وخطط الدروس والسلوك. حدد نقاط القوة والضعف واقترح توصية واحدة ذات أولوية.`,
    };

    const prompt = `أنت محلل تعليمي خبير. لخّص أداء المعلم "${teacherName}" في مدرسة "${schoolName || 'غير محدد'}" بناءً على البيانات التالية:

إجمالي الطلاب: ${totalStudents}
نسبة الحضور اليوم: ${attendanceRate}%

تفاصيل الفصول:
${classDetails}

${focusInstructions[focus] || focusInstructions.comprehensive}

اكتب ملخصاً مهنياً موجزاً (3-5 جمل فقط). الملخص يجب أن يكون بالعربية، مهني، ومباشر. لا تستخدم عناوين أو نقاط، اكتب فقرة واحدة متصلة.`;

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
