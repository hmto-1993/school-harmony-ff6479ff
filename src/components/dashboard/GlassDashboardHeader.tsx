import { format } from "date-fns";
import { Sparkles, Printer, Lock, Unlock, RotateCcw, AlertTriangle } from "lucide-react";
import ShareDialog from "@/components/shared/ShareDialog";
import { Button } from "@/components/ui/button";
import TierBadge from "@/components/subscription/TierBadge";
import { useMemo, useEffect, useState } from "react";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onPrint?: () => void;
  locked?: boolean;
  onToggleLock?: () => void;
  onResetOrder?: () => void;
  attendanceRate?: number;
  totalStudents?: number;
  todayPresent?: number;
}

function toHijri(date: Date): string {
  try {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric", month: "long", day: "numeric",
    });
    const formatted = fmt.format(date);
    return formatted.includes("هـ") ? formatted : formatted + " هـ";
  } catch {
    return "";
  }
}

function getGreeting(): { greeting: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 12) return { greeting: "صباح الخير", emoji: "☀️" };
  if (h < 17) return { greeting: "مساء النور", emoji: "🌤" };
  return { greeting: "مساء الخير", emoji: "🌙" };
}

export default function GlassDashboardHeader({
  onPrint, locked, onToggleLock, onResetOrder,
  attendanceRate = 0, totalStudents = 0, todayPresent = 0,
}: Props) {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy/MM/dd");
  const dayName = new Date().toLocaleDateString("ar-SA", { weekday: "long" });
  const hijriDate = useMemo(() => toHijri(new Date()), []);
  const { greeting, emoji } = useMemo(() => getGreeting(), []);
  const { currentWeek, calendarData, isExamWeek } = useAcademicWeek();
  const todayExam = isExamWeek(new Date());
  const [teacherName, setTeacherName] = useState<string>("");
  const [expiringLinks, setExpiringLinks] = useState<{ label: string; daysLeft: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    // Fetch teacher display name
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.full_name) {
        const parts = String(data.full_name).trim().split(/\s+/);
        // Show first 2 words for a friendly greeting
        setTeacherName(parts.slice(0, 2).join(" "));
      }
    });
    // Expiring shared links
    supabase
      .from("shared_views")
      .select("label, expires_at")
      .eq("teacher_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .then(({ data: links }) => {
        if (!links) return;
        const expiring = links
          .map(l => ({
            label: l.label || "رابط مشاركة",
            daysLeft: Math.ceil((new Date(l.expires_at).getTime() - Date.now()) / 86400000),
          }))
          .filter(l => l.daysLeft <= 2);
        setExpiringLinks(expiring);
      });
  }, [user]);

  return (
    <div className="space-y-3">
      {/* Expiring links warning */}
      {expiringLinks.length > 0 && (
        <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-2xl px-4 py-2.5 text-sm print:hidden backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <span className="text-warning-foreground/90 font-medium">
            {expiringLinks.length === 1
              ? `رابط "${expiringLinks[0].label}" ينتهي خلال ${expiringLinks[0].daysLeft === 0 ? "اليوم" : expiringLinks[0].daysLeft + " يوم"}`
              : `${expiringLinks.length} روابط مشاركة تنتهي قريباً`}
          </span>
        </div>
      )}

      {/* Glass header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 print:hidden">
        {/* Aurora gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-info/30" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/40 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-accent/30 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-info/20 rounded-full blur-2xl" />

        {/* Glass overlay */}
        <div className="relative backdrop-blur-2xl bg-background/40 dark:bg-background/30 p-5 sm:p-7">
          <div className="flex flex-col gap-5">
            {/* Top row: greeting + actions */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl" aria-hidden>{emoji}</span>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {greeting}{teacherName ? `، ${teacherName}` : ""}
                  </h1>
                  <TierBadge />
                </div>
                <p className="text-sm text-muted-foreground/90 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  لمحة سريعة عن يومك التعليمي
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 print:hidden flex-shrink-0">
                {onToggleLock && (
                  <Button size="sm" variant="ghost"
                    onClick={onToggleLock}
                    className="h-9 w-9 p-0 rounded-xl bg-background/60 hover:bg-background/80 backdrop-blur-sm border border-border/40"
                    title={locked ? "فتح ترتيب الويدجات" : "قفل ترتيب الويدجات"}>
                    {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                )}
                {!locked && onResetOrder && (
                  <Button size="sm" variant="ghost"
                    onClick={onResetOrder}
                    className="h-9 w-9 p-0 rounded-xl bg-background/60 hover:bg-background/80 backdrop-blur-sm border border-border/40"
                    title="إعادة الترتيب">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                <div className="rounded-xl bg-background/60 backdrop-blur-sm border border-border/40">
                  <ShareDialog />
                </div>
                {onPrint && (
                  <Button size="sm" variant="ghost"
                    onClick={onPrint}
                    className="h-9 w-9 p-0 rounded-xl bg-background/60 hover:bg-background/80 backdrop-blur-sm border border-border/40"
                    title="طباعة">
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Bottom row: chips with date/week */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/40 px-3 py-1 text-xs font-medium text-foreground">
                <span className="text-primary">●</span> {dayName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/40 px-3 py-1 text-xs font-medium text-foreground/80 tabular-nums">
                {today}
              </span>
              {hijriDate && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border/40 px-3 py-1 text-xs font-medium text-foreground/70">
                  {hijriDate}
                </span>
              )}
              {currentWeek && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 backdrop-blur-sm border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
                  الأسبوع {currentWeek}{calendarData ? `/${calendarData.total_weeks}` : ""}
                </span>
              )}
              {todayExam && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 backdrop-blur-sm border border-warning/30 px-3 py-1 text-xs font-semibold text-warning">
                  {todayExam.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
