import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DailyIconComponent } from "./DailyIconComponent";
import { getMaxDisplayIcons, calcManualSubtotal, isParticipation } from "./classwork-helpers";
import type { CategoryInfo, SummaryRow } from "./classwork-types";
import ViolationHistoryDialog from "./ViolationHistoryDialog";
import { toEnglishDigits, normalizeInputDigits, preventWheelChange, preventArrowKeyChange } from "@/lib/number-utils";

interface Props {
  students: SummaryRow[];
  categories: CategoryInfo[];
  isEditing: boolean;
  tempEdits: Record<string, string>;
  setTempEdits: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fillAllCatId: string;
  selectedPeriod: number;
  tableRef: (el: HTMLDivElement | null) => void;
}

export default function ClassworkTable({
  students, categories, isEditing, tempEdits, setTempEdits,
  fillAllCatId, selectedPeriod, tableRef,
}: Props) {
  const [violationDialog, setViolationDialog] = useState<{
    studentId: string; studentName: string; categoryId: string | null; categoryName: string;
  } | null>(null);

  return (
    <>
      <div className="hidden print:block text-center mb-2">
        <h2 className="text-sm font-bold">المهام والمشاركة — {selectedPeriod === 1 ? "الفترة الأولى" : "الفترة الثانية"}</h2>
      </div>
      <div ref={tableRef} className="w-full overflow-x-auto -mx-1 px-1 rounded-xl border border-border/40 shadow-sm" dir="rtl" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" } as React.CSSProperties}>
        <table className="w-full text-sm border-collapse" style={{ tableLayout: "auto" }} dir="rtl">
          <thead>
            <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
              <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl">#</th>
              <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 whitespace-nowrap w-0 bg-primary/10">الطالب</th>
              {categories.map(cat => (
                <React.Fragment key={`sub-${cat.id}`}>
                  <th className={cn(
                    "text-center p-2 font-bold text-xs border-b-2 border-primary/20 min-w-[55px] border-r-2 border-r-border",
                    isEditing
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : cat.is_deduction
                        ? "bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-red-400"
                        : "bg-info/10 text-info dark:bg-info/20"
                  )}>
                    <div className="leading-tight">{cat.is_deduction ? "مخالفة" : (
                      cat.name.split(/\s*و\s*/).length > 1
                        ? cat.name.split(/\s*و\s*/).map((part, pi) => <div key={pi}>{pi > 0 ? `و${part}` : part}</div>)
                        : cat.name
                    )}</div>
                    {cat.is_deduction && <div className="text-[10px] opacity-80">العدد</div>}
                  </th>
                  <th className={cn(
                    "text-center p-2 font-semibold text-xs border-b-2 border-primary/20 min-w-[55px]",
                    isEditing
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : cat.is_deduction
                        ? "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-red-400"
                        : "bg-warning/10 text-warning dark:bg-warning/20"
                  )}>
                    <div>{cat.is_deduction ? "الخصم" : "الدرجة"}</div>
                    <div className="text-[10px] opacity-80">{cat.is_deduction ? "مجموع الخصم" : `من ${Number(cat.max_score)}`}</div>
                  </th>
                </React.Fragment>
              ))}
              <th className="text-center p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 min-w-[80px]">الإجمالي</th>
              <th className="text-center p-3 font-semibold text-xs border-b-2 border-primary/20 last:rounded-tl-xl min-w-[90px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">الدرجات المكتسبة</th>
            </tr>
          </thead>
          <tbody>
            {students.map((sg, i) => {
              const isEven = i % 2 === 0;
              const isLast = i === students.length - 1;
              const sub = calcManualSubtotal(sg.manualScores, categories);

              return (
                <tr key={sg.student_id} className={cn(
                  isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                  "border-b border-border/40 group",
                  "hover:[&>td]:!bg-primary/15 dark:hover:[&>td]:!bg-primary/25 transition-colors",
                )}>
                  <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10", isLast && "first:rounded-br-xl")}>{toEnglishDigits(i + 1)}</td>
                  <td className="p-3 font-semibold border-l border-border/10 whitespace-nowrap bg-primary/5">
                    <button
                      type="button"
                      onClick={() => setViolationDialog({
                        studentId: sg.student_id,
                        studentName: sg.full_name,
                        categoryId: null,
                        categoryName: "",
                      })}
                      className="text-right hover:text-primary hover:underline transition-colors no-print"
                      title="عرض سجل كل المخالفات"
                    >
                      {sg.full_name}
                    </button>
                    <span className="hidden print:inline">{sg.full_name}</span>
                  </td>

                  {categories.map(cat => {
                    const cellKey = `${sg.student_id}__${cat.id}`;
                    const allIcons = sg.dailyIcons[cat.id] || [];
                    const maxDisplay = getMaxDisplayIcons(cat.name);
                    const icons = allIcons.slice(0, maxDisplay);
                    const manualScore = sg.manualScores[cat.id] ?? 0;
                    const deductionCount = sg.deductionCounts?.[cat.id] ?? 0;
                    return (
                      <React.Fragment key={cat.id}>
                        <td className={cn(
                          "p-1.5 text-center border-l border-border/10 border-r-2 border-r-border",
                          cat.is_deduction && "bg-destructive/10 dark:bg-destructive/20"
                        )}>
                          {cat.is_deduction ? (
                            <button
                              type="button"
                              onClick={() => deductionCount > 0 && setViolationDialog({
                                studentId: sg.student_id,
                                studentName: sg.full_name,
                                categoryId: cat.id,
                                categoryName: cat.name,
                              })}
                              disabled={deductionCount === 0}
                              className={cn(
                                "text-xs font-bold tabular-nums w-full no-print",
                                deductionCount > 0
                                  ? "text-destructive dark:text-red-400 hover:underline cursor-pointer"
                                  : "text-muted-foreground cursor-default"
                              )}
                              dir="ltr"
                              title={deductionCount > 0 ? "عرض سجل المخالفات" : ""}
                            >
                              {toEnglishDigits(deductionCount)}
                            </button>
                          ) : icons.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-0.5">
                              {icons.map((icon, idx) => (
                                <DailyIconComponent key={idx} icon={icon} size="h-3.5 w-3.5" />
                              ))}
                            </div>
                          )}
                        </td>
                        <td className={cn(
                          "p-1.5 text-center border-l border-border/10",
                          isEditing
                            ? "bg-emerald-500/10"
                            : cat.is_deduction
                              ? "bg-destructive/10 dark:bg-destructive/20"
                              : "bg-warning/5 dark:bg-warning/10"
                        )}>
                          {isEditing && !cat.is_deduction ? (() => {
                            const locked = fillAllCatId && fillAllCatId !== "__all__" && fillAllCatId !== cat.id;
                            return (
                              <Input
                                type="number" min={0} max={Number(cat.max_score)}
                                value={tempEdits[cellKey] ?? ""}
                                onChange={(e) => setTempEdits(prev => ({ ...prev, [cellKey]: toEnglishDigits(e.target.value) }))}
                                onInput={normalizeInputDigits} onWheel={preventWheelChange} onKeyDown={preventArrowKeyChange}
                                className={cn(
                                  "w-14 mx-auto text-center h-7 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                  locked && "opacity-40 pointer-events-none"
                                )}
                                dir="ltr"
                                disabled={!!locked}
                              />
                            );
                          })() : (
                            <span
                              dir="ltr"
                              className={cn(
                                "text-xs font-bold tabular-nums",
                                cat.is_deduction && manualScore > 0
                                  ? "text-destructive dark:text-red-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {cat.is_deduction && manualScore > 0 ? `−${toEnglishDigits(manualScore)}` : toEnglishDigits(manualScore)}
                            </span>
                          )}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  <td className={cn("p-2 text-center font-bold border-l border-border/10", isLast && "")}>
                    {toEnglishDigits(sub.score)} / {toEnglishDigits(sub.max)}
                  </td>
                  <td className={cn("p-2 text-center font-bold border-l border-border/10 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400", isLast && "last:rounded-bl-xl")}>
                    {toEnglishDigits(sg.earnedTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ViolationHistoryDialog
        open={!!violationDialog}
        onOpenChange={(o) => { if (!o) setViolationDialog(null); }}
        studentId={violationDialog?.studentId ?? null}
        studentName={violationDialog?.studentName ?? ""}
        categoryId={violationDialog?.categoryId ?? null}
        categoryName={violationDialog?.categoryName}
        period={selectedPeriod}
      />
    </>
  );
}
