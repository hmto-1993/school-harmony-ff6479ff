import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { AlertTriangle, Calendar, FileX, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName: string;
  /** When provided, restricts results to a single category (the column the user clicked). null/undefined = all violations */
  categoryId?: string | null;
  categoryName?: string;
  period: number;
}

interface ViolationRow {
  id: string;
  date: string;
  score: number;
  note: string | null;
  category_id: string;
  category_name: string;
}

const ViolationHistoryDialog = React.forwardRef<HTMLDivElement, Props>(function ViolationHistoryDialog({
  open, onOpenChange, studentId, studentName, categoryId, categoryName, period,
}, _ref) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ViolationRow[]>([]);

  useEffect(() => {
    if (!open || !studentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fetch all deduction categories first to filter properly
      const { data: cats } = await supabase
        .from("grade_categories")
        .select("id, name, is_deduction")
        .eq("is_deduction", true);
      const dedIds = (cats || []).map((c: any) => c.id);
      const catNameMap = new Map<string, string>((cats || []).map((c: any) => [c.id, c.name]));

      let query = supabase
        .from("grades")
        .select("id, date, score, note, category_id")
        .eq("student_id", studentId)
        .eq("period", period)
        .not("score", "is", null)
        .order("date", { ascending: false });

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      } else if (dedIds.length > 0) {
        query = query.in("category_id", dedIds);
      }

      const { data } = await query;
      if (cancelled) return;

      const mapped: ViolationRow[] = (data || [])
        .filter((g: any) => Number(g.score) > 0)
        .map((g: any) => ({
          id: g.id,
          date: g.date,
          score: Number(g.score),
          note: g.note,
          category_id: g.category_id,
          category_name: catNameMap.get(g.category_id) || "—",
        }));
      setRows(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, studentId, categoryId, period]);

  const totalDeduction = rows.reduce((sum, r) => sum + r.score, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            سجل المخالفات — {studentName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            {categoryName ? (
              <Badge variant="outline" className="text-destructive border-destructive/40">
                {categoryName}
              </Badge>
            ) : (
              <Badge variant="outline">جميع المخالفات</Badge>
            )}
            <Badge variant="secondary">
              {period === 1 ? "الفترة الأولى" : "الفترة الثانية"}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileX className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">لا توجد مخالفات مسجلة</p>
          </div>
        ) : (
          <>
            {/* Summary header */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">إجمالي المخالفات:</span>
                <Badge className="bg-destructive text-destructive-foreground">{rows.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">مجموع الخصم:</span>
                <span className="text-lg font-bold text-destructive tabular-nums" dir="ltr">
                  −{totalDeduction}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto rounded-lg border border-border/40">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-right font-semibold text-xs w-10">#</th>
                    <th className="p-2 text-right font-semibold text-xs">التاريخ</th>
                    {!categoryId && (
                      <th className="p-2 text-right font-semibold text-xs">النوع</th>
                    )}
                    <th className="p-2 text-right font-semibold text-xs">الوصف</th>
                    <th className="p-2 text-center font-semibold text-xs w-20">الخصم</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-t border-border/40 transition-colors",
                        idx % 2 === 0 ? "bg-card" : "bg-muted/20",
                        "hover:bg-sky-100/60 dark:hover:bg-sky-900/30"
                      )}
                    >
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(r.date), "yyyy/MM/dd")}
                        </div>
                      </td>
                      {!categoryId && (
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
                            {r.category_name}
                          </Badge>
                        </td>
                      )}
                      <td className="p-2 text-xs text-foreground/80">
                        {r.note?.trim() || <span className="text-muted-foreground italic">—</span>}
                      </td>
                      <td className="p-2 text-center">
                        <span className="font-bold text-destructive tabular-nums" dir="ltr">
                          −{r.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default ViolationHistoryDialog;
