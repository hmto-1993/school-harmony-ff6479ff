import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Sparkles, AlertTriangle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

import AchievementDetailDialog from "./notification-dialogs/AchievementDetailDialog";
import WarningDetailDialog from "./notification-dialogs/WarningDetailDialog";
import ExcuseUploadDialog from "./notification-dialogs/ExcuseUploadDialog";
import CertificateDialog from "./notification-dialogs/CertificateDialog";
import LoginPopupDialog from "./notification-dialogs/LoginPopupDialog";

interface FullMarkGrade { categoryName: string; score: number; maxScore: number; period: number; }
interface Warning { id: string; message: string; created_at: string; is_read: boolean; }
interface Props { studentId: string; studentName: string; className: string; grades: any[]; attendance: any[]; }

export default function StudentNotificationCards({ studentId, studentName, className: classNameProp, grades, attendance }: Props) {
  const { student: authStudent } = useAuth();
  const [fullMarks, setFullMarks] = useState<FullMarkGrade[]>([]);
  const [certOpen, setCertOpen] = useState(false);
  const [achieveDetailOpen, setAchieveDetailOpen] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<PrintHeaderConfig | null>(null);
  const [subjectName, setSubjectName] = useState("المادة الدراسية");
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [warningDetailOpen, setWarningDetailOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [allowedSessions, setAllowedSessions] = useState(0);
  const [absenceThreshold, setAbsenceThreshold] = useState(20);
  const [absenceMode, setAbsenceMode] = useState("percentage");
  const [isExceeded, setIsExceeded] = useState(false);
  const [excuseOpen, setExcuseOpen] = useState(false);
  const [excuseFile, setExcuseFile] = useState<File | null>(null);
  const [excuseReason, setExcuseReason] = useState("");
  const [excuseUploading, setExcuseUploading] = useState(false);
  const [existingExcuses, setExistingExcuses] = useState<any[]>([]);
  const [loginPopupOpen, setLoginPopupOpen] = useState(false);
  const [loginPopupType, setLoginPopupType] = useState<"warning" | "achievement" | null>(null);
  const [confettiFired, setConfettiFired] = useState(false);

  const absentDates = attendance.filter((a) => a.status === "absent").map((a) => ({
    date: a.date, day_name: new Date(a.date).toLocaleDateString("ar-SA", { weekday: "long" }),
  })).sort((a, b) => b.date.localeCompare(a.date));

  useEffect(() => {
    const periodTests = grades.filter((g) => {
      const name = g.grade_categories?.name || "";
      return (name.includes("اختبار الفترة") || name.includes("اختبار فتر")) && g.score !== null && g.score !== undefined;
    });
    const perfect = periodTests.filter((g) => g.score === g.grade_categories?.max_score && g.grade_categories?.max_score > 0);
    setFullMarks(perfect.map((g) => ({ categoryName: g.grade_categories?.name || "اختبار الفترة", score: g.score, maxScore: g.grade_categories?.max_score, period: g.period || 1 })));
  }, [grades]);

  useEffect(() => {
    (async () => {
      const [warningsRes, excusesRes, settingsRes] = await Promise.all([
        supabase.from("notifications").select("id, message, created_at, is_read").eq("student_id", studentId).eq("type", "warning").order("created_at", { ascending: false }),
        supabase.from("excuse_submissions").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
        supabase.from("site_settings").select("id, value").in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions"]),
      ]);
      setWarnings(warningsRes.data || []);
      setExistingExcuses(excusesRes.data || []);
      let threshold = 20, sessions = 0, mode = "percentage";
      (settingsRes.data || []).forEach((s: any) => {
        if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
        if (s.id === "absence_allowed_sessions") sessions = Number(s.value) || 0;
        if (s.id === "absence_mode") mode = s.value || "percentage";
      });
      setAbsenceThreshold(threshold); setAllowedSessions(sessions); setAbsenceMode(mode);
      const absentCount = attendance.filter(a => a.status === "absent").length;
      const totalAttendance = attendance.length;
      if (mode === "sessions" && sessions > 0) setIsExceeded(absentCount > sessions);
      else if (totalAttendance > 0) setIsExceeded((absentCount / totalAttendance) * 100 >= threshold);
    })();
  }, [studentId, attendance]);

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

  useEffect(() => {
    const key = `notif_popup_shown_${studentId}`;
    if (sessionStorage.getItem(key)) return;
    const hasNewWarning = warnings.some((w) => !w.is_read);
    const hasAchievement = fullMarks.length > 0;
    if (hasNewWarning || hasAchievement) {
      const timer = setTimeout(() => {
        setLoginPopupType(hasAchievement ? "achievement" : "warning");
        setLoginPopupOpen(true);
        sessionStorage.setItem(key, "true");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [warnings, fullMarks, studentId]);

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
    if (loginPopupOpen && loginPopupType === "achievement") setTimeout(fireConfetti, 300);
  }, [loginPopupOpen, loginPopupType, fireConfetti]);

  const openWarningDetail = async (w: Warning) => {
    setSelectedWarning(w);
    setWarningDetailOpen(true);
    if (!w.is_read) {
      await supabase.from("notifications").update({ is_read: true, status: "seen" }).eq("id", w.id);
      setWarnings(prev => prev.map(x => x.id === w.id ? { ...x, is_read: true } : x));
    }
  };

  const handleExcuseSubmit = async () => {
    if (!excuseFile || !selectedWarning) return;
    if (excuseFile.size > 5 * 1024 * 1024) { toast({ title: "خطأ", description: "حجم الملف يتجاوز 5 ميجابايت", variant: "destructive" }); return; }
    setExcuseUploading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", excuseFile);
      uploadForm.append("student_id", studentId);
      uploadForm.append("session_token", authStudent?.session_token || "");
      uploadForm.append("session_issued_at", String(authStudent?.session_issued_at || ""));
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadRes = await fetch(`${supabaseUrl}/functions/v1/upload-excuse-file`, { method: "POST", body: uploadForm });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) throw new Error(uploadData.error || "فشل رفع الملف");
      const filePath = uploadData.file_path;
      const { data: excuseResult, error: excuseErr } = await supabase.functions.invoke("submit-excuse", {
        body: { student_id: studentId, notification_id: selectedWarning.id, file_url: filePath, file_name: excuseFile.name, reason: excuseReason, session_token: authStudent?.session_token, session_issued_at: authStudent?.session_issued_at },
      });
      if (excuseErr || !excuseResult?.success) throw new Error(excuseResult?.error || excuseErr?.message || "Failed");
      setExistingExcuses(prev => [{ file_url: filePath, file_name: excuseFile.name, reason: excuseReason, status: "pending", notification_id: selectedWarning.id, created_at: new Date().toISOString() }, ...prev]);
      toast({ title: "تم الإرسال", description: "تم رفع العذر بنجاح وسيتم مراجعته من المعلم" });
      setExcuseOpen(false); setExcuseFile(null); setExcuseReason("");
    } catch (err: any) { toast({ title: "خطأ", description: err.message, variant: "destructive" }); }
    setExcuseUploading(false);
  };

  const todayHijri = new Date().toLocaleDateString("ar-SA-u-ca-islamic-umalqura", { year: "numeric", month: "long", day: "numeric" });
  const hasWarnings = warnings.length > 0;
  const hasAchievements = fullMarks.length > 0;
  const newWarnings = warnings.filter((w) => !w.is_read);

  if (!hasWarnings && !hasAchievements) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {hasAchievements && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <Card className={cn("border-0 cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]", "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/50 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-900/20", "ring-2 ring-amber-400/50 dark:ring-amber-500/30 shadow-lg shadow-amber-200/30 dark:shadow-amber-900/20")} onClick={() => setAchieveDetailOpen(true)}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-2xl bg-amber-400/25 blur-lg animate-pulse" />
                      <div className="relative rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 p-3 shadow-lg shadow-amber-400/30"><Trophy className="h-6 w-6 text-amber-950" /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-200 truncate">🎉 الدرجة الكاملة!</h3>
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-300/80 line-clamp-1">{fullMarks.map((f) => f.categoryName).join(" و ")}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 h-8 px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                      <Eye className="h-3.5 w-3.5 ml-1" /><span className="text-xs hidden sm:inline">التفاصيل</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {hasWarnings && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut", delay: hasAchievements ? 0.15 : 0 }}>
              <Card className={cn("border-0 cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]", "bg-gradient-to-br from-red-50 via-rose-50 to-red-100/50 dark:from-red-950/40 dark:via-rose-950/30 dark:to-red-900/20", "ring-2 ring-red-400/40 dark:ring-red-500/30 shadow-lg shadow-red-200/30 dark:shadow-red-900/20")} onClick={() => openWarningDetail(warnings[0])}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-2xl bg-red-400/20 blur-lg" />
                      <div className="relative rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 p-3 shadow-lg shadow-red-500/30"><AlertTriangle className="h-6 w-6 text-white" /></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h3 className="text-sm sm:text-base font-bold text-red-900 dark:text-red-200 truncate">{isExceeded ? "🚫 محروم من الاختبار" : "⚠️ إنذار غياب"}</h3>
                        {newWarnings.length > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">جديد</Badge>}
                        {isExceeded && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0 animate-pulse">محروم</Badge>}
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300/80 line-clamp-2">
                        {absenceMode === "sessions" && allowedSessions > 0
                          ? `لقد غبت ${absentDates.length} حصص من أصل ${allowedSessions} حصص مسموح بها`
                          : `${absentDates.length} يوم غياب — النسبة ${attendance.length > 0 ? Math.round((absentDates.length / attendance.length) * 100) : 0}% من الحد ${absenceThreshold}%`}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 h-8 px-2 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30">
                      <Eye className="h-3.5 w-3.5 ml-1" /><span className="text-xs hidden sm:inline">التفاصيل</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LoginPopupDialog open={loginPopupOpen} onOpenChange={(v) => { setLoginPopupOpen(v); if (!v) setConfettiFired(false); }} type={loginPopupType} studentName={studentName} fullMarkNames={fullMarks.map(f => f.categoryName).join(" و ")} onViewDetails={() => { setLoginPopupOpen(false); if (loginPopupType === "achievement") setAchieveDetailOpen(true); else if (warnings[0]) { setSelectedWarning(warnings[0]); setWarningDetailOpen(true); } }} />
      <AchievementDetailDialog open={achieveDetailOpen} onOpenChange={setAchieveDetailOpen} studentName={studentName} className={classNameProp} subjectName={subjectName} fullMarks={fullMarks} onShowCert={() => { setAchieveDetailOpen(false); setCertOpen(true); }} fireConfetti={fireConfetti} confettiFired={confettiFired} />
      <WarningDetailDialog open={warningDetailOpen} onOpenChange={setWarningDetailOpen} selectedWarning={selectedWarning} warnings={warnings} absentDates={absentDates} existingExcuses={existingExcuses} onSelectWarning={openWarningDetail} onOpenExcuse={() => setExcuseOpen(true)} />
      <ExcuseUploadDialog open={excuseOpen} onOpenChange={setExcuseOpen} excuseFile={excuseFile} setExcuseFile={setExcuseFile} excuseReason={excuseReason} setExcuseReason={setExcuseReason} excuseUploading={excuseUploading} onSubmit={handleExcuseSubmit} />
      <CertificateDialog open={certOpen} onOpenChange={setCertOpen} studentName={studentName} className={classNameProp} subjectName={subjectName} fullMarks={fullMarks} headerConfig={headerConfig} todayHijri={todayHijri} />
    </>
  );
}
