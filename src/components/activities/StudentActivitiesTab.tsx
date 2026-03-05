import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ClipboardList, FileUp, FileText, Download, Loader2, Upload,
  CheckCircle2, ArrowRight, AlertCircle, Send
} from "lucide-react";

interface StudentActivitiesTabProps {
  studentId: string;
  classId: string | null;
}

interface Activity {
  id: string; title: string; description: string | null; type: string;
  file_url: string | null; file_name: string | null;
  allow_student_uploads: boolean;
  questions?: any[];
}

export default function StudentActivitiesTab({ studentId, classId }: StudentActivitiesTabProps) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Activity | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  useEffect(() => {
    if (classId) fetchActivities();
  }, [classId]);

  const fetchActivities = async () => {
    if (!classId) return;
    setLoading(true);

    // Get activity IDs targeted to this class
    const { data: targets } = await supabase
      .from("activity_class_targets")
      .select("activity_id, allow_student_uploads")
      .eq("class_id", classId);

    if (!targets?.length) { setActivities([]); setLoading(false); return; }

    const ids = targets.map(t => t.activity_id);
    const uploadsMap: Record<string, boolean> = {};
    targets.forEach(t => { uploadsMap[t.activity_id] = t.allow_student_uploads; });

    const { data: acts } = await supabase
      .from("teacher_activities")
      .select("*")
      .in("id", ids)
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    // Check which quizzes student already completed
    const { data: subs } = await supabase
      .from("quiz_submissions")
      .select("activity_id")
      .eq("student_id", studentId)
      .in("activity_id", ids);

    const completed = new Set<string>();
    subs?.forEach(s => completed.add(s.activity_id));
    setCompletedQuizzes(completed);

    setActivities((acts || []).map((a: any) => ({
      ...a,
      allow_student_uploads: uploadsMap[a.id] || false,
    })));
    setLoading(false);
  };

  const openQuiz = async (activity: Activity) => {
    if (completedQuizzes.has(activity.id)) {
      toast({ title: "لقد أكملت هذا الاختبار مسبقاً" });
      return;
    }
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("activity_id", activity.id)
      .order("sort_order");

    setSelectedQuiz({ ...activity, questions: questions || [] });
    setQuizAnswers({});
    setQuizResult(null);
  };

  const submitQuiz = async () => {
    if (!selectedQuiz?.questions) return;
    setSubmitting(true);

    let score = 0;
    const total = selectedQuiz.questions.length;
    selectedQuiz.questions.forEach(q => {
      if (quizAnswers[q.id] === q.correct_answer) score++;
    });

    await supabase.from("quiz_submissions").insert({
      activity_id: selectedQuiz.id,
      student_id: studentId,
      answers: quizAnswers,
      score,
      total,
    } as any);

    setQuizResult({ score, total });
    setCompletedQuizzes(prev => new Set(prev).add(selectedQuiz.id));
    setSubmitting(false);
  };

  const uploadStudentFile = async (activityId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الملف يتجاوز 5 ميجابايت", variant: "destructive" });
      return;
    }
    setUploadingFor(activityId);
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const { error } = await supabase.storage.from("activities").upload(`student-uploads/${safeName}`, file);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setUploadingFor(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("activities").getPublicUrl(`student-uploads/${safeName}`);
    await supabase.from("student_file_submissions").insert({
      activity_id: activityId,
      student_id: studentId,
      class_id: classId,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
    } as any);
    toast({ title: "تم رفع الملف بنجاح" });
    setUploadingFor(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Quiz view
  if (selectedQuiz) {
    return (
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-primary" />
              {selectedQuiz.title}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedQuiz(null); setQuizResult(null); }} className="gap-1.5">
              <ArrowRight className="h-4 w-4 rotate-180" /> العودة
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {quizResult ? (
            <div className="text-center py-8 space-y-4">
              <div className={cn(
                "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
                quizResult.score / quizResult.total >= 0.6 ? "bg-emerald-500/15" : "bg-rose-500/15"
              )}>
                <CheckCircle2 className={cn(
                  "h-10 w-10",
                  quizResult.score / quizResult.total >= 0.6 ? "text-emerald-500" : "text-rose-500"
                )} />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{quizResult.score}/{quizResult.total}</p>
                <p className="text-muted-foreground mt-1">
                  {Math.round((quizResult.score / quizResult.total) * 100)}%
                </p>
              </div>
            </div>
          ) : (
            <>
              {selectedQuiz.questions?.map((q, qi) => (
                <div key={q.id} className="p-4 rounded-2xl border border-border/30 bg-muted/10 space-y-3">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="shrink-0 rounded-full text-xs">{qi + 1}</Badge>
                    <p className="font-medium text-foreground">{q.question_text}</p>
                  </div>
                  {q.image_url && (
                    <img src={q.image_url} alt="" className="max-h-48 rounded-xl object-contain mx-auto" />
                  )}
                  <div className="space-y-2">
                    {(q.options as string[]).map((opt: string, oi: number) => (
                      <button
                        key={oi}
                        onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oi }))}
                        className={cn(
                          "w-full text-right p-3 rounded-xl border transition-all",
                          quizAnswers[q.id] === oi
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border/30 hover:border-primary/30 text-foreground"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                onClick={submitQuiz}
                disabled={submitting || Object.keys(quizAnswers).length < (selectedQuiz.questions?.length || 0)}
                className="w-full gap-2 rounded-xl h-11"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                تسليم الاختبار
              </Button>
              {Object.keys(quizAnswers).length < (selectedQuiz.questions?.length || 0) && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  أجب على جميع الأسئلة ({Object.keys(quizAnswers).length}/{selectedQuiz.questions?.length})
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Activities list
  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-primary" />
          الأنشطة الحالية
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد أنشطة متاحة حالياً</p>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="p-4 rounded-2xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    activity.type === "quiz" ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {activity.type === "quiz" ? <ClipboardList className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground">{activity.title}</h4>
                    {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activity.type === "quiz" && (
                    <Button
                      size="sm"
                      variant={completedQuizzes.has(activity.id) ? "outline" : "default"}
                      className="gap-1.5 rounded-xl"
                      onClick={() => openQuiz(activity)}
                      disabled={completedQuizzes.has(activity.id)}
                    >
                      {completedQuizzes.has(activity.id) ? (
                        <><CheckCircle2 className="h-4 w-4" /> مكتمل</>
                      ) : (
                        <><ClipboardList className="h-4 w-4" /> بدء الاختبار</>
                      )}
                    </Button>
                  )}

                  {activity.file_url && (
                    <a href={activity.file_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
                        <Download className="h-4 w-4" /> تحميل الملف
                      </Button>
                    </a>
                  )}

                  {activity.allow_student_uploads && (
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && uploadStudentFile(activity.id, e.target.files[0])}
                      />
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-xl pointer-events-none" asChild>
                        <span>
                          {uploadingFor === activity.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          رفع ملف (5MB)
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
