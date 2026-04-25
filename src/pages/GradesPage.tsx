import { useEffect, useMemo } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardList, BarChart3, UserCheck, BookOpen, Users, FileDown, Lock,
  PenLine, LineChart, GraduationCap, ChevronDown,
} from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import EmptyState from "@/components/EmptyState";
import AcademicWeekBadge from "@/components/dashboard/AcademicWeekBadge";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";

// === Sub-tabs config (3 main groups) ===
const GROUPS = {
  entry: {
    id: "entry", label: "الإدخال", icon: PenLine, color: "primary",
    desc: "إدخال الدرجات اليومية والسلوك والاستيراد",
  },
  analysis: {
    id: "analysis", label: "التحليل", icon: LineChart, color: "info",
    desc: "التفاعل الكلي والتقييم النهائي",
  },
  semester: {
    id: "semester", label: "الفصل الدراسي", icon: GraduationCap, color: "accent",
    desc: "ملخص نتائج الفصل",
  },
} as const;

const SUB_TABS = {
  entry: [
    { id: "daily", label: "تفاعل اليوم", icon: ClipboardList },
    { id: "behavior", label: "السلوك", icon: UserCheck },
    { id: "import", label: "استيراد", icon: FileDown },
  ],
  analysis: [
    { id: "classwork", label: "التفاعل الكلي", icon: BarChart3 },
    { id: "summary", label: "التقييم النهائي", icon: BarChart3 },
  ],
  semester: [
    { id: "semester", label: "ملخص الفصل", icon: BookOpen },
  ],
} as const;

const PERIODS = [
  { id: 1, label: "الفترة الأولى" },
  { id: 2, label: "الفترة الثانية" },
];

function getGroupForType(type: string): keyof typeof GROUPS {
  if (["daily", "behavior", "import"].includes(type)) return "entry";
  if (["classwork", "summary"].includes(type)) return "analysis";
  return "semester";
}

export default function GradesPage() {
  const { perms, loaded: permsLoaded } = useTeacherPermissions();
  const { data: classesRaw, isLoading: classesLoading } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => {
      const { data: cls } = await supabase.from("classes").select("id, name").order("name");
      return { classes: cls || [] };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const classes = classesRaw?.classes || [];

  const { data: classCounts = {} } = useQuery({
    queryKey: ["class-student-counts"],
    queryFn: async () => {
      const { data: students } = await supabase.from("students").select("id, class_id");
      const counts: Record<string, number> = {};
      (students || []).forEach((s) => {
        if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1;
      });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const [selectedClass, setSelectedClass] = usePersistedState("selected_class", "");
  const [activeType, setActiveType] = usePersistedState("grades_active_type", "daily");
  const [selectedPeriod, setSelectedPeriod] = usePersistedState("grades_selected_period", 1);

  const canEdit = perms.can_manage_grades && !perms.read_only_mode;
  const canView = perms.can_view_grades || perms.read_only_mode;

  // Filter sub-tabs based on permissions
  const visibleSubTabs = useMemo(() => {
    if (canEdit) return SUB_TABS;
    return {
      entry: SUB_TABS.entry.filter(t => t.id === "daily"),
      analysis: SUB_TABS.analysis,
      semester: SUB_TABS.semester,
    };
  }, [canEdit]);

  const activeGroup = getGroupForType(activeType);
  const showPeriodSelector = ["daily", "classwork", "summary", "import"].includes(activeType);

  const studentCount = selectedClass ? (classCounts[selectedClass] || 0) : 0;
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || "";

  useEffect(() => {
    if (permsLoaded && !canEdit && (activeType === "behavior" || activeType === "import")) {
      setActiveType("daily");
    }
  }, [permsLoaded, canEdit, activeType, setActiveType]);

  const handleGroupChange = (newGroup: string) => {
    const firstTab = visibleSubTabs[newGroup as keyof typeof SUB_TABS]?.[0];
    if (firstTab) setActiveType(firstTab.id);
  };

  if (permsLoaded && !canView) {
    return (
      <div className="space-y-6 animate-fade-in">
        <EmptyState icon={Lock} title="لا تملك صلاحية عرض الدرجات" description="تواصل مع المدير لتفعيل صلاحية مشاهدة الدرجات" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* === Glassmorphism Header === */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl p-5 shadow-card no-print">
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black bg-gradient-to-l from-primary via-primary to-accent bg-clip-text text-transparent">
                الدرجات والتقييمات
              </h1>
              <AcademicWeekBadge />
            </div>
            <p className="text-sm text-muted-foreground">{GROUPS[activeGroup].desc}</p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2">
              <NoorExportDialog />
            </div>
          )}
        </div>

        {/* === Unified Toolbar === */}
        <div className="relative mt-5 flex items-center gap-2 flex-wrap">
          {/* Class Picker */}
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 backdrop-blur-md px-2 py-1.5 shadow-sm">
            <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass} disabled={classesLoading}>
              <SelectTrigger className="h-8 w-[160px] border-0 bg-transparent focus:ring-0 font-bold text-sm">
                <SelectValue placeholder="اختر الفصل" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{cls.name}</span>
                      {classCounts[cls.id] !== undefined && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          {classCounts[cls.id]}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClass && (
              <Badge variant="secondary" className="h-6 px-2 text-[11px] font-bold gap-1">
                {studentCount}
                <span className="font-normal text-muted-foreground">طالب</span>
              </Badge>
            )}
          </div>

          {/* Period Selector */}
          {selectedClass && showPeriodSelector && (
            <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-background/70 backdrop-blur-md p-1 shadow-sm">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={cn(
                    "px-3 h-8 text-xs font-bold rounded-lg transition-all duration-200",
                    selectedPeriod === p.id
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* === Main Group Tabs === */}
      {selectedClass && !classesLoading && (
        <div className="no-print animate-fade-in">
          <Tabs value={activeGroup} onValueChange={handleGroupChange} dir="rtl">
            <TabsList className="h-auto w-full grid grid-cols-3 gap-2 bg-card/60 backdrop-blur-xl border border-border/40 p-2 rounded-2xl shadow-card">
              {Object.values(GROUPS).map((g) => {
                const Icon = g.icon;
                const isActive = activeGroup === g.id;
                const colorMap: Record<string, string> = {
                  primary: "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary/30",
                  info: "data-[state=active]:bg-info data-[state=active]:text-info-foreground data-[state=active]:shadow-info/30",
                  accent: "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-accent/30",
                };
                return (
                  <TabsTrigger
                    key={g.id}
                    value={g.id}
                    className={cn(
                      "flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-sm transition-all duration-300",
                      "data-[state=active]:shadow-md data-[state=active]:font-extrabold",
                      colorMap[g.color]
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{g.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Sub-tabs (Pills) */}
          {visibleSubTabs[activeGroup].length > 1 && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap p-1.5 rounded-xl border border-border/40 bg-card/40 backdrop-blur-md">
              {visibleSubTabs[activeGroup].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeType === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveType(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all duration-200",
                      isActive
                        ? "bg-foreground/90 text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === Content === */}
      {selectedClass && !classesLoading ? (
        <div className="animate-fade-in print-area">
          <ReportPrintHeader reportType="grades" />
          <PrintWatermark reportType="grades" />

          {activeType === "daily" && (
            <DailyGradeEntry selectedClass={selectedClass} onClassChange={setSelectedClass} selectedPeriod={selectedPeriod} />
          )}
          {activeType === "classwork" && (
            <ClassworkSummary selectedClass={selectedClass} onClassChange={setSelectedClass} selectedPeriod={selectedPeriod} />
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
          <PrintFooterSignatures reportType={activeType === "behavior" ? "behavior" : "grades"} />
        </div>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="اختر فصلاً للبدء"
          description="حدد الفصل الدراسي من الشريط العلوي لعرض وإدخال درجات الطلاب"
        />
      )}
    </div>
  );
}
