import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, Save, ChevronDown, RotateCcw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const DEFAULT_TEMPLATES = {
  absence:
    "المكرم ولي أمر الطالب: {student_name}.. نفيدكم بأن ابننا غاب {absence_count} أيام، آخرها {last_date}. نأمل حثه على الانضباط لتفادي الحرمان. معلم المادة: {teacher_name}.",
  full_mark:
    "المكرم ولي أمر الطالب: {student_name}.. يسعدني إبلاغكم بحصول ابننا على (الدرجة الكاملة) في اختبار الفيزياء 1. نفخر بتفوقه المستمر! المعلم: {teacher_name}.",
  honor_roll:
    "بشرى سارة لولي أمر الطالب: {student_name}.. نبارك لكم دخول ابنكم (لوحة الشرف) لهذا الشهر لتحقيقه العلامة الكاملة مع انضباط تام بنسبة حضور 100%. المعلم: {teacher_name}.",
};

const TEMPLATE_INFO = {
  absence: {
    label: "إنذار غياب",
    emoji: "🔴",
    description: "يُرسل لولي الأمر عند تجاوز الطالب حد الغياب المسموح",
  },
  full_mark: {
    label: "درجة كاملة",
    emoji: "⭐",
    description: "يُرسل تهنئة عند حصول الطالب على الدرجة الكاملة في اختبار",
  },
  honor_roll: {
    label: "لوحة الشرف",
    emoji: "🏆",
    description: "يُرسل بشرى دخول الطالب لوحة الشرف الشهرية",
  },
};

const AVAILABLE_VARIABLES = [
  { key: "{student_name}", label: "اسم الطالب" },
  { key: "{teacher_name}", label: "اسم المعلم" },
  { key: "{absence_count}", label: "عدد أيام الغياب" },
  { key: "{last_date}", label: "تاريخ آخر غياب" },
  { key: "{test_name}", label: "اسم الاختبار" },
];

export default function WhatsAppTemplatesSettings() {
  const [templates, setTemplates] = useState({
    absence: "",
    full_mark: "",
    honor_roll: "",
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["whatsapp_template_absence", "whatsapp_template_full_mark", "whatsapp_template_honor_roll"]);

      const loaded = { ...DEFAULT_TEMPLATES };
      if (data) {
        data.forEach((s) => {
          const key = s.id.replace("whatsapp_template_", "") as keyof typeof loaded;
          if (s.value) loaded[key] = s.value;
        });
      }
      setTemplates(loaded);
      setLoaded(true);
    };

    fetchTemplates();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { id: "whatsapp_template_absence", value: templates.absence },
        { id: "whatsapp_template_full_mark", value: templates.full_mark },
        { id: "whatsapp_template_honor_roll", value: templates.honor_roll },
      ];

      for (const update of updates) {
        await supabase.from("site_settings").upsert(update);
      }

      toast({ title: "تم الحفظ", description: "تم حفظ قوالب الرسائل بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleReset = (key: keyof typeof templates) => {
    setTemplates((prev) => ({ ...prev, [key]: DEFAULT_TEMPLATES[key] }));
  };

  if (!loaded) return null;

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20 text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">قوالب رسائل واتساب</h3>
                <p className="text-xs text-muted-foreground">تخصيص نصوص الرسائل المرسلة لأولياء الأمور</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-6">
            {/* Variables Reference */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">المتغيرات المتاحة</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Badge key={v.key} variant="outline" className="text-xs font-mono">
                    {v.key} = {v.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Templates */}
            {(Object.keys(TEMPLATE_INFO) as (keyof typeof TEMPLATE_INFO)[]).map((key) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <span>{TEMPLATE_INFO[key].emoji}</span>
                    {TEMPLATE_INFO[key].label}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => handleReset(key)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    استعادة الافتراضي
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{TEMPLATE_INFO[key].description}</p>
                <Textarea
                  value={templates[key]}
                  onChange={(e) => setTemplates((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={3}
                  className="resize-none text-sm"
                  dir="rtl"
                />
              </div>
            ))}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ القوالب"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
