import React, { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Radar, RotateCcw, Volume2, VolumeX, Award, Star, X, HelpCircle, Timer, BookOpen, UserMinus, Check } from "lucide-react";
import { playTickSound, playSelectSound, startScanHum, playCorrectSound, playWrongSound } from "./radar-audio";
import { type RadarQuestion, getRandomQuestion, loadQuestions } from "./radar-quiz-types";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import RadarQuizModal from "./RadarQuizModal";

/** Fire a small celebratory confetti burst from a DOM element's position */
export function fireRadarConfetti(el: HTMLElement | null) {
  const rect = el?.getBoundingClientRect();
  const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
  const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.4;
  confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 32,
    gravity: 0.9,
    scalar: 0.85,
    ticks: 130,
    origin: { x, y },
    colors: ["#10b981", "#34d399", "#fbbf24", "#60a5fa", "#a78bfa"],
    disableForReducedMotion: true,
  });
}

// ── Types ──────────────────────────────────────────────────────────
interface Student {
  student_id: string;
  full_name: string;
}

export interface RadarSettings {
  speed: "fast" | "medium" | "slow";
  sessionMemory: boolean;
  visualEffect: "radar" | "slots" | "spotlight";
  quizEnabled: boolean;
  surpriseMode: boolean;
  quizDuration: number;
  questionSource: "local" | "bank"; // local = quick questions, bank = from library
}

interface SmartRadarProps {
  students: Student[];
  settings: RadarSettings;
  muted: boolean;
  participatedStudentIds?: string[];
  onToggleMute: () => void;
  onSelectForGrade: (studentId: string) => void;
  onSelectForParticipation: (studentId: string, level: "excellent" | "average" | "zero" | "star") => void;
  onQuizCorrect: (studentId: string, score: number) => void;
  onClose: () => void;
}

const SPEED_MAP = { fast: 60, medium: 100, slow: 160 };
const SPIN_TICKS = { fast: 20, medium: 28, slow: 35 };

export default function SmartRadar({
  students,
  settings,
  muted,
  participatedStudentIds = [],
  onToggleMute,
  onSelectForGrade,
  onSelectForParticipation,
  onQuizCorrect,
  onClose,
}: SmartRadarProps) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showParticipationPicker, setShowParticipationPicker] = useState(false);
  const [excludeParticipated, setExcludeParticipated] = useState(true);

  // Quick duration override (before spinning)
  const [localDuration, setLocalDuration] = useState(settings.quizDuration);

  // Quiz state
  const [quizQuestion, setQuizQuestion] = useState<RadarQuestion | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickAudioRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Visual feedback state (✓ / ✗ overlay + shake)
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const studentNameRef = useRef<HTMLDivElement | null>(null);

  const stopHumRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionsRef = useRef<RadarQuestion[]>([]);

  /** Trigger visual feedback (auto-clears after 800ms) */
  const triggerFeedback = useCallback((kind: "correct" | "wrong") => {
    setFeedback(kind);
    if (kind === "correct") {
      fireRadarConfetti(studentNameRef.current);
    }
    window.setTimeout(() => setFeedback(null), 850);
  }, []);


  // Bank question source state
  const [bankChapters, setBankChapters] = useState<{ id: string; title: string }[]>([]);
  const [bankLessons, setBankLessons] = useState<{ id: string; title: string }[]>([]);
  const [selectedBankChapter, setSelectedBankChapter] = useState<string>("");
  const [selectedBankLesson, setSelectedBankLesson] = useState<string>("");
  const bankQuestionsRef = useRef<RadarQuestion[]>([]);

  useEffect(() => { setLocalDuration(settings.quizDuration); }, [settings.quizDuration]);

  // Load local questions
  useEffect(() => {
    questionsRef.current = loadQuestions();
  }, []);

  // Load bank chapters
  useEffect(() => {
    if (settings.questionSource === "bank" && settings.quizEnabled) {
      supabase.from("question_bank_chapters").select("id, title").order("sort_order").then(({ data }) => {
        setBankChapters((data as any[]) || []);
      });
    }
  }, [settings.questionSource, settings.quizEnabled]);

  // Load bank lessons when chapter selected
  useEffect(() => {
    if (selectedBankChapter) {
      supabase.from("question_bank_lessons").select("id, title").eq("chapter_id", selectedBankChapter).order("sort_order").then(({ data }) => {
        setBankLessons((data as any[]) || []);
      });
    } else {
      setBankLessons([]);
      setSelectedBankLesson("");
    }
  }, [selectedBankChapter]);

  // Load bank questions when lesson selected
  useEffect(() => {
    if (selectedBankLesson) {
      supabase.from("question_bank_questions").select("*").eq("lesson_id", selectedBankLesson).eq("enabled", true).then(({ data }) => {
        bankQuestionsRef.current = ((data as any[]) || []).map((q: any) => ({
          id: q.id,
          type: q.question_type as "mcq" | "truefalse",
          text: q.question_text,
          options: q.options as string[],
          correctIndex: q.correct_index,
          score: q.score,
          enabled: true,
        }));
      });
    } else {
      bankQuestionsRef.current = [];
    }
  }, [selectedBankLesson]);

  const participatedSet = new Set(participatedStudentIds);
  const available = students.filter(
    (s) => (!settings.sessionMemory || !excluded.has(s.student_id)) &&
           (!excludeParticipated || !participatedSet.has(s.student_id))
  );

  // ── Timer logic ──────────────────────────────────────────────────
  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (tickAudioRef.current) { clearInterval(tickAudioRef.current); tickAudioRef.current = null; }
  }, []);

  const startTimer = useCallback((duration: number) => {
    clearTimers();
    setTimeLeft(duration);
    setTimerPaused(false);
  }, [clearTimers]);

  // Countdown effect
  useEffect(() => {
    if (timeLeft <= 0 || timerPaused || quizResult) {
      clearTimers();
      // Auto-submit timeout (wrong answer)
      if (timeLeft <= 0 && quizQuestion && !quizResult && selectedAnswer === null) {
        setQuizResult("wrong");
        if (!muted) playWrongSound();
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    // Tick sound every second when < 10s
    if (timeLeft <= 10 && !muted) {
      tickAudioRef.current = setInterval(() => {
        playTickSound(1200);
      }, 1000);
    }
    return () => clearTimers();
  }, [timeLeft, timerPaused, quizResult, muted, quizQuestion, selectedAnswer, clearTimers]);

  const handleReset = () => {
    setExcluded(new Set());
    setSelectedStudent(null);
    setShowActions(false);
    setQuizQuestion(null);
    setQuizResult(null);
    setSelectedAnswer(null);
    clearTimers();
    setTimeLeft(0);
  };

  const getQuizQuestion = useCallback((): RadarQuestion | null => {
    if (settings.questionSource === "bank") {
      const enabled = bankQuestionsRef.current.filter(q => q.enabled);
      if (enabled.length === 0) return null;
      return enabled[Math.floor(Math.random() * enabled.length)];
    }
    return getRandomQuestion(questionsRef.current);
  }, [settings.questionSource]);

  const openQuizForStudent = useCallback((student: Student) => {
    const q = getQuizQuestion();
    if (q) {
      setQuizQuestion(q);
      setQuizResult(null);
      setSelectedAnswer(null);
      setShowActions(false);
      startTimer(localDuration);
    }
  }, [localDuration, startTimer, getQuizQuestion]);

  const handleSpin = useCallback(() => {
    if (spinning || available.length === 0) return;
    setSelectedStudent(null);
    setShowActions(false);
    setQuizQuestion(null);
    setQuizResult(null);
    setSelectedAnswer(null);
    setShowParticipationPicker(false);
    clearTimers();
    setTimeLeft(0);
    setSpinning(true);

    if (!muted) {
      stopHumRef.current = startScanHum();
    }

    const totalTicks = SPIN_TICKS[settings.speed];
    const interval = SPEED_MAP[settings.speed];
    let tick = 0;
    const winnerIdx = Math.floor(Math.random() * available.length);

    intervalRef.current = setInterval(() => {
      tick++;
      const idx = tick < totalTicks - 5
        ? Math.floor(Math.random() * available.length)
        : (winnerIdx + (totalTicks - tick)) % available.length;

      setCurrentIndex(students.findIndex((s) => s.student_id === available[idx >= 0 ? idx : 0]?.student_id));

      if (!muted) {
        playTickSound(600 + (tick / totalTicks) * 800);
      }

      if (tick >= totalTicks) {
        clearInterval(intervalRef.current!);
        stopHumRef.current?.();
        stopHumRef.current = null;

        const winner = available[winnerIdx];
        setCurrentIndex(students.findIndex((s) => s.student_id === winner.student_id));
        setSelectedStudent(winner);
        setSpinning(false);

        if (settings.sessionMemory) {
          setExcluded((prev) => new Set([...prev, winner.student_id]));
        }

        if (!muted) playSelectSound();

        // Surprise mode: auto-open quiz
        if (settings.surpriseMode && settings.quizEnabled) {
          const q = getQuizQuestion();
          if (q) {
            setQuizQuestion(q);
            setQuizResult(null);
            setSelectedAnswer(null);
            startTimer(localDuration);
            return;
          }
        }

        setShowActions(true);
      }
    }, interval);
  }, [spinning, available, students, settings, muted, localDuration, startTimer, clearTimers]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopHumRef.current?.();
      clearTimers();
    };
  }, [clearTimers]);

  const handleGradeAction = () => {
    if (selectedStudent) onSelectForGrade(selectedStudent.student_id);
    setShowActions(false);
    setSelectedStudent(null);
  };

  const handleParticipationAction = () => {
    setShowParticipationPicker(true);
  };

  const handlePickLevel = (level: "excellent" | "average" | "zero" | "star") => {
    if (selectedStudent) onSelectForParticipation(selectedStudent.student_id, level);
    setShowParticipationPicker(false);
    setShowActions(false);
    setSelectedStudent(null);
  };

  const handleQuizAction = () => {
    if (selectedStudent) openQuizForStudent(selectedStudent);
  };

  const handleQuizAnswer = (answerIdx: number) => {
    if (!quizQuestion || quizResult) return;
    setSelectedAnswer(answerIdx);
    const isCorrect = answerIdx === quizQuestion.correctIndex;
    setQuizResult(isCorrect ? "correct" : "wrong");
    clearTimers();

    if (!muted) {
      if (isCorrect) playCorrectSound();
      else playWrongSound();
    }

    if (isCorrect && selectedStudent) {
      onQuizCorrect(selectedStudent.student_id, quizQuestion.score);
    }
  };

  const handleQuizDismiss = () => {
    setQuizQuestion(null);
    setQuizResult(null);
    setSelectedAnswer(null);
    setSelectedStudent(null);
    setShowActions(false);
    clearTimers();
    setTimeLeft(0);
  };

  const allExcluded = settings.sessionMemory && excluded.size >= students.length;
  const hasLocalQuiz = settings.quizEnabled && questionsRef.current.some((q) => q.enabled);
  const hasBankQuiz = settings.quizEnabled && settings.questionSource === "bank" && bankQuestionsRef.current.length > 0;
  const hasQuizQuestions = hasLocalQuiz || hasBankQuiz;

  // Timer color
  const timerDuration = localDuration;
  const timerPercent = timerDuration > 0 ? (timeLeft / timerDuration) * 100 : 0;
  const timerColor = timeLeft <= 5 ? "bg-rose-500" : timeLeft <= 15 ? "bg-amber-500" : "bg-emerald-500";
  const timerTextColor = timeLeft <= 5 ? "text-rose-400" : timeLeft <= 15 ? "text-amber-400" : "text-emerald-400";
  const timerBorderColor = timeLeft <= 5 ? "border-rose-500/50" : timeLeft <= 15 ? "border-amber-500/50" : "border-emerald-500/50";

  // ── Quiz Modal ──────────────────────────────────────────────────
  if (quizQuestion && selectedStudent) {
    return (
      <RadarQuizModal
        question={quizQuestion}
        studentName={selectedStudent.full_name}
        muted={muted}
        onToggleMute={onToggleMute}
        timeLeft={timeLeft}
        timerPaused={timerPaused}
        onTogglePause={() => setTimerPaused(p => !p)}
        timerDuration={localDuration}
        selectedAnswer={selectedAnswer}
        quizResult={quizResult}
        onAnswer={handleQuizAnswer}
        onDismiss={handleQuizDismiss}
      />
    );
  }

  // ── Main Radar UI ──────────────────────────────────────────────
  return (
    <div className="relative rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-2xl text-white overflow-hidden" dir="rtl">
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
          <button type="button" onClick={onToggleMute}
            className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            title={muted ? "تشغيل الصوت" : "كتم الصوت"}>
            {muted ? <VolumeX className="h-4 w-4 text-white/50" /> : <Volume2 className="h-4 w-4 text-primary" />}
          </button>
          {settings.sessionMemory && excluded.size > 0 && (
            <button type="button" onClick={handleReset}
              className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              title="اعادة ضبط">
              <RotateCcw className="h-4 w-4 text-amber-400" />
            </button>
          )}
          <button type="button" onClick={onClose}
            className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            title="اغلاق">
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Exclude participated toggle */}
      {participatedStudentIds.length > 0 && (
        <div className="relative flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <UserMinus className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-white/60">استبعاد من شارك ({participatedStudentIds.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setExcludeParticipated(p => !p)}
            className={cn(
              "h-6 w-11 rounded-full border transition-colors relative",
              excludeParticipated
                ? "bg-primary/30 border-primary/50"
                : "bg-white/10 border-white/20"
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all",
              excludeParticipated
                ? "bg-primary right-0.5"
                : "bg-white/50 left-0.5"
            )} />
          </button>
        </div>
      )}

      {/* Quick controls (before spin) */}
      {!spinning && !showActions && !selectedStudent && settings.quizEnabled && (
        <div className="relative mb-3 space-y-2.5">
          {/* Bank chapter/lesson selector */}
          {settings.questionSource === "bank" && (
            <div className="p-2.5 rounded-xl border border-white/10 bg-white/5 space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-bold text-white/60">مصدر الأسئلة: بنك الأسئلة</span>
              </div>
              <Select value={selectedBankChapter} onValueChange={v => { setSelectedBankChapter(v); setSelectedBankLesson(""); }}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/15 text-white/80">
                  <SelectValue placeholder="اختر الفصل" />
                </SelectTrigger>
                <SelectContent>
                  {bankChapters.map(ch => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBankChapter && (
                <Select value={selectedBankLesson} onValueChange={setSelectedBankLesson}>
                  <SelectTrigger className="h-8 text-xs bg-white/5 border-white/15 text-white/80">
                    <SelectValue placeholder="اختر الدرس" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankLessons.map(ls => (
                      <SelectItem key={ls.id} value={ls.id}>{ls.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedBankLesson && (
                <p className="text-[10px] text-emerald-400/70 font-medium">
                  {bankQuestionsRef.current.length} سؤال متاح
                </p>
              )}
            </div>
          )}

          {/* Duration slider */}
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-[11px] font-bold text-white/60">مدة السؤال</span>
              </div>
              <span className="text-sm font-black text-primary tabular-nums">{localDuration} ثانية</span>
            </div>
            <Slider
              min={5}
              max={60}
              step={5}
              value={[localDuration]}
              onValueChange={([v]) => setLocalDuration(v)}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Scanner display */}
      <div className="relative rounded-xl border border-primary/20 bg-black/40 p-4 mb-4 min-h-[120px] flex flex-col items-center justify-center">
        {spinning && (
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="absolute w-full h-1 bg-gradient-to-l from-transparent via-primary/60 to-transparent animate-[scan_1.5s_linear_infinite]" />
          </div>
        )}

        {currentIndex >= 0 && students[currentIndex] ? (
          <div className={cn("text-center transition-all duration-150", spinning && "scale-105", selectedStudent && "scale-110")}>
            <div className={cn("text-2xl font-black tracking-wide", selectedStudent ? "text-primary" : "text-white/90")}>
              {students[currentIndex].full_name}
            </div>
            {selectedStudent && (
              <div className="mt-2 text-xs text-primary/70 font-medium animate-fade-in">تم الاختيار</div>
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
              <span key={id} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/40 border border-white/10">
                {st.full_name.split(" ").slice(0, 2).join(" ")}
              </span>
            ) : null;
          })}
        </div>
      )}

      {/* Action buttons */}
      {showActions && selectedStudent ? (
        showParticipationPicker ? (
          <div className="space-y-2 animate-fade-in">
            <p className="text-xs text-white/60 text-center font-medium">اختر رمز المشاركة</p>
            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={() => handlePickLevel("excellent")}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-400">
                  <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" /><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M8.6 12.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-bold text-emerald-400">ممتاز</span>
              </button>
              <button type="button" onClick={() => handlePickLevel("average")}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 transition-all">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-orange-400">
                  <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" /><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M8 12h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-bold text-orange-400">متوسط</span>
              </button>
              <button type="button" onClick={() => handlePickLevel("zero")}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 transition-all">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-rose-400">
                  <circle cx="12" cy="12" r="8.5" fill="currentColor" opacity="0.12" /><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M9 9l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-bold text-rose-400">صفر</span>
              </button>
              <button type="button" onClick={() => handlePickLevel("star")}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 border-yellow-500/40 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all">
                <svg viewBox="0 0 24 24" className="h-7 w-7">
                  <path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.27l-5.8 3.18 1.1-6.5-4.7-4.6 6.5-.95L12 2.5z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                <span className="text-[10px] font-bold text-yellow-400">متميز</span>
              </button>
            </div>
            <button type="button" onClick={() => setShowParticipationPicker(false)} className="w-full text-xs text-white/40 hover:text-white/60 py-1 transition-colors">
              رجوع
            </button>
          </div>
        ) : (
          <div className={cn("grid gap-2 animate-fade-in", hasQuizQuestions ? "grid-cols-3" : "grid-cols-2")}>
            <button type="button" onClick={handleGradeAction}
              className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all text-sm font-bold text-primary">
              <Award className="h-4 w-4" />سؤال بدرجة
            </button>
            <button type="button" onClick={handleParticipationAction}
              className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-sm font-bold text-amber-400">
              <Star className="h-4 w-4" />مشاركة صفية
            </button>
            {hasQuizQuestions && (
              <button type="button" onClick={handleQuizAction}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all text-sm font-bold text-cyan-400">
                <HelpCircle className="h-4 w-4" />سؤال مبرمج
              </button>
            )}
          </div>
        )
      ) : (
        <Button onClick={handleSpin} disabled={spinning || allExcluded}
          className={cn("w-full h-12 text-base font-bold rounded-xl transition-all",
            spinning ? "bg-primary/20 text-primary border-primary/30" : "bg-gradient-to-l from-primary to-primary/80 text-primary-foreground hover:shadow-lg hover:shadow-primary/30"
          )}>
          {spinning ? (
            <span className="flex items-center gap-2"><Radar className="h-5 w-5 animate-spin" />جاري البحث...</span>
          ) : allExcluded ? "تم اختيار الجميع" : (
            <span className="flex items-center gap-2"><Radar className="h-5 w-5" />تشغيل الرادار</span>
          )}
        </Button>
      )}

      <style>{`@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }`}</style>
    </div>
  );
}