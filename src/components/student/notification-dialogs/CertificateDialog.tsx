import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Printer, X } from "lucide-react";
import type { PrintHeaderConfig } from "@/components/settings/PrintHeaderEditor";
import { resolveLogoSrc } from "@/lib/default-logos";

interface FullMarkGrade {
  categoryName: string;
  score: number;
  maxScore: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentName: string;
  className: string;
  subjectName: string;
  fullMarks: FullMarkGrade[];
  headerConfig: PrintHeaderConfig | null;
  todayHijri: string;
}

export default function CertificateDialog({ open, onOpenChange, studentName, className, subjectName, fullMarks, headerConfig, todayHijri }: Props) {
  const certRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = certRef.current;
    if (!content) return;
    const pw = window.open("", "_blank");
    if (!pw) return;
    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>شهادة تميز - ${studentName}</title><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'IBM Plex Sans Arabic',sans-serif;padding:30px;background:#fff;color:#1e293b;direction:rtl}.header{border-bottom:3px solid #3b82f6;padding-bottom:12px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.header-section{flex:1;line-height:1.8}.header-section p{margin:0;font-weight:600}.header-center{display:flex;align-items:center;gap:10px;flex-shrink:0}.header-center img{object-fit:contain}.cert-border{border:4px double #DAA520;border-radius:16px;padding:40px;margin:20px 0;text-align:center;background:linear-gradient(135deg,#FFFDF0,#FFF8E1,#FFFDF0)}.cert-title{font-size:28px;font-weight:700;color:#B8860B;margin-bottom:16px}.sig-box{text-align:center;width:30%}.sig-box p{margin-bottom:40px;font-weight:600;font-size:13px}.sig-line{border-top:1px solid #1e293b;padding-top:8px;font-size:12px;color:#64748b}@media print{body{padding:0}@page{margin:15mm}}</style></head><body>${content.innerHTML}</body></html>`);
    pw.document.close();
    pw.onload = () => pw.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />شهادة التميز
          </DialogTitle>
        </DialogHeader>
        <div ref={certRef} className="bg-white text-slate-900 p-4" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
          {headerConfig && (
            <div style={{ borderBottom: "3px solid #3b82f6", paddingBottom: "12px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
              <div style={{ flex: 1, textAlign: headerConfig.rightSection.align, fontSize: `${headerConfig.rightSection.fontSize}px`, lineHeight: 1.8, color: headerConfig.rightSection.color || "#1e293b" }}>
                {headerConfig.rightSection.lines.map((l, i) => (<p key={i} style={{ margin: 0, fontWeight: 600 }}>{l}</p>))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {headerConfig.centerSection.images.map((img, i) => { const s = resolveLogoSrc(i, img); return s ? <img key={i} src={s} alt="" style={{ width: `${headerConfig.centerSection.imagesSizes[i] || 60}px`, height: `${headerConfig.centerSection.imagesSizes[i] || 60}px`, objectFit: "contain" }} /> : null; })}
              </div>
              <div style={{ flex: 1, textAlign: headerConfig.leftSection.align, fontSize: `${headerConfig.leftSection.fontSize}px`, lineHeight: 1.8, color: headerConfig.leftSection.color || "#1e293b" }}>
                {headerConfig.leftSection.lines.map((l, i) => (<p key={i} style={{ margin: 0, fontWeight: 600 }}>{l}</p>))}
              </div>
            </div>
          )}
          <div style={{ border: "4px double #DAA520", borderRadius: "16px", padding: "40px 24px", margin: "20px 0", textAlign: "center", background: "linear-gradient(135deg, #FFFDF0 0%, #FFF8E1 50%, #FFFDF0 100%)" }}>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "#B8860B", marginBottom: "16px" }}>🏆 شهادة تميّز 🏆</div>
            <div style={{ fontSize: "15px", color: "#64748b", marginBottom: "20px" }}>تُمنح هذه الشهادة للطالب المتميز</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#1e293b", margin: "16px auto", padding: "10px 20px", display: "inline-block", borderBottom: "2px solid #DAA520" }}>{studentName}</div>
            <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>الفصل: {className}</div>
            <div style={{ fontSize: "15px", lineHeight: 2, color: "#334155", margin: "12px 0" }}>
              تهنئة بحصوله على الدرجة الكاملة في مادة <strong style={{ color: "#B8860B" }}>{subjectName}</strong>
            </div>
            {fullMarks.map((f, i) => (
              <div key={i} style={{ display: "inline-block", margin: "6px", padding: "6px 16px", borderRadius: "9999px", background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: "1px solid #D97706", fontSize: "13px", fontWeight: 600, color: "#92400E" }}>{f.categoryName}: {f.score}/{f.maxScore} ✓</div>
            ))}
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "20px" }}>{todayHijri}</div>
          </div>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 ml-1" />إغلاق
          </Button>
          <Button onClick={handlePrint} className="gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-amber-950">
            <Printer className="h-4 w-4" />طباعة الشهادة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
