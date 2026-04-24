import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, Users, Eye, FileText, AlertCircle, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import GradesChart from "@/components/reports/GradesChart";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import PrintWatermark from "@/components/shared/PrintWatermark";
import ReportExportDialog from "@/components/reports/ReportExportDialog";
import HomeworkPanel from "./grades-smart/HomeworkPanel";
import GradesViewControls from "./grades-smart/GradesViewControls";
import LevelsReport from "./grades-smart/LevelsReport";
import AbsenceReasonDialog from "./grades-smart/AbsenceReasonDialog";
import { useHomeworkTargets, useExamAbsences } from "./grades-smart/useGradesSmartData";
import {
  studentPercent, classifyLevel, getReasonLabel, homeworkStatus,
  type ViewMode, type SortKey, type SortDir,
} from "./grades-smart/grades-helpers";
import { toast } from "@/hooks/use-toast";
import type { GradeRow, CategoryMeta } from "@/hooks/useReportSending";

interface GradesReportTabProps {
  gradeData: GradeRow[];
  categoryNames: string[];
  categoryMeta?: CategoryMeta[];
  loadingGrades: boolean;
  selectedClass: string;
  fetchGrades: () => void;
  onPreview: () => void;
  exportGradesExcel: () => void;
  exportGradesPDF: () => void;
  shareGradesWhatsApp: () => void;
  scope: "current" | "all";
  setScope: (s: "current" | "all") => void;
}

export default function GradesReportTab({
  gradeData, categoryNames, categoryMeta = [], loadingGrades, selectedClass,
  fetchGrades, onPreview, exportGradesExcel, exportGradesPDF, shareGradesWhatsApp,
  scope, setScope,
}: GradesReportTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [showLevelsReport, setShowLevelsReport] = useState(false);
  const [absDialog, setAbsDialog] = useState<{ open: boolean; studentId?: string; studentName?: string; categoryId?: string; categoryName?: string }>({ open: false });

  const { homeworkCategories, targets, saveTarget } = useHomeworkTargets(selectedClass, categoryMeta);
  // Exam categories = non-homework
  const examCategories = useMemo(
    () => categoryMeta.filter((c) => !homeworkCategories.find((h) => h.id === c.id)),
    [categoryMeta, homeworkCategories]
  );
  const { absences, saveAbsence, key: absKey } = useExamAbsences(selectedClass, examCategories);

  // Apply exam filter (students who didn't take a specific exam = score is null)
  const filteredRows = useMemo(() => {
    if (examFilter === "all") return gradeData;
    const cat = examCategories.find((c) => c.id === examFilter);
    if (!cat) return gradeData;
    return gradeData.filter((r) => r.categories[cat.name] === null || r.categories[cat.name] === undefined);
  }, [gradeData, examFilter, examCategories]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.student_name.localeCompare(b.student_name, "ar");
      else if (sortKey === "raw") cmp = (a.total || 0) - (b.total || 0);
      else cmp = studentPercent(a, categoryMeta) - studentPercent(b, categoryMeta);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredRows, sortKey, sortDir, categoryMeta]);

  const formatCellValue = (score: number | null, cat?: CategoryMeta) => {
    if (score === null || score === undefined) return "—";
    if (viewMode === "raw") return cat ? `${score}/${cat.max_score}` : String(score);
    if (!cat || !cat.max_score) return `${score}%`;
    return `${Math.round((score / cat.max_score) * 100)}%`;
  };

  const buildLevelsBlob = async () => {
    const { buildLevelsReportPDF } = await import("./grades-smart/levels-pdf-builder");
    const hwStats = homeworkCategories.map((cat) => {
      const required = targets[cat.id] ?? 0;
      const stats = filteredRows.reduce(
        (acc, r) => {
          const score = r.categories[cat.name];
          const submitted = score === null || score === undefined ? 0 : Math.min(score, required);
          const status = homeworkStatus(submitted, required);
          acc[status.key as "complete" | "partial" | "missing"]++;
          return acc;
        },
        { complete: 0, partial: 0, missing: 0 }
      );
      return { name: cat.name, complete: stats.complete, partial: stats.partial, missing: stats.missing };
    });
    return buildLevelsReportPDF(filteredRows, categoryMeta, hwStats);
  };

  const handleExportLevelsPDF = async () => {
    try {
      const { blob, fileName } = await buildLevelsBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "تم التصدير", description: "تقرير المستويات بصيغة PDF" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleShareLevelsWhatsApp = async () => {
    try {
      const { sharePDFViaWhatsApp } = await import("@/lib/whatsapp-share");
      const { blob, fileName } = await buildLevelsBlob();
      const result = await sharePDFViaWhatsApp(blob, fileName, "📊 تقرير تصنيف المستويات");
      toast({
        title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF",
        description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب",
      });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        <Button onClick={fetchGrades} disabled={loadingGrades || !selectedClass}>
          <BarChart3 className="h-4 w-4 ml-1.5" />
          {loadingGrades ? "جارٍ التحميل..." : "عرض التقرير"}
        </Button>
        {gradeData.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={onPreview} className="gap-1.5">
              <Eye className="h-4 w-4" />معاينة
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportLevelsPDF} className="gap-1.5">
              <FileText className="h-4 w-4" />تصدير المستويات PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareLevelsWhatsApp}
              className="gap-1.5 text-success border-success/30 hover:bg-success/10"
            >
              <Share2 className="h-4 w-4" />إرسال المستويات واتساب
            </Button>
            <ReportExportDialog
              title="تصدير تقرير الدرجات"
              onExportExcel={exportGradesExcel}
              onExportPDF={exportGradesPDF}
              onShareWhatsApp={shareGradesWhatsApp}
            />
          </>
        )}
      </div>

      {gradeData.length > 0 && (
        <>
          <HomeworkPanel
            homeworkCategories={homeworkCategories}
            targets={targets}
            saveTarget={saveTarget}
            rows={gradeData}
          />

          <GradesViewControls
            viewMode={viewMode} setViewMode={setViewMode}
            sortKey={sortKey} setSortKey={setSortKey}
            sortDir={sortDir} setSortDir={setSortDir}
            scope={scope} setScope={setScope}
            examFilter={examFilter} setExamFilter={setExamFilter}
            examCategories={examCategories}
            showLevelsReport={showLevelsReport} setShowLevelsReport={setShowLevelsReport}
          />

          {showLevelsReport && (
            <LevelsReport rows={filteredRows} categories={categoryMeta} />
          )}

          <div className="print-area space-y-4">
            <ReportPrintHeader reportType="grades" />
            <PrintWatermark reportType="grades" />
            <GradesChart data={filteredRows} categoryNames={categoryNames} />

            <Card className="border-0 shadow-lg bg-card">
              <CardContent className="pt-4">
                <div className="max-h-[400px] overflow-auto rounded-xl border border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-l from-success/5 to-primary/5 dark:from-success/10 dark:to-primary/10">
                        <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                        {categoryNames.map((name) => (
                          <TableHead key={name} className="text-center font-semibold">{name}</TableHead>
                        ))}
                        <TableHead className="text-center font-semibold">
                          {viewMode === "percent" ? "النسبة %" : "المجموع"}
                        </TableHead>
                        <TableHead className="text-center font-semibold">المستوى</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRows.map((row, i) => {
                        const percent = studentPercent(row, categoryMeta);
                        const lvl = classifyLevel(percent);
                        return (
                          <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                            <TableCell className="font-medium">{row.student_name}</TableCell>
                            {categoryNames.map((name) => {
                              const cat = categoryMeta.find((c) => c.name === name);
                              const score = row.categories[name];
                              const isExam = cat && examCategories.find((e) => e.id === cat.id);
                              const isAbsent = score === null || score === undefined;
                              const absRecord = cat && row.student_id
                                ? absences[absKey(row.student_id, cat.id)] : undefined;
                              return (
                                <TableCell key={name} className="text-center text-muted-foreground">
                                  {!isAbsent ? (
                                    formatCellValue(score, cat)
                                  ) : isExam && row.student_id && cat ? (
                                    <button
                                      className="inline-flex items-center gap-1 text-xs text-destructive hover:underline print:hidden"
                                      onClick={() => setAbsDialog({
                                        open: true, studentId: row.student_id, studentName: row.student_name,
                                        categoryId: cat.id, categoryName: cat.name,
                                      })}
                                      title={absRecord ? `${getReasonLabel(absRecord.reason)}${absRecord.notes ? ` — ${absRecord.notes}` : ""}` : "تسجيل سبب الغياب"}
                                    >
                                      <AlertCircle className="h-3 w-3" />
                                      {absRecord ? getReasonLabel(absRecord.reason) : "غائب"}
                                    </button>
                                  ) : "—"}
                                </TableCell>
                              );
                            })}
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
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!loadingGrades && gradeData.length === 0 && (
        <Card className="print:hidden border-0 shadow-lg bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="rounded-2xl bg-gradient-to-br from-success/10 to-primary/10 p-4 mb-4">
              <Users className="h-10 w-10 text-success/40" />
            </div>
            <p className="text-sm">اختر الفصل ثم اضغط "عرض التقرير"</p>
          </CardContent>
        </Card>
      )}

      <AbsenceReasonDialog
        open={absDialog.open}
        onClose={() => setAbsDialog({ open: false })}
        studentName={absDialog.studentName || ""}
        categoryName={absDialog.categoryName || ""}
        initial={
          absDialog.studentId && absDialog.categoryId
            ? absences[absKey(absDialog.studentId, absDialog.categoryId)]
            : undefined
        }
        onSave={(reason, notes) => {
          if (absDialog.studentId && absDialog.categoryId) {
            saveAbsence(absDialog.studentId, absDialog.categoryId, reason, notes);
            toast({ title: "تم الحفظ", description: "تم تسجيل سبب الغياب" });
          }
        }}
      />
    </div>
  );
}
