import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParentVisibility } from "./constants";

interface Props {
  student: any;
  isParent: boolean;
  parentVis: ParentVisibility;
  evalSubView: "daily" | "classwork";
  setEvalSubView: (v: "daily" | "classwork") => void;
}

type EvaluationLevel = "excellent" | "average" | "zero" | "star";

const SLOTS = 3;

const iconToneStyles: Record<EvaluationLevel | "empty", CSSProperties> = {
  excellent: { color: "hsl(var(--success))" },
  average: { color: "hsl(var(--warning))" },
  zero: { color: "hsl(var(--destructive))" },
  star: { color: "hsl(var(--warning))" },
  empty: { color: "hsl(var(--muted-foreground) / 0.35)" },
};

function EvaluationIcon({ level, size = 20, className }: { level: EvaluationLevel | null; size?: number; className?: string }) {
  const style = level ? iconToneStyles[level] : iconToneStyles.empty;

  if (level === "star") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        style={style}
        aria-hidden="true"
      >
        <path
          d="M12 3.75l2.55 5.17 5.7.83-4.13 4.03.98 5.68L12 16.78 6.9 19.46l.98-5.68-4.13-4.03 5.7-.83L12 3.75z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (level === "excellent") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        style={style}
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M8.6 12.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (level === "average") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        style={style}
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (level === "zero") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        style={style}
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M9 9l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      style={style}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

function LevelIcon({ level, size = 20 }: { level: EvaluationLevel | null; size?: number }) {
  return (
    <span className="mx-auto inline-flex items-center justify-center">
      <EvaluationIcon level={level} size={size} />
    </span>
  );
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

  const getLevel = (score: number | null, maxScore: number, catName: string): EvaluationLevel | null => {
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

  const getIconLevels = (score: number | null, maxScore: number, catName: string): EvaluationLevel[] => {
    if (score === null || score === undefined) return ["zero"];
    if (score <= 0) return ["zero"];

    const isPartic = isParticFn(catName);
    if (score >= maxScore && isPartic) return ["star"];
    if (score >= maxScore) return ["excellent"];

    const slotCount = isPartic ? SLOTS : 1;
    const perSlot = Math.round(maxScore / slotCount);
    const averageScore = Math.round(perSlot / 2);
    const icons: EvaluationLevel[] = [];
    let remaining = score;

    while (remaining > 0 && icons.length < slotCount) {
      if (remaining >= perSlot) {
        icons.push("excellent");
        remaining -= perSlot;
      } else if (remaining >= averageScore) {
        icons.push("average");
        remaining -= averageScore;
      } else {
        icons.push("average");
        remaining = 0;
      }
    }

    return icons.length > 0 ? icons : ["zero"];
  };

  const Legend = () => (
    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground justify-center flex-wrap">
      <span className="flex items-center gap-1"><EvaluationIcon level="star" size={14} /> متميز</span>
      <span className="flex items-center gap-1"><EvaluationIcon level="excellent" size={14} /> ممتاز</span>
      <span className="flex items-center gap-1"><EvaluationIcon level="average" size={14} /> متوسط</span>
      <span className="flex items-center gap-1"><EvaluationIcon level="zero" size={14} /> ضعيف</span>
      {currentSubView === "daily" && <span className="flex items-center gap-1"><EvaluationIcon level={null} size={14} /> لم يُقيّم</span>}
    </div>
  );

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
              <tr className="bg-gradient-to-l from-success/10 via-accent/5 to-success/5">
                <th className="text-right p-2 font-semibold text-success border-b-2 border-success/20 first:rounded-tr-xl">اليوم</th>
                {dailyCatNames.map((catName) => (
                  <th key={catName} className="text-center p-2 font-semibold text-success border-b-2 border-success/20 whitespace-nowrap text-[10px]">{catName}</th>
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
                          <LevelIcon level={level} />
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

  const classworkContent = (() => {
    const cwGrades = evalFilteredGrades.filter((g: any) => g.grade_categories?.category_group === "classwork");
    if (cwGrades.length === 0) return <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>;
    const cwCatNames = Array.from(new Set<string>(cwGrades.map((g: any) => g.grade_categories?.name).filter(Boolean)));

    return (
      <>
        <div className="overflow-auto rounded-xl border border-border/30 shadow-sm">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gradient-to-l from-success/10 via-accent/5 to-success/5">
                <th className="text-right p-3 font-semibold text-success border-b-2 border-success/20 first:rounded-tr-xl text-xs">فئة التقييم</th>
                <th className="text-center p-3 font-semibold text-success border-b-2 border-success/20 last:rounded-tl-xl text-xs">التقييم</th>
              </tr>
            </thead>
            <tbody>
              {cwCatNames.map((catName, catIdx) => {
                const catGrades = cwGrades
                  .filter((g: any) => g.grade_categories?.name === catName)
                  .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));
                const allIcons = catGrades.flatMap((g: any) => getIconLevels(g.score, g.grade_categories?.max_score || 100, catName));
                const displayIcons = allIcons.slice(-effectiveIconsCount);

                return (
                  <tr key={catName} className={catIdx % 2 === 0 ? "bg-card" : "bg-muted/30 dark:bg-muted/20"}>
                    <td className="p-3 text-right font-semibold border-l border-border/10 whitespace-nowrap text-xs">{catName}</td>
                    <td className="p-3 text-center border-l border-border/10">
                      <div className="flex items-center gap-0.5 flex-wrap justify-center">
                        {displayIcons.map((iconLevel, i) => <LevelIcon key={`${catName}-${i}`} level={iconLevel} />)}
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
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-success to-info" />
          التقييم المستمر
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showDaily && showClasswork && (
          <div className="flex items-center gap-1 mb-4 bg-muted/40 rounded-xl p-1">
            <button
              onClick={() => setEvalSubView("daily")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all",
                currentSubView === "daily" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              📅 تفاعل اليوم
            </button>
            <button
              onClick={() => setEvalSubView("classwork")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all",
                currentSubView === "classwork" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              📊 التفاعل الكلي
            </button>
          </div>
        )}
        {currentSubView === "daily" ? dailyContent : classworkContent}
      </CardContent>
    </Card>
  );
}
