import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  BookOpen, ChevronLeft, Plus, Trash2, Edit2, FileUp, Loader2,
  HelpCircle, Check, X, ArrowRight, GraduationCap, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuestionBank, type QBQuestion } from "@/hooks/useQuestionBank";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function QuestionBankTab() {
  const { toast } = useToast();
  const bank = useQuestionBank();
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [editingChapter, setEditingChapter] = useState<{ id: string; title: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ id: string; title: string } | null>(null);
  const [addQuestionOpen, setAddQuestionOpen] = useState(false);
  const [newQ, setNewQ] = useState({ type: "mcq" as "mcq" | "truefalse", text: "", options: ["", "", "", ""], correctIndex: 0, score: 1 });
  const [pdfImporting, setPdfImporting] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<Omit<QBQuestion, "id" | "lesson_id" | "created_by" | "created_at">[] | null>(null);

  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) return;
    bank.addChapter(newChapterTitle.trim());
    setNewChapterTitle("");
  };

  const handleAddLesson = () => {
    if (!newLessonTitle.trim() || !bank.selectedChapterId) return;
    bank.addLesson(bank.selectedChapterId, newLessonTitle.trim());
    setNewLessonTitle("");
  };

  const handleAddQuestion = () => {
    if (!newQ.text.trim() || !bank.selectedLessonId) return;
    const opts = newQ.type === "truefalse" ? ["صح", "خطأ"] : newQ.options;
    bank.addQuestion(bank.selectedLessonId, {
      question_text: newQ.text, question_type: newQ.type,
      options: opts, correct_index: newQ.correctIndex,
      score: newQ.score, enabled: true,
    });
    setNewQ({ type: "mcq", text: "", options: ["", "", "", ""], correctIndex: 0, score: 1 });
    setAddQuestionOpen(false);
  };

  const handlePdfImport = async (file: File) => {
    if (!bank.selectedLessonId) return;
    setPdfImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-pdf-questions`,
        {
          method: "POST",
          body: formData,
          headers: { Authorization: `Bearer ${session?.access_token}` },
        }
      );
      if (!resp.ok) throw new Error("فشل تحليل الملف");
      const result = await resp.json();
      if (result.questions && result.questions.length > 0) {
        setReviewQuestions(result.questions);
        toast({ title: "تم التحليل", description: `تم استخراج ${result.questions.length} سؤال للمراجعة` });
      } else {
        toast({ title: "لم يتم العثور على أسئلة", description: "لم يتمكن النظام من استخراج أسئلة من هذا الملف", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل استيراد PDF", variant: "destructive" });
    } finally {
      setPdfImporting(false);
    }
  };

  const handleApproveImport = () => {
    if (!reviewQuestions || !bank.selectedLessonId) return;
    const enabled = reviewQuestions.filter(q => q.enabled);
    bank.addQuestionsBatch(bank.selectedLessonId, enabled);
    setReviewQuestions(null);
  };

  const selectedChapter = bank.chapters.find(c => c.id === bank.selectedChapterId);
  const selectedLesson = bank.lessons.find(l => l.id === bank.selectedLessonId);

  // ── Breadcrumb navigation ──
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <button onClick={() => { bank.setSelectedChapterId(null); bank.setSelectedLessonId(null); }}
        className="text-primary hover:underline font-bold">بنك الأسئلة</button>
      {selectedChapter && (
        <>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
          <button onClick={() => bank.setSelectedLessonId(null)}
            className={cn("font-bold", selectedLesson ? "text-primary hover:underline" : "text-foreground")}>
            {selectedChapter.title}
          </button>
        </>
      )}
      {selectedLesson && (
        <>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rotate-180" />
          <span className="font-bold text-foreground">{selectedLesson.title}</span>
        </>
      )}
    </div>
  );

  // ── Chapters List ──
  if (!bank.selectedChapterId) {
    return (
      <div className="space-y-4" dir="rtl">
        {renderBreadcrumb()}
        <div className="flex items-center gap-2">
          <Input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)}
            placeholder="عنوان الفصل الجديد" className="flex-1 rounded-xl"
            onKeyDown={e => e.key === "Enter" && handleAddChapter()} />
          <Button onClick={handleAddChapter} disabled={!newChapterTitle.trim()} size="sm" className="gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" />إضافة فصل
          </Button>
        </div>
        {bank.loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : bank.chapters.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
              <BookOpen className="h-14 w-14 text-muted-foreground/30" />
              <p className="text-muted-foreground">لا توجد فصول بعد</p>
              <p className="text-xs text-muted-foreground/60">أضف فصلاً تعليمياً لبدء بناء بنك الأسئلة</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bank.chapters.map((ch, i) => (
              <Card key={ch.id} className="group cursor-pointer hover:shadow-lg transition-all duration-300 rounded-2xl border-primary/20 hover:border-primary/40 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10"
                onClick={() => { if (!editingChapter) bank.setSelectedChapterId(ch.id); }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingChapter?.id === ch.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input value={editingChapter.title} onChange={e => setEditingChapter({ ...editingChapter, title: e.target.value })}
                          className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === "Enter") { bank.updateChapter(ch.id, editingChapter.title); setEditingChapter(null); } }} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { bank.updateChapter(ch.id, editingChapter.title); setEditingChapter(null); }}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingChapter(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <h4 className="font-bold text-foreground text-sm truncate">{ch.title}</h4>
                    )}
                    <p className="text-[11px] text-muted-foreground">فصل {i + 1}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingChapter({ id: ch.id, title: ch.title })}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => bank.deleteChapter(ch.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground/40" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Lessons List ──
  if (!bank.selectedLessonId) {
    return (
      <div className="space-y-4" dir="rtl">
        {renderBreadcrumb()}
        <div className="flex items-center gap-2">
          <Input value={newLessonTitle} onChange={e => setNewLessonTitle(e.target.value)}
            placeholder="عنوان الدرس الجديد" className="flex-1 rounded-xl"
            onKeyDown={e => e.key === "Enter" && handleAddLesson()} />
          <Button onClick={handleAddLesson} disabled={!newLessonTitle.trim()} size="sm" className="gap-1.5 rounded-xl">
            <Plus className="h-4 w-4" />إضافة درس
          </Button>
        </div>
        {bank.lessons.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
              <Brain className="h-14 w-14 text-muted-foreground/30" />
              <p className="text-muted-foreground">لا توجد دروس في هذا الفصل</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bank.lessons.map((ls, i) => (
              <Card key={ls.id} className="group cursor-pointer hover:shadow-lg transition-all duration-300 rounded-2xl border-amber-500/20 hover:border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-500/10"
                onClick={() => { if (!editingLesson) bank.setSelectedLessonId(ls.id); }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingLesson?.id === ls.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input value={editingLesson.title} onChange={e => setEditingLesson({ ...editingLesson, title: e.target.value })}
                          className="h-7 text-sm" autoFocus onKeyDown={e => { if (e.key === "Enter") { bank.updateLesson(ls.id, editingLesson.title); setEditingLesson(null); } }} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { bank.updateLesson(ls.id, editingLesson.title); setEditingLesson(null); }}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingLesson(null)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    ) : (
                      <h4 className="font-bold text-foreground text-sm truncate">{ls.title}</h4>
                    )}
                    <p className="text-[11px] text-muted-foreground">الدرس {i + 1}</p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingLesson({ id: ls.id, title: ls.title })}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => bank.deleteLesson(ls.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground/40" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Questions List ──
  return (
    <div className="space-y-4" dir="rtl">
      {renderBreadcrumb()}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setAddQuestionOpen(true)} size="sm" className="gap-1.5 rounded-xl">
          <Plus className="h-4 w-4" />إضافة سؤال
        </Button>
        <label className="cursor-pointer">
          <input type="file" accept=".pdf" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (f) handlePdfImport(f);
            e.target.value = "";
          }} />
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl pointer-events-none" asChild>
            <span>{pdfImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}استيراد من PDF</span>
          </Button>
        </label>
      </div>

      {/* Review imported questions */}
      {reviewQuestions && (
        <Card className="border-2 border-primary/30 shadow-lg">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              مراجعة الأسئلة المستخرجة ({reviewQuestions.length} سؤال)
            </h4>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {reviewQuestions.map((q, i) => (
                <div key={i} className={cn("rounded-xl border p-3 space-y-2 transition-all", q.enabled ? "border-border" : "border-border/40 opacity-50")}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">#{i + 1} - {q.question_type === "mcq" ? "اختيار متعدد" : "صح/خطأ"}</span>
                    <Switch checked={q.enabled} onCheckedChange={v => {
                      setReviewQuestions(prev => prev!.map((rq, ri) => ri === i ? { ...rq, enabled: v } : rq));
                    }} />
                  </div>
                  <p className="text-sm font-bold">{q.question_text}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(q.options as string[]).map((opt, oi) => (
                      <span key={oi} className={cn("px-2 py-0.5 rounded-lg text-xs font-medium border",
                        oi === q.correct_index ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "bg-muted border-border")}>
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApproveImport} size="sm" className="gap-1.5">
                <Check className="h-4 w-4" />اعتماد الأسئلة المفعّلة
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setReviewQuestions(null)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {bank.questions.length === 0 && !reviewQuestions ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <HelpCircle className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-muted-foreground">لا توجد أسئلة في هذا الدرس</p>
            <p className="text-xs text-muted-foreground/60">أضف أسئلة يدوياً أو استوردها من ملف PDF</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {bank.questions.map((q, i) => (
            <div key={q.id} className={cn("rounded-xl border p-3 transition-all",
              q.enabled ? "border-border bg-card" : "border-border/40 bg-muted/30 opacity-60")}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                    {q.question_type === "mcq" ? "اختيار متعدد" : "صح/خطأ"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {q.score} درجة
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={q.enabled} onCheckedChange={v => bank.updateQuestion(q.id, { enabled: v })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => bank.deleteQuestion(q.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm font-bold mb-2">{q.question_text}</p>
              <div className="flex flex-wrap gap-1.5">
                {(q.options as string[]).map((opt, oi) => (
                  <span key={oi} className={cn("px-2 py-0.5 rounded-lg text-xs font-medium border",
                    oi === q.correct_index ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "bg-muted border-border")}>
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Question Dialog */}
      <Dialog open={addQuestionOpen} onOpenChange={setAddQuestionOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>إضافة سؤال جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>نوع السؤال</Label>
              <Select value={newQ.type} onValueChange={v => {
                const type = v as "mcq" | "truefalse";
                setNewQ(prev => ({ ...prev, type, options: type === "truefalse" ? ["صح", "خطأ"] : ["", "", "", ""], correctIndex: 0 }));
              }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">اختيار من متعدد</SelectItem>
                  <SelectItem value="truefalse">صح أو خطأ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>نص السؤال</Label>
              <Input value={newQ.text} onChange={e => setNewQ(prev => ({ ...prev, text: e.target.value }))} placeholder="اكتب السؤال هنا" className="mt-1" />
            </div>
            <div>
              <Label>الدرجة</Label>
              <Input type="number" min={1} max={10} value={newQ.score} onChange={e => setNewQ(prev => ({ ...prev, score: Number(e.target.value) || 1 }))} className="mt-1 w-20" />
            </div>
            <div className="space-y-2">
              <Label>الخيارات (اضغط على الإجابة الصحيحة)</Label>
              {newQ.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setNewQ(prev => ({ ...prev, correctIndex: i }))}
                    className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border-2 text-xs font-black transition-all",
                      newQ.correctIndex === i ? "bg-emerald-500/20 border-emerald-500 text-emerald-600" : "bg-muted border-border text-muted-foreground hover:border-primary/40")}>
                    {newQ.correctIndex === i ? "✓" : String.fromCharCode(1571 + i)}
                  </button>
                  {newQ.type === "mcq" ? (
                    <Input value={opt} onChange={e => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ(prev => ({ ...prev, options: opts }));
                    }} placeholder={`الخيار ${i + 1}`} className="flex-1" />
                  ) : (
                    <span className="text-sm font-bold">{opt}</span>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={handleAddQuestion} disabled={!newQ.text.trim()} className="w-full">إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
