import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trophy, Award, Printer, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";

interface FullMarkGrade {
  categoryName: string;
  score: number;
  maxScore: number;
  period: number;
}

interface Props {
  studentName: string;
  className: string;
  grades: any[];
}

export default function FullMarkCelebration({ studentName, className, grades }: Props) {
  const [fullMarks, setFullMarks] = useState<FullMarkGrade[]>([]);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<PrintHeaderConfig | null>(null);
  const [subjectName, setSubjectName] = useState("المادة الدراسية");
  const [hasFired, setHasFired] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  // Detect full marks on period test categories
  useEffect(() => {
    const periodTestGrades = grades.filter((g) => {
      const catName = g.grade_categories?.name?.toLowerCase() || "";
      const isTest = catName.includes("اختبار الفترة") || catName.includes("اختبار فتر");
      return isTest && g.score !== null && g.score !== undefined;
    });

    const perfect = periodTestGrades.filter(
      (g) => g.score === g.grade_categories?.max_score && g.grade_categories?.max_score > 0
    );

    if (perfect.length > 0) {
      setFullMarks(
        perfect.map((g) => ({
          categoryName: g.grade_categories?.name || "اختبار الفترة",
          score: g.score,
          maxScore: g.grade_categories?.max_score,
          period: g.period || 1,
        }))
      );
    }
  }, [grades]);

  // Fetch header config and subject
  useEffect(() => {
    if (fullMarks.length === 0) return;
    (async () => {
      const [headerRes, defHeaderRes, subjectRes] = await Promise.all([
        supabase.from("site_settings").select("value").eq("id", "print_header_config_grades").single(),
        supabase.from("site_settings").select("value").eq("id", "print_header_config").single(),
        supabase.from("site_settings").select("value").eq("id", "subject_name").maybeSingle(),
      ]);
      const hVal = headerRes.data?.value || defHeaderRes.data?.value;
      if (hVal) try { setHeaderConfig(JSON.parse(hVal)); } catch {}
      if (subjectRes.data?.value) setSubjectName(subjectRes.data.value);
    })();
  }, [fullMarks]);

  const fireConfetti = () => {
    if (hasFired) return;
    setHasFired(true);

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#4CAF50", "#2196F3"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#4CAF50", "#2196F3"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    // Big burst
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#FFA500", "#FFEC8B", "#DAA520"],
      });
    }, 300);
  };

  const handleCardClick = () => {
    setCelebrateOpen(true);
    setTimeout(fireConfetti, 200);
  };

  const handlePrintCert = () => {
    const content = certRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>شهادة تميز - ${studentName}</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'IBM Plex Sans Arabic', sans-serif; padding: 30px; background: white; color: #1e293b; direction: rtl; }
          .header { border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
          .header-section { flex: 1; line-height: 1.8; }
          .header-section p { margin: 0; font-weight: 600; }
          .header-center { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
          .header-center img { object-fit: contain; }
          .cert-border { border: 4px double #DAA520; border-radius: 16px; padding: 40px; margin: 20px 0; text-align: center; background: linear-gradient(135deg, #FFFDF0 0%, #FFF8E1 50%, #FFFDF0 100%); }
          .cert-title { font-size: 28px; font-weight: 700; color: #B8860B; margin-bottom: 16px; }
          .cert-subtitle { font-size: 18px; color: #64748b; margin-bottom: 24px; }
          .cert-name { font-size: 24px; font-weight: 700; color: #1e293b; margin: 20px 0; padding: 12px 24px; display: inline-block; border-bottom: 2px solid #DAA520; }
          .cert-text { font-size: 16px; line-height: 2; color: #334155; margin: 16px 0; }
          .cert-footer { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { text-align: center; width: 30%; }
          .sig-box p { margin-bottom: 40px; font-weight: 600; font-size: 13px; }
          .sig-line { border-top: 1px solid #1e293b; padding-top: 8px; font-size: 12px; color: #64748b; }
          @media print { body { padding: 0; } @page { margin: 15mm; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  if (fullMarks.length === 0) return null;

  const todayHijri = new Date().toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      {/* Gold Celebration Card */}
      <Card
        className={cn(
          "border-0 cursor-pointer overflow-hidden transition-all duration-500 hover:scale-[1.02]",
          "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50",
          "dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-amber-950/40",
          "ring-2 ring-amber-400/60 dark:ring-amber-500/40",
          "shadow-lg shadow-amber-200/40 dark:shadow-amber-900/30",
          "animate-fade-in"
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            {/* Glowing Trophy */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-amber-400/30 blur-xl animate-pulse" />
              <div className="relative rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 p-3.5 shadow-lg shadow-amber-400/40">
                <Trophy className="h-7 w-7 text-amber-950" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                  🎉 تميّز — الدرجة الكاملة!
                </h3>
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300/80">
                حصلت على الدرجة الكاملة في{" "}
                <strong>{fullMarks.map((f) => f.categoryName).join(" و ")}</strong>
              </p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-1">
                اضغط لعرض الشهادة والاحتفال 🏆
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Celebration Dialog */}
      <Dialog open={celebrateOpen} onOpenChange={(v) => { setCelebrateOpen(v); if (!v) setHasFired(false); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Trophy className="h-5 w-5" />
              تهانينا — الدرجة الكاملة! 🎉
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-6 space-y-4">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
              <div className="relative flex items-center justify-center w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-xl shadow-amber-400/40">
                <Trophy className="h-12 w-12 text-amber-900" />
              </div>
            </div>

            <div>
              <p className="text-lg font-bold text-foreground">{studentName}</p>
              <p className="text-sm text-muted-foreground">{className}</p>
            </div>

            <div className="space-y-2">
              {fullMarks.map((f, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30 border border-amber-300/50 dark:border-amber-700/50"
                >
                  <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {f.categoryName} — {f.score}/{f.maxScore}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              تهنئة خاصة لك على حصولك على الدرجة الكاملة في {subjectName}. واصل تميّزك!
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCelebrateOpen(false)}>
              <X className="h-4 w-4 ml-1" />
              إغلاق
            </Button>
            <Button
              onClick={() => { setCelebrateOpen(false); setCertOpen(true); }}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950"
            >
              <Award className="h-4 w-4" />
              عرض الشهادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Dialog */}
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
                borderBottom: "3px solid #3b82f6",
                paddingBottom: "12px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}>
                <div style={{
                  flex: 1,
                  textAlign: headerConfig.rightSection.align,
                  fontSize: `${headerConfig.rightSection.fontSize}px`,
                  lineHeight: 1.8,
                  color: headerConfig.rightSection.color || "#1e293b",
                }}>
                  {headerConfig.rightSection.lines.map((line, i) => (
                    <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {headerConfig.centerSection.images.map((img, i) =>
                    img ? (
                      <img key={i} src={img} alt="" style={{
                        width: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                        height: `${headerConfig.centerSection.imagesSizes[i] || 60}px`,
                        objectFit: "contain",
                      }} />
                    ) : null
                  )}
                </div>
                <div style={{
                  flex: 1,
                  textAlign: headerConfig.leftSection.align,
                  fontSize: `${headerConfig.leftSection.fontSize}px`,
                  lineHeight: 1.8,
                  color: headerConfig.leftSection.color || "#1e293b",
                }}>
                  {headerConfig.leftSection.lines.map((line, i) => (
                    <p key={i} style={{ margin: 0, fontWeight: 600 }}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate Body */}
            <div style={{
              border: "4px double #DAA520",
              borderRadius: "16px",
              padding: "40px",
              margin: "20px 0",
              textAlign: "center",
              background: "linear-gradient(135deg, #FFFDF0 0%, #FFF8E1 50%, #FFFDF0 100%)",
            }}>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#B8860B", marginBottom: "16px" }}>
                🏆 شهادة تميّز 🏆
              </div>
              <div style={{ fontSize: "16px", color: "#64748b", marginBottom: "24px" }}>
                تُمنح هذه الشهادة للطالب المتميز
              </div>
              <div style={{
                fontSize: "24px", fontWeight: 700, color: "#1e293b",
                margin: "20px auto", padding: "12px 24px",
                display: "inline-block", borderBottom: "2px solid #DAA520",
              }}>
                {studentName}
              </div>
              <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "16px" }}>
                الفصل: {className}
              </div>
              <div style={{ fontSize: "16px", lineHeight: 2, color: "#334155", margin: "16px 0" }}>
                تهنئة بحصوله على الدرجة الكاملة في مادة{" "}
                <strong style={{ color: "#B8860B" }}>{subjectName}</strong>
              </div>
              {fullMarks.map((f, i) => (
                <div key={i} style={{
                  display: "inline-block", margin: "8px",
                  padding: "8px 20px", borderRadius: "9999px",
                  background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                  border: "1px solid #D97706",
                  fontSize: "14px", fontWeight: 600, color: "#92400E",
                }}>
                  {f.categoryName}: {f.score}/{f.maxScore} ✓
                </div>
              ))}
              <div style={{ fontSize: "14px", color: "#64748b", marginTop: "24px" }}>
                {todayHijri}
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", paddingTop: "20px" }}>
              <div style={{ textAlign: "center", width: "30%" }}>
                <p style={{ marginBottom: "40px", fontWeight: 600, fontSize: "13px" }}>معلم المادة</p>
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px", fontSize: "12px", color: "#64748b" }}>.......................</div>
              </div>
              <div style={{ textAlign: "center", width: "30%" }}>
                <p style={{ marginBottom: "40px", fontWeight: 600, fontSize: "13px" }}>المرشد الطلابي</p>
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px", fontSize: "12px", color: "#64748b" }}>.......................</div>
              </div>
              <div style={{ textAlign: "center", width: "30%" }}>
                <p style={{ marginBottom: "40px", fontWeight: 600, fontSize: "13px" }}>قائد المدرسة</p>
                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "8px", fontSize: "12px", color: "#64748b" }}>.......................</div>
              </div>
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
