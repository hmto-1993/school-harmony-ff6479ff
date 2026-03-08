import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HijriCalendar } from "@/components/ui/hijri-calendar";
import { useCalendarType } from "@/hooks/useCalendarType";

interface HijriDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  className?: string;
  buttonClassName?: string;
}

function formatDateLabel(date: Date, isHijri: boolean): string {
  if (isHijri) {
    return date.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric", month: "long", day: "numeric",
    }) + " هـ";
  }
  return date.toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric",
  }) + " م";
}

export function HijriDatePicker({ date, onDateChange, className, buttonClassName }: HijriDatePickerProps) {
  const { isHijri: savedIsHijri, setCalendarType } = useCalendarType();
  const [isHijri, setIsHijri] = React.useState(savedIsHijri);
  const [open, setOpen] = React.useState(false);

  // Sync with global preference
  React.useEffect(() => {
    setIsHijri(savedIsHijri);
  }, [savedIsHijri]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-1.5 font-normal backdrop-blur-sm", buttonClassName)}
        >
          <CalendarIcon className="h-4 w-4" />
          {formatDateLabel(date, isHijri)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align="start">
        <HijriCalendar
          selected={date}
          defaultHijri={isHijri}
          onSelect={(d) => {
            onDateChange(d);
            setOpen(false);
          }}
          onModeChange={(h) => {
            setIsHijri(h);
            setCalendarType(h ? "hijri" : "gregorian");
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
