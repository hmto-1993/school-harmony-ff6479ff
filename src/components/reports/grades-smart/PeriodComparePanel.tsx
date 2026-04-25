import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, Minus, GitCompare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryMeta } from "@/hooks/useReportSending";

interface Props {
  selectedClass: string;
  categoryMeta: CategoryMeta[];
}

interface StudentCompareRow {
  student_id: string;
  student_name: string;
  p1Total: number;
  p2Total: number;
  p1Pct: number;
  p2Pct: number;
}

export default function PeriodComparePanel({ selectedClass, categoryMeta }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StudentCompareRow[]>([]);

  // Use the categories already known to the report (deduped by name).
  // We need their max_score and weight to compute totals/percentages.
  const categories = categoryMeta;

  const totalWeight = useMemo(
    () => categories.reduce((s, c) => s + (Number(c.weight) || 0), 0) || 100,
    [categories]
  );

  const fetchData = async () => {
    if (!selectedClass || selectedClass === "all" || categories.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      // Students of the class
      const { data: students } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("class_id", selectedClass)
        .order("full_name");

      const studentIds = (students || []).map((s) => s.id);
      if (studentIds.length === 0) {
        setRows([]);
        return;
      }

      const catIds = categories.map((c) => c.id);
      const catById = new Map(categories.map((c) => [c.id, c]));

      // Fetch both periods from manual_category_scores (source of truth for exam-type)
      const { data: manual } = await supabase
        .from("manual_category_scores")
        .select("student_id, category_id, score, period")
        .in("student_id", studentIds)
        .in("category_id", catIds);

      // Fetch both periods from grades (classwork etc.)
      const { data: grades } = await supabase
        .from("grades")
        .select("student_id, category_id, score, period")
        .in("student_id", studentIds)
        .in("category_id", catIds);

      // student -> period -> categoryId -> score
      const map: Record<string, Record<number, Record<string, number>>> = {};
      const ensure = (sid: string, period: number) => {
        if (!map[sid]) map[sid] = {};
        if (!map[sid][period]) map[sid][period] = {};
        return map[sid][period];
      };
      (grades || []).forEach((g: any) => {
        if (g.score !== null && g.score !== undefined) {
          ensure(g.student_id, g.period)[g.category_id] = Number(g.score);
        }
      });
      // manual takes precedence
      (manual || []).forEach((g: any) => {
        if (g.score !== null && g.score !== undefined) {
          ensure(g.student_id, g.period)[g.category_id] = Number(g.score);
        }
      });

      const computed: StudentCompareRow[] = (students || []).map((s) => {
        const compute = (period: number) => {
          const scores = map[s.id]?.[period] || {};
          let total = 0;
          let weightedPct = 0;
          categories.forEach((c) => {
            const v = scores[c.id];
            if (v !== undefined && v !== null) {
              total += v;
              weightedPct += (v / (c.max_score || 100)) * (Number(c.weight) || 0);
            }
          });
          return {
            total: Math.round(total * 10) / 10,
            pct: Math.round((weightedPct / totalWeight) * 10000) / 100,
          };
        };
        const p1 = compute(1);
        const p2 = compute(2);
        return {
          student_id: s.id,
          student_name: s.full_name,
          p1Total: p1.total,
          p2Total: p2.total,
          p1Pct: p1.pct,
          p2Pct: p2.pct,
        };
      });

      setRows(computed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedClass]);

  // Summary stats
  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const improved = rows.filter((r) => r.p2Pct > r.p1Pct).length;
    const declined = rows.filter((r) => r.p2Pct < r.p1Pct).length;
    const same = rows.length - improved - declined;
    const avgP1 = rows.reduce((s, r) => s + r.p1Pct, 0) / rows.length;
    const avgP2 = rows.reduce((s, r) => s + r.p2Pct, 0) / rows.length;
    return {
      improved,
      declined,
      same,
      avgDiff: Math.round((avgP2 - avgP1) * 10) / 10,
    };
  }, [rows]);

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-success/5 print:hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          مقارنة الفترتين
        </CardTitle>
        <Button
          variant={open ? "default" : "outline"}
          size="sm"
          onClick={() => setOpen(!open)}
          className="h-7 text-xs"
        >
          {open ? "إخفاء" : "عرض المقارنة"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري حساب المقارنة...
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-4">
              اختر فصلاً محدداً (لا "جميع الشعب") لعرض المقارنة.
            </p>
          ) : (
            <>
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg bg-success/10 p-2 text-center">
                    <div className="font-bold text-success text-base">{summary.improved}</div>
                    <div className="text-muted-foreground">تحسّن</div>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-2 text-center">
                    <div className="font-bold text-destructive text-base">{summary.declined}</div>
                    <div className="text-muted-foreground">تراجع</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <div className="font-bold text-foreground text-base">{summary.same}</div>
                    <div className="text-muted-foreground">ثابت</div>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-2 text-center">
                    <div className={`font-bold text-base ${summary.avgDiff >= 0 ? "text-success" : "text-destructive"}`}>
                      {summary.avgDiff > 0 ? "+" : ""}{summary.avgDiff}%
                    </div>
                    <div className="text-muted-foreground">متوسط الفرق</div>
                  </div>
                </div>
              )}

              <div className="max-h-[360px] overflow-auto rounded-lg border border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-right">الطالب</TableHead>
                      <TableHead className="text-center">الفترة 1</TableHead>
                      <TableHead className="text-center">الفترة 2</TableHead>
                      <TableHead className="text-center">الفرق %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const diff = Math.round((r.p2Pct - r.p1Pct) * 10) / 10;
                      const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus;
                      const colorCls =
                        diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "text-muted-foreground";
                      return (
                        <TableRow key={r.student_id}>
                          <TableCell className="font-medium">{r.student_name}</TableCell>
                          <TableCell className="text-center text-xs">
                            <div className="font-bold">{r.p1Total}</div>
                            <div className="text-muted-foreground">{r.p1Pct}%</div>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <div className="font-bold">{r.p2Total}</div>
                            <div className="text-muted-foreground">{r.p2Pct}%</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`gap-1 ${colorCls} border-current`}>
                              <Icon className="h-3 w-3" />
                              {diff > 0 ? "+" : ""}{diff}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
