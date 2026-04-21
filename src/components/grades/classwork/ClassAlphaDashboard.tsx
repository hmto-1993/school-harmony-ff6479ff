import { useEffect, useMemo, useRef, useState } from "react";
import { Star, CircleDashed, AlertTriangle, Eye, EyeOff, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePersistedState } from "@/hooks/usePersistedState";

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
  /** Threshold above which a student is considered "Elite" (net score). Default: any positive net score, top performers. */
  eliteMinScore?: number;
}

type SectionKey = "elite" | "ground" | "alert";

interface SectionConfig {
  key: SectionKey;
  title: string;
  subtitle: string;
  Icon: typeof Star;
  // Tailwind tokens for accents
  accentText: string;
  iconColor: string;
  borderLight: string;
  borderDark: string;
  glowLight: string;
  glowDark: string;
  badgeBg: string;
  pillBg: string;
}

const SECTIONS: Record<SectionKey, SectionConfig> = {
  elite: {
    key: "elite",
    title: "المتميزون",
    subtitle: "Alpha Elite",
    Icon: Star,
    accentText: "text-emerald-700 dark:text-emerald-300",
    iconColor: "text-emerald-500 dark:text-emerald-300",
    borderLight: "border-emerald-300/70",
    borderDark: "dark:border-emerald-400/40",
    glowLight: "shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_8px_24px_-6px_rgba(16,185,129,0.25)]",
    glowDark: "dark:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_28px_-2px_rgba(16,185,129,0.35)]",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-200 border-emerald-400/40",
    pillBg: "bg-white/70 dark:bg-emerald-950/30 border-emerald-300/60 dark:border-emerald-400/30 text-emerald-800 dark:text-emerald-100",
  },
  ground: {
    key: "ground",
    title: "منطقة الصفر",
    subtitle: "Alpha Ground",
    Icon: CircleDashed,
    accentText: "text-slate-700 dark:text-slate-200",
    iconColor: "text-slate-500 dark:text-slate-300",
    borderLight: "border-slate-300/70",
    borderDark: "dark:border-slate-400/30",
    glowLight: "shadow-[0_0_0_1px_rgba(148,163,184,0.18),0_8px_24px_-6px_rgba(148,163,184,0.25)]",
    glowDark: "dark:shadow-[0_0_0_1px_rgba(203,213,225,0.18),0_0_24px_-4px_rgba(203,213,225,0.25)]",
    badgeBg: "bg-slate-400/10 dark:bg-slate-300/10 text-slate-700 dark:text-slate-100 border-slate-400/40",
    pillBg: "bg-white/70 dark:bg-slate-900/40 border-slate-300/60 dark:border-slate-400/25 text-slate-800 dark:text-slate-100",
  },
  alert: {
    key: "alert",
    title: "منطقة التنبيه",
    subtitle: "Alpha Alert",
    Icon: AlertTriangle,
    accentText: "text-rose-700 dark:text-rose-300",
    iconColor: "text-rose-500 dark:text-rose-300",
    borderLight: "border-rose-300/70",
    borderDark: "dark:border-rose-400/40",
    glowLight: "shadow-[0_0_0_1px_rgba(244,63,94,0.18),0_8px_24px_-6px_rgba(244,63,94,0.28)]",
    glowDark: "dark:shadow-[0_0_0_1px_rgba(244,63,94,0.28),0_0_28px_-2px_rgba(244,63,94,0.35)]",
    badgeBg: "bg-rose-500/10 dark:bg-rose-400/10 text-rose-700 dark:text-rose-200 border-rose-400/40",
    pillBg: "bg-white/70 dark:bg-rose-950/30 border-rose-300/60 dark:border-rose-400/30 text-rose-800 dark:text-rose-100",
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

function RadarPing({ x, y }: { x: number; y: number }) {
  return (
    <span
      className="pointer-events-none absolute z-10 h-3 w-3 rounded-full"
      style={{ left: x - 6, top: y - 6 }}
    >
      <span className="absolute inset-0 rounded-full bg-current opacity-60 animate-ping" />
      <span className="absolute inset-[3px] rounded-full bg-current" />
    </span>
  );
}

interface SectionProps {
  cfg: SectionConfig;
  students: AlphaStudent[];
  hidden: boolean;
  onToggle: () => void;
  emptyText: string;
  showScore?: boolean;
  showViolations?: boolean;
}

function Section({ cfg, students, hidden, onToggle, emptyText, showScore, showViolations }: SectionProps) {
  const [pings, setPings] = useState<{ id: number; x: number; y: number; key: string }[]>([]);
  const idRef = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++idRef.current;
    setPings(p => [...p, { id, x, y, key }]);
    setTimeout(() => setPings(p => p.filter(pi => pi.id !== id)), 800);
  };

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
            <div className="relative p-2.5 max-h-72 overflow-y-auto">
              {students.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground dark:text-slate-400 py-6">
                  {emptyText}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  <AnimatePresence initial={false}>
                    {students.map((s) => (
                      <motion.li
                        key={s.student_id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleClick(e, s.student_id)}
                          className={cn(
                            "relative w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur text-right transition-all duration-200 hover:scale-[1.015] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-current",
                            cfg.pillBg,
                            cfg.iconColor,
                          )}
                        >
                          <span className="text-sm font-semibold truncate text-foreground dark:text-slate-50 flex-1 text-right">
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
                          {pings.filter(p => p.key === s.student_id).map(p => (
                            <RadarPing key={p.id} x={p.x} y={p.y} />
                          ))}
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ClassAlphaDashboard({ classId, className, students, eliteMinScore }: Props) {
  const [hideElite, setHideElite] = usePersistedState<boolean>(`alpha_dash_elite_hidden_${classId}`, false);
  const [hideGround, setHideGround] = usePersistedState<boolean>(`alpha_dash_ground_hidden_${classId}`, false);
  const [hideAlert, setHideAlert] = usePersistedState<boolean>(`alpha_dash_alert_hidden_${classId}`, false);

  const { elite, ground, alert } = useMemo(() => {
    const alertList = students
      .filter(s => (s.violationsCount || 0) > 0)
      .sort((a, b) => (b.violationsCount || 0) - (a.violationsCount || 0));

    const remaining = students.filter(s => (s.violationsCount || 0) === 0);

    // Elite: positive net scores. If eliteMinScore provided, use it; else top performers (>0) up to 8.
    const positives = remaining
      .filter(s => s.earnedTotal > (eliteMinScore ?? 0))
      .sort((a, b) => b.earnedTotal - a.earnedTotal);
    const eliteList = eliteMinScore != null ? positives : positives.slice(0, 8);
    const eliteIds = new Set(eliteList.map(s => s.student_id));

    // Ground: no violations, no positive score (zero or untouched)
    const groundList = remaining
      .filter(s => !eliteIds.has(s.student_id))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));

    return { elite: eliteList, ground: groundList, alert: alertList };
  }, [students, eliteMinScore]);

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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-foreground dark:text-slate-100">
              لوحة تصنيف الفصل الذكية
            </h3>
            <p className="text-[10px] text-muted-foreground dark:text-slate-400">
              {className} — تحديث لحظي حسب الرصد
            </p>
          </div>
        </div>
      </div>

      {/* Three sections */}
      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 p-3">
        <Section
          cfg={SECTIONS.elite}
          students={elite}
          hidden={hideElite}
          onToggle={() => setHideElite(!hideElite)}
          emptyText="لا يوجد متميزون بعد"
          showScore
        />
        <Section
          cfg={SECTIONS.ground}
          students={ground}
          hidden={hideGround}
          onToggle={() => setHideGround(!hideGround)}
          emptyText="لا يوجد طلاب في هذه المنطقة"
        />
        <Section
          cfg={SECTIONS.alert}
          students={alert}
          hidden={hideAlert}
          onToggle={() => setHideAlert(!hideAlert)}
          emptyText="لا توجد تنبيهات — أداء ممتاز 🎉"
          showViolations
        />
      </div>
    </div>
  );
}
