import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ImagePlus, GripVertical, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuizQuestion {
  id?: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false";
  image_url?: string | null;
  options: string[];
  correct_answer: number;
  sort_order: number;
}

interface QuizBuilderProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}

export default function QuizBuilder({ questions, onChange }: QuizBuilderProps) {
  const [uploading, setUploading] = useState<number | null>(null);

  const addQuestion = (type: "multiple_choice" | "true_false") => {
    const newQ: QuizQuestion = {
      question_text: "",
      question_type: type,
      options: type === "true_false" ? ["صح", "خطأ"] : ["", "", "", ""],
      correct_answer: 0,
      sort_order: questions.length,
    };
    onChange([...questions, newQ]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    const opts = [...updated[qIndex].options];
    opts[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    onChange(updated);
  };

  const handleImageUpload = async (qIndex: number, file: File) => {
    setUploading(qIndex);
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const safeName = `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const { error } = await supabase.storage.from("activities").upload(`quiz-images/${safeName}`, file);
    if (!error) {
      // Store path for private bucket — signed URLs generated on demand
      updateQuestion(qIndex, { image_url: `quiz-images/${safeName}` });
    }
    setUploading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion("multiple_choice")} className="gap-1.5 rounded-xl">
          <Plus className="h-4 w-4" /> اختيار متعدد
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => addQuestion("true_false")} className="gap-1.5 rounded-xl">
          <Plus className="h-4 w-4" /> صح / خطأ
        </Button>
      </div>

      {questions.length === 0 && (
        <p className="text-center text-muted-foreground py-6 text-sm">أضف أسئلة للاختبار</p>
      )}

      {questions.map((q, qi) => (
        <Card key={qi} className="border-border/40 rounded-2xl overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span className="font-bold text-foreground">س{qi + 1}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {q.question_type === "true_false" ? "صح/خطأ" : "اختيار متعدد"}
                </span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeQuestion(qi)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Input
              placeholder="نص السؤال..."
              value={q.question_text}
              onChange={e => updateQuestion(qi, { question_text: e.target.value })}
              className="rounded-xl"
            />

            {/* Image upload */}
            <div className="flex items-center gap-2">
              {q.image_url && (
                <SignedImage bucket="activities" path={q.image_url} className="h-16 w-16 rounded-xl object-cover border border-border/30" />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(qi, e.target.files[0])}
                />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-xl border border-dashed border-border/40 hover:border-primary/40">
                  <ImagePlus className="h-4 w-4" />
                  {uploading === qi ? "جاري الرفع..." : "إرفاق صورة"}
                </div>
              </label>
              {q.image_url && (
                <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => updateQuestion(qi, { image_url: null })}>
                  إزالة
                </Button>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">الخيارات (انقر لتحديد الإجابة الصحيحة)</Label>
              {q.options.map((opt, oi) => (
                <div
                  key={oi}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer",
                    q.correct_answer === oi
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/30 hover:border-primary/30"
                  )}
                  onClick={() => updateQuestion(qi, { correct_answer: oi })}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    q.correct_answer === oi
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {q.correct_answer === oi ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs">{oi + 1}</span>}
                  </div>
                  {q.question_type === "true_false" ? (
                    <span className="text-sm font-medium">{opt}</span>
                  ) : (
                    <Input
                      placeholder={`الخيار ${oi + 1}`}
                      value={opt}
                      onChange={e => { e.stopPropagation(); updateOption(qi, oi, e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
