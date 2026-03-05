import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, BarChart3, UserCheck, BookOpen, Users } from "lucide-react";
import DailyGradeEntry from "@/components/grades/DailyGradeEntry";
import GradesSummary from "@/components/grades/GradesSummary";
import BehaviorEntry from "@/components/grades/BehaviorEntry";
import SemesterSummary from "@/components/grades/SemesterSummary";
import NoorExportDialog from "@/components/grades/NoorExportDialog";
import { cn } from "@/lib/utils";

// Each class gets a fixed soft color pair (bg + text + active ring)
const CLASS_STYLES = [
  { bg: "bg-blue-50 dark:bg-blue-500/10", bgActive: "bg-blue-100 dark:bg-blue-500/20", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-400/60", border: "border-blue-300 dark:border-blue-500/40", accent: "bg-blue-500" },
  { bg: "bg-violet-50 dark:bg-violet-500/10", bgActive: "bg-violet-100 dark:bg-violet-500/20", text: "text-violet-600 dark:text-violet-400", ring: "ring-violet-400/60", border: "border-violet-300 dark:border-violet-500/40", accent: "bg-violet-500" },
  { bg: "bg-emerald-50 dark:bg-emerald-500/10", bgActive: "bg-emerald-100 dark:bg-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-400/60", border: "border-emerald-300 dark:border-emerald-500/40", accent: "bg-emerald-500" },
  { bg: "bg-rose-50 dark:bg-rose-500/10", bgActive: "bg-rose-100 dark:bg-rose-500/20", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-400/60", border: "border-rose-300 dark:border-rose-500/40", accent: "bg-rose-500" },
  { bg: "bg-amber-50 dark:bg-amber-500/10", bgActive: "bg-amber-100 dark:bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-400/60", border: "border-amber-300 dark:border-amber-500/40", accent: "bg-amber-500" },
  { bg: "bg-cyan-50 dark:bg-cyan-500/10", bgActive: "bg-cyan-100 dark:bg-cyan-500/20", text: "text-cyan-600 dark:text-cyan-400", ring: "ring-cyan-400/60", border: "border-cyan-300 dark:border-cyan-500/40", accent: "bg-cyan-500" },
  { bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10", bgActive: "bg-fuchsia-100 dark:bg-fuchsia-500/20", text: "text-fuchsia-600 dark:text-fuchsia-400", ring: "ring-fuchsia-400/60", border: "border-fuchsia-300 dark:border-fuchsia-500/40", accent: "bg-fuchsia-500" },
  { bg: "bg-teal-50 dark:bg-teal-500/10", bgActive: "bg-teal-100 dark:bg-teal-500/20", text: "text-teal-600 dark:text-teal-400", ring: "ring-teal-400/60", border: "border-teal-300 dark:border-teal-500/40", accent: "bg-teal-500" },
  { bg: "bg-indigo-50 dark:bg-indigo-500/10", bgActive: "bg-indigo-100 dark:bg-indigo-500/20", text: "text-indigo-600 dark:text-indigo-400", ring: "ring-indigo-400/60", border: "border-indigo-300 dark:border-indigo-500/40", accent: "bg-indigo-500" },
  { bg: "bg-sky-50 dark:bg-sky-500/10", bgActive: "bg-sky-100 dark:bg-sky-500/20", text: "text-sky-600 dark:text-sky-400", ring: "ring-sky-400/60", border: "border-sky-300 dark:border-sky-500/40", accent: "bg-sky-500" },
];

const ENTRY_TYPES = [
  { id: "daily", label: "إدخال يومي", icon: ClipboardList, bg: "bg-blue-50 dark:bg-blue-500/10", bgActive: "bg-blue-100 dark:bg-blue-500/25", text: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-500", border: "border-blue-200 dark:border-blue-500/30", borderActive: "border-blue-400 dark:border-blue-400/60" },
  { id: "behavior", label: "السلوك", icon: UserCheck, bg: "bg-emerald-50 dark:bg-emerald-500/10", bgActive: "bg-emerald-100 dark:bg-emerald-500/25", text: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-500", border: "border-emerald-200 dark:border-emerald-500/30", borderActive: "border-emerald-400 dark:border-emerald-400/60" },
  { id: "summary", label: "التقييم النهائي", icon: BarChart3, bg: "bg-violet-50 dark:bg-violet-500/10", bgActive: "bg-violet-100 dark:bg-violet-500/25", text: "text-violet-600 dark:text-violet-400", iconBg: "bg-violet-500", border: "border-violet-200 dark:border-violet-500/30", borderActive: "border-violet-400 dark:border-violet-400/60" },
  { id: "semester", label: "ملخص الفصل", icon: BookOpen, bg: "bg-amber-50 dark:bg-amber-500/10", bgActive: "bg-amber-100 dark:bg-amber-500/25", text: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-500", border: "border-amber-200 dark:border-amber-500/30", borderActive: "border-amber-400 dark:border-amber-400/60" },
] as const;

const PERIODS = [
  { id: 1, label: "الفترة الأولى", bg: "bg-sky-50 dark:bg-sky-500/10", bgActive: "bg-sky-100 dark:bg-sky-500/25", text: "text-sky-600 dark:text-sky-400", border: "border-sky-200 dark:border-sky-500/30", borderActive: "border-sky-400 dark:border-sky-400/60", iconBg: "bg-sky-500" },
  { id: 2, label: "الفترة الثانية", bg: "bg-orange-50 dark:bg-orange-500/10", bgActive: "bg-orange-100 dark:bg-orange-500/25", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-500/30", borderActive: "border-orange-400 dark:border-orange-400/60", iconBg: "bg-orange-500" },
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
            const style = CLASS_STYLES[i % CLASS_STYLES.length];
            const count = classCounts[cls.id] || 0;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 text-center transition-all duration-300 hover:scale-[1.04] hover:shadow-lg overflow-hidden",
                  isActive
                    ? cn(style.bgActive, style.border, "shadow-md ring-2", style.ring)
                    : cn(style.bg, "border-transparent hover:border-border/50")
                )}
              >
                {/* Top accent strip */}
                <div className={cn("absolute top-0 inset-x-0 h-1 rounded-b-sm", style.accent, isActive ? "opacity-100" : "opacity-40")} />
                <div className="relative pt-1">
                  <span className={cn("text-base font-bold block", style.text)}>
                    {cls.name}
                  </span>
                  <div className={cn("flex items-center justify-center gap-1 mt-1.5", isActive ? style.text : "text-muted-foreground")}>
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
                    "relative flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.04] hover:shadow-lg",
                    isActive
                      ? cn(type.bgActive, type.borderActive, "shadow-md")
                      : cn(type.bg, type.border)
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-11 w-11 rounded-xl text-white shadow-md transition-transform duration-300",
                    type.iconBg,
                    isActive && "scale-110"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn("text-sm font-bold", type.text)}>
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
                    "relative flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.04] hover:shadow-lg",
                    isActive
                      ? cn(period.bgActive, period.borderActive, "shadow-md")
                      : cn(period.bg, period.border)
                  )}
                >
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all duration-300",
                    period.iconBg,
                    isActive ? "scale-125" : "opacity-50"
                  )} />
                  <span className={cn("text-sm font-bold", period.text)}>
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
