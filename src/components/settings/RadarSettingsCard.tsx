import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Radar, Save, X, Plus, Trash2, HelpCircle, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { type RadarQuestion, loadQuestions, saveQuestions, createEmptyQuestion } from "@/components/grades/radar-quiz-types";

interface RadarSettingsCardProps {
  onClose: () => void;
}

export default function RadarSettingsCard({ onClose }: RadarSettingsCardProps) {
  const [speed, setSpeed] = useState<"fast" | "medium" | "slow">("medium");
  const [sessionMemory, setSessionMemory] = useState(true);
  const [visualEffect, setVisualEffect] = useState<"radar" | "slots" | "spotlight">("radar");
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [surpriseMode, setSurpriseMode] = useState(false);
  const [quizDuration, setQuizDuration] = useState(20);
  const [questionSource, setQuestionSource] = useState<"local" | "bank">("local");
  const [saving, setSaving] = useState(false);

  // Quiz questions
  const [questions, setQuestions] = useState<RadarQuestion[]>([]);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["radar_speed", "radar_session_memory", "radar_visual_effect", "radar_quiz_enabled", "radar_surprise_mode", "radar_quiz_duration", "radar_question_source"])
      .then(({ data }) => {
        (data || []).forEach((s: any) => {
          if (s.id === "radar_speed") setSpeed(s.value as any);
          if (s.id === "radar_session_memory") setSessionMemory(s.value !== "false");
          if (s.id === "radar_visual_effect") setVisualEffect(s.value as any);
          if (s.id === "radar_quiz_enabled") setQuizEnabled(s.value === "true");
          if (s.id === "radar_surprise_mode") setSurpriseMode(s.value === "true");
          if (s.id === "radar_quiz_duration") setQuizDuration(Number(s.value) || 20);
          if (s.id === "radar_question_source") setQuestionSource(s.value === "bank" ? "bank" : "local");
        });
      });
    setQuestions(loadQuestions());
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("site_settings").upsert([
      { id: "radar_speed", value: speed },
      { id: "radar_session_memory", value: String(sessionMemory) },
      { id: "radar_visual_effect", value: visualEffect },
      { id: "radar_quiz_enabled", value: String(quizEnabled) },
      { id: "radar_surprise_mode", value: String(surpriseMode) },
      { id: "radar_quiz_duration", value: String(quizDuration) },
      { id: "radar_question_source", value: questionSource },
    ]);
    saveQuestions(questions);
    setSaving(false);
    toast({ title: "تم الحفظ", description: "تم حفظ اعدادات الرادار والاسئلة بنجاح" });
  };

  const addQuestion = (type: "mcq" | "truefalse") => {
    setQuestions((prev) => [...prev, createEmptyQuestion(type)]);
  };

  const updateQuestion = useCallback((id: string, updates: Partial<RadarQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  }, []);

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateOption = (qId: string, optIdx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = value;
        return { ...q, options: newOpts };
      })
    );
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radar className="h-5 w-5 text-primary" />
            اعدادات الرادار الذكي
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Speed */}
        <div className="space-y-2">
          <Label className="text-sm font-bold">سرعة دوران الرادار</Label>
          <Select value={speed} onValueChange={(v) => setSpeed(v as any)}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">سريع</SelectItem>
              <SelectItem value="medium">متوسط</SelectItem>
              <SelectItem value="slow">بطيء</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Memory */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold">ذاكرة الحصة</Label>
            <p className="text-xs text-muted-foreground mt-0.5">عدم تكرار اختيار الطالب خلال نفس الحصة</p>
          </div>
          <Switch checked={sessionMemory} onCheckedChange={setSessionMemory} />
        </div>

        {/* Visual Effect */}
        <div className="space-y-2">
          <Label className="text-sm font-bold">التاثير البصري</Label>
          <Select value={visualEffect} onValueChange={(v) => setVisualEffect(v as any)}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="radar">رادار دائري</SelectItem>
              <SelectItem value="slots">بطاقات متحركة</SelectItem>
              <SelectItem value="spotlight">تسليط الضوء</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Divider */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
            <HelpCircle className="h-4 w-4 text-primary" />
            نظام الاسئلة التفاعلية
          </h4>

          {/* Quiz Enabled */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <Label className="text-sm font-bold">تفعيل الاسئلة</Label>
              <p className="text-xs text-muted-foreground mt-0.5">اظهار خيار طرح سؤال مبرمج عند اختيار الطالب</p>
            </div>
            <Switch checked={quizEnabled} onCheckedChange={setQuizEnabled} />
          </div>

          {/* Surprise Mode */}
          {quizEnabled && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-sm font-bold">وضع الاختبار المفاجئ</Label>
                <p className="text-xs text-muted-foreground mt-0.5">فتح سؤال تلقائيا عند توقف الرادار</p>
              </div>
              <Switch checked={surpriseMode} onCheckedChange={setSurpriseMode} />
            </div>
          )}

          {/* Quiz Duration */}
          {quizEnabled && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-bold">مدة السؤال بالثواني</Label>
                </div>
                <span className="text-sm font-black text-primary tabular-nums">{quizDuration} ثانية</span>
              </div>
              <Slider
                min={5}
                max={60}
                step={5}
                value={[quizDuration]}
                onValueChange={([v]) => setQuizDuration(v)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">يمكن تغييرها سريعا من داخل قسم تفاعل اليوم قبل تشغيل الرادار</p>
            </div>
          )}

          {quizEnabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setShowEditor(!showEditor)}
                >
                  {showEditor ? "اخفاء المحرر" : `محرر الاسئلة (${questions.length})`}
                </Button>
                {showEditor && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => addQuestion("mcq")}>
                      <Plus className="h-3 w-3" />اختيار متعدد
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => addQuestion("truefalse")}>
                      <Plus className="h-3 w-3" />صح/خطا
                    </Button>
                  </div>
                )}
              </div>

              {showEditor && (
                <div className="space-y-4 max-h-[400px] overflow-auto">
                  {questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">لا توجد اسئلة - اضف سؤالا جديدا</p>
                  )}
                  {questions.map((q, qi) => (
                    <div
                      key={q.id}
                      className={cn(
                        "rounded-xl border p-3 space-y-2.5 transition-all",
                        q.enabled ? "border-border bg-card" : "border-border/40 bg-muted/30 opacity-60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">#{qi + 1}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                            {q.type === "mcq" ? "اختيار متعدد" : "صح/خطا"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={q.enabled}
                            onCheckedChange={(v) => updateQuestion(q.id, { enabled: v })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeQuestion(q.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Question text */}
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                        placeholder="نص السؤال"
                        className="text-sm"
                      />

                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold whitespace-nowrap">الدرجة:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={q.score}
                          onChange={(e) => updateQuestion(q.id, { score: Number(e.target.value) || 1 })}
                          className="w-16 h-7 text-xs text-center"
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">الخيارات (اضغط على الاجابة الصحيحة):</Label>
                        <div className={cn("grid gap-1.5", q.type === "truefalse" ? "grid-cols-2" : "grid-cols-1")}>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateQuestion(q.id, { correctIndex: oi })}
                                className={cn(
                                  "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all border-2 text-xs font-black",
                                  q.correctIndex === oi
                                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                    : "bg-muted border-border text-muted-foreground hover:border-primary/40"
                                )}
                                title="تحديد كاجابة صحيحة"
                              >
                                {q.correctIndex === oi ? "✓" : String.fromCharCode(1571 + oi)}
                              </button>
                              {q.type === "mcq" ? (
                                <Input
                                  value={opt}
                                  onChange={(e) => updateOption(q.id, oi, e.target.value)}
                                  placeholder={`الخيار ${oi + 1}`}
                                  className="h-7 text-xs flex-1"
                                />
                              ) : (
                                <span className="text-sm font-bold">{opt}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-1.5 w-full">
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ جميع الاعدادات"}
        </Button>
      </CardContent>
    </Card>
  );
}
