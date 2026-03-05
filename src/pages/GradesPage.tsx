import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, BarChart3, UserCheck, BookOpen } from "lucide-react";
import DailyGradeEntry from "@/components/grades/DailyGradeEntry";
import GradesSummary from "@/components/grades/GradesSummary";
import BehaviorEntry from "@/components/grades/BehaviorEntry";
import SemesterSummary from "@/components/grades/SemesterSummary";
import NoorExportDialog from "@/components/grades/NoorExportDialog";
import { cn } from "@/lib/utils";

const ENTRY_TYPES = [
  { id: "daily", label: "إدخال يومي", icon: ClipboardList, color: "from-blue-500 to-blue-600" },
  { id: "behavior", label: "السلوك", icon: UserCheck, color: "from-emerald-500 to-emerald-600" },
  { id: "summary", label: "التقييم النهائي", icon: BarChart3, color: "from-violet-500 to-violet-600" },
  { id: "semester", label: "ملخص الفصل", icon: BookOpen, color: "from-amber-500 to-amber-600" },
] as const;

const PERIODS = [
  { id: 1, label: "الفترة الأولى" },
  { id: 2, label: "الفترة الثانية" },
];

export default function GradesPage() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [activeType, setActiveType] = useState<string>("daily");
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  useEffect(() => {
    supabase.from("classes").select("id, name").order("name").then(({ data }) => setClasses(data || []));
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
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">اختر الفصل</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls.id)}
              className={cn(
                "relative p-3 rounded-xl border-2 text-center transition-all duration-200 hover:scale-[1.02]",
                selectedClass === cls.id
                  ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/20"
                  : "border-border/50 bg-card hover:border-primary/40 hover:shadow-sm"
              )}
            >
              <span className={cn(
                "text-sm font-bold",
                selectedClass === cls.id ? "text-primary" : "text-foreground"
              )}>
                {cls.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Entry Type Cards */}
      {selectedClass && (
        <div className="animate-fade-in">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">نوع الإدخال</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ENTRY_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = activeType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setActiveType(type.id)}
                  className={cn(
                    "relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02]",
                    isActive
                      ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/20"
                      : "border-border/50 bg-card hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-lg text-white bg-gradient-to-br",
                    type.color
                  )}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <span className={cn(
                    "text-sm font-bold",
                    isActive ? "text-primary" : "text-foreground"
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
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">الفترة</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-md">
            {PERIODS.map((period) => {
              const isActive = selectedPeriod === period.id;
              return (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriod(period.id)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-center transition-all duration-200 hover:scale-[1.02]",
                    isActive
                      ? "border-primary bg-primary/10 dark:bg-primary/20 shadow-md shadow-primary/20"
                      : "border-border/50 bg-card hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  <span className={cn(
                    "text-sm font-bold",
                    isActive ? "text-primary" : "text-foreground"
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
