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
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            الدرجات والتقييمات
          </h1>
          <p className="text-muted-foreground">إدخال وعرض درجات الطلاب حسب فئات التقييم</p>
        </div>
        <NoorExportDialog />
      </div>

      {/* Class Cards — Cosmic Cyan palette */}
      <div>
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
                  "relative p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-lg overflow-hidden animate-fade-in group",
                  isActive
                    ? "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/50 shadow-md ring-1 ring-primary/20"
                    : "bg-gradient-to-br from-primary/5 to-transparent border-border/50 hover:border-primary/30 hover:from-primary/8"
                )}
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
              >
                <div className={cn(
                  "mx-auto w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 group-hover:scale-110",
                  isActive ? "bg-primary/20 shadow-sm" : "bg-muted/60"
                )}>
                  <Users className={cn("h-4.5 w-4.5", isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <span className={cn("text-sm font-bold block", isActive ? "text-primary" : "text-foreground")}>
                  {cls.name}
                </span>
                <span className={cn("text-[11px] mt-1 block", isActive ? "text-primary/70" : "text-muted-foreground")}>
                  {count} طالب
                </span>
                {isActive && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry Type Cards — unified emerald tint, active = primary */}
      {selectedClass && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">نوع الإدخال</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ENTRY_TYPES.map((type, i) => {
              const Icon = type.icon;
              const isActive = activeType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveType(type.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-lg group animate-fade-in",
                    isActive
                      ? "bg-gradient-to-br from-accent/15 to-accent/5 border-accent/50 shadow-md ring-1 ring-accent/20"
                      : "bg-gradient-to-br from-accent/5 to-transparent border-border/50 hover:border-accent/30 hover:from-accent/8"
                  )}
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <div className={cn(
                    "flex items-center justify-center h-11 w-11 rounded-xl transition-all duration-300 group-hover:scale-110",
                    isActive ? "bg-accent/20 shadow-sm" : "bg-muted/60"
                  )}>
                    <Icon className={cn("h-5 w-5", isActive ? "text-accent" : "text-muted-foreground")} />
                  </div>
                  <span className={cn("text-xs font-bold", isActive ? "text-accent" : "text-foreground")}>
                    {type.label}
                  </span>
                  {isActive && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-accent animate-pulse" />}
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
            {PERIODS.map((period, i) => {
              const isActive = selectedPeriod === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    "relative flex items-center justify-center gap-2.5 p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.03] hover:shadow-lg group animate-fade-in",
                    isActive
                      ? "bg-gradient-to-br from-success/15 to-success/5 border-success/50 shadow-md ring-1 ring-success/20"
                      : "bg-gradient-to-br from-success/5 to-transparent border-border/50 hover:border-success/30 hover:from-success/8"
                  )}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
                >
                  <div className={cn(
                    "h-3 w-3 rounded-full transition-all duration-300",
                    isActive ? "bg-success scale-125 shadow-sm" : "bg-muted-foreground/30"
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
