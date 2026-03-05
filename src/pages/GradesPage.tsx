import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, BarChart3, UserCheck, BookOpen, Users } from "lucide-react";
import DailyGradeEntry from "@/components/grades/DailyGradeEntry";
import GradesSummary from "@/components/grades/GradesSummary";
import BehaviorEntry from "@/components/grades/BehaviorEntry";
import SemesterSummary from "@/components/grades/SemesterSummary";
import NoorExportDialog from "@/components/grades/NoorExportDialog";
import { cn } from "@/lib/utils";

const CLASS_COLORS = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-pink-400",
  "from-amber-500 to-orange-400",
  "from-indigo-500 to-blue-400",
  "from-fuchsia-500 to-pink-400",
  "from-sky-500 to-cyan-400",
  "from-lime-500 to-green-400",
  "from-red-500 to-rose-400",
];

const ENTRY_TYPES = [
  { id: "daily", label: "إدخال يومي", icon: ClipboardList, gradient: "from-blue-500 to-indigo-500", bgActive: "bg-blue-50 dark:bg-blue-500/15", borderActive: "border-blue-400 dark:border-blue-500/50" },
  { id: "behavior", label: "السلوك", icon: UserCheck, gradient: "from-emerald-500 to-teal-500", bgActive: "bg-emerald-50 dark:bg-emerald-500/15", borderActive: "border-emerald-400 dark:border-emerald-500/50" },
  { id: "summary", label: "التقييم النهائي", icon: BarChart3, gradient: "from-violet-500 to-purple-500", bgActive: "bg-violet-50 dark:bg-violet-500/15", borderActive: "border-violet-400 dark:border-violet-500/50" },
  { id: "semester", label: "ملخص الفصل", icon: BookOpen, gradient: "from-amber-500 to-orange-500", bgActive: "bg-amber-50 dark:bg-amber-500/15", borderActive: "border-amber-400 dark:border-amber-500/50" },
] as const;

const PERIODS = [
  { id: 1, label: "الفترة الأولى", gradient: "from-sky-500 to-blue-500", bgActive: "bg-sky-50 dark:bg-sky-500/15", borderActive: "border-sky-400 dark:border-sky-500/50" },
  { id: 2, label: "الفترة الثانية", gradient: "from-orange-500 to-red-500", bgActive: "bg-orange-50 dark:bg-orange-500/15", borderActive: "border-orange-400 dark:border-orange-500/50" },
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

  const showPeriodSelector = activeType === "daily" || activeType === "summary";

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

      {/* Class Cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">اختر الفصل</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {classes.map((cls, i) => {
            const isActive = selectedClass === cls.id;
            const colorIdx = i % CLASS_COLORS.length;
            const count = classCounts[cls.id] || 0;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-lg group",
                  isActive
                    ? "border-transparent shadow-lg"
                    : "border-border/40 bg-card hover:border-border"
                )}
              >
                {/* Gradient background when active */}
                {isActive && (
                  <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-10 dark:opacity-20", CLASS_COLORS[colorIdx])} />
                )}
                {/* Top accent bar */}
                <div className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-1 rounded-b-full transition-all duration-300",
                  isActive ? "w-2/3 bg-gradient-to-r" : "w-0 bg-gradient-to-r",
                  CLASS_COLORS[colorIdx]
                )} />
                <div className="relative">
                  <span className={cn(
                    "text-base font-bold block",
                    isActive
                      ? "bg-gradient-to-r bg-clip-text text-transparent " + CLASS_COLORS[colorIdx]
                      : "text-foreground"
                  )}>
                    {cls.name}
                  </span>
                  <div className={cn(
                    "flex items-center justify-center gap-1 mt-1.5",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    <Users className="h-3 w-3" />
                    <span className="text-[11px] font-medium">{count} طالب</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entry Type Cards */}
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
                    "relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.03] hover:shadow-lg",
                    isActive
                      ? cn(type.bgActive, type.borderActive, "shadow-md")
                      : "border-border/40 bg-card hover:border-border"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-11 w-11 rounded-xl text-white bg-gradient-to-br shadow-md",
                    type.gradient
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    "text-sm font-bold",
                    isActive
                      ? "bg-gradient-to-r bg-clip-text text-transparent " + type.gradient
                      : "text-foreground"
                  )}>
                    {type.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Period Cards */}
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
                    "relative p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-lg",
                    isActive
                      ? cn(period.bgActive, period.borderActive, "shadow-md")
                      : "border-border/40 bg-card hover:border-border"
                  )}
                >
                  {isActive && (
                    <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-10 dark:opacity-15", period.gradient)} />
                  )}
                  <span className={cn(
                    "relative text-sm font-bold",
                    isActive
                      ? "bg-gradient-to-r bg-clip-text text-transparent " + period.gradient
                      : "text-foreground"
                  )}>
                    {period.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {selectedClass && (
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
        </div>
      )}
    </div>
  );
}
