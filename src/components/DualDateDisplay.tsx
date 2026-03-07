import { useMemo } from "react";
import { CalendarIcon, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendarType, setCalendarTypeGlobal, formatDate, formatDateShort, type CalendarType } from "@/hooks/use-calendar-type";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DualDateDisplayProps {
  date?: Date | string;
  className?: string;
  /** compact = single line badge, full = two lines */
  variant?: "compact" | "full";
}

export default function DualDateDisplay({ date, className, variant = "compact" }: DualDateDisplayProps) {
  const calendarType = useCalendarType();
  const d = useMemo(() => (typeof date === "string" ? new Date(date) : date || new Date()), [date]);

  const hijriDate = useMemo(() => formatDate(d, "hijri"), [d]);
  const gregorianDate = useMemo(() => formatDate(d, "gregorian"), [d]);

  const primaryDate = calendarType === "hijri" ? hijriDate : gregorianDate;
  const secondaryDate = calendarType === "hijri" ? gregorianDate : hijriDate;

  const toggleCalendar = async () => {
    const newType: CalendarType = calendarType === "hijri" ? "gregorian" : "hijri";
    setCalendarTypeGlobal(newType);
    await supabase.from("site_settings").upsert({ id: "calendar_type", value: newType });
  };

  if (variant === "full") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-sm font-semibold text-foreground">{primaryDate}</span>
          <span className="text-[11px] text-muted-foreground">{secondaryDate}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              onClick={toggleCalendar}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">تبديل إلى {calendarType === "hijri" ? "ميلادي" : "هجري"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 backdrop-blur-sm", className)}>
      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold text-foreground">{primaryDate}</span>
        <span className="text-[10px] text-muted-foreground">{secondaryDate}</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors ml-0.5"
            onClick={toggleCalendar}
          >
            <ArrowLeftRight className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">تبديل إلى {calendarType === "hijri" ? "ميلادي" : "هجري"}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
