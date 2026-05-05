import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HelpCircle, Volume2, VolumeX, X, Check, XCircle, Pause, Play, Sun, Moon } from "lucide-react";
import { type RadarQuestion } from "./radar-quiz-types";

interface RadarQuizModalProps {
  question: RadarQuestion;
  studentName: string;
  muted: boolean;
  onToggleMute: () => void;
  // Timer
  timeLeft: number;
  timerPaused: boolean;
  onTogglePause: () => void;
  timerDuration: number;
  // Answer
  selectedAnswer: number | null;
  quizResult: "correct" | "wrong" | null;
  onAnswer: (answerIdx: number) => void;
  onDismiss: () => void;
  lightTheme?: boolean;
  onToggleTheme?: () => void;
}

export default function RadarQuizModal({
  question,
  studentName,
  muted,
  onToggleMute,
  timeLeft,
  timerPaused,
  onTogglePause,
  timerDuration,
  selectedAnswer,
  quizResult,
  onAnswer,
  onDismiss,
  lightTheme,
  onToggleTheme,
}: RadarQuizModalProps) {
  const timerPercent = timerDuration > 0 ? (timeLeft / timerDuration) * 100 : 0;
  const timerColor = timeLeft <= 5 ? "bg-rose-500" : timeLeft <= 15 ? "bg-amber-500" : "bg-emerald-500";
  const timerTextColor = timeLeft <= 5 ? "text-rose-400" : timeLeft <= 15 ? "text-amber-400" : "text-emerald-400";
  const timerBorderColor = timeLeft <= 5 ? "border-rose-500/50" : timeLeft <= 15 ? "border-amber-500/50" : "border-emerald-500/50";

  return (
    <div className={cn(
      "relative rounded-2xl border-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-2xl text-white overflow-hidden transition-colors",
      lightTheme && "radar-light",
      quizResult === "wrong" && "border-rose-500/60 animate-radar-shake",
      quizResult === "correct" && "border-emerald-500/60",
      !quizResult && "border-primary/30"
    )} dir="rtl">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }} />

      {/* ✓ / ✗ feedback overlay */}
      {quizResult === "correct" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="h-16 w-16 rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/50 flex items-center justify-center animate-radar-pop ring-4 ring-emerald-400/30">
            <Check className="h-10 w-10 text-white" strokeWidth={3.5} />
          </div>
        </div>
      )}
      {quizResult === "wrong" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="h-16 w-16 rounded-full bg-rose-500 shadow-xl shadow-rose-500/50 flex items-center justify-center animate-radar-fade-out ring-4 ring-rose-400/30">
            <X className="h-10 w-10 text-white" strokeWidth={3.5} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/90">سؤال للطالب</h3>
            <p className="text-[10px] text-primary/70 font-medium">{studentName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onToggleMute}
            className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            {muted ? <VolumeX className="h-4 w-4 text-white/50" /> : <Volume2 className="h-4 w-4 text-primary" />}
          </button>
          <button type="button" onClick={onDismiss}
            className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Timer display */}
      {!quizResult && (
        <div className="relative mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className={cn("text-3xl font-black tabular-nums tracking-tight", timerTextColor)}>
                {timeLeft}
              </span>
              <span className="text-[10px] text-white/40 font-medium">ثانية</span>
            </div>
            <button
              type="button"
              onClick={onTogglePause}
              className={cn(
                "h-9 w-9 rounded-xl border-2 flex items-center justify-center transition-all",
                timerPaused
                  ? "border-emerald-500/50 bg-emerald-500/15 hover:bg-emerald-500/25"
                  : "border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25"
              )}
              title={timerPaused ? "استئناف" : "تجميد"}
            >
              {timerPaused ? <Play className="h-4 w-4 text-emerald-400" /> : <Pause className="h-4 w-4 text-amber-400" />}
            </button>
          </div>
          {/* Progress bar */}
          <div className={cn("h-2.5 w-full rounded-full bg-white/10 border overflow-hidden", timerBorderColor)}>
            <div
              className={cn("h-full rounded-full transition-all duration-1000 ease-linear", timerColor)}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          {timerPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
              <span className="text-sm font-bold text-amber-400 animate-pulse">مؤقت مجمد</span>
            </div>
          )}
        </div>
      )}

      {/* Score badge */}
      <div className="relative mb-3 flex items-center justify-between">
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/20 border border-primary/30 text-primary">
          {question.score} {question.score === 1 ? "درجة" : "درجات"}
        </span>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-white/50">
          {question.type === "mcq" ? "اختيار من متعدد" : "صح او خطا"}
        </span>
      </div>

      {/* Question text */}
      <div className="relative rounded-xl border border-primary/20 bg-black/40 p-4 mb-4">
        <p className="text-base font-bold text-white/90 leading-relaxed">{question.text}</p>
      </div>

      {/* Options */}
      <div className={cn("grid gap-2", question.type === "truefalse" ? "grid-cols-2" : "grid-cols-1")}>
        {question.options.map((opt, i) => {
          const isSelected = selectedAnswer === i;
          const isCorrectOption = i === question.correctIndex;
          const showResult = quizResult !== null;

          let borderClass = "border-white/15";
          let bgClass = "bg-white/5 hover:bg-white/10";
          let textClass = "text-white/80";

          if (showResult && isCorrectOption) {
            borderClass = "border-emerald-500/60";
            bgClass = "bg-emerald-500/15";
            textClass = "text-emerald-300";
          } else if (showResult && isSelected && !isCorrectOption) {
            borderClass = "border-rose-500/60";
            bgClass = "bg-rose-500/15";
            textClass = "text-rose-300";
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(i)}
              disabled={quizResult !== null}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm font-bold text-right",
                borderClass, bgClass, textClass,
                !showResult && "cursor-pointer",
                showResult && "cursor-default"
              )}
            >
              <span className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                showResult && isCorrectOption ? "bg-emerald-500/30 text-emerald-300" :
                showResult && isSelected ? "bg-rose-500/30 text-rose-300" :
                "bg-white/10 text-white/50"
              )}>
                {showResult && isCorrectOption ? <Check className="h-4 w-4" /> :
                 showResult && isSelected ? <XCircle className="h-4 w-4" /> :
                 String.fromCharCode(1571 + i)}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Result banner */}
      {quizResult && (
        <div className={cn(
          "mt-4 rounded-xl p-3 text-center font-bold text-sm animate-fade-in border-2",
          quizResult === "correct"
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
            : "bg-rose-500/15 border-rose-500/40 text-rose-300"
        )}>
          {quizResult === "correct"
            ? `اجابة صحيحة - تم اضافة ${question.score} درجة`
            : timeLeft <= 0 && selectedAnswer === null
              ? `انتهى الوقت - الاجابة الصحيحة: ${question.options[question.correctIndex]}`
              : `اجابة خاطئة - الاجابة الصحيحة: ${question.options[question.correctIndex]}`
          }
        </div>
      )}

      {quizResult && (
        <Button onClick={onDismiss} variant="ghost" className="w-full mt-3 text-white/50 hover:text-white/80">
          متابعة
        </Button>
      )}
    </div>
  );
}
