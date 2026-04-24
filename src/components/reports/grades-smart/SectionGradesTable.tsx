import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle } from "lucide-react";
import { studentPercent, classifyLevel, getReasonLabel } from "./grades-helpers";

interface SectionGradesTableExtraProps {
  showLevelPerCell?: boolean;
}
import type { CategoryMeta, GradeRow } from "@/hooks/useReportSending";

interface Props {
  title: string;
  categories: CategoryMeta[];
  rows: GradeRow[];
  allCategoriesMeta: CategoryMeta[];
  examCategories: CategoryMeta[];
  viewMode: "raw" | "percent";
  formatCellValue: (score: number | null, cat?: CategoryMeta) => string;
  absences: Record<string, { reason: string; notes?: string }>;
  absKey: (studentId: string, categoryId: string) => string;
  onAbsentClick: (student: GradeRow, cat: CategoryMeta) => void;
  showTotal?: boolean;
  showLevelPerCell?: boolean;
}

export default function SectionGradesTable({
  title, categories, rows, allCategoriesMeta, examCategories, viewMode,
  formatCellValue, absences, absKey, onAbsentClick, showTotal = false, showLevelPerCell = false,
}: Props) {
  if (categories.length === 0) {
    return (
      <Card className="border-0 shadow-md bg-card/80">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          لا توجد فئات في هذا القسم
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-0 shadow-lg bg-card">
      <CardContent className="pt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 print:hidden">{title}</h3>
        <div className="max-h-[400px] overflow-auto rounded-xl border border-border/30">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-l from-success/5 to-primary/5 dark:from-success/10 dark:to-primary/10">
                <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                {categories.map((c) => (
                  <TableHead key={c.id} className="text-center font-semibold">{c.name}</TableHead>
                ))}
                {showTotal && (
                  <>
                    <TableHead className="text-center font-semibold">
                      {viewMode === "percent" ? "النسبة %" : "المجموع"}
                    </TableHead>
                    <TableHead className="text-center font-semibold">المستوى</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => {
                const percent = studentPercent(row, allCategoriesMeta);
                const lvl = classifyLevel(percent);
                return (
                  <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                    <TableCell className="font-medium">{row.student_name}</TableCell>
                    {categories.map((cat) => {
                      const score = row.categories[cat.name];
                      const isExam = !!examCategories.find((e) => e.id === cat.id);
                      const isAbsent = score === null || score === undefined;
                      const absRecord = row.student_id ? absences[absKey(row.student_id, cat.id)] : undefined;
                      return (
                        <TableCell key={cat.id} className="text-center text-muted-foreground">
                          {!isAbsent ? (
                            formatCellValue(score, cat)
                          ) : isExam && row.student_id ? (
                            <button
                              className="inline-flex items-center gap-1 text-xs text-destructive hover:underline print:hidden"
                              onClick={() => onAbsentClick(row, cat)}
                              title={absRecord ? `${getReasonLabel(absRecord.reason)}${absRecord.notes ? ` — ${absRecord.notes}` : ""}` : "تسجيل سبب الغياب"}
                            >
                              <AlertCircle className="h-3 w-3" />
                              {absRecord ? getReasonLabel(absRecord.reason) : "غائب"}
                            </button>
                          ) : "—"}
                        </TableCell>
                      );
                    })}
                    {showTotal && (
                      <>
                        <TableCell className="text-center">
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 font-bold">
                            {viewMode === "percent" ? `${percent.toFixed(1)}%` : row.total}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" style={{ color: lvl.color, borderColor: lvl.color }}>
                            {lvl.label}
                          </Badge>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
