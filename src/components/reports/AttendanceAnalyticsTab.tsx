import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, TrendingUp } from "lucide-react";
import AttendanceReportTab from "@/components/reports/AttendanceReportTab";
import MonthlyAnalytics from "@/components/reports/MonthlyAnalytics";
import { usePersistedState } from "@/hooks/usePersistedState";
import type { AttendanceRow } from "@/hooks/useReportSending";

interface Props {
  // Attendance props
  attendanceData: AttendanceRow[];
  loadingAttendance: boolean;
  selectedClass: string;
  fetchAttendance: () => void;
  onPreview: () => void;
  exportAttendanceExcel: () => void;
  exportAttendancePDF: () => void;
  shareAttendanceWhatsApp: () => void;
  reportType: "daily" | "periodic" | "semester";
  students: { id: string; full_name: string; parent_phone: string | null }[];
  periodsPerWeek: number;
  dateFrom: string;
  dateTo: string;
  className: string;
  // Monthly analytics props
  classes: { id: string; name: string }[];
}

export default function AttendanceAnalyticsTab(p: Props) {
  const [sub, setSub] = usePersistedState("reports.attendance_sub", "records");

  return (
    <Tabs value={sub} onValueChange={setSub} dir="rtl" className="space-y-4">
      <TabsList className="bg-muted/40 backdrop-blur p-1 rounded-xl w-full md:w-auto border border-border/30">
        <TabsTrigger value="records" className="gap-1.5 rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
          <ClipboardCheck className="h-4 w-4" />
          سجلات الحضور
        </TabsTrigger>
        <TabsTrigger value="monthly" className="gap-1.5 rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm" style={{ /* monthly accent */ }}>
          <TrendingUp className="h-4 w-4 text-amber-500" />
          التحليل الشهري
        </TabsTrigger>
      </TabsList>

      <TabsContent value="records" className="space-y-4 mt-0 animate-fade-in">
        <AttendanceReportTab
          attendanceData={p.attendanceData}
          loadingAttendance={p.loadingAttendance}
          selectedClass={p.selectedClass}
          fetchAttendance={p.fetchAttendance}
          onPreview={p.onPreview}
          exportAttendanceExcel={p.exportAttendanceExcel}
          exportAttendancePDF={p.exportAttendancePDF}
          shareAttendanceWhatsApp={p.shareAttendanceWhatsApp}
          reportType={p.reportType}
          students={p.students}
          periodsPerWeek={p.periodsPerWeek}
          dateFrom={p.dateFrom}
          dateTo={p.dateTo}
          className={p.className}
        />
      </TabsContent>

      <TabsContent value="monthly" className="space-y-4 mt-0 animate-fade-in">
        <MonthlyAnalytics selectedClass={p.selectedClass} classes={p.classes} />
      </TabsContent>
    </Tabs>
  );
}
