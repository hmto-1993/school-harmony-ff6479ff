import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type CalendarType = "hijri" | "gregorian";

interface CalendarTypeContextValue {
  calendarType: CalendarType;
  isHijri: boolean;
  toggleCalendarType: () => void;
  setCalendarType: (type: CalendarType) => void;
}

const CalendarTypeContext = createContext<CalendarTypeContextValue | undefined>(undefined);

export function CalendarTypeProvider({ children }: { children: ReactNode }) {
  const [calendarType, setCalendarTypeState] = useState<CalendarType>(
    () => (localStorage.getItem("calendar_type") as CalendarType) || "gregorian"
  );

  // Load from DB on mount
  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "calendar_type")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value === "hijri" || data?.value === "gregorian") {
          setCalendarTypeState(data.value);
          localStorage.setItem("calendar_type", data.value);
        }
      });
  }, []);

  const persistType = useCallback(async (type: CalendarType) => {
    localStorage.setItem("calendar_type", type);
    setCalendarTypeState(type);
    // Try to save to DB (will silently fail for non-admin users)
    await supabase
      .from("site_settings")
      .upsert({ id: "calendar_type", value: type }, { onConflict: "id" })
      .then(() => {});
  }, []);

  const toggleCalendarType = useCallback(() => {
    const next = calendarType === "hijri" ? "gregorian" : "hijri";
    persistType(next);
  }, [calendarType, persistType]);

  const setCalendarType = useCallback((type: CalendarType) => {
    persistType(type);
  }, [persistType]);

  return (
    <CalendarTypeContext.Provider value={{ calendarType, isHijri: calendarType === "hijri", toggleCalendarType, setCalendarType }}>
      {children}
    </CalendarTypeContext.Provider>
  );
}

export function useCalendarType() {
  const context = useContext(CalendarTypeContext);
  if (!context) throw new Error("useCalendarType must be used within CalendarTypeProvider");
  return context;
}
