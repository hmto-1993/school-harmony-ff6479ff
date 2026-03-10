import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQuizColors, colorStyles } from "@/hooks/use-quiz-colors";
import {
  ClipboardList, FileUp, Download, Loader2, Upload,
  CheckCircle2, ArrowRight, AlertCircle, Send, Timer
} from "lucide-react";

interface StudentActivitiesTabProps {
  studentId: string;
  classId: string | null;
}

interface Activity {
  id: string; title: string; description: string | null; type: string;
  file_url: string | null; file_name: string | null;
  allow_student_uploads: boolean;
  duration_minutes: number;
  questions?: any[];
}

function CountdownTimer({ totalSeconds, onExpire }: { totalSeconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (remaining <= 0) { onExpireRef.current(); return; }
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(interval); onExpireRef.current(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining <= 60;

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg font-bold",
      isLow ? "bg-rose-500/15 text-rose-600 animate-pulse" : "bg-primary/10 text-primary"
    )}>
      <Timer className="h-5 w-5" />
      <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}

function ActivityItem({ activity, completedQuizzes, uploadingFor, onOpenQuiz, onUpload }: {
  activity: Activity;
  completedQuizzes: Set<string>;
  uploadingFor: string | null;
  onOpenQuiz: (a: Activity) => void;
  onUpload: (id: string, file: File) => void;
}) {
  return (
    <div className="p-4 rounded-2xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors space-y-3">
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          activity.type === "quiz" ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"
        )}>
          {activity.type === "quiz" ? <ClipboardList className="h-5 w-5" /> : <FileUp className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground">{activity.title}</h4>
          {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
          {activity.type === "quiz" && activity.duration_minutes > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" /> {activity.duration_minutes} دقيقة
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {activity.type === "quiz" && (
          <Button size="sm" variant={completedQuizzes.has(activity.id) ? "outline" : "default"}
            className="gap-1.5 rounded-xl" onClick={() => onOpenQuiz(activity)} disabled={completedQuizzes.has(activity.id)}>
            {completedQuizzes.has(activity.id) ? <><CheckCircle2 className="h-4 w-4" /> مكتمل</> : <><ClipboardList className="h-4 w-4" /> بدء الاختبار</>}
          </Button>
        )}
        {activity.file_url && (
          <SignedFileLink bucket="activities" path={activity.file_url}>
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <Download className="h-4 w-4" /> تحميل الملف
            </Button>
          </SignedFileLink>
        )}
        {activity.allow_student_uploads && (
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={e => e.target.files?.[0] && onUpload(activity.id, e.target.files[0])} />
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl pointer-events-none" asChild>
              <span>
                {uploadingFor === activity.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                رفع ملف (5MB)
              </span>
            </Button>
          </label>
        )}
      </div>
    </div>
  );
}

export default function StudentActivitiesTab({ studentId, classId }: StudentActivitiesTabProps) {
  const { toast } = useToast();
  const { colors: quizColors } = useQuizColors();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Activity | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; total: number } | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    if (classId) fetchActivities();
  }, [classId]);

  const fetchActivities = async () => {
    if (!classId) return;
    setLoading(true);

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
      .from("quiz_questions_student" as any)
      .select("*")
      .eq("activity_id", activity.id)
      .order("sort_order");

    setSelectedQuiz({ ...activity, questions: questions || [] });
    setQuizAnswers({});
    setQuizResult(null);
    setTimerActive(activity.duration_minutes > 0);
  };

  const submitQuiz = useCallback(async () => {
    if (!selectedQuiz?.questions || submitting) return;
    setSubmitting(true);
    setTimerActive(false);

    // Grade server-side via edge function
    const sessionToken = sessionStorage.getItem("student_session_token");
    const sessionIssuedAt = Number(sessionStorage.getItem("student_session_issued_at"));

    const { data, error } = await supabase.functions.invoke("grade-quiz", {
      body: {
        activity_id: selectedQuiz.id,
        student_id: studentId,
        answers: quizAnswers,
        session_token: sessionToken,
        session_issued_at: sessionIssuedAt,
      },
    });

    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || error?.message || "فشل تسليم الاختبار", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setQuizResult({ score: data.score, total: data.total });
    setCompletedQuizzes(prev => new Set(prev).add(selectedQuiz.id));
    setSubmitting(false);
  }, [selectedQuiz, quizAnswers, submitting, studentId, toast]);

  const handleTimerExpire = useCallback(() => {
    toast({ title: "⏰ انتهى الوقت!", description: "تم تسليم الاختبار تلقائياً" });
    submitQuiz();
  }, [submitQuiz, toast]);

  const uploadStudentFile = async (activityId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الملف يتجاوز 5 ميجابايت", variant: "destructive" });
      return;
    }
    setUploadingFor(activityId);

    const formData = new FormData();
    formData.append("student_id", studentId);
    formData.append("activity_id", activityId);
    formData.append("class_id", classId);
    formData.append("file", file);

    const { data, error } = await supabase.functions.invoke("upload-student-file", {
      body: formData,
    });

    if (error || data?.error) {
      toast({ title: "خطأ", description: data?.error || error?.message || "فشل رفع الملف", variant: "destructive" });
      setUploadingFor(null);
      return;
    }
    toast({ title: "تم رفع الملف بنجاح" });
    setUploadingFor(null);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // Quiz view
  if (selectedQuiz) {
    return (
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-primary" />
              {selectedQuiz.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {timerActive && selectedQuiz.duration_minutes > 0 && !quizResult && (
                <CountdownTimer totalSeconds={selectedQuiz.duration_minutes * 60} onExpire={handleTimerExpire} />
              )}
              <Button variant="ghost" size="sm" onClick={() => { setSelectedQuiz(null); setQuizResult(null); setTimerActive(false); }} className="gap-1.5">
                <ArrowRight className="h-4 w-4 rotate-180" /> العودة
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {quizResult ? (
            <div className="text-center py-8 space-y-4">
              <div className={cn(
                "w-20 h-20 rounded-full mx-auto flex items-center justify-center",
                quizResult.score / quizResult.total >= 0.6 ? "bg-emerald-500/15" : "bg-rose-500/15"
              )}>
                <CheckCircle2 className={cn("h-10 w-10",
                  quizResult.score / quizResult.total >= 0.6 ? "text-emerald-500" : "text-rose-500"
                )} />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{quizResult.score}/{quizResult.total}</p>
                <p className="text-muted-foreground mt-1">{Math.round((quizResult.score / quizResult.total) * 100)}%</p>
              </div>
            </div>
          ) : (
            <>
              {selectedQuiz.questions?.map((q, qi) => (
                <div key={q.id} className="rounded-2xl border border-border/20 overflow-hidden space-y-0">
                  {(() => {
                    const qColor = q.question_type === "true_false" ? quizColors.trueFalse : quizColors.mcq;
                    const cs = colorStyles(qColor);
                    return (
                      <div className="p-4 space-y-2 border-b" style={{ ...cs.bg10, ...cs.border20 }}>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0 rounded-full text-xs font-bold"
                            style={{ ...cs.bgBorderText }}>
                            {qi + 1}
                          </Badge>
                          <div className="flex items-center gap-2 flex-1">
                            <p className="font-semibold text-foreground text-base">{q.question_text}</p>
                            <Badge variant="outline" className="shrink-0 text-[10px] rounded-full"
                              style={{ ...cs.bgBorder, ...cs.text }}>
                              {q.question_type === "true_false" ? "صح/خطأ" : "اختياري"}
                            </Badge>
                          </div>
                        </div>
                        {q.image_url && <img src={q.image_url} alt="" className="max-h-48 rounded-xl object-contain mx-auto" />}
                      </div>
                    );
                  })()}
                  <div className="p-4 space-y-2.5 bg-background">
                    {(q.options as string[]).map((opt: string, oi: number) => {
                      const isTF = q.question_type === "true_false";
                      const mcLabels = ["A", "B", "C", "D"];
                      const isSelected = quizAnswers[q.id] === oi;
                      const selCs = colorStyles(quizColors.selected);
                      return (
                        <button key={oi} onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: oi }))}
                          className={cn(
                            "w-full text-right p-3.5 rounded-xl border-2 transition-all flex items-center gap-3",
                            isSelected ? "font-medium" : "border-border/60 hover:border-primary/40 hover:bg-muted/30 text-foreground"
                          )}
                          style={isSelected ? { ...selCs.borderSolid, ...selCs.bg10, color: quizColors.selected, ...selCs.shadow } : undefined}>
                          {!isTF && (
                            <span
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 font-mono",
                                !isSelected && "bg-muted text-muted-foreground"
                              )}
                              style={isSelected ? { ...selCs.bgSolid, color: '#fff' } : undefined}>
                              {mcLabels[oi] || oi + 1}
                            </span>
                          )}
                          <span className={!isSelected ? "text-foreground" : undefined}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button onClick={submitQuiz}
                disabled={submitting || Object.keys(quizAnswers).length < (selectedQuiz.questions?.length || 0)}
                className="w-full gap-2 rounded-xl h-11">
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

  // Separate activities by type
  const quizzes = activities.filter(a => a.type === "quiz");
  const fileActivities = activities.filter(a => a.type !== "quiz");

  // Activities list - split into sections
  return (
    <div className="space-y-6">
      {/* Quizzes Section */}
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
            <ClipboardList className="h-5 w-5 text-violet-500" />
            الاختبارات
            {quizzes.length > 0 && (
              <Badge variant="outline" className="text-xs rounded-full mr-1">{quizzes.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">لا توجد اختبارات متاحة حالياً</p>
          ) : (
            <div className="space-y-3">
              {quizzes.map(activity => (
                <ActivityItem key={activity.id} activity={activity} completedQuizzes={completedQuizzes}
                  uploadingFor={uploadingFor} onOpenQuiz={openQuiz} onUpload={uploadStudentFile} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Activities Section */}
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-blue-500 to-cyan-500" />
            <FileUp className="h-5 w-5 text-blue-500" />
            الأنشطة والملفات
            {fileActivities.length > 0 && (
              <Badge variant="outline" className="text-xs rounded-full mr-1">{fileActivities.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fileActivities.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">لا توجد أنشطة متاحة حالياً</p>
          ) : (
            <div className="space-y-3">
              {fileActivities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} completedQuizzes={completedQuizzes}
                  uploadingFor={uploadingFor} onOpenQuiz={openQuiz} onUpload={uploadStudentFile} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
