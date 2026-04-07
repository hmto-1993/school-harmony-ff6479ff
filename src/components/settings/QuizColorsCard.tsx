import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { QUIZ_COLOR_OPTIONS } from "@/hooks/use-quiz-colors";

interface QuizColorsCardProps {
  quizColorMcq: string;
  setQuizColorMcq: (v: string) => void;
  quizColorTf: string;
  setQuizColorTf: (v: string) => void;
  quizColorSelected: string;
  setQuizColorSelected: (v: string) => void;
  savingQuizColors: boolean;
  setSavingQuizColors: (v: boolean) => void;
  onClose: () => void;
}

export function QuizColorsCard({
  quizColorMcq, setQuizColorMcq,
  quizColorTf, setQuizColorTf,
  quizColorSelected, setQuizColorSelected,
  savingQuizColors, setSavingQuizColors,
  onClose,
}: QuizColorsCardProps) {
  const items = [
    { label: "لون أسئلة الاختيار من متعدد", value: quizColorMcq, setter: setQuizColorMcq },
    { label: "لون أسئلة الصح والخطأ", value: quizColorTf, setter: setQuizColorTf },
    { label: "لون الإجابة المختارة", value: quizColorSelected, setter: setQuizColorSelected },
  ];

  const handleSave = async () => {
    setSavingQuizColors(true);
    const results = await Promise.all([
      supabase.from("site_settings").upsert({ id: "quiz_color_mcq", value: quizColorMcq }),
      supabase.from("site_settings").upsert({ id: "quiz_color_tf", value: quizColorTf }),
      supabase.from("site_settings").upsert({ id: "quiz_color_selected", value: quizColorSelected }),
    ]);
    setSavingQuizColors(false);
    if (results.some(r => r.error)) {
      toast({ title: "خطأ", description: "فشل حفظ ألوان الاختبارات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث ألوان الاختبارات بنجاح" });
    }
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg"><Palette className="h-5 w-5 text-primary" />ألوان الاختبارات</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8"><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.label} className="space-y-2">
              <Label className="text-sm font-semibold">{item.label}</Label>
              <div className="flex flex-wrap gap-2">
                {QUIZ_COLOR_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => item.setter(opt.value)}
                    className={cn("w-9 h-9 rounded-xl border-2 transition-all hover:scale-110",
                      item.value === opt.value ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                    )} style={{ backgroundColor: opt.value }} title={opt.label} />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: item.value }} />
                <span className="text-xs text-muted-foreground">المحدد: {QUIZ_COLOR_OPTIONS.find(o => o.value === item.value)?.label || item.value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold mb-2">معاينة:</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorMcq }}>اختياري</div>
            <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorTf }}>صح/خطأ</div>
            <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorSelected }}>الإجابة</div>
          </div>
        </div>
        <Button disabled={savingQuizColors} className="gap-1.5" onClick={handleSave}>
          <Save className="h-4 w-4" />{savingQuizColors ? "جارٍ الحفظ..." : "حفظ الألوان"}
        </Button>
      </CardContent>
    </Card>
  );
}
