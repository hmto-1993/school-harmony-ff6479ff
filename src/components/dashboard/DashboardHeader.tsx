import { format } from "date-fns";
import { LayoutDashboard, Sparkles, Printer, Calendar, BookOpen, GraduationCap, AlertTriangle, Lock, Unlock, RotateCcw } from "lucide-react";
import ShareDialog from "@/components/shared/ShareDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo, useEffect, useState } from "react";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onPrint?: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
  onResetOrder?: () => void;
}

function toHijri(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formatted = formatter.format(date);
    // Ensure "هـ" suffix appears only once
    return formatted.includes("هـ") ? formatted : formatted + " هـ";
  } catch {
    return "";
  }
}

export default function DashboardHeader({ onPrint }: Props) {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy/MM/dd");
  const dayName = new Date().toLocaleDateString("ar-SA", { weekday: "long" });
  const hijriDate = useMemo(() => toHijri(new Date()), []);
  const { currentWeek, calendarData, isExamWeek } = useAcademicWeek();
  const todayExam = isExamWeek(new Date());
  const [dashboardTitle, setDashboardTitle] = useState("لوحة التحكم");
  const [expiringLinks, setExpiringLinks] = useState<{ label: string; daysLeft: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("site_settings").select("value").eq("id", "dashboard_title").maybeSingle().then(({ data }) => {
      if (data?.value) setDashboardTitle(data.value);
    });

    // Check for expiring shared links
    if (user) {
      supabase
        .from("shared_views")
        .select("label, expires_at")
        .eq("teacher_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .then(({ data: links }) => {
          if (!links) return;
          const expiring = links
            .map(l => ({ label: l.label || "رابط مشاركة", daysLeft: Math.ceil((new Date(l.expires_at).getTime() - Date.now()) / 86400000) }))
            .filter(l => l.daysLeft <= 2);
          setExpiringLinks(expiring);
        });
    }
  }, [user]);

  return (
    <div className="space-y-2">
      {/* Expiring links warning */}
      {expiringLinks.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm print:hidden">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800 font-medium">
            {expiringLinks.length === 1
              ? `رابط المشاركة "${expiringLinks[0].label}" ينتهي خلال ${expiringLinks[0].daysLeft === 0 ? "اليوم" : expiringLinks[0].daysLeft + " يوم"} — قم بتمديده من زر المشاركة`
              : `${expiringLinks.length} روابط مشاركة تنتهي قريباً — قم بتمديدها من زر المشاركة`}
          </span>
        </div>
      )}
    <div className="relative overflow-hidden rounded-2xl gradient-primary p-6 md:p-8 text-primary-foreground">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-4 left-1/3 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
      <div className="absolute bottom-6 left-1/4 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse delay-300" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{dashboardTitle}</h1>
              <p className="text-sm text-white/70 mt-0.5 hidden sm:block">نظرة شاملة على أداء الطلاب اليوم</p>
            </div>
          </div>
        </div>

        {/* Mobile: compact row with date + actions */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span>{dayName}</span>
            <span className="text-white/40">•</span>
            <span>{today}</span>
            {currentWeek && (
              <>
                <span className="text-white/40">•</span>
                <span>أسبوع {currentWeek}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 print:hidden">
            <ShareDialog />
            {onPrint && (
              <Button size="sm" variant="ghost" onClick={onPrint} className="text-white/80 hover:text-white hover:bg-white/15 h-8 w-8 p-0">
                <Printer className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Desktop: full info column */}
        <div className="hidden sm:flex flex-col items-end gap-2 text-left">
          <div className="flex items-center gap-2">
            <ShareDialog />
            {onPrint && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onPrint}
                className="text-white/80 hover:text-white hover:bg-white/15 gap-1.5 print:hidden"
              >
                <Printer className="h-4 w-4" />
                <span className="text-xs font-medium">طباعة التقرير</span>
              </Button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-white/70" />
              <span className="text-sm font-medium">{dayName}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 mt-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-white/50" />
              <span className="text-xs text-white/60">{today}</span>
            </div>
            {hijriDate && (
              <span className="text-[11px] text-white/45 font-medium">{hijriDate}</span>
            )}
            {currentWeek && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <BookOpen className="h-3 w-3 text-white/50" />
                <span className="text-[11px] text-white/60">الأسبوع {currentWeek}{calendarData ? ` من ${calendarData.total_weeks}` : ""}</span>
                {todayExam && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-white/30 text-white/80">
                    {todayExam.label}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
