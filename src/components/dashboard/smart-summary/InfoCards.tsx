import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserX, BookOpen, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import AbsenceWarningSlip from "@/components/reports/AbsenceWarningSlip";
import type { AbsentStudent, AtRiskStudent } from "@/hooks/useSmartDashboardData";

interface Props {
  currentLesson: string | null;
  currentWeek: number | null;
  absentToday: AbsentStudent[];
  atRiskStudents: AtRiskStudent[];
  absSettingsDisplay: { mode: string; threshold: number; allowedSessions: number };
}

export default function InfoCards({ currentLesson, currentWeek, absentToday, atRiskStudents, absSettingsDisplay }: Props) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);

  const openWarning = (student: AtRiskStudent) => {
    setSelectedStudent(student);
    setWarningOpen(true);
  };

  return (
    <>
      {/* Current Lesson */}
      <Card className="border-0 ring-1 ring-info/15 bg-gradient-to-br from-info/5 via-card to-info/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-info to-info/70 shadow-md">
              <BookOpen className="h-4 w-4 text-info-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">درس اليوم</p>
              <p className="text-xs text-muted-foreground">
                {currentWeek ? `الأسبوع ${currentWeek}` : "الخطة الدراسية"}
              </p>
            </div>
          </div>
          {currentLesson ? (
            <div className="bg-info/5 rounded-lg px-3 py-2">
              <p className="text-sm font-semibold text-foreground">{currentLesson}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">لم يتم تعيين درس لهذا اليوم</p>
          )}
        </CardContent>
      </Card>

      {/* Absent Today */}
      <Card className="border-0 ring-1 ring-destructive/15 bg-gradient-to-br from-destructive/5 via-card to-destructive/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-destructive to-destructive/70 shadow-md">
              <UserX className="h-4 w-4 text-destructive-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">الغياب اليوم</p>
              <p className="text-xs text-muted-foreground">إجمالي الغائبين</p>
            </div>
            <Badge variant="destructive" className="mr-auto text-lg px-3 py-0.5">
              {absentToday.length}
            </Badge>
          </div>
          {absentToday.length > 0 ? (
            <div className="max-h-24 overflow-y-auto space-y-1 scrollbar-thin">
              {absentToday.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-destructive/5 rounded-lg px-2 py-1">
                  <span className="font-medium text-foreground truncate">{s.full_name}</span>
                  <span className="text-muted-foreground text-[10px]">{s.class_name}</span>
                </div>
              ))}
              {absentToday.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{absentToday.length - 5} طالب آخر
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-success font-medium">✓ لا يوجد غياب اليوم</p>
          )}
        </CardContent>
      </Card>

      {/* At-Risk Students */}
      <Card className="border-0 ring-1 ring-warning/15 bg-gradient-to-br from-warning/5 via-card to-warning/10 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-warning to-warning/70 shadow-md">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">حد الغياب {absSettingsDisplay.mode === "sessions" && absSettingsDisplay.allowedSessions > 0 ? `${absSettingsDisplay.allowedSessions} حصة` : `${absSettingsDisplay.threshold}%`}</p>
              <p className="text-xs text-muted-foreground">طلاب بلغوا الحد</p>
            </div>
            <Badge className={cn(
              "mr-auto text-lg px-3 py-0.5",
              atRiskStudents.length > 0
                ? "bg-warning text-warning-foreground hover:bg-warning/80"
                : "bg-success text-success-foreground hover:bg-success/80"
            )}>
              {atRiskStudents.length}
            </Badge>
          </div>
          {atRiskStudents.length > 0 ? (
            <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-thin">
              {atRiskStudents.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs bg-warning/5 rounded-lg px-2 py-1.5 gap-2">
                  <span className="font-medium text-foreground truncate flex-1">{s.full_name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-warning font-bold text-[10px]">{s.absenceRate}%</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openWarning(s)}
                    >
                      <FileWarning className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {atRiskStudents.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  +{atRiskStudents.length - 5} طالب آخر
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-success font-medium">✓ لا يوجد طلاب بلغوا الحد</p>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <AbsenceWarningSlip
          open={warningOpen}
          onOpenChange={setWarningOpen}
          studentId={selectedStudent.id}
          studentName={selectedStudent.full_name}
          className={selectedStudent.class_name}
          absenceRate={selectedStudent.absenceRate}
          totalAbsent={selectedStudent.totalAbsent}
          totalDays={selectedStudent.totalDays}
        />
      )}
    </>
  );
}
