import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  ClipboardCheck, GraduationCap, Heart, Trophy, FileText, Users2, Lock,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import PrintPreviewDialog from "@/components/reports/PrintPreviewDialog";
import BehaviorReport from "@/components/reports/BehaviorReport";
import MonthlyAnalytics from "@/components/reports/MonthlyAnalytics";
import ComprehensiveExport from "@/components/reports/ComprehensiveExport";
import ReportFilters from "@/components/reports/ReportFilters";
import AttendanceReportTab from "@/components/reports/AttendanceReportTab";
import GradesReportTab from "@/components/reports/GradesReportTab";
import BulkSendConfirmDialog from "@/components/reports/BulkSendConfirmDialog";
import ReportsHeader from "@/components/reports/ReportsHeader";
import { AttendancePreviewContent, GradesPreviewContent } from "@/components/reports/ReportPreviewContent";
import { useReportsData } from "@/hooks/useReportsData";

export default function ReportsPage() {
  const r = useReportsData();

  if (r.permsLoaded && !r.teacherPerms.can_view_reports && !r.teacherPerms.read_only_mode) {
    return (
      <div className="space-y-6 animate-fade-in flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-muted mx-auto">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground">لا تملك صلاحية عرض التقارير</h2>
          <p className="text-muted-foreground text-sm">تواصل مع المدير لتفعيل صلاحية مشاهدة التقارير</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <ReportsHeader
        sendingSMS={r.sendingSMS}
        selectedStudent={r.selectedStudent}
        handleSendSMS={r.handleSendSMS}
        handleSendWhatsApp={r.handleSendWhatsApp}
        setBulkConfirm={r.setBulkConfirm}
      />

      {/* Bulk send progress */}
      {r.bulkProgress.active && (
        <Card className="border-0 shadow-lg bg-card/80 print:hidden">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Users2 className="h-5 w-5 text-primary" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">جارٍ الإرسال الجماعي...</span>
                  <span className="text-muted-foreground">{r.bulkProgress.current} / {r.bulkProgress.total}</span>
                </div>
                <Progress value={(r.bulkProgress.current / r.bulkProgress.total) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <ReportFilters
        classes={r.classes}
        selectedClass={r.selectedClass}
        setSelectedClass={r.setSelectedClass}
        students={r.students}
        selectedStudent={r.selectedStudent}
        setSelectedStudent={r.setSelectedStudent}
        reportType={r.reportType}
        setReportType={r.handleReportTypeChange}
        dateFromDate={r.dateFromDate}
        setDateFromDate={r.setDateFromDate}
        dateToDate={r.dateToDate}
        setDateToDate={r.setDateToDate}
        selectedWeeks={r.selectedWeeks}
        toggleWeek={r.toggleWeek}
        toggleAllWeeks={r.toggleAllWeeks}
        getWeeksInfo={r.getWeeksInfo}
        currentWeek={r.currentWeek}
      />

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="report-tabs-list w-full justify-start print:hidden h-auto p-1.5 gap-1.5 bg-muted/60 rounded-xl">
          <TabsTrigger value="attendance" className="report-tab report-tab--attendance gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all">
            <ClipboardCheck className="h-4 w-4" />
            تقرير الحضور
          </TabsTrigger>
          <TabsTrigger value="grades" className="report-tab report-tab--grades gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all">
            <GraduationCap className="h-4 w-4" />
            تقرير الدرجات
          </TabsTrigger>
          <TabsTrigger value="behavior" className="report-tab report-tab--behavior gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all">
            <Heart className="h-4 w-4" />
            تقرير السلوك
          </TabsTrigger>
          <TabsTrigger value="analytics" className="report-tab gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400">
            <Trophy className="h-4 w-4" />
            التحليل الشهري
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="report-tab gap-1.5 rounded-lg px-4 py-2.5 font-medium transition-all data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400">
            <FileText className="h-4 w-4" />
            تقارير شاملة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceReportTab
            attendanceData={r.attendanceData}
            loadingAttendance={r.loadingAttendance}
            selectedClass={r.selectedClass}
            fetchAttendance={r.fetchAttendance}
            onPreview={() => { r.setPreviewType("attendance"); r.setPreviewOpen(true); }}
            exportAttendanceExcel={r.exportAttendanceExcel}
            exportAttendancePDF={r.exportAttendancePDF}
            shareAttendanceWhatsApp={r.shareAttendanceWhatsApp}
            reportType={r.reportType}
            students={r.students}
            periodsPerWeek={r.periodsPerWeek}
            dateFrom={r.dateFrom}
            dateTo={r.dateTo}
            className={r.className}
          />
        </TabsContent>

        <TabsContent value="grades">
          <GradesReportTab
            gradeData={r.gradeData}
            categoryNames={r.categoryNames}
            loadingGrades={r.loadingGrades}
            selectedClass={r.selectedClass}
            fetchGrades={r.fetchGrades}
            onPreview={() => { r.setPreviewType("grades"); r.setPreviewOpen(true); }}
            exportGradesExcel={r.exportGradesExcel}
            exportGradesPDF={r.exportGradesPDF}
            shareGradesWhatsApp={r.shareGradesWhatsApp}
          />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <BehaviorReport selectedClass={r.selectedClass} dateFrom={r.dateFrom} dateTo={r.dateTo} selectedStudent={r.selectedStudent} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <MonthlyAnalytics selectedClass={r.selectedClass} classes={r.classes} />
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <ComprehensiveExport classes={r.classes} />
        </TabsContent>
      </Tabs>

      {/* Print Preview Dialog */}
      <PrintPreviewDialog
        open={r.previewOpen}
        onOpenChange={r.setPreviewOpen}
        reportType={r.previewType}
        title={r.previewType === "attendance" ? "تقرير الحضور" : r.previewType === "grades" ? "تقرير الدرجات" : "تقرير السلوك"}
      >
        {r.previewType === "attendance" && r.attendanceData.length > 0 && (
          <AttendancePreviewContent attendanceData={r.attendanceData} attendanceSummary={r.attendanceSummary} />
        )}
        {r.previewType === "grades" && r.gradeData.length > 0 && (
          <GradesPreviewContent gradeData={r.gradeData} categoryNames={r.categoryNames} />
        )}
      </PrintPreviewDialog>

      {/* Bulk send confirmation dialog */}
      <BulkSendConfirmDialog
        open={r.bulkConfirm.open}
        onOpenChange={(open) => r.setBulkConfirm((prev: any) => ({ ...prev, open }))}
        students={r.students}
        onConfirm={() => r.handleBulkSendSMS(r.bulkConfirm.sections)}
      />
    </div>
  );
}
