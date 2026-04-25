import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart3, Users, Eye, FileText, Share2, ClipboardCheck, GraduationCap, Activity, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import GradesChart from "@/components/reports/GradesChart";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import PrintWatermark from "@/components/shared/PrintWatermark";
import ReportExportDialog from "@/components/reports/ReportExportDialog";
import HomeworkPanel from "./grades-smart/HomeworkPanel";
import GradesViewControls from "./grades-smart/GradesViewControls";
import LevelsReport from "./grades-smart/LevelsReport";
import AbsenceReasonDialog from "./grades-smart/AbsenceReasonDialog";
import SectionGradesTable from "./grades-smart/SectionGradesTable";
import ExamsSummaryPanel from "./grades-smart/ExamsSummaryPanel";
import MissingGradesAlert from "./grades-smart/MissingGradesAlert";
import PeriodComparePanel from "./grades-smart/PeriodComparePanel";
import { useHomeworkTargets, useExamAbsences } from "./grades-smart/useGradesSmartData";
import {
  studentPercent, homeworkStatus,
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
  period: 1 | 2;
  setPeriod: (p: 1 | 2) => void;
}

export default function GradesReportTab({
  gradeData, categoryNames, categoryMeta = [], loadingGrades, selectedClass,
  fetchGrades, onPreview, exportGradesExcel, exportGradesPDF, shareGradesWhatsApp,
  period, setPeriod,
}: GradesReportTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [examFilter, setExamFilter] = useState<string>("all");
  const [showLevelsReport, setShowLevelsReport] = useState(false);
  const [activeSection, setActiveSection] = useState<"homework" | "exams">("exams");
  const [examColumn, setExamColumn] = useState<string>("all");
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const [absDialog, setAbsDialog] = useState<{ open: boolean; studentId?: string; studentName?: string; categoryId?: string; categoryName?: string }>({ open: false });

  const { homeworkCategories, targets, saveTarget } = useHomeworkTargets(selectedClass, categoryMeta);
  const examCategories = useMemo(
    () => categoryMeta.filter((c) => {
      const n = c.name || "";
      return n.includes("فترة") || n.includes("عملي") || n.toLowerCase().includes("period") || n.toLowerCase().includes("practical");
    }),
    [categoryMeta]
  );
  const { absences, saveAbsence, key: absKey } = useExamAbsences(selectedClass, examCategories);

  const filteredRows = useMemo(() => {
    if (examFilter === "all") return gradeData;
    const cat = examCategories.find((c) => c.id === examFilter);
    if (!cat) return gradeData;
    return gradeData.filter((r) => r.categories[cat.name] === null || r.categories[cat.name] === undefined);
  }, [gradeData, examFilter, examCategories]);

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

  const visibleExamCategories = examColumn === "all"
    ? examCategories
    : examCategories.filter((c) => c.id === examColumn);

  // Filter active when user narrows by exam column or "missing-grades" exam filter
  const filterActive = examFilter !== "all" || examColumn !== "all";
  const filterLabel = (() => {
    const parts: string[] = [];
    if (examColumn !== "all") {
      const col = examCategories.find((c) => c.id === examColumn);
      if (col) parts.push(col.name);
    }
    if (examFilter !== "all") {
      const ex = examCategories.find((c) => c.id === examFilter);
      if (ex) parts.push(`ناقص: ${ex.name}`);
    }
    return parts.join(" • ");
  })();

  // Wrapped exports: when scope === "filtered", export sortedRows + visible categories
  const handleExportExcel = async (scope: "all" | "filtered") => {
    if (scope === "all") return exportGradesExcel();
    const cats = visibleExamCategories.length > 0 ? visibleExamCategories : categoryMeta;
    const catNames = cats.map((c) => c.name);
    const XLSX = await import("xlsx");
    const rows = sortedRows.map((r) => {
      const row: Record<string, any> = { "اسم الطالب": r.student_name };
      catNames.forEach((n) => { row[n] = r.categories[n] ?? "—"; });
      row["المجموع"] = r.total;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الدرجات");
    const { safeWriteXLSX } = await import("@/lib/download-utils");
    safeWriteXLSX(wb, `تقرير_الدرجات_مفلتر.xlsx`);
  };

  const handleExportPDF = async (scope: "all" | "filtered") => {
    if (scope === "all") return exportGradesPDF();
    const cats = visibleExamCategories.length > 0 ? visibleExamCategories : categoryMeta;
    const { buildGradesPDF, savePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildGradesPDF(sortedRows, cats.map((c) => c.name));
    savePDFBlob(blob, fileName);
  };

  const handleShareWhatsApp = async (scope: "all" | "filtered") => {
    if (scope === "all") return shareGradesWhatsApp();
    const cats = visibleExamCategories.length > 0 ? visibleExamCategories : categoryMeta;
    const { buildGradesPDF, sharePDFBlob } = await import("@/lib/report-pdf-builders");
    const { blob, fileName } = await buildGradesPDF(sortedRows, cats.map((c) => c.name));
    const result = await sharePDFBlob(blob, fileName, `📋 تقرير الدرجات (مفلتر)`);
    toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
  };

  return (
    <div className="space-y-4">
      {/* Unified action toolbar */}
      <div className="flex items-center gap-2 flex-wrap print:hidden p-2 rounded-xl bg-muted/30 border border-border/30">
        <Button onClick={fetchGrades} disabled={loadingGrades || !selectedClass} size="sm" className="gap-1.5">
          <BarChart3 className="h-4 w-4" />
          {loadingGrades ? "جارٍ التحميل..." : "عرض التقرير"}
        </Button>
        {gradeData.length > 0 && (
          <>
            <div className="h-6 w-px bg-border/60 mx-1" />
            <Button variant="ghost" size="sm" onClick={onPreview} className="gap-1.5 h-8">
              <Eye className="h-4 w-4" />معاينة
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportLevelsPDF} className="gap-1.5 h-8">
              <FileText className="h-4 w-4" />المستويات PDF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareLevelsWhatsApp}
              className="gap-1.5 h-8 text-success hover:bg-success/10"
            >
              <Share2 className="h-4 w-4" />واتساب المستويات
            </Button>
            <div className="flex-1" />
            <ReportExportDialog
              title="تصدير تقرير الدرجات"
              filterActive={filterActive}
              filterLabel={filterActive ? filterLabel : undefined}
              filteredCount={sortedRows.length}
              totalCount={gradeData.length}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              onShareWhatsApp={handleShareWhatsApp}
            />
          </>
        )}
      </div>

      {gradeData.length > 0 && (
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as "homework" | "exams")} dir="rtl">
          <TabsList className="grid grid-cols-2 w-full max-w-md print:hidden">
            <TabsTrigger value="exams" className="gap-1.5">
              <GraduationCap className="h-4 w-4" />
              الاختبارات ({examCategories.length})
            </TabsTrigger>
            <TabsTrigger value="homework" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              الواجبات ({homeworkCategories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="homework" className="space-y-4 mt-4 animate-fade-in">
            <HomeworkPanel
              homeworkCategories={homeworkCategories}
              targets={targets}
              saveTarget={saveTarget}
              rows={gradeData}
            />
            {homeworkCategories.length > 0 && (
              <SectionGradesTable
                title="جدول الواجبات"
                categories={homeworkCategories}
                rows={sortedRows}
                allCategoriesMeta={categoryMeta}
                examCategories={examCategories}
                viewMode={viewMode}
                formatCellValue={formatCellValue}
                absences={absences}
                absKey={absKey}
                onAbsentClick={(s, c) => setAbsDialog({ open: true, studentId: s.student_id, studentName: s.student_name, categoryId: c.id, categoryName: c.name })}
              />
            )}
          </TabsContent>

          <TabsContent value="exams" className="space-y-4 mt-4 animate-fade-in">
            {/* Controls (consolidated) */}
            <GradesViewControls
              viewMode={viewMode} setViewMode={setViewMode}
              sortKey={sortKey} setSortKey={setSortKey}
              sortDir={sortDir} setSortDir={setSortDir}
              period={period} setPeriod={setPeriod}
              examCategories={examCategories}
              showLevelsReport={showLevelsReport} setShowLevelsReport={setShowLevelsReport}
              examColumn={examColumn} setExamColumn={setExamColumn}
            />

            {/* Missing grades — also acts as the exam filter */}
            <MissingGradesAlert
              examCategories={examCategories}
              visibleCategories={visibleExamCategories}
              rows={gradeData}
              examFilter={examFilter}
              setExamFilter={setExamFilter}
            />

            {/* Analytics block (collapsible) */}
            <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-9 px-3 rounded-lg bg-gradient-to-l from-primary/5 to-success/5 border border-border/30 hover:from-primary/10 hover:to-success/10 print:hidden"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-primary" />
                    لوحة التحليلات
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${analyticsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3 animate-fade-in">
                <ExamsSummaryPanel examCategories={examCategories} rows={gradeData} />
                <PeriodComparePanel selectedClass={selectedClass} categoryMeta={categoryMeta} />
              </CollapsibleContent>
            </Collapsible>

            {showLevelsReport && (
              <LevelsReport rows={filteredRows} categories={categoryMeta} />
            )}

            <div className="print-area space-y-4">
              <ReportPrintHeader reportType="grades" />
              <PrintWatermark reportType="grades" />
              <GradesChart data={filteredRows} categoryNames={categoryNames} />

              <SectionGradesTable
                title="جدول الاختبارات"
                categories={
                  visibleExamCategories.length > 0 ? visibleExamCategories : categoryMeta
                }
                rows={sortedRows}
                allCategoriesMeta={categoryMeta}
                examCategories={examCategories}
                viewMode={viewMode}
                formatCellValue={formatCellValue}
                absences={absences}
                absKey={absKey}
                onAbsentClick={(s, c) => setAbsDialog({ open: true, studentId: s.student_id, studentName: s.student_name, categoryId: c.id, categoryName: c.name })}
                showTotal
                showLevelPerCell
              />
            </div>
          </TabsContent>
        </Tabs>
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
