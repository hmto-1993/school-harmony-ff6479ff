/**
 * QuizColorSettings — تخصيص ألوان الاختبارات التفاعلية
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { QUIZ_COLOR_OPTIONS } from "@/hooks/use-quiz-colors";

interface Props {
  onClose: () => void;
}

export default function QuizColorSettings({ onClose }: Props) {
  const [quizColorMcq, setQuizColorMcq] = useState("#0ea5e9");
  const [quizColorTf, setQuizColorTf] = useState("#f59e0b");
  const [quizColorSelected, setQuizColorSelected] = useState("#14b8a6");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["quiz_color_mcq", "quiz_color_tf", "quiz_color_selected"])
      .then(({ data }) => {
        (data || []).forEach((s) => {
          if (s.id === "quiz_color_mcq" && s.value) setQuizColorMcq(s.value);
          if (s.id === "quiz_color_tf" && s.value) setQuizColorTf(s.value);
          if (s.id === "quiz_color_selected" && s.value) setQuizColorSelected(s.value);
        });
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const results = await Promise.all([
      supabase.from("site_settings").upsert({ id: "quiz_color_mcq", value: quizColorMcq }),
      supabase.from("site_settings").upsert({ id: "quiz_color_tf", value: quizColorTf }),
      supabase.from("site_settings").upsert({ id: "quiz_color_selected", value: quizColorSelected }),
    ]);
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast({ title: "خطأ", description: "فشل حفظ ألوان الاختبارات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث ألوان الاختبارات بنجاح" });
    }
  };

  const colorSections = [
    { label: "لون أسئلة الاختيار من متعدد", value: quizColorMcq, setter: setQuizColorMcq },
    { label: "لون أسئلة الصح والخطأ", value: quizColorTf, setter: setQuizColorTf },
    { label: "لون الإجابة المختارة", value: quizColorSelected, setter: setQuizColorSelected },
  ];

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            ألوان الاختبارات
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {colorSections.map((section) => (
            <div key={section.label} className="space-y-2">
              <Label className="text-sm font-semibold">{section.label}</Label>
              <div className="flex flex-wrap gap-2">
                {QUIZ_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => section.setter(opt.value)}
                    className={cn(
                      "w-9 h-9 rounded-xl border-2 transition-all hover:scale-110",
                      section.value === opt.value ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                    )}
                    style={{ backgroundColor: opt.value }}
                    title={opt.label}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: section.value }} />
                <span className="text-xs text-muted-foreground">
                  المحدد: {QUIZ_COLOR_OPTIONS.find((o) => o.value === section.value)?.label || section.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* معاينة */}
        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold mb-2">معاينة:</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorMcq }}>اختياري</div>
            <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorTf }}>صح/خطأ</div>
            <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: quizColorSelected }}>الإجابة</div>
          </div>
        </div>

        <Button disabled={saving} className="gap-1.5" onClick={handleSave}>
          <Save className="h-4 w-4" />
          {saving ? "جارٍ الحفظ..." : "حفظ الألوان"}
        </Button>
      </CardContent>
    </Card>
  );
}
