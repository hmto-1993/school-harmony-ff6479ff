import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Save, Wand2 } from "lucide-react";
import type { GradeCategory } from "./CategoryTable";

interface Props {
  groupKey: string;        // 'classwork' | 'exam'
  groupLabel: string;
  categories: GradeCategory[]; // categories of this group (filtered)
  classFilter: string;     // 'all' | classId | 'orphaned'
  isAdmin: boolean;
  onApplied: () => void;   // refresh parent data
  colorScheme: "emerald" | "amber";
}

export default function GroupCapEditor({ groupKey, groupLabel, categories, classFilter, isAdmin, onApplied, colorScheme }: Props) {
  const { toast } = useToast();
  const [maxTotal, setMaxTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = colorScheme === "emerald"
    ? "border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-900/10"
    : "border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-900/10";

  // Compute current sum of category max scores in this group
  const currentSum = categories.reduce((acc, c) => acc + Number(c.max_score || 0), 0);

  // Load saved cap (only meaningful for a specific class)
  useEffect(() => {
    if (classFilter === "all" || classFilter === "orphaned") {
      setMaxTotal(currentSum);
      return;
    }
    setLoading(true);
    supabase
      .from("category_group_caps" as any)
      .select("max_total")
      .eq("class_id", classFilter)
      .eq("category_group", groupKey)
      .maybeSingle()
      .then(({ data }: any) => {
        setMaxTotal(data?.max_total ?? currentSum);
        setLoading(false);
      });
  }, [classFilter, groupKey, currentSum]);

  const distributeEvenly = () => {
    if (categories.length === 0) return;
    const per = Math.floor((maxTotal / categories.length) * 100) / 100;
    const remainder = Math.round((maxTotal - per * categories.length) * 100) / 100;
    const updates = categories.map((c, i) => ({
      id: c.id,
      max_score: i === 0 ? per + remainder : per,
    }));
    return updates;
  };

  const handleApply = async () => {
    if (classFilter === "all" || classFilter === "orphaned") {
      toast({ title: "اختر فصلاً محدداً", description: "يجب اختيار فصل محدد لتطبيق التوزيع", variant: "destructive" });
      return;
    }
    if (categories.length === 0) {
      toast({ title: "لا توجد فئات في هذا النوع", variant: "destructive" });
      return;
    }
    if (maxTotal <= 0) {
      toast({ title: "أدخل درجة كلية صحيحة", variant: "destructive" });
      return;
    }

    setSaving(true);
    const updates = distributeEvenly() || [];

    // 1) Save the cap
    await supabase.from("category_group_caps" as any).upsert(
      { class_id: classFilter, category_group: groupKey, max_total: maxTotal },
      { onConflict: "class_id,category_group" }
    );

    // 2) Distribute evenly across sub-categories
    await Promise.all(
      updates.map(u =>
        supabase.from("grade_categories").update({ max_score: u.max_score }).eq("id", u.id)
      )
    );

    setSaving(false);
    toast({
      title: "تم التطبيق",
      description: `تم توزيع ${maxTotal} درجة على ${categories.length} فئة (${(maxTotal / categories.length).toFixed(2)} لكل فئة)`,
    });
    onApplied();
  };

  if (!isAdmin) return null;

  return (
    <div className={`rounded-lg border-2 ${colors} p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-primary" />
        <Label className="text-sm font-bold">الدرجة الكلية لنوع "{groupLabel}"</Label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        أدخل الدرجة الكلية للنوع الرئيسي وسيتم توزيعها بالتساوي على {categories.length} فئة فرعية. يمكنك تعديل كل فئة يدوياً بعد التوزيع.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs whitespace-nowrap">الإجمالي:</Label>
          <Input
            type="number"
            min={0}
            value={maxTotal}
            onChange={(e) => setMaxTotal(parseFloat(e.target.value) || 0)}
            className="h-8 w-24"
            disabled={loading}
          />
        </div>
        <span className="text-[11px] text-muted-foreground">
          (المجموع الحالي: <strong>{currentSum}</strong>)
        </span>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={saving || classFilter === "all" || classFilter === "orphaned" || categories.length === 0}
          className="gap-1.5 h-8"
        >
          {saving ? <Save className="h-3.5 w-3.5 animate-pulse" /> : <Wand2 className="h-3.5 w-3.5" />}
          توزيع تلقائي وحفظ
        </Button>
        {(classFilter === "all" || classFilter === "orphaned") && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400">⚠ اختر فصلاً محدداً للتفعيل</span>
        )}
      </div>
    </div>
  );
}
