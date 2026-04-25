import { useEffect, useMemo, useRef, useState } from "react";
import {
  Star, CircleDashed, AlertTriangle, Eye, EyeOff, Sparkles,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
  Trophy, Target, Bell, Copy, Award, Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useToast } from "@/hooks/use-toast";

export interface AlphaStudent {
  student_id: string;
  full_name: string;
  earnedTotal: number;
  violationsCount?: number;
}

interface Props {
  classId: string;
  className: string;
  students: AlphaStudent[];
  /** Threshold above which a student is considered "Elite" (net score). */
  eliteMinScore?: number;
}

type SectionKey = "elite" | "ground" | "alert";

interface SectionConfig {
  key: SectionKey;
  title: string;
  subtitle: string;
  Icon: typeof Star;
  HeroIcon: typeof Crown;
  accentText: string;
  iconColor: string;
  borderLight: string;
  borderDark: string;
  glowLight: string;
  glowDark: string;
  badgeBg: string;
  pillBg: string;
  /** Tailwind bg color used for the percentage bar segment. */
  barBg: string;
  emptyText: string;
}

const SECTIONS: Record<SectionKey, SectionConfig> = {
  elite: {
    key: "elite",
    title: "المتميزون",
    subtitle: "Alpha Elite",
    Icon: Star,
    HeroIcon: Crown,
    accentText: "text-emerald-700 dark:text-emerald-300",
    iconColor: "text-emerald-500 dark:text-emerald-300",
    borderLight: "border-emerald-300/70",
    borderDark: "dark:border-emerald-400/40",
    glowLight: "shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_8px_24px_-6px_rgba(16,185,129,0.25)]",
    glowDark: "dark:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_28px_-2px_rgba(16,185,129,0.35)]",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-200 border-emerald-400/40",
    pillBg: "bg-white/70 dark:bg-emerald-950/30 border-emerald-300/60 dark:border-emerald-400/30 text-emerald-800 dark:text-emerald-100",
    barBg: "bg-emerald-500 dark:bg-emerald-400",
    emptyText: "لا يوجد متميزون بعد",
  },
  ground: {
    key: "ground",
    title: "منطقة الصفر",
    subtitle: "Alpha Ground",
    Icon: CircleDashed,
    HeroIcon: Target,
    accentText: "text-slate-700 dark:text-slate-200",
    iconColor: "text-slate-500 dark:text-slate-300",
    borderLight: "border-slate-300/70",
    borderDark: "dark:border-slate-400/30",
    glowLight: "shadow-[0_0_0_1px_rgba(148,163,184,0.18),0_8px_24px_-6px_rgba(148,163,184,0.25)]",
    glowDark: "dark:shadow-[0_0_0_1px_rgba(203,213,225,0.18),0_0_24px_-4px_rgba(203,213,225,0.25)]",
    badgeBg: "bg-slate-400/10 dark:bg-slate-300/10 text-slate-700 dark:text-slate-100 border-slate-400/40",
    pillBg: "bg-white/70 dark:bg-slate-900/40 border-slate-300/60 dark:border-slate-400/25 text-slate-800 dark:text-slate-100",
    barBg: "bg-slate-400 dark:bg-slate-300",
    emptyText: "لا يوجد طلاب في هذه المنطقة",
  },
  alert: {
    key: "alert",
    title: "منطقة التنبيه",
    subtitle: "Alpha Alert",
    Icon: AlertTriangle,
    HeroIcon: AlertTriangle,
    accentText: "text-rose-700 dark:text-rose-300",
    iconColor: "text-rose-500 dark:text-rose-300",
    borderLight: "border-rose-300/70",
    borderDark: "dark:border-rose-400/40",
    glowLight: "shadow-[0_0_0_1px_rgba(244,63,94,0.18),0_8px_24px_-6px_rgba(244,63,94,0.28)]",
    glowDark: "dark:shadow-[0_0_0_1px_rgba(244,63,94,0.28),0_0_28px_-2px_rgba(244,63,94,0.35)]",
    badgeBg: "bg-rose-500/10 dark:bg-rose-400/10 text-rose-700 dark:text-rose-200 border-rose-400/40",
    pillBg: "bg-white/70 dark:bg-rose-950/30 border-rose-300/60 dark:border-rose-400/30 text-rose-800 dark:text-rose-100",
    barBg: "bg-rose-500 dark:bg-rose-400",
    emptyText: "لا توجد تنبيهات — أداء ممتاز 🎉",
  },
};

/** Animated counter from 0 → value */
function useCountUp(value: number, duration = 600) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

function CountBadge({ value, className }: { value: number; className?: string }) {
  const n = useCountUp(value);
  return (
    <span className={cn("inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full text-xs font-bold border backdrop-blur tabular-nums", className)}>
      {n}
    </span>
  );
}

/** Trend arrow showing change vs previous snapshot. */
function TrendIndicator({ delta }: { delta: number }) {
  if (delta === 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
      <Minus className="h-2.5 w-2.5" />
      ثابت
    </span>
  );
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
      <TrendingUp className="h-2.5 w-2.5" />
      +{delta}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
      <TrendingDown className="h-2.5 w-2.5" />
      {delta}
    </span>
  );
}

interface QuickActionsProps {
  student: AlphaStudent;
  variant: SectionKey;
  onClose: () => void;
}

/** Compact quick-action bar revealed when a student is selected. */
function QuickActions({ student, variant, onClose }: QuickActionsProps) {
  const { toast } = useToast();
  const cfg = SECTIONS[variant];

  const actions = useMemo(() => {
    if (variant === "elite") return [
      { key: "praise", label: "ثناء", Icon: Trophy, onClick: () => toast({ title: "👏 أحسنت!", description: `تم إرسال ثناء للطالب: ${student.full_name}` }) },
      { key: "cert", label: "شهادة", Icon: Award, onClick: () => toast({ title: "🏅 شهادة تميز", description: `جاهزة للإصدار للطالب: ${student.full_name}` }) },
    ];
    if (variant === "alert") return [
      { key: "warn", label: "تنبيه", Icon: Bell, onClick: () => toast({ title: "🔔 تم تسجيل التنبيه", description: `تم تسجيل تنبيه للطالب: ${student.full_name}` }) },
      { key: "follow", label: "متابعة", Icon: Target, onClick: () => toast({ title: "🎯 قيد المتابعة", description: `تمت إضافة الطالب: ${student.full_name} لقائمة المتابعة` }) },
    ];
    return [
      { key: "encourage", label: "تشجيع", Icon: Sparkles, onClick: () => toast({ title: "✨ شجّع طالبك", description: `تم تسجيل تشجيع للطالب: ${student.full_name}` }) },
      { key: "focus", label: "تركيز", Icon: Target, onClick: () => toast({ title: "🎯 محل التركيز", description: `تمت إضافة الطالب: ${student.full_name} لقائمة التركيز` }) },
    ];
  }, [variant, student, toast]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className={cn("flex items-center gap-1 px-2 py-1.5 mt-1 rounded-lg border", cfg.pillBg)}>
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={(e) => { e.stopPropagation(); a.onClick(); }}
            className={cn("inline-flex items-center gap-1 px-2 h-7 rounded-md text-[10px] font-bold transition-all hover:scale-105 hover:bg-white/60 dark:hover:bg-white/10", cfg.accentText)}
          >
            <a.Icon className="h-3 w-3" />
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(student.full_name);
            toast({ title: "📋 تم النسخ", description: `تم نسخ اسم الطالب` });
          }}
          className="inline-flex items-center gap-1 px-2 h-7 rounded-md text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition"
        >
          <Copy className="h-3 w-3" />
          نسخ
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-[10px] text-muted-foreground hover:text-foreground px-1.5"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

interface SectionProps {
  cfg: SectionConfig;
  students: AlphaStudent[];
  totalStudents: number;
  hidden: boolean;
  onToggle: () => void;
  showScore?: boolean;
  showViolations?: boolean;
  trendDelta: number;
}

function Section({ cfg, students, totalStudents, hidden, onToggle, showScore, showViolations, trendDelta }: SectionProps) {
  const [expanded, setExpanded] = usePersistedState<boolean>(`alpha_section_expanded_${cfg.key}`, false);
  const [activeStudent, setActiveStudent] = useState<string | null>(null);

  const percentage = totalStudents > 0 ? Math.round((students.length / totalStudents) * 100) : 0;

  // Hero student: top performer for elite, most violations for alert, or first for ground
  const heroStudent = students[0];
  const visibleStudents = expanded ? students : students.slice(0, 3);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border backdrop-blur-xl transition-all duration-500 overflow-hidden font-[Cairo,Tajawal,system-ui,sans-serif]",
        "bg-white/60 dark:bg-slate-900/45",
        cfg.borderLight,
        cfg.borderDark,
        cfg.glowLight,
        cfg.glowDark,
      )}
    >
      {/* Decorative blob */}
      <div className={cn("pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-3xl opacity-40", cfg.iconColor.replace("text-", "bg-"))} />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-2 px-3 py-2.5 border-b border-white/30 dark:border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-white/70 dark:bg-white/5 border", cfg.borderLight, cfg.borderDark)}>
            <cfg.Icon className={cn("h-4 w-4", cfg.iconColor)} />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className={cn("text-sm font-bold leading-tight", cfg.accentText)}>{cfg.title}</h4>
            <span className="text-[10px] text-muted-foreground dark:text-slate-400 leading-tight">{cfg.subtitle}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <CountBadge value={hidden ? 0 : students.length} className={cfg.badgeBg} />
          <button
            type="button"
            onClick={onToggle}
            title={hidden ? "إظهار" : "إخفاء"}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 text-foreground/70 hover:text-foreground hover:bg-white/80 dark:hover:bg-white/10 transition"
          >
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!hidden && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="relative p-2.5">
              {/* KPI strip: percentage + trend */}
              <div className="flex items-center justify-between gap-2 mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-lg font-black tabular-nums leading-none", cfg.accentText)}>
                    {percentage}<span className="text-xs">%</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">من الفصل</span>
                </div>
                <TrendIndicator delta={trendDelta} />
              </div>

              {/* Hero student card */}
              {heroStudent && (
                <div className={cn("flex items-center gap-2 px-2.5 py-2 rounded-xl border mb-2", cfg.pillBg)}>
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-white/60 dark:bg-white/5 border", cfg.borderLight, cfg.borderDark)}>
                    <cfg.HeroIcon className={cn("h-4 w-4", cfg.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-muted-foreground leading-none mb-0.5">
                      {cfg.key === "elite" ? "نجم الحصة" : cfg.key === "alert" ? "الأكثر مخالفات" : "بحاجة لتشجيع"}
                    </p>
                    <p className="text-xs font-bold truncate">{heroStudent.full_name}</p>
                  </div>
                  {showScore && heroStudent.earnedTotal !== 0 && (
                    <span className={cn("text-xs font-black tabular-nums shrink-0", cfg.accentText)}>
                      {heroStudent.earnedTotal > 0 ? `+${heroStudent.earnedTotal}` : heroStudent.earnedTotal}
                    </span>
                  )}
                  {showViolations && (heroStudent.violationsCount || 0) > 0 && (
                    <span className={cn("text-xs font-black tabular-nums shrink-0 inline-flex items-center gap-0.5", cfg.accentText)}>
                      <AlertTriangle className="h-3 w-3" />
                      {heroStudent.violationsCount}
                    </span>
                  )}
                </div>
              )}

              {/* Student list (compact: 3 visible, expand for all) */}
              {students.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground dark:text-slate-400 py-4">
                  {cfg.emptyText}
                </p>
              ) : (
                <>
                  <div className={cn("max-h-72 overflow-y-auto", expanded && "pr-1")}>
                    <ul className="flex flex-col gap-1">
                      <AnimatePresence initial={false}>
                        {visibleStudents.map((s) => {
                          const isActive = activeStudent === s.student_id;
                          return (
                            <motion.li
                              key={s.student_id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.2 }}
                            >
                              <button
                                type="button"
                                onClick={() => setActiveStudent(isActive ? null : s.student_id)}
                                className={cn(
                                  "relative w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border backdrop-blur text-right transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-current",
                                  cfg.pillBg,
                                  cfg.iconColor,
                                  isActive && "ring-2 ring-current scale-[1.01]"
                                )}
                              >
                                <span className="text-xs font-semibold truncate text-foreground dark:text-slate-50 flex-1 text-right">
                                  {s.full_name}
                                </span>
                                {showScore && s.earnedTotal !== 0 && (
                                  <span className={cn("text-[11px] font-bold tabular-nums shrink-0", cfg.accentText)}>
                                    {s.earnedTotal > 0 ? `+${s.earnedTotal}` : s.earnedTotal}
                                  </span>
                                )}
                                {showViolations && (s.violationsCount || 0) > 0 && (
                                  <span className={cn("text-[11px] font-bold tabular-nums shrink-0 inline-flex items-center gap-0.5", cfg.accentText)}>
                                    <AlertTriangle className="h-3 w-3" />
                                    {s.violationsCount}
                                  </span>
                                )}
                              </button>
                              <AnimatePresence>
                                {isActive && (
                                  <QuickActions
                                    student={s}
                                    variant={cfg.key}
                                    onClose={() => setActiveStudent(null)}
                                  />
                                )}
                              </AnimatePresence>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </div>

                  {/* Expand toggle */}
                  {students.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setExpanded(!expanded)}
                      className={cn(
                        "mt-1.5 w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-white/40 dark:hover:bg-white/5",
                        cfg.accentText
                      )}
                    >
                      {expanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          عرض أقل
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          عرض الكل ({students.length})
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Horizontal stacked progress bar showing class distribution. */
function DistributionBar({ elite, ground, alert, total }: { elite: number; ground: number; alert: number; total: number }) {
  if (total === 0) return null;
  const ePct = (elite / total) * 100;
  const gPct = (ground / total) * 100;
  const aPct = (alert / total) * 100;

  return (
    <div className="px-3 pb-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
          <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-300" />
          توزيع أداء الفصل
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {total} طالب
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden bg-muted/50 flex">
        {ePct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${ePct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={SECTIONS.elite.barBg}
            title={`متميزون: ${elite}`}
          />
        )}
        {gPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${gPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className={SECTIONS.ground.barBg}
            title={`صفر: ${ground}`}
          />
        )}
        {aPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${aPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className={SECTIONS.alert.barBg}
            title={`تنبيه: ${alert}`}
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px]">
        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
          {Math.round(ePct)}% متميز
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-sm bg-slate-400 dark:bg-slate-300" />
          {Math.round(gPct)}% صفر
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
          <span className="h-2 w-2 rounded-sm bg-rose-500 dark:bg-rose-400" />
          {Math.round(aPct)}% تنبيه
        </span>
      </div>
    </div>
  );
}

export default function ClassAlphaDashboard({ classId, className, students, eliteMinScore }: Props) {
  const [hideElite, setHideElite] = usePersistedState<boolean>(`alpha_dash_elite_hidden_${classId}`, false);
  const [hideGround, setHideGround] = usePersistedState<boolean>(`alpha_dash_ground_hidden_${classId}`, false);
  const [hideAlert, setHideAlert] = usePersistedState<boolean>(`alpha_dash_alert_hidden_${classId}`, false);
  const [dashCollapsed, setDashCollapsed] = usePersistedState<boolean>(`alpha_dash_collapsed_${classId}`, false);

  const { elite, ground, alert } = useMemo(() => {
    const alertList = students
      .filter(s => (s.violationsCount || 0) > 0)
      .sort((a, b) => (b.violationsCount || 0) - (a.violationsCount || 0));

    const remaining = students.filter(s => (s.violationsCount || 0) === 0);

    const positives = remaining
      .filter(s => s.earnedTotal > (eliteMinScore ?? 0))
      .sort((a, b) => b.earnedTotal - a.earnedTotal);
    const eliteList = eliteMinScore != null ? positives : positives.slice(0, 8);
    const eliteIds = new Set(eliteList.map(s => s.student_id));

    // Ground sorted by lowest improvement potential first (those who really need encouragement)
    const groundList = remaining
      .filter(s => !eliteIds.has(s.student_id))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));

    return { elite: eliteList, ground: groundList, alert: alertList };
  }, [students, eliteMinScore]);

  // Track previous counts per class to compute trend deltas
  const prevRef = useRef<Record<string, { elite: number; ground: number; alert: number }>>({});
  const [deltas, setDeltas] = useState({ elite: 0, ground: 0, alert: 0 });

  useEffect(() => {
    const prev = prevRef.current[classId];
    if (prev) {
      setDeltas({
        elite: elite.length - prev.elite,
        ground: ground.length - prev.ground,
        alert: alert.length - prev.alert,
      });
    }
    prevRef.current[classId] = { elite: elite.length, ground: ground.length, alert: alert.length };
  }, [classId, elite.length, ground.length, alert.length]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl no-print font-[Cairo,Tajawal,system-ui,sans-serif]",
        "border-white/40 dark:border-white/10",
        "bg-gradient-to-br from-white/70 via-white/50 to-white/70",
        "dark:bg-gradient-to-br dark:from-slate-900/60 dark:via-indigo-950/40 dark:to-slate-900/60",
        "shadow-[0_8px_30px_rgba(2,6,23,0.06)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--foreground))_1px,transparent_0)] [background-size:18px_18px]" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/40 dark:border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-foreground dark:text-slate-100 truncate">
              لوحة تصنيف الفصل الذكية
            </h3>
            <p className="text-[10px] text-muted-foreground dark:text-slate-400 truncate">
              {className} — تحديث لحظي حسب الرصد
            </p>
          </div>
        </div>
        <button
          onClick={() => setDashCollapsed(!dashCollapsed)}
          className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-white/5 border border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 transition-all shrink-0"
          aria-label={dashCollapsed ? "إظهار اللوحة" : "إخفاء اللوحة"}
        >
          {dashCollapsed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{dashCollapsed ? "إظهار" : "إخفاء"}</span>
          {dashCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!dashCollapsed && (
          <motion.div
            key="dash-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Distribution KPI bar */}
            <DistributionBar
              elite={elite.length}
              ground={ground.length}
              alert={alert.length}
              total={students.length}
            />

            {/* Three sections */}
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 p-3 pt-0">
              <Section
                cfg={SECTIONS.elite}
                students={elite}
                totalStudents={students.length}
                hidden={hideElite}
                onToggle={() => setHideElite(!hideElite)}
                showScore
                trendDelta={deltas.elite}
              />
              <Section
                cfg={SECTIONS.ground}
                students={ground}
                totalStudents={students.length}
                hidden={hideGround}
                onToggle={() => setHideGround(!hideGround)}
                trendDelta={deltas.ground}
              />
              <Section
                cfg={SECTIONS.alert}
                students={alert}
                totalStudents={students.length}
                hidden={hideAlert}
                onToggle={() => setHideAlert(!hideAlert)}
                showViolations
                trendDelta={deltas.alert}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
