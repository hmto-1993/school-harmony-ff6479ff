import { useMemo, useState } from "react";
import { Crown, Eye, EyeOff, Trophy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { usePersistedState } from "@/hooks/usePersistedState";
import type { SummaryRow } from "./classwork-types";

interface Props {
  classId: string;
  className: string;
  students: SummaryRow[];
}

interface PodiumStudent {
  id: string;
  name: string;
  score: number;
  rank: 1 | 2 | 3;
}

const RANK_CONFIG = {
  1: {
    label: "المركز الأول",
    crown: "text-amber-300",
    glow: "shadow-[0_0_60px_rgba(251,191,36,0.55)]",
    border: "border-amber-300/70",
    bg: "from-amber-400/30 via-yellow-300/20 to-amber-500/10",
    ring: "ring-amber-300/60",
    text: "text-amber-200",
    height: "h-44 sm:h-52",
    pillar: "from-amber-400/40 to-amber-600/20",
    iconSize: "h-10 w-10",
  },
  2: {
    label: "المركز الثاني",
    crown: "text-slate-200",
    glow: "shadow-[0_0_35px_rgba(203,213,225,0.35)]",
    border: "border-slate-300/60",
    bg: "from-slate-300/25 via-slate-200/15 to-slate-400/10",
    ring: "ring-slate-300/50",
    text: "text-slate-100",
    height: "h-36 sm:h-40",
    pillar: "from-slate-300/35 to-slate-500/15",
    iconSize: "h-8 w-8",
  },
  3: {
    label: "المركز الثالث",
    crown: "text-orange-300",
    glow: "shadow-[0_0_30px_rgba(251,146,60,0.35)]",
    border: "border-orange-400/60",
    bg: "from-orange-400/25 via-amber-600/15 to-orange-500/10",
    ring: "ring-orange-300/50",
    text: "text-orange-200",
    height: "h-32 sm:h-36",
    pillar: "from-orange-400/35 to-orange-600/15",
    iconSize: "h-8 w-8",
  },
} as const;

export default function AlphaLeaderboard({ classId, className, students }: Props) {
  const [hidden, setHidden] = usePersistedState<boolean>(`alpha_leaderboard_hidden_${classId}`, false);
  const [pulseId, setPulseId] = useState<string | null>(null);

  const podium = useMemo<PodiumStudent[]>(() => {
    const sorted = [...students]
      .map((s) => ({ id: s.student_id, name: s.full_name, score: s.earnedTotal }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return sorted.slice(0, 3).map((s, i) => ({ ...s, rank: (i + 1) as 1 | 2 | 3 }));
  }, [students]);

  const handleStudentClick = (id: string) => {
    setPulseId(id);
    setTimeout(() => setPulseId(null), 800);
    const colors = ["#fbbf24", "#f59e0b", "#fcd34d", "#fde68a", "#fff7ed"];
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.4 },
      colors,
      scalar: 0.9,
    });
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });
  };

  // Order: 2nd | 1st | 3rd
  const ordered = [
    podium.find((p) => p.rank === 2),
    podium.find((p) => p.rank === 1),
    podium.find((p) => p.rank === 3),
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl no-print transition-all duration-500",
        "border-white/10 dark:border-white/10",
        "bg-gradient-to-br from-slate-900/70 via-indigo-950/60 to-slate-900/70",
        "shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
      )}
    >
      {/* Decorative cosmic blobs */}
      <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:18px_18px]" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-2 px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Trophy className="h-5 w-5 text-amber-300" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-200 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold bg-gradient-to-l from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
              لوحة شرف ألفا
            </h3>
            <p className="text-[10px] text-slate-300/70">
              المتميزون في {className} — حسب صافي الدرجات
            </p>
          </div>
        </div>
        <button
          onClick={() => setHidden(!hidden)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300",
            "bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 hover:border-white/20",
            "backdrop-blur-md"
          )}
          title={hidden ? "إظهار اللوحة" : "إخفاء اللوحة"}
        >
          {hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          <span>{hidden ? "إظهار" : "إخفاء"}</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!hidden && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="relative px-4 pt-6 pb-4">
              {podium.length === 0 ? (
                <p className="text-center text-sm text-slate-300/60 py-6">
                  لا توجد درجات كافية لعرض المتصدرين بعد
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-2xl mx-auto">
                  {ordered.map((p, idx) => {
                    if (!p) return <div key={idx} />;
                    const cfg = RANK_CONFIG[p.rank];
                    const isFirst = p.rank === 1;
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        onClick={() => handleStudentClick(p.id)}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.12, type: "spring", stiffness: 120 }}
                        className={cn(
                          "group relative flex flex-col items-center justify-end rounded-2xl border-2 backdrop-blur-md",
                          "bg-gradient-to-b transition-all duration-300 hover:scale-[1.04] focus:outline-none focus:ring-2",
                          "px-2 py-3 sm:px-3 sm:py-4",
                          cfg.bg,
                          cfg.border,
                          cfg.ring,
                          cfg.height,
                          cfg.glow,
                          pulseId === p.id && "animate-pulse",
                          isFirst && "ring-2"
                        )}
                      >
                        {/* Glow halo behind first place name */}
                        {isFirst && (
                          <div className="pointer-events-none absolute inset-x-4 top-10 h-12 rounded-full bg-amber-300/30 blur-2xl" />
                        )}

                        {/* Crown */}
                        <Crown
                          className={cn(
                            "drop-shadow-[0_0_8px_currentColor] mb-1",
                            cfg.crown,
                            cfg.iconSize,
                            isFirst && "animate-[bounce_2.5s_ease-in-out_infinite]"
                          )}
                          fill="currentColor"
                          strokeWidth={1.5}
                        />

                        {/* Rank number badge */}
                        <div
                          className={cn(
                            "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black border-2",
                            cfg.border,
                            "bg-slate-900/60 backdrop-blur",
                            cfg.text
                          )}
                        >
                          {p.rank}
                        </div>

                        {/* Name */}
                        <p
                          className={cn(
                            "relative z-10 mt-2 text-center font-bold leading-tight px-1",
                            isFirst ? "text-sm sm:text-base" : "text-xs sm:text-sm",
                            cfg.text
                          )}
                        >
                          {p.name}
                        </p>

                        {/* Score */}
                        <div
                          className={cn(
                            "relative z-10 mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border",
                            "bg-slate-900/50 backdrop-blur",
                            cfg.border,
                            cfg.text
                          )}
                        >
                          {p.score} نقطة
                        </div>

                        {/* Pillar shine */}
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-x-2 bottom-0 h-3 rounded-b-xl bg-gradient-to-t opacity-60",
                            cfg.pillar
                          )}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
