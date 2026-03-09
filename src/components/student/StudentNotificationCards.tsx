import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Trophy, Award, Printer, X, Sparkles, AlertTriangle, Eye, ChevronLeft, Upload, Loader2, FileImage,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/* ─── Types ─── */
interface FullMarkGrade {
  categoryName: string;
  score: number;
  maxScore: number;
  period: number;
}

interface Warning {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  studentId: string;
  studentName: string;
  className: string;
  grades: any[];
  attendance: any[];
}

/* ─── Component ─── */
export default function StudentNotificationCards({
  studentId,
  studentName,
  className: classNameProp,
  grades,
  attendance,
}: Props) {
  // --- Full mark detection ---
  const [fullMarks, setFullMarks] = useState<FullMarkGrade[]>([]);
  const [certOpen, setCertOpen] = useState(false);
  const [achieveDetailOpen, setAchieveDetailOpen] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<PrintHeaderConfig | null>(null);
  const [subjectName, setSubjectName] = useState("المادة الدراسية");
  const certRef = useRef<HTMLDivElement>(null);

  // --- Warnings ---
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [warningDetailOpen, setWarningDetailOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);

  // --- Absence settings ---
  const [allowedSessions, setAllowedSessions] = useState(0);
  const [absenceThreshold, setAbsenceThreshold] = useState(20);
  const [absenceMode, setAbsenceMode] = useState("percentage");
  const [totalTermSessions, setTotalTermSessions] = useState(0);
  const [isExceeded, setIsExceeded] = useState(false);

  // --- Excuse submission ---
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [excuseFile, setExcuseFile] = useState<File | null>(null);
  const [excuseReason, setExcuseReason] = useState("");
  const [excuseUploading, setExcuseUploading] = useState(false);
  const [existingExcuses, setExistingExcuses] = useState<any[]>([]);

  // --- Login popup ---
  const [loginPopupOpen, setLoginPopupOpen] = useState(false);
  const [loginPopupType, setLoginPopupType] = useState<"warning" | "achievement" | null>(null);
  const [confettiFired, setConfettiFired] = useState(false);

  // --- Absent dates for detail view ---
  const absentDates = attendance
    .filter((a) => a.status === "absent")
    .map((a) => ({
      date: a.date,
      day_name: new Date(a.date).toLocaleDateString("ar-SA", { weekday: "long" }),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Detect full marks
  useEffect(() => {
    const periodTests = grades.filter((g) => {
      const name = g.grade_categories?.name || "";
      return (name.includes("اختبار الفترة") || name.includes("اختبار فتر")) &&
        g.score !== null && g.score !== undefined;
    });
    const perfect = periodTests.filter(
      (g) => g.score === g.grade_categories?.max_score && g.grade_categories?.max_score > 0
    );
    setFullMarks(
      perfect.map((g) => ({
        categoryName: g.grade_categories?.name || "اختبار الفترة",
        score: g.score,
        maxScore: g.grade_categories?.max_score,
        period: g.period || 1,
      }))
    );
  }, [grades]);

  // Fetch warnings + excuses + absence settings
  useEffect(() => {
    (async () => {
      const [warningsRes, excusesRes, settingsRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, message, created_at, is_read")
          .eq("student_id", studentId)
          .eq("type", "warning")
          .order("created_at", { ascending: false }),
        supabase
          .from("excuse_submissions")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("site_settings")
          .select("id, value")
          .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions"]),
      ]);

      setWarnings(warningsRes.data || []);
      setExistingExcuses(excusesRes.data || []);

      let threshold = 20;
      let sessions = 0;
      let mode = "percentage";
      let total = 0;
      (settingsRes.data || []).forEach((s: any) => {
        if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
        if (s.id === "absence_allowed_sessions") sessions = Number(s.value) || 0;
        if (s.id === "absence_mode") mode = s.value || "percentage";
        if (s.id === "total_term_sessions") total = Number(s.value) || 0;
      });
      setAbsenceThreshold(threshold);
      setAllowedSessions(sessions);
      setAbsenceMode(mode);
      setTotalTermSessions(total);

      // Calculate if exceeded
      const absentCount = attendance.filter(a => a.status === "absent").length;
      const totalAttendance = attendance.length;
      if (mode === "sessions" && sessions > 0) {
        setIsExceeded(absentCount > sessions);
      } else if (totalAttendance > 0) {
        setIsExceeded((absentCount / totalAttendance) * 100 >= threshold);
      }
    })();
  }, [studentId, attendance]);

  // Fetch header & subject
  useEffect(() => {
    (async () => {
      const [h1, h2, subj] = await Promise.all([
        supabase.from("site_settings").select("value").eq("id", "print_header_config_grades").single(),
        supabase.from("site_settings").select("value").eq("id", "print_header_config").single(),
        supabase.from("site_settings").select("value").eq("id", "subject_name").maybeSingle(),
      ]);
      const hVal = h1.data?.value || h2.data?.value;
      if (hVal) try { setHeaderConfig(JSON.parse(hVal)); } catch {}
      if (subj.data?.value) setSubjectName(subj.data.value);
    })();
  }, []);

  // One-time login popup
  useEffect(() => {
    const key = `notif_popup_shown_${studentId}`;
    const lastShown = sessionStorage.getItem(key);
    if (lastShown) return;

    const hasNewWarning = warnings.some((w) => !w.is_read);
    const hasAchievement = fullMarks.length > 0;

    if (hasNewWarning || hasAchievement) {
      // Delay to let page settle
      const timer = setTimeout(() => {
        setLoginPopupType(hasAchievement ? "achievement" : "warning");
        setLoginPopupOpen(true);
        sessionStorage.setItem(key, "true");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [warnings, fullMarks, studentId]);

  // Fire confetti
  const fireConfetti = useCallback(() => {
    if (confettiFired) return;
    setConfettiFired(true);
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: ["#FFD700", "#FFA500", "#FF6347", "#4CAF50", "#2196F3"] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: ["#FFD700", "#FFA500", "#FF6347", "#4CAF50", "#2196F3"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    setTimeout(() => confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors: ["#FFD700", "#FFA500", "#FFEC8B", "#DAA520"] }), 200);
  }, [confettiFired]);

  useEffect(() => {
    if (loginPopupOpen && loginPopupType === "achievement") {
      setTimeout(fireConfetti, 300);
    }
  }, [loginPopupOpen, loginPopupType, fireConfetti]);

  const handlePrintCert = () => {
    const content = certRef.current;
    if (!content) return;
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>شهادة تميز - ${studentName}</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'IBM Plex Sans Arabic',sans-serif;padding:30px;background:#fff;color:#1e293b;direction:rtl}.header{border-bottom:3px solid #3b82f6;padding-bottom:12px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.header-section{flex:1;line-height:1.8}.header-section p{margin:0;font-weight:600}.header-center{display:flex;align-items:center;gap:10px;flex-shrink:0}.header-center img{object-fit:contain}.cert-border{border:4px double #DAA520;border-radius:16px;padding:40px;margin:20px 0;text-align:center;background:linear-gradient(135deg,#FFFDF0,#FFF8E1,#FFFDF0)}.cert-title{font-size:28px;font-weight:700;color:#B8860B;margin-bottom:16px}.sig-box{text-align:center;width:30%}.sig-box p{margin-bottom:40px;font-weight:600;font-size:13px}.sig-line{border-top:1px solid #1e293b;padding-top:8px;font-size:12px;color:#64748b}@media print{body{padding:0}@page{margin:15mm}}</style></head><body>${content.innerHTML}</body></html>`);
    pw.document.close();
    pw.onload = () => pw.print();
  };

  // Mark warning as seen when detail opens
  const openWarningDetail = async (w: Warning) => {
    setSelectedWarning(w);
    setWarningDetailOpen(true);
    // Mark as seen
    if (!w.is_read) {
      await supabase.from("notifications").update({ is_read: true, status: "seen" }).eq("id", w.id);
      setWarnings(prev => prev.map(x => x.id === w.id ? { ...x, is_read: true } : x));
    }
  };

  // Handle excuse submission
  const handleExcuseSubmit = async () => {
    if (!excuseFile || !selectedWarning) return;
    if (excuseFile.size > 5 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الملف يتجاوز 5 ميجابايت", variant: "destructive" });
      return;
    }
    setExcuseUploading(true);
    try {
      const ext = excuseFile.name.split(".").pop() || "jpg";
      const fileName = `excuse_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("school-assets").upload(`excuses/${fileName}`, excuseFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(`excuses/${fileName}`);

      const { error: insertErr } = await supabase.from("excuse_submissions").insert({
        notification_id: selectedWarning.id,
        student_id: studentId,
        file_url: urlData.publicUrl,
        file_name: excuseFile.name,
        reason: excuseReason,
        status: "pending",
      });
      if (insertErr) throw insertErr;

      // Update notification status
      await supabase.from("notifications").update({ status: "excuse_pending" }).eq("id", selectedWarning.id);

      setExistingExcuses(prev => [{ file_url: urlData.publicUrl, file_name: excuseFile.name, reason: excuseReason, status: "pending", notification_id: selectedWarning.id, created_at: new Date().toISOString() }, ...prev]);
      toast({ title: "تم الإرسال", description: "تم رفع العذر بنجاح وسيتم مراجعته من المعلم" });
      setExcuseOpen(false);
      setExcuseFile(null);
      setExcuseReason("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setExcuseUploading(false);
  };

  const todayHijri = new Date().toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
    year: "numeric", month: "long", day: "numeric",
  });

  const hasWarnings = warnings.length > 0;
  const hasAchievements = fullMarks.length > 0;
  const newWarnings = warnings.filter((w) => !w.is_read);

  if (!hasWarnings && !hasAchievements) return null;

  return (
    <>
      {/* ═══ Notification Cards Grid ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Achievement Card */}
        <AnimatePresence>
          {hasAchievements && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Card
                className={cn(
                  "border-0 cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                  "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/50",
                  "dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-900/20",
                  "ring-2 ring-amber-400/50 dark:ring-amber-500/30",
                  "shadow-lg shadow-amber-200/30 dark:shadow-amber-900/20"
                )}
                onClick={() => setAchieveDetailOpen(true)}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-2xl bg-amber-400/25 blur-lg animate-pulse" />
                      <div className="relative rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 p-3 shadow-lg shadow-amber-400/30">
                        <Trophy className="h-6 w-6 text-amber-950" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200 truncate">
                          🎉 الدرجة الكاملة!
                        </h3>
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-300/80 line-clamp-1">
                        {fullMarks.map((f) => f.categoryName).join(" و ")}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 h-8 px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                      <Eye className="h-3.5 w-3.5 ml-1" />
                      <span className="text-xs hidden sm:inline">التفاصيل</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning Card */}
        <AnimatePresence>
          {hasWarnings && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: hasAchievements ? 0.15 : 0 }}
            >
              <Card
                className={cn(
                  "border-0 cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                  "bg-gradient-to-br from-red-50 via-rose-50 to-red-100/50",
                  "dark:from-red-950/40 dark:via-rose-950/30 dark:to-red-900/20",
                  "ring-2 ring-red-400/40 dark:ring-red-500/30",
                  "shadow-lg shadow-red-200/30 dark:shadow-red-900/20"
                )}
                onClick={() => {
                  openWarningDetail(warnings[0]);
                }}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-2xl bg-red-400/20 blur-lg" />
                      <div className="relative rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-3 shadow-lg shadow-red-500/30">
                        <AlertTriangle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm sm:text-base font-bold text-red-900 dark:text-red-200 truncate">
                          ⚠️ إنذار غياب
                        </h3>
                        {newWarnings.length > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                            جديد
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300/80 line-clamp-1">
                        {warnings.length} إنذار — {absentDates.length} يوم غياب مسجّل
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 h-8 px-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30">
                      <Eye className="h-3.5 w-3.5 ml-1" />
                      <span className="text-xs hidden sm:inline">التفاصيل</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ Login Pop-up ═══ */}
      <Dialog open={loginPopupOpen} onOpenChange={(v) => { setLoginPopupOpen(v); if (!v) setConfettiFired(false); }}>
        <DialogContent className="max-w-sm rounded-3xl border-0 shadow-2xl p-0 overflow-hidden" dir="rtl">
          <div className={cn(
            "p-6 text-center",
            loginPopupType === "achievement"
              ? "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500"
              : "bg-gradient-to-br from-red-500 via-rose-500 to-red-600"
          )}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-3"
            >
              {loginPopupType === "achievement"
                ? <Trophy className="h-8 w-8 text-amber-950" />
                : <AlertTriangle className="h-8 w-8 text-white" />}
            </motion.div>
            <DialogHeader>
              <DialogTitle className={cn(
                "text-lg font-bold",
                loginPopupType === "achievement" ? "text-amber-950" : "text-white"
              )}>
                {loginPopupType === "achievement"
                  ? "🎉 مبارك! حصلت على الدرجة الكاملة"
                  : "⚠️ لديك إنذار غياب جديد"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-center text-muted-foreground leading-relaxed">
              {loginPopupType === "achievement"
                ? `تهنئة خاصة لك يا ${studentName} على تميّزك في ${fullMarks.map(f => f.categoryName).join(" و ")}!`
                : `تم تسجيل إنذار غياب جديد في حسابك. يُرجى مراجعة التفاصيل.`}
            </p>
            <DialogFooter className="flex flex-col gap-2 sm:flex-col">
              <Button
                className={cn(
                  "w-full rounded-2xl h-11 text-sm font-bold",
                  loginPopupType === "achievement"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950"
                    : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white"
                )}
                onClick={() => {
                  setLoginPopupOpen(false);
                  if (loginPopupType === "achievement") setAchieveDetailOpen(true);
                  else if (warnings[0]) { setSelectedWarning(warnings[0]); setWarningDetailOpen(true); }
                }}
              >
                <Eye className="h-4 w-4 ml-1" />
                عرض التفاصيل
              </Button>
              <Button variant="outline" onClick={() => setLoginPopupOpen(false)} className="w-full rounded-2xl h-10 text-sm">
                لاحقاً
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Achievement Detail Dialog ═══ */}
      <Dialog open={achieveDetailOpen} onOpenChange={(v) => { setAchieveDetailOpen(v); if (v && !confettiFired) setTimeout(fireConfetti, 200); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Trophy className="h-5 w-5" />
              تفاصيل التميّز
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-4 space-y-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
              <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-xl shadow-amber-400/30">
                <Trophy className="h-10 w-10 text-amber-900" />
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{studentName}</p>
              <p className="text-sm text-muted-foreground">{classNameProp}</p>
            </div>
            <div className="space-y-2">
              {fullMarks.map((f, i) => (
                <div key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30 border border-amber-300/50 dark:border-amber-700/50 mx-1">
                  <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {f.categoryName}: {f.score}/{f.maxScore}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              تهنئة على حصولك على الدرجة الكاملة في مادة <strong>{subjectName}</strong>. واصل تميّزك!
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAchieveDetailOpen(false)}>
              <X className="h-4 w-4 ml-1" />
              إغلاق
            </Button>
            <Button
              onClick={() => { setAchieveDetailOpen(false); setCertOpen(true); }}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950"
            >
              <Award className="h-4 w-4" />
              عرض الشهادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Warning Detail Dialog ═══ */}
      <Dialog open={warningDetailOpen} onOpenChange={setWarningDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              تفاصيل الإنذار
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning message */}
            {selectedWarning && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedWarning.created_at).toLocaleDateString("ar-SA", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {selectedWarning.message}
                </p>
              </div>
            )}

            {/* Absent dates table */}
            {absentDates.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 text-foreground">سجل أيام الغياب:</p>
                <div className="overflow-auto rounded-xl border border-border/40 max-h-60">
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border/30">#</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border/30">التاريخ</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border/30">اليوم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absentDates.map((d, i) => (
                        <tr key={d.date} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                          <td className="text-center p-2 text-xs">{i + 1}</td>
                          <td className="text-center p-2 text-xs">{d.date}</td>
                          <td className="text-center p-2 text-xs">{d.day_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* All warnings */}
            {warnings.length > 1 && (
              <div>
                <p className="text-sm font-semibold mb-2 text-foreground">جميع الإنذارات ({warnings.length}):</p>
                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
                  {warnings.map((w) => (
                    <div
                      key={w.id}
                      className={cn(
                        "rounded-lg border p-3 text-xs cursor-pointer transition-colors",
                        selectedWarning?.id === w.id
                          ? "border-destructive/40 bg-destructive/10"
                          : "border-border/30 bg-muted/20 hover:bg-muted/40"
                      )}
                      onClick={() => openWarningDetail(w)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {new Date(w.created_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                        </span>
                        {!w.is_read && <Badge variant="destructive" className="text-[9px] px-1 py-0">جديد</Badge>}
                      </div>
                      <p className="line-clamp-1 mt-1 text-foreground">{w.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Excuse status */}
            {selectedWarning && (() => {
              const excuse = existingExcuses.find(e => e.notification_id === selectedWarning.id);
              if (excuse) {
                return (
                  <div className={cn(
                    "rounded-xl border p-4",
                    excuse.status === "pending" ? "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20" :
                    excuse.status === "accepted" ? "border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/20" :
                    "border-red-300/50 bg-red-50/50 dark:bg-red-950/20"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">العذر المقدم</span>
                      <Badge variant={
                        excuse.status === "pending" ? "secondary" :
                        excuse.status === "accepted" ? "default" : "destructive"
                      } className="text-xs mr-auto">
                        {excuse.status === "pending" ? "قيد المراجعة" :
                         excuse.status === "accepted" ? "✅ مقبول" : "❌ مرفوض"}
                      </Badge>
                    </div>
                    <a href={excuse.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <FileImage className="h-3 w-3" />
                      {excuse.file_name}
                    </a>
                    {excuse.reason && <p className="text-xs text-muted-foreground mt-2">{excuse.reason}</p>}
                    {excuse.review_note && <p className="text-xs mt-2 text-foreground">ملاحظة المعلم: {excuse.review_note}</p>}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setWarningDetailOpen(false)}>
              <X className="h-4 w-4 ml-1" />
              إغلاق
            </Button>
            {selectedWarning && !existingExcuses.find(e => e.notification_id === selectedWarning.id) && (
              <Button
                onClick={() => setExcuseOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
              >
                <Upload className="h-4 w-4" />
                تقديم عذر
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Excuse Upload Dialog ═══ */}
      <Dialog open={excuseOpen} onOpenChange={setExcuseOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              تقديم عذر للغياب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              يمكنك رفع صورة التقرير الطبي أو أي مستند يثبت العذر
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">ملف العذر (صورة) *</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setExcuseFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">الحد الأقصى: 5 ميجابايت</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">سبب العذر (اختياري)</label>
              <Textarea
                value={excuseReason}
                onChange={(e) => setExcuseReason(e.target.value)}
                placeholder="مثال: تقرير طبي بسبب المرض"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExcuseOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleExcuseSubmit}
              disabled={!excuseFile || excuseUploading}
              className="gap-1.5"
            >
              {excuseUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              رفع العذر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Certificate Dialog ═══ */}
      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              شهادة التميز
            </DialogTitle>
          </DialogHeader>

          <div ref={certRef} className="bg-white text-slate-900 p-4" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            {/* Print Header */}
            {headerConfig && (
              <div style={{
                borderBottom: "3px solid #3b82f6", paddingBottom: "12px", marginBottom: "24px",
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px",
              }}>
                <div style={{
                  flex: 1, textAlign: headerConfig.rightSection.align,
                  fontSize: `${headerConfig.rightSection.fontSize}px`, lineHeight: 1.8,
                  color: headerConfig.rightSection.color || "#1e293b",
                }}>
                  {headerConfig.rightSection.lines.map((l, i) => (
                    <p key={i} style={{ margin: 0, fontWeight: 600 }}>{l}</p>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {headerConfig.centerSection.images.map((img, i) =>
                    img ? <img key={i} src={img} alt="" style={{
                      width: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                      height: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                      objectFit: "contain",
                    }} /> : null
                  )}
                </div>
                <div style={{
                  flex: 1, textAlign: headerConfig.leftSection.align,
                  fontSize: `${headerConfig.leftSection.fontSize}px`, lineHeight: 1.8,
                  color: headerConfig.leftSection.color || "#1e293b",
                }}>
                  {headerConfig.leftSection.lines.map((l, i) => (
                    <p key={i} style={{ margin: 0, fontWeight: 600 }}>{l}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate body */}
            <div style={{
              border: "4px double #DAA520", borderRadius: "16px", padding: "40px 24px",
              margin: "20px 0", textAlign: "center",
              background: "linear-gradient(135deg, #FFFDF0 0%, #FFF8E1 50%, #FFFDF0 100%)",
            }}>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "#B8860B", marginBottom: "16px" }}>🏆 شهادة تميّز 🏆</div>
              <div style={{ fontSize: "15px", color: "#64748b", marginBottom: "20px" }}>تُمنح هذه الشهادة للطالب المتميز</div>
              <div style={{
                fontSize: "22px", fontWeight: 700, color: "#1e293b",
                margin: "16px auto", padding: "10px 20px",
                display: "inline-block", borderBottom: "2px solid #DAA520",
              }}>{studentName}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>الفصل: {classNameProp}</div>
              <div style={{ fontSize: "15px", lineHeight: 2, color: "#334155", margin: "12px 0" }}>
                تهنئة بحصوله على الدرجة الكاملة في مادة <strong style={{ color: "#B8860B" }}>{subjectName}</strong>
              </div>
              {fullMarks.map((f, i) => (
                <div key={i} style={{
                  display: "inline-block", margin: "6px",
                  padding: "6px 16px", borderRadius: "9999px",
                  background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                  border: "1px solid #D97706",
                  fontSize: "13px", fontWeight: 600, color: "#92400E",
                }}>{f.categoryName}: {f.score}/{f.maxScore} ✓</div>
              ))}
              <div style={{ fontSize: "13px", color: "#64748b", marginTop: "20px" }}>{todayHijri}</div>
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "36px" }}>
              {["معلم المادة", "المرشد الطلابي", "قائد المدرسة"].map((label) => (
                <div key={label} style={{ textAlign: "center", width: "30%" }}>
                  <p style={{ marginBottom: "36px", fontWeight: 600, fontSize: "12px" }}>{label}</p>
                  <div style={{ borderTop: "1px solid #1e293b", paddingTop: "6px", fontSize: "11px", color: "#64748b" }}>.......................</div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCertOpen(false)}>
              <X className="h-4 w-4 ml-1" />
              إغلاق
            </Button>
            <Button onClick={handlePrintCert} className="gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950">
              <Printer className="h-4 w-4" />
              طباعة الشهادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
