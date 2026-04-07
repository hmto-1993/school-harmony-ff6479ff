import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Table2 } from "lucide-react";
import type { ParentVisibility } from "./constants";

interface Props {
  student: any;
  isParent: boolean;
  parentVis: ParentVisibility;
  gradesView: "table" | "cards";
  setGradesView: (v: "table" | "cards") => void;
}

export default function StudentGradesTab({ student, isParent, parentVis, gradesView, setGradesView }: Props) {
  const studentClassId = student.class_id;
  const isCatHidden = (catId: string) => {
    if (!isParent) return false;
    if (studentClassId && parentVis.parentGradesHiddenCategories.classes[studentClassId]?.length) {
      return parentVis.parentGradesHiddenCategories.classes[studentClassId].includes(catId);
    }
    return parentVis.parentGradesHiddenCategories.global.includes(catId);
  };

  const filteredGrades = student.grades.filter((g: any) => {
    if (isCatHidden(g.category_id)) return false;
    if (g.grade_categories?.category_group === "classwork") return false;
    if (isParent && parentVis.parentGradesVisiblePeriods !== "both" && g.period !== undefined) {
      if (parentVis.parentGradesVisiblePeriods === "1" && g.period !== 1) return false;
      if (parentVis.parentGradesVisiblePeriods === "2" && g.period !== 2) return false;
    }
    return true;
  });

  if (filteredGrades.length === 0) {
    return (
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardContent className="p-5">
          <p className="text-center text-muted-foreground py-8">لا توجد درجات مسجلة</p>
        </CardContent>
      </Card>
    );
  }

  const aggregateByCategory = (items: any[]) => {
    const catMap: Record<string, { name: string; totalScore: number; maxScore: number; count: number; categoryGroup: string; catName: string }> = {};
    items.forEach((g) => {
      const catName = g.grade_categories?.name || "-";
      const catId = g.category_id || catName;
      if (!catMap[catId]) {
        catMap[catId] = { name: catName, totalScore: 0, maxScore: g.grade_categories?.max_score || 100, count: 0, categoryGroup: g.grade_categories?.category_group || "", catName };
      }
      catMap[catId].totalScore += (g.score ?? 0);
      catMap[catId].count += 1;
    });
    return Object.values(catMap);
  };

  const groups: Record<string, any[]> = {};
  filteredGrades.forEach((g: any) => {
    const group = g.grade_categories?.category_group || "أخرى";
    if (!groups[group]) groups[group] = [];
    groups[group].push(g);
  });

  const groupLabels: Record<string, { label: string; color: string; icon: string }> = {
    classwork: { label: "المهام والمشاركة", color: "text-emerald-500", icon: "📋" },
    exam: { label: "الاختبارات", color: "text-amber-500", icon: "📝" },
    أخرى: { label: "أخرى", color: "text-primary", icon: "📊" },
  };

  const totalScore = filteredGrades.reduce((s: number, g: any) => s + (g.score ?? 0), 0);
  const totalMax = filteredGrades.reduce((s: number, g: any) => s + (g.grade_categories?.max_score || 0), 0);

  const renderGradeRow = (agg: any, i: number) => {
    const score = agg.totalScore;
    const totalMaxForCat = agg.maxScore * agg.count;
    const pct = totalMaxForCat > 0 ? Math.round((score / totalMaxForCat) * 100) : 0;
    return (
      <div key={i} className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{agg.name}</p>
          <div className="mt-1.5 h-2 rounded-full bg-muted/50 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-blue-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="text-left shrink-0 w-20">
          <span className={cn("text-lg font-bold", pct >= 90 ? "text-emerald-500" : pct >= 75 ? "text-blue-500" : pct >= 60 ? "text-amber-500" : "text-rose-500")}>{score}</span>
          <span className="text-xs text-muted-foreground">/{totalMaxForCat}</span>
        </div>
      </div>
    );
  };

  const cardsView = (
    <div className="space-y-3">
      {Object.entries(groups).map(([groupKey, items]) => {
        const info = groupLabels[groupKey] || groupLabels["أخرى"];
        const aggregated = aggregateByCategory(items);
        const groupTotal = aggregated.reduce((s, a) => s + a.totalScore, 0);
        const groupMax = aggregated.reduce((s, a) => s + (a.maxScore * a.count), 0);
        const groupPct = groupMax > 0 ? Math.round((groupTotal / groupMax) * 100) : 0;
        return (
          <div key={groupKey} className="rounded-xl border border-border/40 overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/20">
              <span className={cn("text-sm font-bold flex items-center gap-2", info.color)}>
                <span>{info.icon}</span> {info.label}
              </span>
              <Badge variant="secondary" className="text-xs font-bold">{groupTotal}/{groupMax} ({groupPct}%)</Badge>
            </div>
            <div className="divide-y divide-border/20">
              {aggregated.map((agg, i) => renderGradeRow(agg, i))}
            </div>
          </div>
        );
      })}
      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-l from-primary/5 to-accent/5 p-4 flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">المجموع الكلي</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{totalScore}</span>
          <span className="text-sm text-muted-foreground">/ {totalMax}</span>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">{totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0}%</Badge>
        </div>
      </div>
    </div>
  );

  const tableView = (
    <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
            <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">المعيار</th>
            <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الدرجة</th>
            <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">من</th>
            {(!isParent || parentVis.parentGradesShowPercentage) && <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">النسبة</th>}
            {(!isParent || parentVis.parentGradesShowEval) && <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">التقييم</th>}
          </tr>
        </thead>
        <tbody>
          {filteredGrades.map((g: any, i: number) => {
            const isEven = i % 2 === 0;
            const isLast = i === filteredGrades.length - 1;
            const score = g.score ?? 0;
            const maxScore = g.grade_categories?.max_score || 100;
            const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            const evalIcon = pct >= 90 ? "★★★" : pct >= 75 ? "★★" : pct >= 60 ? "★" : "➖";
            return (
              <tr key={i} className={cn(isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20", !isLast && "border-b border-border/20")}>
                <td className={cn("p-3 text-right font-semibold border-l border-border/10", isLast && "first:rounded-br-xl")}>{g.grade_categories?.name || "-"}</td>
                <td className="p-3 text-center border-l border-border/10">{g.score ?? "-"}</td>
                <td className="p-3 text-center border-l border-border/10">{g.grade_categories?.max_score || "-"}</td>
                {(!isParent || parentVis.parentGradesShowPercentage) && (
                  <td className="p-3 text-center border-l border-border/10">
                    <span className={cn("text-xs font-bold", pct >= 90 ? "text-emerald-500" : pct >= 75 ? "text-blue-500" : pct >= 60 ? "text-amber-500" : "text-rose-500")}>{pct}%</span>
                  </td>
                )}
                {(!isParent || parentVis.parentGradesShowEval) && (
                  <td className={cn("p-3 text-center text-lg", isLast && "last:rounded-bl-xl", pct >= 90 ? "text-amber-500" : pct >= 75 ? "text-blue-500" : pct >= 60 ? "text-amber-600" : "text-muted-foreground")}>{evalIcon}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
            تفاصيل الدرجات
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <button onClick={() => setGradesView("cards")} className={cn("p-1.5 rounded-md transition-all", gradesView === "cards" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setGradesView("table")} className={cn("p-1.5 rounded-md transition-all", gradesView === "table" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Table2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {gradesView === "cards" ? cardsView : tableView}
      </CardContent>
    </Card>
  );
}
