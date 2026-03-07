import { useMemo } from "react";
import { CalendarIcon, ArrowLeftRight } from "lucide-react";
import { useCalendarType, formatDateShort, setCalendarTypeGlobal, type CalendarType } from "@/hooks/use-calendar-type";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DateToggleBadgeProps {
  date?: Date | string;
  className?: string;
}

export default function DateToggleBadge({ date, className }: DateToggleBadgeProps) {
  const calendarType = useCalendarType();
  const d = useMemo(() => (typeof date === "string" ? new Date(date) : date || new Date()), [date]);
  const primaryFormatted = useMemo(() => formatDateShort(d, calendarType), [d, calendarType]);
  const secondaryFormatted = useMemo(() => formatDateShort(d, calendarType === "hijri" ? "gregorian" : "hijri"), [d, calendarType]);
  const suffix = calendarType === "hijri" ? "هـ" : "م";
  const secondarySuffix = calendarType === "hijri" ? "م" : "هـ";

  const toggle = async () => {
    const newType: CalendarType = calendarType === "hijri" ? "gregorian" : "hijri";
    setCalendarTypeGlobal(newType);
    await supabase.from("site_settings").upsert({ id: "calendar_type", value: newType });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggle}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 backdrop-blur-sm cursor-pointer transition-colors hover:bg-muted/60 hover:border-primary/30 group",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-semibold text-foreground">{primaryFormatted} {suffix}</span>
            <span className="text-[10px] text-muted-foreground">{secondaryFormatted} {secondarySuffix}</span>
          </div>
          <ArrowLeftRight className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">تبديل إلى {calendarType === "hijri" ? "ميلادي" : "هجري"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
