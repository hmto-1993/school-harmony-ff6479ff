import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import type { CategoryMeta, GradeRow } from "@/hooks/useReportSending";

interface Props {
  examCategories: CategoryMeta[];
  visibleCategories: CategoryMeta[];
  rows: GradeRow[];
  examFilter: string;
  setExamFilter: (id: string) => void;
}

export default function MissingGradesAlert({
  visibleCategories, rows, examFilter, setExamFilter,
}: Props) {
  if (rows.length === 0 || visibleCategories.length === 0) return null;

  const stats = visibleCategories.map((cat) => {
    const missing = rows.filter((r) => {
      const v = r.categories[cat.name];
      return v === null || v === undefined;
    }).length;
    return { cat, missing };
  }).filter((s) => s.missing > 0);

  if (stats.length === 0) return null;

  return (
    <Alert className="border-warning/40 bg-warning/5 print:hidden">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">درجات غير مكتملة:</span>
          {stats.map((s) => (
            <Button
              key={s.cat.id}
              variant="outline"
              size="sm"
              className={`h-7 text-xs gap-1.5 ${
                examFilter === s.cat.id
                  ? "bg-warning/20 border-warning text-warning-foreground"
                  : "border-warning/40 text-warning hover:bg-warning/10"
              }`}
              onClick={() => setExamFilter(examFilter === s.cat.id ? "all" : s.cat.id)}
            >
              {s.cat.name}: {s.missing} طالب
              <ArrowLeft className="h-3 w-3" />
            </Button>
          ))}
          {examFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setExamFilter("all")}
            >
              إلغاء الفلتر
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
