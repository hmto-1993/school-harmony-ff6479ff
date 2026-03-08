import { Badge } from "@/components/ui/badge";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { CalendarDays } from "lucide-react";

interface Props {
  date?: Date;
}

export default function AcademicWeekBadge({ date }: Props) {
  const { getWeekForDate, isExamWeek, calendarData } = useAcademicWeek();
  const targetDate = date || new Date();
  const week = getWeekForDate(targetDate);
  const exam = isExamWeek(targetDate);

  if (!calendarData || !week) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className="gap-1 text-xs font-medium">
        <CalendarDays className="h-3 w-3" />
        الأسبوع {week}
      </Badge>
      {exam && (
        <Badge
          variant={exam.type === "final" ? "destructive" : "default"}
          className="text-xs"
        >
          {exam.label}
        </Badge>
      )}
    </div>
  );
}
