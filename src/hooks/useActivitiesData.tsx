import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendPushNotification } from "@/lib/push-notifications";
import type { QuizQuestion } from "@/components/activities/QuizBuilder";

export interface ClassInfo { id: string; name: string; grade: string; section: string; }
export interface Activity {
  id: string; title: string; description: string | null; type: string;
  file_url: string | null; file_name: string | null; is_visible: boolean;
  allow_student_uploads: boolean; created_at: string; created_by: string;
  duration_minutes: number;
  targets: { class_id: string; allow_student_uploads: boolean; classes?: ClassInfo }[];
  question_count?: number;
}

export function useActivitiesData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    const { data } = await supabase.from("classes").select("id, name, grade, section").order("grade");
    if (data) setClasses(data);
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("teacher_activities")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const ids = data.map((a: any) => a.id);
      const [{ data: targets }, { data: qCounts }] = await Promise.all([
        supabase.from("activity_class_targets").select("*, classes(id, name, grade, section)").in("activity_id", ids.length ? ids : ["__none__"]),
        supabase.from("quiz_questions").select("activity_id").in("activity_id", ids.length ? ids : ["__none__"]),
      ]);

      const qCountMap: Record<string, number> = {};
      qCounts?.forEach((q: any) => { qCountMap[q.activity_id] = (qCountMap[q.activity_id] || 0) + 1; });

      setActivities(data.map((a: any) => ({
        ...a,
        targets: (targets || []).filter((t: any) => t.activity_id === a.id),
        question_count: qCountMap[a.id] || 0,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClasses(); fetchActivities(); }, [fetchClasses, fetchActivities]);

  const createActivity = async (params: {
    title: string; description: string; type: "file" | "quiz";
    duration: number; file: File | null; classIds: string[];
    questions: QuizQuestion[]; notify: boolean;
  }) => {
    if (!params.title.trim() || !user || params.classIds.length === 0) {
      toast({ title: "أكمل جميع الحقول المطلوبة", variant: "destructive" });
      return false;
    }
    if (params.type === "quiz" && params.questions.length === 0) {
      toast({ title: "أضف سؤالاً واحداً على الأقل", variant: "destructive" });
      return false;
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;

    if (params.type === "file" && params.file) {
      const ext = params.file.name.substring(params.file.name.lastIndexOf('.'));
      const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const { error: upErr } = await supabase.storage.from("activities").upload(`files/${safeName}`, params.file);
      if (upErr) {
        toast({ title: "خطأ في رفع الملف", description: upErr.message, variant: "destructive" });
        return false;
      }
      fileUrl = `files/${safeName}`;
      fileName = params.file.name;
    }

    const targetIds = params.classIds.includes("__all__") ? classes.map(c => c.id) : params.classIds;

    const { data: activity, error } = await supabase.from("teacher_activities").insert({
      title: params.title.trim(),
      description: params.description.trim() || null,
      type: params.type,
      file_url: fileUrl,
      file_name: fileName,
      created_by: user.id,
      duration_minutes: params.type === "quiz" ? params.duration : 0,
    } as any).select().single();

    if (error || !activity) {
      toast({ title: "خطأ", description: error?.message, variant: "destructive" });
      return false;
    }

    await supabase.from("activity_class_targets").insert(targetIds.map(cid => ({ activity_id: activity.id, class_id: cid })) as any);

    if (params.type === "quiz" && params.questions.length > 0) {
      await supabase.from("quiz_questions").insert(params.questions.map((q, i) => ({
        activity_id: activity.id, question_text: q.question_text, question_type: q.question_type,
        image_url: q.image_url || null, options: q.options, correct_answer: q.correct_answer, sort_order: i,
      })) as any);
    }

    toast({ title: `تم إنشاء ${params.type === "quiz" ? "الاختبار" : "النشاط"} ونشره في ${targetIds.length} فصل` });

    if (params.notify) {
      try {
        await sendPushNotification(
          params.type === "quiz" ? "🎯 اختبار جديد" : "📄 نشاط جديد",
          params.title.trim(),
          targetIds
        );
        toast({ title: "تم إرسال الإشعار للطلاب" });
      } catch (e) {
        console.error("Push notification failed:", e);
      }
    }

    fetchActivities();
    return true;
  };

  const saveEdit = async (params: {
    activity: Activity; title: string; description: string;
    duration: number; classIds: string[]; questions: QuizQuestion[];
  }) => {
    if (!params.title.trim()) return false;

    await supabase.from("teacher_activities").update({
      title: params.title.trim(),
      description: params.description.trim() || null,
      duration_minutes: params.activity.type === "quiz" ? params.duration : 0,
    } as any).eq("id", params.activity.id);

    await supabase.from("activity_class_targets").delete().eq("activity_id", params.activity.id);
    const targetIds = params.classIds.includes("__all__") ? classes.map(c => c.id) : params.classIds;
    if (targetIds.length) {
      await supabase.from("activity_class_targets").insert(targetIds.map(cid => ({ activity_id: params.activity.id, class_id: cid })) as any);
    }

    if (params.activity.type === "quiz") {
      await supabase.from("quiz_questions").delete().eq("activity_id", params.activity.id);
      if (params.questions.length) {
        await supabase.from("quiz_questions").insert(params.questions.map((q, i) => ({
          activity_id: params.activity.id, question_text: q.question_text, question_type: q.question_type,
          image_url: q.image_url || null, options: q.options, correct_answer: q.correct_answer, sort_order: i,
        })) as any);
      }
    }

    toast({ title: "تم تحديث النشاط بنجاح" });
    fetchActivities();
    return true;
  };

  const toggleVisibility = async (activityId: string, current: boolean) => {
    await supabase.from("teacher_activities").update({ is_visible: !current } as any).eq("id", activityId);
    setActivities(prev => prev.map(a => a.id === activityId ? { ...a, is_visible: !current } : a));
    toast({ title: !current ? "مرئي للطلاب" : "مخفي عن الطلاب" });
  };

  const toggleStudentUploads = async (activityId: string, classId: string, current: boolean) => {
    await supabase.from("activity_class_targets").update({ allow_student_uploads: !current } as any).eq("activity_id", activityId).eq("class_id", classId);
    setActivities(prev => prev.map(a => {
      if (a.id !== activityId) return a;
      return { ...a, targets: a.targets.map(t => t.class_id === classId ? { ...t, allow_student_uploads: !current } : t) };
    }));
    toast({ title: !current ? "رفع الملفات مفعّل" : "رفع الملفات معطّل" });
  };

  const deleteActivity = async (id: string) => {
    await supabase.from("teacher_activities").delete().eq("id", id);
    setActivities(prev => prev.filter(a => a.id !== id));
    toast({ title: "تم حذف النشاط" });
  };

  const loadQuizQuestions = async (activityId: string): Promise<QuizQuestion[]> => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("activity_id", activityId).order("sort_order");
    return (data || []).map((q: any) => ({
      id: q.id, question_text: q.question_text, question_type: q.question_type,
      image_url: q.image_url, options: q.options, correct_answer: q.correct_answer, sort_order: q.sort_order,
    }));
  };

  return {
    classes, activities, loading,
    createActivity, saveEdit, toggleVisibility, toggleStudentUploads, deleteActivity, loadQuizQuestions,
  };
}
