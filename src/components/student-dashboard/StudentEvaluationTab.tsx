import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, CircleCheck, CircleMinus, CircleX } from "lucide-react";
import type { ParentVisibility } from "./constants";

interface Props {
  student: any;
  isParent: boolean;
  parentVis: ParentVisibility;
  evalSubView: "daily" | "classwork";
  setEvalSubView: (v: "daily" | "classwork") => void;
}

export default function StudentEvaluationTab({ student, isParent, parentVis, evalSubView, setEvalSubView }: Props) {
  const studentEval = student.evalSettings || { showDaily: true, showClasswork: true, iconsCount: 10 };
  const showDaily = isParent ? parentVis.parentShowDailyGrades : studentEval.showDaily;
  const showClasswork = isParent ? parentVis.parentShowClassworkIcons : studentEval.showClasswork;
  const effectiveIconsCount = isParent ? parentVis.parentClassworkIconsCount : studentEval.iconsCount;

  const studentClassId = student.class_id;
  const isCatHidden = (catId: string) => {
    if (!isParent) return false;
    if (studentClassId && parentVis.parentGradesHiddenCategories.classes[studentClassId]?.length) {
      return parentVis.parentGradesHiddenCategories.classes[studentClassId].includes(catId);
    }
    return parentVis.parentGradesHiddenCategories.global.includes(catId);
  };

  const evalFilteredGrades = student.grades.filter((g: any) => {
    if (isCatHidden(g.category_id)) return false;
    if (isParent && parentVis.parentGradesVisiblePeriods !== "both" && g.period !== undefined) {
      if (parentVis.parentGradesVisiblePeriods === "1" && g.period !== 1) return false;
      if (parentVis.parentGradesVisiblePeriods === "2" && g.period !== 2) return false;
    }
    return true;
  });

  const currentSubView = evalSubView === "classwork" && showClasswork ? "classwork" :
    evalSubView === "daily" && showDaily ? "daily" :
    showDaily ? "daily" : "classwork";

  const isParticFn = (name: string) => name === "المشاركة" || name.includes("المشاركة");
  const SLOTS = 3;

  const getLevel = (score: number | null, maxScore: number, catName: string) => {
    if (score === null || score === undefined) return null;
    const isPartic = isParticFn(catName);
    if (score >= maxScore && isPartic) return "star";
    if (score >= maxScore) return "excellent";
    if (score === 0) return "zero";
    const slotCount = isPartic ? SLOTS : 1;
    const perSlot = Math.round(maxScore / slotCount);
    const averageScore = Math.round(perSlot / 2);
    if (score >= perSlot) return "excellent";
    if (score >= averageScore) return "average";
    return "zero";
  };

  const getIconLevel = (score: number | null, maxScore: number, catName: string): { level: string; isStar: boolean }[] => {
    if (score === null || score === undefined) return [{ level: "zero", isStar: false }];
    if (score <= 0) return [{ level: "zero", isStar: false }];
    const isPartic = isParticFn(catName);
    if (score >= maxScore && isPartic) return [{ level: "excellent", isStar: true }];
    if (score >= maxScore) return [{ level: "excellent", isStar: false }];
    const slotCount = isPartic ? SLOTS : 1;
    const perSlot = Math.round(maxScore / slotCount);
    const averageScore = Math.round(perSlot / 2);
    const icons: { level: string; isStar: boolean }[] = [];
    let remaining = score;
    while (remaining > 0 && icons.length < slotCount) {
      if (remaining >= perSlot) { icons.push({ level: "excellent", isStar: false }); remaining -= perSlot; }
      else if (remaining >= averageScore) { icons.push({ level: "average", isStar: false }); remaining -= averageScore; }
      else { icons.push({ level: "average", isStar: false }); remaining = 0; }
    }
    return icons.length > 0 ? icons : [{ level: "zero", isStar: false }];
  };

  const LevelIcon = ({ level, isStar }: { level: string; isStar?: boolean }) => {
    if (isStar) return <span className="inline-flex p-1 rounded-lg bg-yellow-100/80 dark:bg-yellow-500/15 mx-auto"><Star className="h-5 w-5 text-amber-500 fill-amber-400" /></span>;
    if (level === "star") return <span className="inline-flex p-1 rounded-lg bg-yellow-100/80 dark:bg-yellow-500/15 mx-auto"><Star className="h-5 w-5 text-amber-500 fill-amber-400" /></span>;
    if (level === "excellent") return <span className="inline-flex p-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-500/15 mx-auto"><CircleCheck className="h-5 w-5 text-emerald-500" /></span>;
    if (level === "average") return <span className="inline-flex p-1 rounded-lg bg-amber-100/80 dark:bg-amber-500/15 mx-auto"><CircleMinus className="h-5 w-5 text-amber-500" /></span>;
    if (level === "zero") return <span className="inline-flex p-1 rounded-lg bg-rose-100/80 dark:bg-rose-500/15 mx-auto"><CircleX className="h-5 w-5 text-rose-500" /></span>;
    return <span className="inline-flex p-1 rounded-lg border-2 border-dashed border-muted-foreground/30 mx-auto"><span className="h-5 w-5" /></span>;
  };

  const Legend = () => (
    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground justify-center">
      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" /> متميز</span>
      <span className="flex items-center gap-1"><CircleCheck className="h-3.5 w-3.5 text-emerald-500" /> ممتاز</span>
      <span className="flex items-center gap-1"><CircleMinus className="h-3.5 w-3.5 text-amber-500" /> متوسط</span>
      <span className="flex items-center gap-1"><CircleX className="h-3.5 w-3.5 text-rose-500" /> ضعيف</span>
      {currentSubView === "daily" && <span className="flex items-center gap-1"><span className="text-muted-foreground/30">○</span> لم يُقيّم</span>}
    </div>
  );

  // Daily content
  const dailyContent = (() => {
    const dailyGrades = evalFilteredGrades.filter((g: any) => g.date && g.grade_categories?.category_group === "classwork");
    if (dailyGrades.length === 0) return <p className="text-center text-muted-foreground py-8">لا توجد بيانات تقييم يومي</p>;
    const uniqueDates = Array.from(new Set<string>(dailyGrades.map((g: any) => g.date))).sort().slice(-7);
    const dailyCatNames = Array.from(new Set<string>(dailyGrades.map((g: any) => g.grade_categories?.name).filter(Boolean)));
    const dayLabels: Record<number, string> = { 0: "الأحد", 1: "الإثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت" };
    return (
      <>
        <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr className="bg-gradient-to-l from-emerald-500/10 via-accent/5 to-emerald-500/5">
                <th className="text-right p-2 font-semibold text-emerald-600 border-b-2 border-emerald-500/20 first:rounded-tr-xl">اليوم</th>
                {dailyCatNames.map((catName) => (
                  <th key={catName} className="text-center p-2 font-semibold text-emerald-600 border-b-2 border-emerald-500/20 whitespace-nowrap text-[10px]">{catName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueDates.map((date, di) => {
                const d = new Date(date);
                return (
                  <tr key={date} className={di % 2 === 0 ? "bg-card" : "bg-muted/30 dark:bg-muted/20"}>
                    <td className="p-2 text-right font-semibold border-l border-border/10 whitespace-nowrap">
                      <div className="text-xs">{dayLabels[d.getDay()] || ""}</div>
                      <div className="text-[9px] text-muted-foreground">{d.getDate()}/{d.getMonth() + 1}</div>
                    </td>
                    {dailyCatNames.map((catName) => {
                      const grade = dailyGrades.find((g: any) => g.date === date && g.grade_categories?.name === catName);
                      const level = grade ? getLevel(grade.score, grade.grade_categories?.max_score || 100, catName) : null;
                      return (
                        <td key={catName} className="p-1.5 text-center border-l border-border/10">
                          <LevelIcon level={level || ""} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Legend />
      </>
    );
  })();

  // Classwork content
  const classworkContent = (() => {
    const cwGrades = evalFilteredGrades.filter((g: any) => g.grade_categories?.category_group === "classwork");
    if (cwGrades.length === 0) return <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>;
    const cwCatNames = Array.from(new Set<string>(cwGrades.map((g: any) => g.grade_categories?.name).filter(Boolean)));
    return (
      <>
        <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gradient-to-l from-emerald-500/10 via-accent/5 to-emerald-500/5">
                <th className="text-right p-3 font-semibold text-emerald-600 border-b-2 border-emerald-500/20 first:rounded-tr-xl text-xs">فئة التقييم</th>
                <th className="text-center p-3 font-semibold text-emerald-600 border-b-2 border-emerald-500/20 last:rounded-tl-xl text-xs">التقييم</th>
              </tr>
            </thead>
            <tbody>
              {cwCatNames.map((catName, catIdx) => {
                const catGrades = cwGrades.filter((g: any) => g.grade_categories?.name === catName).sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
                const allIcons = catGrades.flatMap((g: any) => getIconLevel(g.score, g.grade_categories?.max_score || 100, catName));
                const displayIcons = allIcons.slice(-effectiveIconsCount);
                return (
                  <tr key={catName} className={catIdx % 2 === 0 ? "bg-card" : "bg-muted/30 dark:bg-muted/20"}>
                    <td className="p-3 text-right font-semibold border-l border-border/10 whitespace-nowrap text-xs">{catName}</td>
                    <td className="p-3 text-center border-l border-border/10">
                      <div className="flex items-center gap-0.5 flex-wrap justify-center">
                        {displayIcons.map((icon, i) => <span key={i}><LevelIcon level={icon.level} isStar={icon.isStar} /></span>)}
                        {allIcons.length === 0 && <span className="text-muted-foreground/40 text-xs">لا توجد بيانات</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Legend />
      </>
    );
  })();

  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-blue-500" />
          التقييم المستمر
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showDaily && showClasswork && (
          <div className="flex items-center gap-1 mb-4 bg-muted/40 rounded-xl p-1">
            <button onClick={() => setEvalSubView("daily")} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all", currentSubView === "daily" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
              📅 تفاعل اليوم
            </button>
            <button onClick={() => setEvalSubView("classwork")} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all", currentSubView === "classwork" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60")}>
              📊 التفاعل الكلي
            </button>
          </div>
        )}
        {currentSubView === "daily" ? dailyContent : classworkContent}
      </CardContent>
    </Card>
  );
}
