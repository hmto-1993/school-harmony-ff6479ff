import { useEffect, useState } from "react";
import { ClipboardList, BarChart3, UserCheck, BookOpen, Users, FileDown, Lock, Eye } from "lucide-react";
import DailyGradeEntry from "@/components/grades/DailyGradeEntry";
import GradesSummary from "@/components/grades/GradesSummary";
import ClassworkSummary from "@/components/grades/ClassworkSummary";
import BehaviorEntry from "@/components/grades/BehaviorEntry";
import SemesterSummary from "@/components/grades/SemesterSummary";
import GradesImport from "@/components/grades/GradesImport";
import NoorExportDialog from "@/components/grades/NoorExportDialog";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import PrintWatermark from "@/components/shared/PrintWatermark";
import PrintFooterSignatures from "@/components/shared/PrintFooterSignatures";

import { cn } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import AcademicWeekBadge from "@/components/dashboard/AcademicWeekBadge";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";
import { useClasses, useStudentCounts } from "@/hooks/useClasses";

const ENTRY_TYPES = [
  { id: "daily", label: "إدخال يومي", icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "behavior", label: "السلوك", icon: UserCheck, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "classwork", label: "المهام والمشاركة", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "summary", label: "التقييم النهائي", icon: BarChart3, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "semester", label: "ملخص الفصل", icon: BookOpen, color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "import", label: "استيراد من ملف", icon: FileDown, color: "text-teal-500", bg: "bg-teal-500/10" },
] as const;

const PERIODS = [
  { id: 1, label: "الفترة الأولى" },
  { id: 2, label: "الفترة الثانية" },
];

export default function GradesPage() {
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const { data: classes = [] } = useClasses();
  const { data: classCounts = {} } = useStudentCounts();
  const [selectedClass, setSelectedClass] = useState("");
  const [activeType, setActiveType] = useState<string>("daily");
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  const canEdit = perms.can_manage_grades && !perms.read_only_mode;
  const canView = perms.can_view_grades || perms.read_only_mode;

  const availableTypes = canEdit
    ? ENTRY_TYPES
    : ENTRY_TYPES.filter((t) => t.id === "summary" || t.id === "semester" || t.id === "classwork");

  const showPeriodSelector = activeType === "daily" || activeType === "summary" || activeType === "classwork" || activeType === "import";

  // Set default active type to summary if can't edit
  useEffect(() => {
    if (permsLoaded && !canEdit && (activeType === "daily" || activeType === "behavior" || activeType === "import")) {
      setActiveType("summary");
    }
  }, [permsLoaded, canEdit]);

  if (permsLoaded && !canView) {
    return (
      <div className="space-y-6 animate-fade-in">
        <EmptyState
          icon={Lock}
          title="لا تملك صلاحية عرض الدرجات"
          description="تواصل مع المدير لتفعيل صلاحية مشاهدة الدرجات"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            الدرجات والتقييمات
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-muted-foreground">إدخال وعرض درجات الطلاب حسب فئات التقييم</p>
            <AcademicWeekBadge />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NoorExportDialog />
        </div>
      </div>

      {/* Class Cards — Cosmic Cyan palette */}
      <div className="no-print">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          اختر الفصل
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {classes.map((cls, i) => {
            const isActive = selectedClass === cls.id;
            const count = classCounts[cls.id] || 0;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-center transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 overflow-hidden animate-fade-in group",
                  isActive
                    ? "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/25"
                    : "bg-card border-border/60 shadow-md hover:shadow-lg hover:border-primary/40 hover:shadow-primary/10"
                )}
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                <div className={cn(
                  "mx-auto w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 transition-all duration-300 group-hover:scale-110 shadow-sm",
                  isActive ? "bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/30" : "bg-muted"
                )}>
                  <Users className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-sm font-bold block", isActive ? "text-primary" : "text-foreground")}>
                  {cls.name}
                </span>
                <span className={cn("text-[11px] mt-1 block font-medium", isActive ? "text-primary/70" : "text-muted-foreground")}>
                  {count} طالب
                </span>
                
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry Type Cards — green active, colorful icons */}
      {selectedClass && (
        <div className="animate-fade-in no-print">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">نوع الإدخال</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {availableTypes.map((type, i) => {
              const Icon = type.icon;
              const isActive = activeType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveType(type.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 text-center transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 group animate-fade-in",
                    isActive
                      ? "bg-gradient-to-br from-success/20 via-success/10 to-success/5 border-success shadow-lg shadow-success/20 ring-2 ring-success/25"
                      : "bg-card border-border/60 shadow-md hover:shadow-lg hover:border-success/40 hover:shadow-success/10"
                  )}
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <div className={cn(
                    "flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm",
                    isActive ? "bg-gradient-to-br from-success to-success/70 shadow-md shadow-success/30" : type.bg
                  )}>
                    <Icon className={cn("h-5 w-5", isActive ? "text-success-foreground" : type.color)} />
                  </div>
                  <span className={cn("text-xs font-bold", isActive ? "text-success" : "text-foreground")}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Period Cards — unified amber tint, active = primary */}
      {selectedClass && showPeriodSelector && (
        <div className="animate-fade-in no-print">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">الفترة</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
            {PERIODS.map((period, i) => {
              const isActive = selectedPeriod === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    "relative flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.04] hover:-translate-y-1 group animate-fade-in",
                    isActive
                      ? "bg-gradient-to-br from-success/20 via-success/10 to-success/5 border-success shadow-lg shadow-success/20 ring-2 ring-success/25"
                      : "bg-card border-border/60 shadow-md hover:shadow-lg hover:border-success/40 hover:shadow-success/10"
                  )}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <div className={cn(
                    "h-3.5 w-3.5 rounded-full transition-all duration-300 shadow-sm",
                    isActive ? "bg-success scale-125 shadow-md shadow-success/40" : "bg-muted-foreground/30"
                  )} />
                  <span className={cn("text-sm font-bold", isActive ? "text-success" : "text-foreground")}>
                    {period.label}
                  </span>
                  
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content or Empty State */}
      {selectedClass ? (
        <div className="animate-fade-in print-area">
          <ReportPrintHeader reportType="grades" />
          <PrintWatermark reportType="grades" />
          {activeType === "daily" && (
            <DailyGradeEntry selectedClass={selectedClass} onClassChange={setSelectedClass} selectedPeriod={selectedPeriod} />
          )}
          {activeType === "behavior" && (
            <BehaviorEntry selectedClass={selectedClass} onClassChange={setSelectedClass} />
          )}
          {activeType === "classwork" && (
            <ClassworkSummary selectedClass={selectedClass} onClassChange={setSelectedClass} selectedPeriod={selectedPeriod} />
          )}
          {activeType === "summary" && (
            <GradesSummary selectedClass={selectedClass} onClassChange={setSelectedClass} selectedPeriod={selectedPeriod} />
          )}
          {activeType === "semester" && (
            <SemesterSummary selectedClass={selectedClass} onClassChange={setSelectedClass} />
          )}
          {activeType === "import" && (
            <GradesImport selectedClass={selectedClass} onClassChange={setSelectedClass} selectedPeriod={selectedPeriod} />
          )}
          <PrintFooterSignatures reportType={activeType === "behavior" ? "behavior" : "grades"} />
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="اختر فصلاً للبدء"
          description="حدد الفصل الدراسي من الأعلى لعرض وإدخال درجات الطلاب"
        />
      )}
    </div>
  );
}
