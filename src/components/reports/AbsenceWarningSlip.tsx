import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safePrint } from "@/lib/print-utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Send, X, Loader2, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";

interface AbsentDate {
  date: string;
  day_name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  className: string;
  absenceRate: number;
  totalAbsent: number;
  totalDays: number;
}

export default function AbsenceWarningSlip({
  open,
  onOpenChange,
  studentId,
  studentName,
  className,
  absenceRate,
  totalAbsent,
  totalDays,
}: Props) {
  const [headerConfig, setHeaderConfig] = useState<PrintHeaderConfig | null>(null);
  const [absentDates, setAbsentDates] = useState<AbsentDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState("المادة الدراسية");
  const [warningText, setWarningText] = useState("");
  const [sending, setSending] = useState(false);
  const [parentPhone, setParentPhone] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>("sent");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && studentId) {
      fetchData();
    }
  }, [open, studentId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch tenant-scoped header config (attendance → default fallback handled inside helper)
    const { fetchScopedPrintHeader } = await import("@/lib/print-header-fetch");
    let parsed = await fetchScopedPrintHeader("attendance");
    if (!parsed) parsed = await fetchScopedPrintHeader();
    if (parsed) setHeaderConfig(parsed as any);

    // Fetch absent dates
    const { data: attendance } = await supabase
      .from("attendance_records")
      .select("date")
      .eq("student_id", studentId)
      .eq("status", "absent")
      .order("date", { ascending: false });

    if (attendance) {
      setAbsentDates(
        attendance.map((r) => {
          const d = new Date(r.date);
          return {
            date: r.date,
            day_name: d.toLocaleDateString("ar-SA", { weekday: "long" }),
          };
        })
      );
    }

    // Get subject name from site settings
    const { data: subjectData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "subject_name")
      .maybeSingle();
    if (subjectData?.value) setSubjectName(subjectData.value);

    // Get parent phone
    const { data: studentData } = await supabase
      .from("students")
      .select("parent_phone")
      .eq("id", studentId)
      .single();
    if (studentData?.parent_phone) setParentPhone(studentData.parent_phone);

    // Check latest notification status for this student
    const { data: notifData } = await supabase
      .from("notifications")
      .select("id, status")
      .eq("student_id", studentId)
      .eq("type", "warning")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (notifData?.status) setNotificationStatus(notifData.status);

    // Build default warning text
    const subj = subjectData?.value || "المادة الدراسية";
    const absentCount = attendance?.length || 0;
    // Fetch absence settings
    const { data: absSettings } = await supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode"]);
    
    let threshold = 20;
    let allowedSess = 0;
    let absMode = "percentage";
    (absSettings || []).forEach((s: any) => {
      if (s.id === "absence_threshold") threshold = Number(s.value) || 20;
      if (s.id === "absence_allowed_sessions") allowedSess = Number(s.value) || 0;
      if (s.id === "absence_mode") absMode = s.value || "percentage";
    });

    const thresholdText = absMode === "sessions" && allowedSess > 0
      ? `${allowedSess} حصة غياب`
      : `${threshold}%`;

    setWarningText(
      `تحية طيبة وبعد،\n\nنود إشعاركم بأن الطالب ${studentName} في الفصل ${className} (مادة ${subj}) قد بلغت نسبة غيابه ${absenceRate}% من إجمالي الحصص الدراسية (${absentCount} غياب من أصل ${totalDays} حصة).\n\nوحيث أن نظام وزارة التعليم ينص على أن الطالب الذي يتجاوز حد الغياب المسموح به (${thresholdText}) يُحرم من دخول الاختبارات النهائية، نأمل منكم متابعة ابنكم والتواصل مع إدارة المدرسة لمعالجة هذا الأمر.\n\nتنبيه: هذا الطالب قد بلغ حد الغياب المسموح به. يُرجى إشعار ولي الأمر.`
    );

    setLoading(false);
  };

  const handleSendToStudent = async () => {
    setSending(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("notifications").insert({
      student_id: studentId,
      type: "warning",
      message: warningText,
      created_by: userData?.user?.id || null,
      status: "sent",
    });
    setSending(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setNotificationStatus("sent");
      toast({ title: "تم الإرسال", description: "تم إرسال الإنذار إلى حساب الطالب بنجاح" });
      onOpenChange(false);
    }
  };

  const handleWhatsApp = () => {
    if (!parentPhone) {
      toast({ title: "تنبيه", description: "لا يوجد رقم هاتف لولي الأمر", variant: "destructive" });
      return;
    }
    const phone = parentPhone.startsWith("+") ? parentPhone.slice(1) : parentPhone.startsWith("0") ? "966" + parentPhone.slice(1) : parentPhone;
    const text = encodeURIComponent(warningText);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;

    // Clone and replace textarea with styled div for print
    const clone = content.cloneNode(true) as HTMLElement;
    const textareaEl = clone.querySelector("textarea");
    if (textareaEl) {
      const div = document.createElement("div");
      div.style.cssText = "background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;line-height:1.8;font-size:14px;white-space:pre-wrap;";
      div.textContent = warningText;
      textareaEl.parentElement?.replaceChild(div, textareaEl);
    }
    // Remove the label above textarea
    const labels = clone.querySelectorAll("p");
    labels.forEach(p => { if (p.textContent?.includes("قابل للتعديل")) p.remove(); });

    // Create a temporary print container in the current page (no new window)
    const printContainer = document.createElement("div");
    printContainer.className = "print-area";
    printContainer.id = "absence-print-area";
    printContainer.setAttribute("dir", "rtl");
    printContainer.style.cssText = "font-family:'IBM Plex Sans Arabic',sans-serif;color:#1e293b;background:white;padding:20px;";
    printContainer.innerHTML = clone.innerHTML;
    document.body.appendChild(printContainer);

    // Close dialog before printing
    onOpenChange(false);

    safePrint(() => {
      // Cleanup: remove the temporary print container
      const el = document.getElementById("absence-print-area");
      if (el) el.remove();
    });
  }, [warningText, onOpenChange]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:h-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <span>🔴</span>
            إنذار غياب - {studentName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div ref={printRef} className="bg-white text-slate-900 p-4" dir="rtl">
            {/* Header */}
            {headerConfig && (
              <div
                style={{
                  borderBottom: "3px solid #3b82f6",
                  paddingBottom: "12px",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: headerConfig.rightSection.align,
                    fontSize: `${headerConfig.rightSection.fontSize}px`,
                    lineHeight: 1.8,
                    color: headerConfig.rightSection.color || "#1e293b",
                  }}
                >
                  {headerConfig.rightSection.lines.map((line, i) => (
                    <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {headerConfig.centerSection.images.map((img, i) =>
                    img ? (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        style={{
                          width: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                          height: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                          objectFit: "contain",
                        }}
                      />
                    ) : null
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    textAlign: headerConfig.leftSection.align,
                    fontSize: `${headerConfig.leftSection.fontSize}px`,
                    lineHeight: 1.8,
                    color: headerConfig.leftSection.color || "#1e293b",
                  }}
                >
                  {headerConfig.leftSection.lines.map((line, i) => (
                    <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div
              style={{
                textAlign: "center",
                margin: "24px 0",
                fontSize: "22px",
                fontWeight: 700,
                color: "#dc2626",
                border: "2px solid #dc2626",
                padding: "12px 24px",
              }}
            >
              إنذار غياب
            </div>

            {/* Student Info */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ color: "#64748b", fontSize: "14px" }}>اسم الطالب:</span>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{studentName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ color: "#64748b", fontSize: "14px" }}>الفصل:</span>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{className}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ color: "#64748b", fontSize: "14px" }}>المادة:</span>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{subjectName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ color: "#64748b", fontSize: "14px" }}>نسبة الغياب:</span>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#dc2626" }}>{absenceRate}%</span>
              </div>
            </div>

            {/* Editable Warning Text */}
            <div style={{ margin: "20px 0" }}>
              <p style={{ fontWeight: 600, marginBottom: "8px", fontSize: "14px", color: "#64748b" }}>نص الإنذار (قابل للتعديل):</p>
              <Textarea
                value={warningText}
                onChange={(e) => setWarningText(e.target.value)}
                className="min-h-[140px] text-sm leading-relaxed bg-rose-50 border-rose-200 text-slate-800 dark:bg-rose-50 dark:text-slate-800 dark:border-rose-200"
                dir="rtl"
                style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", lineHeight: 1.8 }}
              />
            </div>


            {/* Absent Dates Table */}
            {absentDates.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <p style={{ fontWeight: 600, marginBottom: "12px", fontSize: "14px" }}>سجل أيام الغياب:</p>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #e2e8f0", padding: "10px", background: "#f1f5f9", fontWeight: 600, fontSize: "13px" }}>#</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "10px", background: "#f1f5f9", fontWeight: 600, fontSize: "13px" }}>التاريخ</th>
                      <th style={{ border: "1px solid #e2e8f0", padding: "10px", background: "#f1f5f9", fontWeight: 600, fontSize: "13px" }}>اليوم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absentDates.slice(0, 10).map((d, i) => (
                      <tr key={d.date}>
                        <td style={{ border: "1px solid #e2e8f0", padding: "10px", textAlign: "center", fontSize: "13px" }}>{i + 1}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "10px", textAlign: "center", fontSize: "13px" }}>{d.date}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "10px", textAlign: "center", fontSize: "13px" }}>{d.day_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {absentDates.length > 10 && (
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px", textAlign: "center" }}>
                    ... و{absentDates.length - 10} أيام غياب أخرى
                  </p>
                )}
              </div>
            )}

            {/* Signatures */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "40px",
                paddingTop: "20px",
              }}
            >
              <div style={{ textAlign: "center", width: "30%" }}>
                <p style={{ marginBottom: "40px", fontWeight: 600, fontSize: "13px" }}>توقيع المعلم</p>
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px", fontSize: "12px", color: "#64748b" }}>
                  .......................
                </div>
              </div>
              <div style={{ textAlign: "center", width: "30%" }}>
                <p style={{ marginBottom: "40px", fontWeight: 600, fontSize: "13px" }}>توقيع ولي الأمر</p>
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px", fontSize: "12px", color: "#64748b" }}>
                  .......................
                </div>
              </div>
              <div style={{ textAlign: "center", width: "30%" }}>
                <p style={{ marginBottom: "40px", fontWeight: 600, fontSize: "13px" }}>توقيع المرشد الطلابي</p>
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px", fontSize: "12px", color: "#64748b" }}>
                  .......................
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">حالة الإنذار:</span>
          <Badge variant={
            notificationStatus === "excuse_pending" ? "secondary" :
            notificationStatus === "seen" ? "outline" : "default"
          } className="text-xs">
            {notificationStatus === "sent" ? "تم الإرسال" :
             notificationStatus === "seen" ? "تمت المشاهدة" :
             notificationStatus === "excuse_pending" ? "بانتظار العذر" :
             notificationStatus === "excuse_accepted" ? "✅ تم قبول العذر" :
             notificationStatus === "excuse_rejected" ? "❌ تم رفض العذر" :
             notificationStatus}
          </Badge>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-1" />
            إغلاق
          </Button>
          <Button
            variant="outline"
            onClick={handleWhatsApp}
            disabled={loading || !parentPhone}
            className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <MessageCircle className="h-4 w-4" />
            واتساب
          </Button>
          <Button
            variant="secondary"
            onClick={handleSendToStudent}
            disabled={loading || sending || !warningText.trim()}
            className="gap-1.5"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            إرسال للطالب
          </Button>
          <Button onClick={handlePrint} disabled={loading} className="gap-1.5">
            <Printer className="h-4 w-4" />
            طباعة الإنذار
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
