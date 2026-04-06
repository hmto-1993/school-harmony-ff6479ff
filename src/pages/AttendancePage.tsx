import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";
import { Save, CheckCircle2, ClipboardCheck, Search, CalendarIcon, ArrowRightLeft, Lock, AlertTriangle } from "lucide-react";
import ScrollToSaveButton from "@/components/shared/ScrollToSaveButton";
import EmptyState from "@/components/EmptyState";
import AcademicWeekBadge from "@/components/dashboard/AcademicWeekBadge";
import AttendanceStats from "@/components/attendance/AttendanceStats";
import AttendanceClassSelector from "@/components/attendance/AttendanceClassSelector";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import AttendanceExportMenu from "@/components/attendance/AttendanceExportMenu";
import MoveSessionDialogs from "@/components/attendance/MoveSessionDialogs";
import PrintFooterSignatures from "@/components/shared/PrintFooterSignatures";
import { useAttendanceData, statusOptions } from "@/hooks/useAttendanceData";
import type { AttendanceStatus } from "@/hooks/useAttendanceData";
import { safeWriteXLSX } from "@/lib/download-utils";

export default function AttendancePage() {
  const {
    perms, permsLoaded, role,
    classesLoading, classes, selectedClass, setSelectedClass,
    studentsLoading, records, saving,
    selectedDate, setSelectedDate, date,
    statusFilter, setStatusFilter, searchQuery, setSearchQuery,
    dayNote, setDayNote, savedDayNote, savingNote, saveDayNote,
    moveDialogOpen, setMoveDialogOpen, moveConfirmOpen, setMoveConfirmOpen,
    moveTargetDate, setMoveTargetDate, movingDate, handleMoveSession,
    weeklyProgress, weeklyProgressLoaded, overrideLock,
    absenceAlerts, selectedProgress, isClassLocked,
    filteredRecords, isViewOnly,
    updateStatus, updateNotes, markAllPresent, markAllAbsent, handleSave,
    toast,
  } = useAttendanceData();

  const exportAttendanceExcel = async (scope: "all" | "filtered" = "all") => {
    const data = scope === "filtered" ? filteredRecords : records;
    if (!data.length) return;
    const XLSX = await import("xlsx");
    const className = classes.find(c => c.id === selectedClass)?.name || "";
    const statusLabel: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر", early_leave: "منصرف مبكرًا", sick_leave: "إجازة مرضية" };
    const rows = data.map((r, i) => ({ "#": i + 1, "الاسم": r.full_name, "الحالة": statusLabel[r.status] || r.status, "الملاحظات": r.notes || "" }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "الحضور");
    const suffix = scope === "filtered" && statusFilter !== "all" ? `_${statusFilter}` : "";
    safeWriteXLSX(wb, `حضور_${className}_${date}${suffix}.xlsx`);
    toast({ title: "تم", description: `تم تصدير ${data.length} سجل إلى Excel` });
  };

  const exportAttendancePDF = async (scope: "all" | "filtered" = "all") => {
    const data = scope === "filtered" ? filteredRecords : records;
    if (!data.length) return;
    const { createArabicPDF, getArabicTableStyles, finalizePDF } = await import("@/lib/arabic-pdf");
    const autoTableImport = await import("jspdf-autotable");
    const autoTable = autoTableImport.default;
    const className = classes.find(c => c.id === selectedClass)?.name || "";
    const statusLabel: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر", early_leave: "منصرف مبكرًا", sick_leave: "إجازة مرضية" };
    const filterLabel = scope === "filtered" && statusFilter !== "all"
      ? ` (${statusOptions.find(o => o.value === statusFilter)?.label || statusFilter})`
      : "";
    const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "portrait", reportType: "attendance", includeHeader: true });
    const tableStyles = getArabicTableStyles(advanced);
    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text(`تقرير الحضور — ${className} — ${date}${filterLabel}`, doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });
    const head = [["الملاحظات", "الحالة", "الاسم", "#"]];
    const body = data.map((r, i) => [r.notes || "", statusLabel[r.status] || r.status, r.full_name, String(i + 1)]);
    autoTable(doc, { head, body, startY: startY + 8, ...tableStyles, columnStyles: { 2: { halign: "right" as const, fontStyle: "bold" as const }, 3: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 } } });
    const suffix = scope === "filtered" && statusFilter !== "all" ? `_${statusFilter}` : "";
    finalizePDF(doc, `حضور_${className}_${date}${suffix}.pdf`, watermark, advanced);
    toast({ title: "تم", description: `تم تصدير ${data.length} سجل إلى PDF` });
  };

  const exportAttendanceWhatsApp = async (scope: "all" | "filtered" = "all") => {
    const data = scope === "filtered" ? filteredRecords : records;
    if (!data.length) return;
    const { createArabicPDF, getArabicTableStyles, finalizePDFAsBlob } = await import("@/lib/arabic-pdf");
    const autoTableImport = await import("jspdf-autotable");
    const autoTable = autoTableImport.default;
    const className = classes.find(c => c.id === selectedClass)?.name || "";
    const statusLabel: Record<string, string> = { present: "حاضر", absent: "غائب", late: "متأخر", early_leave: "منصرف مبكرًا", sick_leave: "إجازة مرضية" };
    const filterLabel = scope === "filtered" && statusFilter !== "all"
      ? ` (${statusOptions.find(o => o.value === statusFilter)?.label || statusFilter})`
      : "";
    const { doc, startY, watermark, advanced } = await createArabicPDF({ orientation: "portrait", reportType: "attendance", includeHeader: true });
    const tableStyles = getArabicTableStyles(advanced);
    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text(`تقرير الحضور — ${className} — ${date}${filterLabel}`, doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });
    const head = [["الملاحظات", "الحالة", "الاسم", "#"]];
    const body = data.map((r, i) => [r.notes || "", statusLabel[r.status] || r.status, r.full_name, String(i + 1)]);
    autoTable(doc, { head, body, startY: startY + 8, ...tableStyles, columnStyles: { 2: { halign: "right" as const, fontStyle: "bold" as const }, 3: { halign: "center" as const, fontStyle: "bold" as const, cellWidth: 10 } } });
    const suffix = scope === "filtered" && statusFilter !== "all" ? `_${statusFilter}` : "";
    const fileName = `حضور_${className}_${date}${suffix}.pdf`;
    const pdfBlob = finalizePDFAsBlob(doc, watermark, advanced);
    const { sharePDFViaWhatsApp } = await import("@/lib/whatsapp-share");
    const result = await sharePDFViaWhatsApp(pdfBlob, fileName, `📋 تقرير الحضور — ${className} — ${date}${filterLabel}`);
    toast({ title: result === "shared" ? "تم المشاركة" : "تم تصدير PDF", description: result === "shared" ? "تم مشاركة ملف PDF بنجاح" : "تم تحميل الملف، يمكنك إرفاقه في واتساب" });
  };

  if (permsLoaded && !perms.can_view_attendance && !perms.read_only_mode && role !== "admin") {
    return <EmptyState icon={Lock} title="لا تملك صلاحية عرض الحضور" description="تواصل مع المسؤول لتفعيل صلاحية عرض الحضور" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          التحضير
        </h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-muted-foreground">التاريخ:</span>
          <HijriDatePicker date={selectedDate} onDateChange={(d) => setSelectedDate(d)} />
          <AcademicWeekBadge date={selectedDate} />
          {selectedClass && records.some(r => r.existing_id) && (
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setMoveTargetDate(selectedDate); setMoveDialogOpen(true); }}>
              <ArrowRightLeft className="h-3.5 w-3.5" />
              نقل الحصة
            </Button>
          )}
          {savedDayNote && (
            <span className="text-xs px-2 py-1 rounded-md bg-info/10 text-info border border-info/30">📝 {savedDayNote}</span>
          )}
        </div>
      </div>

      <MoveSessionDialogs
        date={date} records={records}
        moveDialogOpen={moveDialogOpen} setMoveDialogOpen={setMoveDialogOpen}
        moveConfirmOpen={moveConfirmOpen} setMoveConfirmOpen={setMoveConfirmOpen}
        moveTargetDate={moveTargetDate} setMoveTargetDate={setMoveTargetDate}
        movingDate={movingDate} onMoveSession={handleMoveSession}
      />

      <AttendanceClassSelector
        classes={classes} classesLoading={classesLoading}
        selectedClass={selectedClass} onSelectClass={setSelectedClass}
        weeklyProgress={weeklyProgress} weeklyProgressLoaded={weeklyProgressLoaded}
        overrideLock={overrideLock}
      />

      {/* Day Note */}
      {selectedClass && (
        <Card className="border-0 shadow-sm bg-card/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Input value={dayNote} onChange={(e) => setDayNote(e.target.value)} placeholder="ملاحظة اليوم (مثال: إجازة، مرضي، تأجيل...)" className="flex-1 h-9 text-sm" />
              <Button onClick={saveDayNote} disabled={savingNote || dayNote === savedDayNote} size="sm" variant="outline" className="shrink-0">
                <Save className="h-4 w-4 ml-1" />
                حفظ الملاحظة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lock Banner */}
      {isClassLocked && selectedClass && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-warning/40 bg-warning/10 p-4 animate-fade-in">
          <Lock className="h-6 w-6 text-warning shrink-0" />
          <div>
            <p className="font-semibold text-sm text-warning">تم الوصول للحد الأسبوعي</p>
            <p className="text-xs text-muted-foreground">
              اكتمل تحضير هذا الفصل ({selectedProgress?.sessions}/{selectedProgress?.limit} حصص). لإضافة حصص إضافية، فعّل "تجاوز القفل" من الإعدادات.
            </p>
          </div>
        </div>
      )}

      <AttendanceStats
        total={records.length}
        present={records.filter((r) => r.status === "present").length}
        absent={records.filter((r) => r.status === "absent").length}
        late={records.filter((r) => r.status === "late").length}
        earlyLeave={records.filter((r) => r.status === "early_leave").length}
        sickLeave={records.filter((r) => r.status === "sick_leave").length}
        activeFilter={statusFilter === "all" ? "all" : statusFilter}
        onFilterChange={(f) => setStatusFilter(f as AttendanceStatus | "all")}
      />

      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80">
        <CardContent className="pt-6">
          {studentsLoading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-4 rounded bg-muted/50" />
                  <div className="h-4 w-32 rounded bg-muted/50" />
                  <div className="flex-1" />
                  <div className="h-8 w-24 rounded-lg bg-muted/40" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title={selectedClass ? "لا يوجد طلاب في هذا الفصل" : "اختر فصلاً لبدء تسجيل الحضور"}
              description={selectedClass ? "تأكد من إضافة طلاب لهذا الفصل أولاً" : "حدد الفصل من القائمة أعلاه لعرض قائمة الطلاب وتسجيل حضورهم"}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <Button size="sm" onClick={markAllPresent} disabled={isClassLocked} className="gap-1.5 bg-success hover:bg-success/90 text-success-foreground shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  تحديد الكل حاضر
                </Button>
                <Button size="sm" variant="outline" onClick={markAllAbsent} disabled={isClassLocked} className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  تحديد الكل غائب
                </Button>
                <AttendanceExportMenu
                  statusFilter={statusFilter}
                  onExportExcel={exportAttendanceExcel}
                  onExportPDF={exportAttendancePDF}
                  onExportWhatsApp={exportAttendanceWhatsApp}
                />
                <div className="relative flex-1 min-w-[160px] max-w-[280px]">
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input placeholder="بحث عن طالب..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 text-xs pr-8 backdrop-blur-sm" />
                </div>
                <ScrollToSaveButton targetId="attendance-save" />
              </div>

              <AttendanceTable
                records={filteredRecords}
                allRecords={records}
                absenceAlerts={absenceAlerts}
                updateStatus={updateStatus}
                updateNotes={updateNotes}
              />

              <div id="attendance-save" className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving || isClassLocked || isViewOnly} className="shadow-md shadow-primary/20">
                  <Save className="h-4 w-4 ml-2" />
                  {isViewOnly ? "عرض فقط" : isClassLocked ? "🔒 مغلق" : saving ? "جارٍ الحفظ..." : "حفظ الحضور"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <PrintFooterSignatures reportType="attendance" />
    </div>
  );
}
