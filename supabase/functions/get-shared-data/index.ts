import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) return ok({ error: 'رمز المشاركة مطلوب' });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Validate token
    const { data: share } = await supabase
      .from('shared_views')
      .select('*')
      .eq('token', token)
      .single();

    if (!share) return ok({ error: 'رابط المشاركة غير صالح' });
    if (new Date(share.expires_at) < new Date()) return ok({ error: 'انتهت صلاحية رابط المشاركة' });

    const classIds = share.class_ids || [];
    if (classIds.length === 0) return ok({ error: 'لا توجد فصول مشتركة' });

    // 2. Track view — increment view_count and update last_viewed_at
    await supabase
      .from('shared_views')
      .update({ view_count: (share.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq('id', share.id);

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    // 3. Phase 1 - parallel queries
    const [
      { data: profile },
      { data: classes },
      { data: students },
      { data: todayAttendance },
      { data: categories },
      { data: behavior },
      { data: lessonPlans },
      { data: schoolSetting },
      { data: attendanceHistory },
      { data: academicCalendar },
      { data: classSchedules },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('user_id', share.teacher_id).single(),
      supabase.from('classes').select('id, name, grade, section').in('id', classIds),
      supabase.from('students').select('id, full_name, class_id').in('class_id', classIds).order('full_name'),
      supabase.from('attendance_records').select('student_id, status, class_id').in('class_id', classIds).eq('date', today),
      supabase.from('grade_categories').select('id, name, max_score, category_group, sort_order, class_id'),
      supabase.from('behavior_records').select('student_id, type, class_id, date, note').in('class_id', classIds).gte('date', thirtyDaysAgo),
      supabase.from('lesson_plans').select('class_id, week_number, is_completed, lesson_title, day_index, slot_index').in('class_id', classIds).eq('created_by', share.teacher_id),
      supabase.from('site_settings').select('value').eq('id', 'school_name').single(),
      // Full attendance history for weekly report
      supabase.from('attendance_records').select('student_id, status, class_id, date').in('class_id', classIds).order('date', { ascending: false }).limit(5000),
      // Academic calendar for week calculation
      supabase.from('academic_calendar').select('start_date, total_weeks, semester, academic_year').order('created_at', { ascending: false }).limit(1).single(),
      // Class schedules for periods per week
      supabase.from('class_schedules').select('class_id, periods_per_week, days_of_week').in('class_id', classIds),
    ]);

    const studentIds = (students || []).map((s: any) => s.id);

    // 4. Phase 2 - grades (depend on student IDs)
    let grades: any[] = [];
    let manualScores: any[] = [];
    if (studentIds.length > 0) {
      const [g, m] = await Promise.all([
        supabase.from('grades').select('student_id, category_id, score, period, date').in('student_id', studentIds),
        supabase.from('manual_category_scores').select('student_id, category_id, score, period').in('student_id', studentIds),
      ]);
      grades = g.data || [];
      manualScores = m.data || [];
    }

    // 5. Build attendance report summary per date
    const attendanceByDate: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    (attendanceHistory || []).forEach((r: any) => {
      if (!attendanceByDate[r.date]) attendanceByDate[r.date] = { present: 0, absent: 0, late: 0, total: 0 };
      attendanceByDate[r.date].total++;
      if (r.status === 'present') attendanceByDate[r.date].present++;
      else if (r.status === 'absent') attendanceByDate[r.date].absent++;
      else if (r.status === 'late') attendanceByDate[r.date].late++;
    });

    const attendanceReport = Object.entries(attendanceByDate)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // 6. Build per-class summaries
    const classSummaries = (classes || []).map((c: any) => {
      const classStudents = (students || []).filter((s: any) => s.class_id === c.id);
      const classStudentIds = classStudents.map((s: any) => s.id);
      const att = (todayAttendance || []).filter((a: any) => a.class_id === c.id);
      const present = att.filter((a: any) => a.status === 'present').length;
      const absent = att.filter((a: any) => a.status === 'absent').length;
      const late = att.filter((a: any) => a.status === 'late').length;

      const classGrades = grades.filter((g: any) => classStudentIds.includes(g.student_id));
      const classManual = manualScores.filter((m: any) => classStudentIds.includes(m.student_id));

      const classLessons = (lessonPlans || []).filter((l: any) => l.class_id === c.id);
      const classBehavior = (behavior || []).filter((b: any) => b.class_id === c.id);
      const positiveCount = classBehavior.filter((b: any) => b.type === 'positive').length;
      const negativeCount = classBehavior.filter((b: any) => b.type === 'negative').length;

      // Attendance history per class
      const classAttHistory = (attendanceHistory || []).filter((a: any) => a.class_id === c.id);
      const totalAbsences = classAttHistory.filter((a: any) => a.status === 'absent').length;

      // Students with most absences
      const absencesByStudent: Record<string, number> = {};
      classAttHistory.filter((a: any) => a.status === 'absent').forEach((a: any) => {
        absencesByStudent[a.student_id] = (absencesByStudent[a.student_id] || 0) + 1;
      });
      const topAbsentees = Object.entries(absencesByStudent)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([studentId, count]) => {
          const student = classStudents.find((s: any) => s.id === studentId);
          return { name: student?.full_name || '', count };
        });

      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        section: c.section,
        studentCount: classStudents.length,
        students: classStudents.map((s: any) => ({ id: s.id, full_name: s.full_name })),
        attendance: { present, absent, late, total: classStudents.length, notRecorded: classStudents.length - att.length },
        grades: classGrades,
        manualScores: classManual,
        lessonPlans: {
          total: classLessons.length,
          completed: classLessons.filter((l: any) => l.is_completed).length,
        },
        behavior: { positive: positiveCount, negative: negativeCount },
        totalAbsences,
        topAbsentees,
      };
    });

    const totalStudents = (students || []).length;
    const totalPresent = (todayAttendance || []).filter((a: any) => a.status === 'present').length;
    const attendanceRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

    return ok({
      teacherName: profile?.full_name || 'معلم',
      schoolName: schoolSetting?.value || '',
      expiresAt: share.expires_at,
      canPrint: share.can_print,
      canExport: share.can_export,
      label: share.label || '',
      totalStudents,
      attendanceRate,
      classes: classSummaries,
      categories: categories || [],
      attendanceReport,
      viewCount: (share.view_count || 0) + 1,
    });
  } catch (e) {
    console.error('get-shared-data error:', e);
    return ok({ error: 'حدث خطأ غير متوقع' });
  }
});
