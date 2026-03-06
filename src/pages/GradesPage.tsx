import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, BarChart3, UserCheck, BookOpen, Users, FileUp } from "lucide-react";
import DailyGradeEntry from "@/components/grades/DailyGradeEntry";
import GradesSummary from "@/components/grades/GradesSummary";
import BehaviorEntry from "@/components/grades/BehaviorEntry";
import SemesterSummary from "@/components/grades/SemesterSummary";
import GradesImport from "@/components/grades/GradesImport";
import NoorExportDialog from "@/components/grades/NoorExportDialog";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";

const ENTRY_TYPES = [
  { id: "daily", label: "إدخال يومي", icon: ClipboardList },
  { id: "behavior", label: "السلوك", icon: UserCheck },
  { id: "summary", label: "التقييم النهائي", icon: BarChart3 },
  { id: "semester", label: "ملخص الفصل", icon: BookOpen },
  { id: "import", label: "استيراد من ملف", icon: FileUp },
] as const;

const PERIODS = [
  { id: 1, label: "الفترة الأولى" },
  { id: 2, label: "الفترة الثانية" },
];

export default function GradesPage() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [selectedClass, setSelectedClass] = useState("");
  const [activeType, setActiveType] = useState<string>("daily");
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  useEffect(() => {
    const load = async () => {
      const [{ data: cls }, { data: students }] = await Promise.all([
        supabase.from("classes").select("id, name").order("name"),
        supabase.from("students").select("id, class_id"),
      ]);
      setClasses(cls || []);
      const counts: Record<string, number> = {};
      (students || []).forEach((s) => {
        if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1;
      });
      setClassCounts(counts);
    };
    load();
  }, []);

  const showPeriodSelector = activeType === "daily" || activeType === "summary" || activeType === "import";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display bg-gradient-to-l from-neon to-gold bg-clip-text text-transparent">
            الدرجات والتقييمات
          </h1>
          <p className="text-muted-foreground">إدخال وعرض درجات الطلاب حسب فئات التقييم</p>
        </div>
        <NoorExportDialog />
      </div>

      {/* Class Cards — unified blue tint, active = primary */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">اختر الفصل</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {classes.map((cls) => {
            const isActive = selectedClass === cls.id;
            const count = classCounts[cls.id] || 0;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={cn(
                  "relative p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.04] hover-lift overflow-hidden glass-card",
                  isActive
                    ? "!border-neon !bg-neon/10 dark:!bg-neon/15 shadow-neon ring-2 ring-neon/30"
                    : ""
                )}
              >
                <div className={cn("absolute top-0 inset-x-0 h-1 rounded-b-sm transition-all", isActive ? "bg-neon" : "bg-neon/20")} />
                <div className="relative pt-1">
                    <span className={cn("text-base font-bold block", isActive ? "text-neon" : "text-gold")}>
                    {cls.name}
                  </span>
                  <div className={cn("flex items-center justify-center gap-1 mt-1.5", isActive ? "text-neon" : "text-muted-foreground")}>
                    <Users className="h-3 w-3" />
                    <span className="text-[11px] font-medium">{count} طالب</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry Type Cards — unified emerald tint, active = primary */}
      {selectedClass && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">نوع الإدخال</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ENTRY_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = activeType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveType(type.id)}
                  className={cn(
                    "relative flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.04] hover-lift glass-card",
                    isActive
                      ? "!border-neon !bg-neon/10 dark:!bg-neon/15 shadow-neon"
                      : ""
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-11 w-11 rounded-xl text-white shadow-md transition-transform duration-300",
                    isActive ? "bg-neon scale-110" : "bg-neon/60"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn("text-sm font-bold", isActive ? "text-neon" : "text-gold")}>
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
        <div className="animate-fade-in">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">الفترة</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
            {PERIODS.map((period) => {
              const isActive = selectedPeriod === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    "relative flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.04] hover:shadow-lg",
                    isActive
                      ? "bg-primary/10 dark:bg-primary/20 border-primary shadow-md"
                      : "bg-amber-50/70 dark:bg-amber-500/5 border-amber-200/60 dark:border-amber-500/15 hover:border-amber-300 dark:hover:border-amber-500/30"
                  )}
                >
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all duration-300",
                    isActive ? "bg-gold scale-125" : "bg-gold/40"
                  )} />
                  <span className={cn("text-sm font-bold", isActive ? "text-gold" : "text-gold/70")}>
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
        <div className="animate-fade-in">
          {activeType === "daily" && (
            <DailyGradeEntry selectedClass={selectedClass} onClassChange={setSelectedClass} selectedPeriod={selectedPeriod} />
          )}
          {activeType === "behavior" && (
            <BehaviorEntry selectedClass={selectedClass} onClassChange={setSelectedClass} />
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
