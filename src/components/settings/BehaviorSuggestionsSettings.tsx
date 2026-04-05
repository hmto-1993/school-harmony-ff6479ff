import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Save, Plus, X, ThumbsUp, ThumbsDown, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_SUGGESTIONS: Record<string, string[]> = {
  positive: [
    "أظهر احتراماً للقوانين الصفية",
    "ساعد في ترتيب الفصل",
    "أظهر تعاوناً مع زملائه",
    "حافظ على الهدوء أثناء الدرس",
    "أظهر مسؤولية في أداء مهامه",
    "ساعد في حل النزاعات بين الطلاب",
    "أظهر قيادة إيجابية في المجموعة",
    "حافظ على النظام في الفصل",
  ],
  negative: [
    "أحدث ضوضاء في الفصل",
    "لم يتبع قوانين الفصل",
    "أزعج زملاءه أثناء الدرس",
    "لم يحترم دور المعلم",
    "أظهر سلوكاً غير لائق",
    "لم يشارك في أنشطة الفصل",
    "أظهر عدم احترام للآخرين",
    "أحدث فوضى في الفصل",
  ],
  neutral: [
    "أظهر سلوكاً مقبولاً في الفصل",
    "يحتاج تذكيراً ببعض القوانين",
    "أظهر تحسناً في السلوك",
    "أنجز المهام المطلوبة منه",
  ],
};

const TYPES = [
  { key: "positive", label: "إيجابي", icon: ThumbsUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20" },
  { key: "negative", label: "سلبي", icon: ThumbsDown, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", border: "border-rose-200 dark:border-rose-500/20" },
  { key: "neutral", label: "محايد", icon: Minus, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20" },
];

interface Props {
  onClose: () => void;
}

export default function BehaviorSuggestionsSettings({ onClose }: Props) {
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>(DEFAULT_SUGGESTIONS);
  const [newItems, setNewItems] = useState<Record<string, string>>({ positive: "", negative: "", neutral: "" });
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState("positive");

  useEffect(() => {
    supabase.from("site_settings").select("id, value").in("id", [
      "behavior_suggestions_positive",
      "behavior_suggestions_negative",
      "behavior_suggestions_neutral",
    ]).then(({ data }) => {
      if (data && data.length > 0) {
        const loaded = { ...DEFAULT_SUGGESTIONS };
        data.forEach((s: any) => {
          const type = s.id.replace("behavior_suggestions_", "");
          try { loaded[type] = JSON.parse(s.value); } catch {}
        });
        setSuggestions(loaded);
      }
    });
  }, []);

  const addItem = (type: string) => {
    const text = newItems[type]?.trim();
    if (!text) return;
    setSuggestions((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), text],
    }));
    setNewItems((prev) => ({ ...prev, [type]: "" }));
  };

  const removeItem = (type: string, index: number) => {
    setSuggestions((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const results = await Promise.all(
      Object.entries(suggestions).map(([type, items]) =>
        supabase.from("site_settings").upsert({
          id: `behavior_suggestions_${type}`,
          value: JSON.stringify(items),
        })
      )
    );
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast({ title: "خطأ", description: "فشل حفظ المقترحات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث مقترحات وصف السلوك" });
    }
  };

  const resetDefaults = () => {
    setSuggestions({ ...DEFAULT_SUGGESTIONS });
    toast({ title: "تمت الاستعادة", description: "تم استعادة المقترحات الافتراضية — اضغط حفظ لتأكيد التغيير" });
  };

  const currentType = TYPES.find((t) => t.key === activeType)!;

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ThumbsUp className="h-5 w-5 text-primary" />
            مقترحات وصف السلوك
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type Tabs */}
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveType(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all",
                activeType === t.key
                  ? `${t.bg} ${t.border} ${t.color}`
                  : "border-border bg-card text-muted-foreground hover:bg-muted/30"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">
                {suggestions[t.key]?.length || 0}
              </Badge>
            </button>
          ))}
        </div>

        {/* Suggestions List */}
        <div className={cn("rounded-xl border p-3 space-y-2", currentType.border, currentType.bg)}>
          {suggestions[activeType]?.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border/50">
              <span className="flex-1 text-sm">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(activeType, i)}
                className="text-destructive/60 hover:text-destructive transition-colors p-1"
                title="حذف"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {(!suggestions[activeType] || suggestions[activeType].length === 0) && (
            <p className="text-center text-xs text-muted-foreground py-4">لا توجد مقترحات لهذا النوع</p>
          )}
        </div>

        {/* Add New */}
        <div className="flex gap-2">
          <Input
            value={newItems[activeType] || ""}
            onChange={(e) => setNewItems((p) => ({ ...p, [activeType]: e.target.value }))}
            placeholder="أضف مقترح جديد..."
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addItem(activeType)}
          />
          <Button size="sm" variant="outline" onClick={() => addItem(activeType)} className="gap-1">
            <Plus className="h-4 w-4" />
            إضافة
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={resetDefaults} className="text-muted-foreground text-xs">
            استعادة الافتراضي
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ المقترحات"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
