import { Tabs, TabsContent } from "@/components/ui/tabs";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Lock } from "lucide-react";
import PrintPreviewDialog from "@/components/reports/PrintPreviewDialog";
import MonthlyAnalytics from "@/components/reports/MonthlyAnalytics";
import ComprehensiveExport from "@/components/reports/ComprehensiveExport";
import ReportFilters from "@/components/reports/ReportFilters";
import AttendanceReportTab from "@/components/reports/AttendanceReportTab";
import GradesReportTab from "@/components/reports/GradesReportTab";
import BehaviorViolationsTab from "@/components/reports/BehaviorViolationsTab";
import BulkSendConfirmDialog from "@/components/reports/BulkSendConfirmDialog";
import BulkSendProgressCard from "@/components/reports/BulkSendProgressCard";
import ReportsHeader from "@/components/reports/ReportsHeader";
import ReportsTabsNav from "@/components/reports/ReportsTabsNav";
import { AttendancePreviewContent, GradesPreviewContent } from "@/components/reports/ReportPreviewContent";
import { useReportsData } from "@/hooks/useReportsData";

export default function ReportsPage() {
  const r = useReportsData();
  const [activeTab, setActiveTab] = usePersistedState("reports_active_tab", "attendance");

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

      <BulkSendProgressCard
        current={r.bulkProgress.current}
        total={r.bulkProgress.total}
        active={r.bulkProgress.active}
      />

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

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <ReportsTabsNav />

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
            categoryMeta={r.categoryMeta}
            loadingGrades={r.loadingGrades}
            selectedClass={r.selectedClass}
            fetchGrades={r.fetchGrades}
            onPreview={() => { r.setPreviewType("grades"); r.setPreviewOpen(true); }}
            exportGradesExcel={r.exportGradesExcel}
            exportGradesPDF={r.exportGradesPDF}
            shareGradesWhatsApp={r.shareGradesWhatsApp}
            scope={r.gradesScope}
            setScope={r.setGradesScope}
            period={r.gradesPeriod}
            setPeriod={r.setGradesPeriod}
          />
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <BehaviorViolationsTab
            selectedClass={r.selectedClass}
            dateFrom={r.dateFrom}
            dateTo={r.dateTo}
            selectedStudent={r.selectedStudent}
            reportType={r.reportType}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <MonthlyAnalytics selectedClass={r.selectedClass} classes={r.classes} />
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-4">
          <ComprehensiveExport classes={r.classes} />
        </TabsContent>
      </Tabs>

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

      <BulkSendConfirmDialog
        open={r.bulkConfirm.open}
        onOpenChange={(open) => r.setBulkConfirm((prev: any) => ({ ...prev, open }))}
        students={r.students}
        onConfirm={() => r.handleBulkSendSMS(r.bulkConfirm.sections)}
      />
    </div>
  );
}
