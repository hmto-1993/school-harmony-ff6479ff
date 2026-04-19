import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import type { GradeCategory } from "./CategoryTable";

interface Props {
  groupKey: string;        // 'classwork' | 'exam'
  groupLabel: string;
  categories: GradeCategory[]; // categories of this group (filtered) — used only to seed default value
  classFilter: string;     // 'all' | classId | 'orphaned'
  isAdmin: boolean;
  onApplied: () => void;   // refresh parent data
  classes?: { id: string; name: string }[]; // needed when classFilter === 'all'
}

/**
 * Inline editor for a group's total score (e.g., "المهام = 40").
 * - Saves the cap to category_group_caps without redistributing sub-category scores.
 * - When classFilter === 'all', applies the same cap to every class at once.
 */
export default function GroupCapEditor({ groupKey, groupLabel, categories, classFilter, isAdmin, onApplied, classes = [] }: Props) {
  const { toast } = useToast();
  const [maxTotal, setMaxTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentSum = categories.reduce((acc, c) => acc + Number(c.max_score || 0), 0);

  useEffect(() => {
    if (classFilter === "orphaned") {
      setMaxTotal(currentSum);
      return;
    }
    setLoading(true);
    const query = classFilter === "all"
      ? supabase.from("category_group_caps" as any).select("max_total").is("class_id", null).eq("category_group", groupKey).maybeSingle()
      : supabase.from("category_group_caps" as any).select("max_total").eq("class_id", classFilter).eq("category_group", groupKey).maybeSingle();

    query.then(({ data }: any) => {
      setMaxTotal(data?.max_total ?? currentSum);
      setLoading(false);
    });
  }, [classFilter, groupKey, currentSum]);

  const handleSave = async () => {
    if (classFilter === "orphaned") {
      toast({ title: "اختر فصلاً أو 'جميع الفصول'", variant: "destructive" });
      return;
    }
    if (maxTotal < 0) {
      toast({ title: "أدخل درجة صحيحة", variant: "destructive" });
      return;
    }

    setSaving(true);

    if (classFilter === "all") {
      // Apply to every class + a global (null) record as the default
      const rows = [
        { class_id: null, category_group: groupKey, max_total: maxTotal },
        ...classes.map(c => ({ class_id: c.id, category_group: groupKey, max_total: maxTotal })),
      ];
      await supabase.from("category_group_caps" as any).upsert(rows, { onConflict: "class_id,category_group" });
      toast({ title: "تم الحفظ", description: `تم تطبيق ${maxTotal} درجة على جميع الفصول لـ "${groupLabel}"` });
    } else {
      await supabase.from("category_group_caps" as any).upsert(
        { class_id: classFilter, category_group: groupKey, max_total: maxTotal },
        { onConflict: "class_id,category_group" }
      );
      toast({ title: "تم الحفظ", description: `${groupLabel}: ${maxTotal} درجة` });
    }

    setSaving(false);
    // Preserve scroll position across the parent re-fetch/re-render
    const scrollY = window.scrollY;
    onApplied();
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "auto" });
      setTimeout(() => window.scrollTo({ top: scrollY, behavior: "auto" }), 50);
    });
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Input
        type="number"
        min={0}
        value={maxTotal}
        onChange={(e) => setMaxTotal(parseFloat(e.target.value) || 0)}
        className="h-8 w-20 text-center font-bold"
        disabled={loading}
        title={`الدرجة الكلية لـ "${groupLabel}"`}
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || classFilter === "orphaned"}
        className="gap-1.5 h-8"
      >
        <Save className={`h-3.5 w-3.5 ${saving ? "animate-pulse" : ""}`} />
        حفظ
      </Button>
      <span className="text-[11px] text-muted-foreground">
        (المجموع الفعلي للفئات: <strong>{currentSum}</strong>)
      </span>
    </div>
  );
}
