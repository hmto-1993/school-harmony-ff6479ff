import * as React from "react";
import { ChevronLeft, ChevronRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

interface HijriCalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  onModeChange?: (isHijri: boolean) => void;
}

// Hijri month names in Arabic
const HIJRI_MONTHS = [
  "محرّم", "صفر", "ربيع الأول", "ربيع الآخر",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوّال", "ذو القعدة", "ذو الحجة",
];

const GREGORIAN_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

const WEEKDAYS = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

// Convert Gregorian date to Hijri parts using Intl
function toHijriParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1");
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "1400");
  return { day, month, year };
}

// Get all dates in a Gregorian month
function getGregorianMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(new Date(year, month, d));
  }
  return dates;
}

// Find the Gregorian date that corresponds to a given Hijri year/month/day=1
function findGregorianForHijriMonth(hijriYear: number, hijriMonth: number): Date {
  // Approximate: Hijri calendar started ~622 CE, each year ~354.37 days
  const approxGregorianYear = Math.floor(hijriYear * 0.970229 + 621.5);
  const searchStart = new Date(approxGregorianYear - 1, 0, 1);
  
  // Search forward from approximate date
  let current = new Date(searchStart);
  for (let i = 0; i < 800; i++) {
    const parts = toHijriParts(current);
    if (parts.year === hijriYear && parts.month === hijriMonth && parts.day === 1) {
      return current;
    }
    current = new Date(current.getTime() + 86400000);
  }
  
  // Fallback: search backward
  current = new Date(searchStart);
  for (let i = 0; i < 800; i++) {
    current = new Date(current.getTime() - 86400000);
    const parts = toHijriParts(current);
    if (parts.year === hijriYear && parts.month === hijriMonth && parts.day === 1) {
      return current;
    }
  }
  
  return new Date();
}

// Get all dates belonging to a specific Hijri month
function getHijriMonthDates(hijriYear: number, hijriMonth: number): Date[] {
  const firstDay = findGregorianForHijriMonth(hijriYear, hijriMonth);
  const dates: Date[] = [firstDay];
  
  let current = new Date(firstDay.getTime() + 86400000);
  for (let i = 0; i < 31; i++) {
    const parts = toHijriParts(current);
    if (parts.month !== hijriMonth || parts.year !== hijriYear) break;
    dates.push(current);
    current = new Date(current.getTime() + 86400000);
  }
  
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function HijriCalendar({ selected, onSelect, className, onModeChange, defaultHijri }: HijriCalendarProps & { defaultHijri?: boolean }) {
  const [isHijri, setIsHijri] = React.useState(defaultHijri ?? false);

  // Current view state - always stored as Gregorian year/month for Gregorian mode
  // and Hijri year/month for Hijri mode
  const initDate = selected || new Date();
  const initHijri = toHijriParts(initDate);

  const [gregYear, setGregYear] = React.useState(initDate.getFullYear());
  const [gregMonth, setGregMonth] = React.useState(initDate.getMonth());
  const [hijriYear, setHijriYear] = React.useState(initHijri.year);
  const [hijriMonth, setHijriMonth] = React.useState(initHijri.month);

  // When switching modes, sync the view to the currently selected/viewed month
  const handleToggle = () => {
    if (!isHijri) {
      // Switching to Hijri - convert current Gregorian view center to Hijri
      const midDate = new Date(gregYear, gregMonth, 15);
      const parts = toHijriParts(midDate);
      setHijriYear(parts.year);
      setHijriMonth(parts.month);
    } else {
      // Switching to Gregorian - find Gregorian month of current Hijri view
      const firstDay = findGregorianForHijriMonth(hijriYear, hijriMonth);
      setGregYear(firstDay.getFullYear());
      setGregMonth(firstDay.getMonth());
    }
    const newMode = !isHijri;
    setIsHijri(newMode);
    onModeChange?.(newMode);
  };

  const handlePrev = () => {
    if (isHijri) {
      if (hijriMonth === 1) {
        setHijriMonth(12);
        setHijriYear((y) => y - 1);
      } else {
        setHijriMonth((m) => m - 1);
      }
    } else {
      if (gregMonth === 0) {
        setGregMonth(11);
        setGregYear((y) => y - 1);
      } else {
        setGregMonth((m) => m - 1);
      }
    }
  };

  const handleNext = () => {
    if (isHijri) {
      if (hijriMonth === 12) {
        setHijriMonth(1);
        setHijriYear((y) => y + 1);
      } else {
        setHijriMonth((m) => m + 1);
      }
    } else {
      if (gregMonth === 11) {
        setGregMonth(0);
        setGregYear((y) => y + 1);
      } else {
        setGregMonth((m) => m + 1);
      }
    }
  };

  // Build grid
  const dates = React.useMemo(() => {
    if (isHijri) {
      return getHijriMonthDates(hijriYear, hijriMonth);
    } else {
      return getGregorianMonthDates(gregYear, gregMonth);
    }
  }, [isHijri, gregYear, gregMonth, hijriYear, hijriMonth]);

  // First day of week (0=Sunday)
  const firstDayOfWeek = dates.length > 0 ? dates[0].getDay() : 0;

  // Build weeks grid
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = Array(firstDayOfWeek).fill(null);

  for (const d of dates) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const caption = isHijri
    ? `${HIJRI_MONTHS[hijriMonth - 1]} ${hijriYear}هـ`
    : `${GREGORIAN_MONTHS[gregMonth]} ${gregYear}`;

  const getDayLabel = (d: Date): string => {
    if (isHijri) {
      return toHijriParts(d).day.toString();
    }
    return d.getDate().toString();
  };

  return (
    <div className={cn("p-3 pointer-events-auto", className)}>
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className="w-full mb-2 gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftRight className="h-3.5 w-3.5" />
        {isHijri ? "التحويل للميلادي" : "التحويل للهجري"}
      </Button>

      {/* Navigation */}
      <div className="flex justify-center pt-1 relative items-center mb-4">
        <button
          onClick={handlePrev}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">{caption}</div>
        <button
          onClick={handleNext}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="flex mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="w-9 h-9 flex items-center justify-center text-muted-foreground text-[0.8rem] font-normal">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      {weeks.map((week, wi) => (
        <div key={wi} className="flex mt-0.5">
          {week.map((day, di) => (
            <div key={di} className="h-9 w-9 text-center text-sm p-0 relative">
              {day ? (
                <button
                  onClick={() => onSelect?.(day)}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal",
                    selected && isSameDay(day, selected) &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    isToday(day) && !(selected && isSameDay(day, selected)) &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  {getDayLabel(day)}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
