import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSmartDashboardData } from "@/hooks/useSmartDashboardData";
import AttendanceTrendCard from "./smart-summary/AttendanceTrendCard";
import GradeDistributionCard from "./smart-summary/GradeDistributionCard";
import BehaviorCard from "./smart-summary/BehaviorCard";
import InfoCards from "./smart-summary/InfoCards";

export default function SmartDashboardSummary() {
  const [isOpen, setIsOpen] = useState(() => localStorage.getItem('smart-summary-open') !== 'false');

  const {
    loading, absentToday, atRiskStudents, currentLesson,
    dailyAttendance, gradeDistribution, behaviorSummary,
    absSettingsDisplay, avgRate, trendDir, currentWeek,
  } = useSmartDashboardData();

  const toggleOpen = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem('smart-summary-open', String(open));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-52 bg-muted/50 border-0" />
        ))}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={toggleOpen}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md">
            <BarChart3 className="h-4 w-4 text-primary-foreground" />
          </div>
          <h3 className="text-sm font-bold text-foreground">الملخص الذكي</h3>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isOpen ? "إخفاء" : "إظهار"}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AttendanceTrendCard dailyAttendance={dailyAttendance} avgRate={avgRate} trendDir={trendDir} />
          <GradeDistributionCard gradeDistribution={gradeDistribution} />
          <BehaviorCard behaviorSummary={behaviorSummary} />
          <InfoCards
            currentLesson={currentLesson}
            currentWeek={currentWeek}
            absentToday={absentToday}
            atRiskStudents={atRiskStudents}
            absSettingsDisplay={absSettingsDisplay}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
