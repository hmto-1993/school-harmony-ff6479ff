import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  GraduationCap, ClipboardCheck, ShieldCheck, BookOpen,
  FileText, Loader2, ClipboardList, Layers,
  User, Hash, BookMarked, Heart, MessageCircle, ChevronUp,
} from "lucide-react";
import StudentActivitiesTab from "@/components/activities/StudentActivitiesTab";
import StudentAnnouncements from "@/components/announcements/StudentAnnouncements";
import StudentNotificationCards from "@/components/student/StudentNotificationCards";
import HonorRoll from "@/components/student/HonorRoll";
import ParentContactForm from "@/components/parent/ParentContactForm";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useStudentPdfExport } from "@/hooks/useStudentPdfExport";
import StudentDashboardHeader from "@/components/student-dashboard/StudentDashboardHeader";
import StudentSummaryCards from "@/components/student-dashboard/StudentSummaryCards";
import StudentGradesTab from "@/components/student-dashboard/StudentGradesTab";
import StudentEvaluationTab from "@/components/student-dashboard/StudentEvaluationTab";
import StudentAttendanceTab from "@/components/student-dashboard/StudentAttendanceTab";
import StudentBehaviorTab from "@/components/student-dashboard/StudentBehaviorTab";
import StudentLibraryTab from "@/components/student-dashboard/StudentLibraryTab";
import StudentPopupDialog from "@/components/student-dashboard/StudentPopupDialog";

function InlineContactSection({ studentId, studentName, classId }: { studentId: string; studentName: string; classId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full" dir="rtl">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-bold text-base transition-all duration-300",
          "bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30 dark:hover:bg-sky-500/20",
        )}
      >
        <MessageCircle className="h-5 w-5" />
        تواصل مع المعلم
        <ChevronUp className={cn("h-5 w-5 transition-transform duration-300", !open && "rotate-180")} />
      </button>
      {open && (
        <Card className="mt-3 border-0 shadow-lg bg-card/90 backdrop-blur-sm animate-in slide-in-from-top-2 fade-in duration-300">
          <CardContent className="p-4">
            <ParentContactForm studentId={studentId} studentName={studentName} classId={classId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const { student, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const isParent = student?.login_type === "parent";

  const dashData = useStudentDashboardData(student, isParent);
  const { exportingPdf, handleExportPdf } = useStudentPdfExport(
    student, isParent, dashData.parentVis, dashData.schoolName, dashData.schoolLogoUrl, dashData.parentPdfHeader,
  );

  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (!loading && !student) navigate("/login", { replace: true });
  }, [loading, student, navigate]);

  if (!student) { navigate("/login"); return null; }

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const baseVis = (student.visibility || {}) as Record<string, boolean>;
  const liveVis = dashData.studentVis || {};
  const defaultVis = { grades: true, attendance: true, behavior: true, activities: true, library: true, honorRoll: true, absenceWarning: true, nationalId: true };
  const pick = (k: string) => liveVis[k] ?? baseVis[k] ?? (defaultVis as any)[k];
  const vis = isParent ? {
    grades: (baseVis.grades ?? true) && dashData.parentVis.parentShowGrades,
    attendance: (baseVis.attendance ?? true) && dashData.parentVis.parentShowAttendance,
    behavior: (baseVis.behavior ?? true) && dashData.parentVis.parentShowBehavior,
    activities: dashData.parentVis.parentShowActivities,
    library: dashData.parentVis.parentShowLibrary,
    honorRoll: dashData.parentVis.parentShowHonorRoll,
    absenceWarning: dashData.parentVis.parentShowAbsenceWarning,
    nationalId: dashData.parentVis.parentShowNationalId,
  } : {
    grades: pick("grades"),
    attendance: pick("attendance"),
    behavior: pick("behavior"),
    activities: pick("activities"),
    library: pick("library"),
    honorRoll: pick("honorRoll"),
    absenceWarning: pick("absenceWarning"),
    nationalId: pick("nationalId"),
  };

  const totalWeighted = vis.grades ? student.grades.reduce((sum: number, g: any) => {
    const cat = g.grade_categories;
    if (!cat || g.score === null) return sum;
    return sum + (g.score / cat.max_score) * cat.weight;
  }, 0) : 0;
  const totalWeight = vis.grades ? student.grades.reduce((sum: number, g: any) => {
    const cat = g.grade_categories;
    if (!cat || g.score === null) return sum;
    return sum + cat.weight;
  }, 0) : 0;
  const percentage = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100) : 0;
  const presentCount = vis.attendance ? student.attendance.filter((a: any) => a.status === "present").length : 0;
  const absentCount = vis.attendance ? student.attendance.filter((a: any) => a.status === "absent").length : 0;
  const positiveCount = vis.behavior ? student.behaviors.filter((b: any) => b.type === "إيجابي").length : 0;
  const negativeCount = vis.behavior ? student.behaviors.filter((b: any) => b.type === "سلبي").length : 0;

  const resolvedWelcome = isParent
    ? dashData.welcomeMessage.replace(/\{name\}/g, student.full_name)
    : dashData.studentWelcomeMessage.replace(/\{name\}/g, student.full_name);

  const studentEvalBase = student.evalSettings || { showDaily: true, showClasswork: true, iconsCount: 10 };
  const studentEval = dashData.studentEvalLive
    ? { showDaily: dashData.studentEvalLive.showDaily, showClasswork: dashData.studentEvalLive.showClasswork, iconsCount: dashData.studentEvalLive.iconsCount }
    : studentEvalBase;
  const showEvalTab = isParent ? (dashData.parentVis.parentShowDailyGrades || dashData.parentVis.parentShowClassworkIcons) : (studentEval.showDaily || studentEval.showClasswork);

  const visibleTabs = [
    ...(showEvalTab ? [{ value: "evaluation", label: "التقييم المستمر", icon: ClipboardList }] : []),
    ...(vis.grades ? [{ value: "grades", label: "الدرجات", icon: GraduationCap }] : []),
    ...(vis.attendance ? [{ value: "attendance", label: "الحضور", icon: ClipboardCheck }] : []),
    ...(vis.behavior ? [{ value: "behavior", label: "السلوك", icon: ShieldCheck }] : []),
    ...(vis.activities ? [{ value: "activities", label: "الأنشطة", icon: Layers }] : []),
    ...(vis.library ? [{ value: "library", label: "المكتبة", icon: BookOpen }] : []),
  ];
  const defaultTab = visibleTabs[0]?.value || "activities";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20" dir="rtl">
      <StudentDashboardHeader isParent={isParent} schoolName={dashData.schoolName} schoolLogoUrl={dashData.schoolLogoUrl} onSignOut={handleSignOut} />

      <main className="container mx-auto p-4 space-y-6">
        {/* Welcome */}
        {((isParent && dashData.welcomeEnabled) || (!isParent && dashData.studentWelcomeEnabled)) && (
          <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                  <Heart className="h-7 w-7 text-primary-foreground" />
                </div>
                <p className="flex-1 text-base font-bold text-foreground leading-relaxed">{resolvedWelcome}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Info */}
        <Card className="border-0 shadow-lg bg-card/90 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                <div><p className="text-[11px] text-muted-foreground">اسم الطالب</p><p className="text-sm font-bold text-foreground">{student.full_name}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/30 flex items-center justify-center"><BookMarked className="h-5 w-5 text-emerald-500" /></div>
                <div><p className="text-[11px] text-muted-foreground">الصف</p><p className="text-sm font-bold text-foreground">{student.class ? `${student.class.name} - ${student.class.grade} (${student.class.section})` : "غير محدد"}</p></div>
              </div>
              {vis.nationalId && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/30 flex items-center justify-center"><Hash className="h-5 w-5 text-amber-500" /></div>
                  <div><p className="text-[11px] text-muted-foreground">الهوية الوطنية</p><p className="text-sm font-bold text-foreground">{student.national_id || "غير محدد"}</p></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PDF Export */}
        <Button onClick={handleExportPdf} disabled={exportingPdf} variant="ghost" size="sm" className="w-auto mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          تصدير PDF
        </Button>

        <StudentSummaryCards vis={vis} percentage={percentage} presentCount={presentCount} absentCount={absentCount} positiveCount={positiveCount} negativeCount={negativeCount} />

        {vis.absenceWarning && (
          <StudentNotificationCards studentId={student.id} studentName={student.full_name} className={student.class?.name || ""} grades={vis.grades ? student.grades : []} attendance={vis.attendance ? student.attendance : []} />
        )}

        {vis.honorRoll && <HonorRoll classId={student.class_id} />}
        <StudentAnnouncements classId={student.class_id} />

        {/* Tabs */}
        <Tabs value={activeTab || defaultTab} onValueChange={setActiveTab} dir="rtl">
          <div className="w-full overflow-x-auto scrollbar-none">
            <TabsList className="flex w-max min-w-full h-auto gap-1 p-1">
              {visibleTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-1 whitespace-nowrap gap-1 text-xs sm:text-sm px-3 py-1.5">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {showEvalTab && vis.grades && (
            <TabsContent value="evaluation">
              <StudentEvaluationTab student={student} isParent={isParent} parentVis={dashData.parentVis} evalSubView={dashData.evalSubView} setEvalSubView={dashData.setEvalSubView} />
            </TabsContent>
          )}

          {vis.grades && (
            <TabsContent value="grades">
              <StudentGradesTab student={student} isParent={isParent} parentVis={dashData.parentVis} gradesView={dashData.gradesView} setGradesView={dashData.setGradesView} />
            </TabsContent>
          )}

          {vis.attendance && (
            <TabsContent value="attendance">
              <StudentAttendanceTab attendance={student.attendance} />
            </TabsContent>
          )}

          {vis.behavior && (
            <TabsContent value="behavior">
              <StudentBehaviorTab behaviors={student.behaviors} />
            </TabsContent>
          )}

          <TabsContent value="activities">
            <StudentActivitiesTab studentId={student.id} classId={student.class_id} />
          </TabsContent>

          <TabsContent value="library">
            <StudentLibraryTab
              folders={dashData.folders} foldersLoading={dashData.foldersLoading}
              selectedFolder={dashData.selectedFolder} setSelectedFolder={dashData.setSelectedFolder}
              folderFiles={dashData.folderFiles} setFolderFiles={dashData.setFolderFiles}
              filesLoading={dashData.filesLoading} previewFile={dashData.previewFile}
              setPreviewFile={dashData.setPreviewFile} openFolder={dashData.openFolder}
              studentClass={student.class}
            />
          </TabsContent>
        </Tabs>

        {isParent && dashData.parentVis.parentShowContactTeacher && (
          <InlineContactSection studentId={student.id} studentName={student.full_name} classId={student.class_id} />
        )}
      </main>

      <StudentPopupDialog
        open={dashData.popupOpen}
        title={dashData.popupTitle}
        message={dashData.popupMessage}
        action={dashData.popupAction}
        onDismiss={dashData.dismissPopup}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setTimeout(() => {
            document.querySelector('[role="tablist"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        }}
      />
    </div>
  );
}
