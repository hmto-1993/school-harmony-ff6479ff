import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface QBChapter {
  id: string;
  title: string;
  sort_order: number;
  created_by: string;
  created_at: string;
}

export interface QBLesson {
  id: string;
  chapter_id: string;
  title: string;
  sort_order: number;
  created_by: string;
  created_at: string;
}

export interface QBQuestion {
  id: string;
  lesson_id: string;
  question_text: string;
  question_type: "mcq" | "truefalse";
  options: string[];
  correct_index: number;
  score: number;
  enabled: boolean;
  created_by: string;
  created_at: string;
}

export function useQuestionBank() {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<QBChapter[]>([]);
  const [lessons, setLessons] = useState<QBLesson[]>([]);
  const [questions, setQuestions] = useState<QBQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const fetchChapters = useCallback(async () => {
    const { data } = await supabase
      .from("question_bank_chapters")
      .select("*")
      .order("sort_order", { ascending: true });
    setChapters((data as QBChapter[]) || []);
  }, []);

  const fetchLessons = useCallback(async (chapterId: string) => {
    const { data } = await supabase
      .from("question_bank_lessons")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("sort_order", { ascending: true });
    setLessons((data as QBLesson[]) || []);
  }, []);

  const fetchQuestions = useCallback(async (lessonId: string) => {
    const { data } = await supabase
      .from("question_bank_questions")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    setQuestions((data as QBQuestion[]) || []);
  }, []);

  useEffect(() => {
    fetchChapters().then(() => setLoading(false));
  }, [fetchChapters]);

  useEffect(() => {
    if (selectedChapterId) fetchLessons(selectedChapterId);
    else setLessons([]);
  }, [selectedChapterId, fetchLessons]);

  useEffect(() => {
    if (selectedLessonId) fetchQuestions(selectedLessonId);
    else setQuestions([]);
  }, [selectedLessonId, fetchQuestions]);

  const addChapter = async (title: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("question_bank_chapters").insert({
      title, created_by: user.id, sort_order: chapters.length,
    });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تمت الإضافة" });
    fetchChapters();
  };

  const updateChapter = async (id: string, title: string) => {
    await supabase.from("question_bank_chapters").update({ title }).eq("id", id);
    fetchChapters();
  };

  const deleteChapter = async (id: string) => {
    await supabase.from("question_bank_chapters").delete().eq("id", id);
    if (selectedChapterId === id) { setSelectedChapterId(null); setSelectedLessonId(null); }
    fetchChapters();
    toast({ title: "تم الحذف" });
  };

  const addLesson = async (chapterId: string, title: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("question_bank_lessons").insert({
      chapter_id: chapterId, title, created_by: user.id, sort_order: lessons.length,
    });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تمت الإضافة" });
    fetchLessons(chapterId);
  };

  const updateLesson = async (id: string, title: string) => {
    await supabase.from("question_bank_lessons").update({ title }).eq("id", id);
    if (selectedChapterId) fetchLessons(selectedChapterId);
  };

  const deleteLesson = async (id: string) => {
    await supabase.from("question_bank_lessons").delete().eq("id", id);
    if (selectedLessonId === id) setSelectedLessonId(null);
    if (selectedChapterId) fetchLessons(selectedChapterId);
    toast({ title: "تم الحذف" });
  };

  const addQuestion = async (lessonId: string, q: Omit<QBQuestion, "id" | "lesson_id" | "created_by" | "created_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("question_bank_questions").insert({
      lesson_id: lessonId, ...q, created_by: user.id,
    });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    fetchQuestions(lessonId);
  };

  const addQuestionsBatch = async (lessonId: string, qs: Omit<QBQuestion, "id" | "lesson_id" | "created_by" | "created_at">[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = qs.map(q => ({ lesson_id: lessonId, ...q, created_by: user.id }));
    const { error } = await supabase.from("question_bank_questions").insert(rows);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    fetchQuestions(lessonId);
    toast({ title: "تم الاستيراد", description: `تمت إضافة ${qs.length} سؤال` });
  };

  const updateQuestion = async (id: string, updates: Partial<QBQuestion>) => {
    await supabase.from("question_bank_questions").update(updates).eq("id", id);
    if (selectedLessonId) fetchQuestions(selectedLessonId);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("question_bank_questions").delete().eq("id", id);
    if (selectedLessonId) fetchQuestions(selectedLessonId);
  };

  const fetchRandomQuestions = async (lessonId: string, count: number = 1): Promise<QBQuestion[]> => {
    const { data } = await supabase
      .from("question_bank_questions")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("enabled", true);
    if (!data || data.length === 0) return [];
    const shuffled = [...(data as QBQuestion[])].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  return {
    chapters, lessons, questions, loading,
    selectedChapterId, setSelectedChapterId,
    selectedLessonId, setSelectedLessonId,
    addChapter, updateChapter, deleteChapter,
    addLesson, updateLesson, deleteLesson,
    addQuestion, addQuestionsBatch, updateQuestion, deleteQuestion,
    fetchRandomQuestions, fetchChapters, fetchLessons, fetchQuestions,
  };
}
