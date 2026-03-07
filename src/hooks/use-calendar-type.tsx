import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CalendarType = "hijri" | "gregorian";

let cachedType: CalendarType | null = null;
const listeners = new Set<(t: CalendarType) => void>();

function notify(t: CalendarType) {
  cachedType = t;
  listeners.forEach((fn) => fn(t));
}

export function useCalendarType() {
  const [calendarType, setCalendarType] = useState<CalendarType>(cachedType || "hijri");

  useEffect(() => {
    listeners.add(setCalendarType);
    if (!cachedType) {
      supabase
        .from("site_settings")
        .select("value")
        .eq("id", "calendar_type")
        .single()
        .then(({ data }) => {
          const val = (data?.value === "gregorian" ? "gregorian" : "hijri") as CalendarType;
          notify(val);
        });
    }
    return () => { listeners.delete(setCalendarType); };
  }, []);

  return calendarType;
}

export function setCalendarTypeGlobal(t: CalendarType) {
  notify(t);
}

export function formatDate(date: Date | string, calendarType: CalendarType): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (calendarType === "hijri") {
    return d.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: Date | string, calendarType: CalendarType): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (calendarType === "hijri") {
    return d.toLocaleDateString("ar-SA-u-ca-islamic-umalqura");
  }
  return d.toLocaleDateString("ar-SA");
}
