import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HijriCalendar } from "@/components/ui/hijri-calendar";

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
  const [isHijri, setIsHijri] = React.useState(false);
  const [open, setOpen] = React.useState(false);

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
          onSelect={(d) => {
            onDateChange(d);
            setOpen(false);
          }}
          onModeChange={setIsHijri}
        />
      </PopoverContent>
    </Popover>
  );
}
