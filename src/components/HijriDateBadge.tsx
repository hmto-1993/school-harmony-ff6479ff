import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import { useCalendarType, formatDateShort } from "@/hooks/use-calendar-type";
import { cn } from "@/lib/utils";

interface HijriDateBadgeProps {
  date?: Date | string;
  className?: string;
}

export default function HijriDateBadge({ date, className }: HijriDateBadgeProps) {
  const calendarType = useCalendarType();
  const d = useMemo(() => (typeof date === "string" ? new Date(date) : date || new Date()), [date]);
  const formatted = useMemo(() => formatDateShort(d, calendarType), [d, calendarType]);
  const suffix = calendarType === "hijri" ? "هـ" : "م";

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 backdrop-blur-sm",
      className
    )}>
      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold text-foreground">{formatted} {suffix}</span>
    </div>
  );
}
