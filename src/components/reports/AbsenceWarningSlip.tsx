import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
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

    // Fetch header config
    const { data: headerData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", "print_header_config_attendance")
      .single();

    if (headerData?.value) {
      try {
        setHeaderConfig(JSON.parse(headerData.value));
      } catch {
        // Try default
        const { data: def } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", "print_header_config")
          .single();
        if (def?.value) try { setHeaderConfig(JSON.parse(def.value)); } catch {}
      }
    } else {
      const { data: def } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "print_header_config")
        .single();
      if (def?.value) try { setHeaderConfig(JSON.parse(def.value)); } catch {}
    }

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
    setWarningText(
      `تحية طيبة وبعد،\n\nنود إشعاركم بأن الطالب ${studentName} في الفصل ${className} (مادة ${subj}) قد بلغت نسبة غيابه ${absenceRate}% من إجمالي الحصص الدراسية (${absentCount} غياب من أصل ${totalDays} حصة).\n\nوحيث أن نظام وزارة التعليم ينص على أن الطالب الذي تتجاوز نسبة غيابه 20% يُحرم من دخول الاختبارات النهائية، نأمل منكم متابعة ابنكم والتواصل مع إدارة المدرسة لمعالجة هذا الأمر.\n\nتنبيه: هذا الطالب قد بلغ حد الغياب المسموح به. يُرجى إشعار ولي الأمر.`
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

  const handlePrint = () => {
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

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>إنذار غياب - ${studentName}</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'IBM Plex Sans Arabic', sans-serif;
            padding: 20px;
            background: white;
            color: #1e293b;
            direction: rtl;
          }
          .header {
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
          }
          .header-section { flex: 1; line-height: 1.8; }
          .header-section p { margin: 0; font-weight: 600; }
          .header-center { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
          .header-center img { object-fit: contain; }
          .title {
            text-align: center;
            margin: 24px 0;
            font-size: 22px;
            font-weight: 700;
            color: #dc2626;
            border: 2px solid #dc2626;
            padding: 12px 24px;
            display: inline-block;
            width: 100%;
          }
          .info-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; font-size: 14px; }
          .info-value { font-weight: 600; font-size: 14px; }
          .warning-text {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            line-height: 1.8;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 10px;
            text-align: center;
            font-size: 13px;
          }
          th { background: #f1f5f9; font-weight: 600; }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding-top: 20px;
          }
          .sig-box {
            text-align: center;
            width: 30%;
          }
          .sig-box p { margin-bottom: 40px; font-weight: 600; font-size: 13px; }
          .sig-line { border-top: 1px solid #1e293b; padding-top: 8px; font-size: 12px; color: #64748b; }
          .date-footer {
            text-align: left;
            margin-top: 20px;
            font-size: 12px;
            color: #64748b;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        ${clone.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const todayFormatted = format(new Date(), "yyyy/MM/dd");
  const todayHijri = new Date().toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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

            {/* Warning text for print (hidden in dialog, shown in print) */}
            <div className="hidden print-warning-text" style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "16px",
              margin: "20px 0",
              lineHeight: 1.8,
              fontSize: "14px",
              whiteSpace: "pre-wrap",
            }}>
              {warningText}
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

            {/* Date Footer */}
            <div style={{ textAlign: "left", marginTop: "20px", fontSize: "12px", color: "#64748b" }}>
              <p>التاريخ: {todayFormatted}</p>
              <p>{todayHijri}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-1" />
            إغلاق
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
