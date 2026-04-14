import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Radar, RotateCcw, Volume2, VolumeX, Award, Star, X } from "lucide-react";
import { playTickSound, playSelectSound, startScanHum } from "./radar-audio";

// ── Types ──────────────────────────────────────────────────────────
interface Student {
  student_id: string;
  full_name: string;
}

interface RadarSettings {
  speed: "fast" | "medium" | "slow";
  sessionMemory: boolean;
  visualEffect: "radar" | "slots" | "spotlight";
}

interface SmartRadarProps {
  students: Student[];
  settings: RadarSettings;
  muted: boolean;
  onToggleMute: () => void;
  onSelectForGrade: (studentId: string) => void;
  onSelectForParticipation: (studentId: string) => void;
  onClose: () => void;
}

const SPEED_MAP = { fast: 60, medium: 100, slow: 160 };
const SPIN_TICKS = { fast: 20, medium: 28, slow: 35 };

export default function SmartRadar({
  students,
  settings,
  muted,
  onToggleMute,
  onSelectForGrade,
  onSelectForParticipation,
  onClose,
}: SmartRadarProps) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showActions, setShowActions] = useState(false);
  const stopHumRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const available = students.filter(
    (s) => !settings.sessionMemory || !excluded.has(s.student_id)
  );

  const handleReset = () => {
    setExcluded(new Set());
    setSelectedStudent(null);
    setShowActions(false);
  };

  const handleSpin = useCallback(() => {
    if (spinning || available.length === 0) return;
    setSelectedStudent(null);
    setShowActions(false);
    setSpinning(true);

    if (!muted) {
      stopHumRef.current = startScanHum();
    }

    const totalTicks = SPIN_TICKS[settings.speed];
    const interval = SPEED_MAP[settings.speed];
    let tick = 0;

    // Pick winner first
    const winnerIdx = Math.floor(Math.random() * available.length);

    intervalRef.current = setInterval(() => {
      tick++;
      // Slow down towards the end
      const idx = tick < totalTicks - 5
        ? Math.floor(Math.random() * available.length)
        : (winnerIdx + (totalTicks - tick)) % available.length;

      setCurrentIndex(students.findIndex((s) => s.student_id === available[idx >= 0 ? idx : 0]?.student_id));

      if (!muted) {
        const pitch = 600 + (tick / totalTicks) * 800;
        playTickSound(pitch);
      }

      if (tick >= totalTicks) {
        clearInterval(intervalRef.current!);
        stopHumRef.current?.();
        stopHumRef.current = null;

        const winner = available[winnerIdx];
        setCurrentIndex(students.findIndex((s) => s.student_id === winner.student_id));
        setSelectedStudent(winner);
        setSpinning(false);
        setShowActions(true);

        if (settings.sessionMemory) {
          setExcluded((prev) => new Set([...prev, winner.student_id]));
        }

        if (!muted) playSelectSound();
      }
    }, interval);
  }, [spinning, available, students, settings, muted]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopHumRef.current?.();
    };
  }, []);

  const handleGradeAction = () => {
    if (selectedStudent) onSelectForGrade(selectedStudent.student_id);
    setShowActions(false);
    setSelectedStudent(null);
  };

  const handleParticipationAction = () => {
    if (selectedStudent) onSelectForParticipation(selectedStudent.student_id);
    setShowActions(false);
    setSelectedStudent(null);
  };

  const allExcluded = settings.sessionMemory && excluded.size >= students.length;

  return (
    <div className="relative rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-2xl text-white overflow-hidden" dir="rtl">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Radar className={cn("h-5 w-5 text-primary", spinning && "animate-spin")} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/90">الرادار الذكي</h3>
            <p className="text-[10px] text-white/50">
              {settings.sessionMemory
                ? `${available.length} متاح من ${students.length}`
                : `${students.length} طالب`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleMute}
            className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            title={muted ? "تشغيل الصوت" : "كتم الصوت"}
          >
            {muted ? <VolumeX className="h-4 w-4 text-white/50" /> : <Volume2 className="h-4 w-4 text-primary" />}
          </button>
          {settings.sessionMemory && excluded.size > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              title="اعادة ضبط"
            >
              <RotateCcw className="h-4 w-4 text-amber-400" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            title="اغلاق"
          >
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Scanner display */}
      <div className="relative rounded-xl border border-primary/20 bg-black/40 p-4 mb-4 min-h-[120px] flex flex-col items-center justify-center">
        {/* Scan line effect when spinning */}
        {spinning && (
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="absolute w-full h-1 bg-gradient-to-l from-transparent via-primary/60 to-transparent animate-[scan_1.5s_linear_infinite]" />
          </div>
        )}

        {currentIndex >= 0 && students[currentIndex] ? (
          <div className={cn(
            "text-center transition-all duration-150",
            spinning && "scale-105",
            selectedStudent && "scale-110"
          )}>
            <div className={cn(
              "text-2xl font-black tracking-wide",
              selectedStudent ? "text-primary" : "text-white/90"
            )}>
              {students[currentIndex].full_name}
            </div>
            {selectedStudent && (
              <div className="mt-2 text-xs text-primary/70 font-medium animate-fade-in">
                تم الاختيار
              </div>
            )}
          </div>
        ) : (
          <div className="text-white/30 text-sm">
            {allExcluded ? "تم اختيار جميع الطلاب - اضغط اعادة الضبط" : "اضغط زر التشغيل للبدء"}
          </div>
        )}
      </div>

      {/* Excluded chips */}
      {settings.sessionMemory && excluded.size > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {Array.from(excluded).map((id) => {
            const st = students.find((s) => s.student_id === id);
            return st ? (
              <span
                key={id}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/40 border border-white/10"
              >
                {st.full_name.split(" ").slice(0, 2).join(" ")}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Action buttons */}
      {showActions && selectedStudent ? (
        <div className="grid grid-cols-2 gap-2 animate-fade-in">
          <button
            type="button"
            onClick={handleGradeAction}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all text-sm font-bold text-primary"
          >
            <Award className="h-4 w-4" />
            سؤال بدرجة
          </button>
          <button
            type="button"
            onClick={handleParticipationAction}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-sm font-bold text-amber-400"
          >
            <Star className="h-4 w-4" />
            مشاركة صفية
          </button>
        </div>
      ) : (
        <Button
          onClick={handleSpin}
          disabled={spinning || allExcluded}
          className={cn(
            "w-full h-12 text-base font-bold rounded-xl transition-all",
            spinning
              ? "bg-primary/20 text-primary border-primary/30"
              : "bg-gradient-to-l from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30"
          )}
        >
          {spinning ? (
            <span className="flex items-center gap-2">
              <Radar className="h-5 w-5 animate-spin" />جاري البحث...
            </span>
          ) : allExcluded ? (
            "تم اختيار الجميع"
          ) : (
            <span className="flex items-center gap-2">
              <Radar className="h-5 w-5" />تشغيل الرادار
            </span>
          )}
        </Button>
      )}

      {/* Scan line animation keyframe */}
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}
