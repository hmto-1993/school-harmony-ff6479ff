import { useState, useEffect } from "react";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Heart, User, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

type SeverityLevel = "low" | "medium" | "high" | "critical";

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: "منخفض",
  medium: "متوسط",
  high: "مرتفع",
  critical: "حرج",
};

const extractSeverity = (note: string | null): SeverityLevel | null => {
  if (!note) return null;
  const match = note.match(/\[severity:(\w+)\]/i);
  const severity = match?.[1]?.toLowerCase();

  if (!severity || !(severity in SEVERITY_LABELS)) return null;

  return severity as SeverityLevel;
};

const cleanNote = (note: string | null): string => {
  if (!note) return "—";
  return note.replace(/\[severity:\w+\]\s*/g, "").trim() || "—";
};

const formatSeverity = (severity: SeverityLevel | null): string => {
  if (!severity) return "—";
  return SEVERITY_LABELS[severity];
};


interface BehaviorRow {
  student_name: string;
  date: string;
  type: string;
  note: string;
  severity: SeverityLevel | null;
}

interface BehaviorReportProps {
  selectedClass: string;
  dateFrom: string;
  dateTo: string;
  selectedStudent: string;
}

const TYPE_LABELS: Record<string, string> = {
  positive: "إيجابي",
  negative: "سلبي",
  neutral: "محايد",
};

const TYPE_COLORS: Record<string, string> = {
  positive: "hsl(142, 71%, 45%)",
  negative: "hsl(0, 84%, 60%)",
  neutral: "hsl(45, 93%, 47%)",
};

export default function BehaviorReport({ selectedClass, dateFrom, dateTo, selectedStudent }: BehaviorReportProps) {
  const [data, setData] = useState<BehaviorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  const fetchBehavior = async () => {
    if (!selectedClass) return;
    setLoading(true);
    let query = supabase
      .from("behavior_records")
      .select("type, note, date, student_id, students(full_name)")
      .eq("class_id", selectedClass)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false });

    if (selectedStudent !== "all") {
      query = query.eq("student_id", selectedStudent);
    }

    const { data: records, error } = await query;

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      setData(
        (records || []).map((r: any) => ({
          student_name: r.students?.full_name || "—",
          date: r.date,
          type: r.type,
          note: cleanNote(r.note),
          severity: extractSeverity(r.note),
        }))
      );
    }
    setLoading(false);
  };

  // Auto-fetch when filters change
  useEffect(() => {
    if (selectedClass && dateFrom && dateTo) {
      fetchBehavior();
    }
  }, [selectedClass, dateFrom, dateTo, selectedStudent]);

  // Summary counts
  const positive = data.filter((r) => r.type === "positive").length;
  const negative = data.filter((r) => r.type === "negative").length;
  const neutral = data.filter((r) => r.type === "neutral").length;

  const filteredData = typeFilter === "all" ? data : data.filter((r) => r.type === typeFilter);

  const studentDetailRows = selectedStudentName
    ? data.filter((r) => r.student_name === selectedStudentName).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const pieData = [
    { name: "إيجابي", value: positive },
    { name: "سلبي", value: negative },
    { name: "محايد", value: neutral },
  ].filter((d) => d.value > 0);

  // Per-student bar chart
  const studentMap: Record<string, { positive: number; negative: number; neutral: number }> = {};
  filteredData.forEach((r) => {
    if (!studentMap[r.student_name]) studentMap[r.student_name] = { positive: 0, negative: 0, neutral: 0 };
    if (r.type in studentMap[r.student_name]) {
      studentMap[r.student_name][r.type as "positive" | "negative" | "neutral"]++;
    }
  });
  const studentCards = Object.entries(studentMap)
    .map(([name, counts]) => {
      const total = counts.positive + counts.negative + counts.neutral;
      const dominant: "positive" | "negative" | "neutral" =
        counts.negative >= counts.positive && counts.negative >= counts.neutral ? "negative" :
        counts.positive >= counts.neutral ? "positive" : "neutral";
      return { name, ...counts, total, dominant };
    })
    .sort((a, b) => b.total - a.total);

  const groupedStudentCards = typeFilter === "all"
    ? [
        { key: "positive" as const, label: "طلاب ذوو سلوك إيجابي غالب", color: TYPE_COLORS.positive, students: studentCards.filter((s) => s.dominant === "positive") },
        { key: "neutral" as const, label: "طلاب ذوو سلوك محايد غالب", color: TYPE_COLORS.neutral, students: studentCards.filter((s) => s.dominant === "neutral") },
        { key: "negative" as const, label: "طلاب ذوو سلوك سلبي غالب", color: TYPE_COLORS.negative, students: studentCards.filter((s) => s.dominant === "negative") },
      ].filter((g) => g.students.length > 0)
    : [{ key: typeFilter, label: "", color: "", students: studentCards }];

  const exportPDF = async () => {
    const { registerArabicFont, getArabicTableStyles, finalizePDF } = await import("@/lib/arabic-pdf");
    const { toPng } = await import("html-to-image");
    const autoTableImport = await import("jspdf-autotable");
    const autoTable = autoTableImport.default;
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await registerArabicFont(doc);
    const tableStyles = getArabicTableStyles();
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 10;

    // --- Render header as HTML image (same approach as grades export) ---
    let startY = 10;
    let watermark: any = undefined;

    // Fetch header config
    const { data: hdrData } = await supabase
      .from("site_settings").select("value")
      .eq("id", "print_header_config_behavior").single();
    let headerConfig: any = null;
    if (hdrData?.value) try { headerConfig = JSON.parse(hdrData.value); } catch {}
    if (!headerConfig) {
      const { data: defData } = await supabase
        .from("site_settings").select("value")
        .eq("id", "print_header_config").single();
      if (defData?.value) try { headerConfig = JSON.parse(defData.value); } catch {}
    }

    if (headerConfig?.watermark?.enabled) watermark = headerConfig.watermark;

    if (headerConfig) {
      // Build header HTML exactly like grades-print.ts
      const rightLines = (headerConfig.rightSection?.lines || [])
        .map((l: string) => `<p style="margin:0;font-weight:600;">${l}</p>`).join("");
      const leftLines = (headerConfig.leftSection?.lines || [])
        .map((l: string) => `<p style="margin:0;font-weight:600;">${l}</p>`).join("");
      const images = (headerConfig.centerSection?.images || [])
        .map((img: string, i: number) => {
          if (!img) return "";
          const size = headerConfig.centerSection?.imagesSizes?.[i] || 60;
          return `<img src="${img}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;" />`;
        }).join("");

      const headerHTML = `
        <div style="direction:rtl;font-family:'IBM Plex Sans Arabic',sans-serif;padding:12px 20px 0;background:#fff;">
          <div style="padding-bottom:8px;border-bottom:3px solid #3b82f6;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
            <div style="max-width:40%;text-align:center;font-size:${headerConfig.rightSection?.fontSize || 12}px;line-height:1.8;color:${headerConfig.rightSection?.color || '#1e293b'};">
              ${rightLines}
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
              ${images}
            </div>
            <div style="max-width:40%;text-align:center;font-size:${headerConfig.leftSection?.fontSize || 12}px;line-height:1.8;color:${headerConfig.leftSection?.color || '#1e293b'};">
              ${leftLines}
            </div>
          </div>
        </div>
      `;

      // Create offscreen container, capture as image
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:760px;background:#fff;";
      container.innerHTML = headerHTML;
      document.body.appendChild(container);

      // Wait for images to load
      const imgs = container.querySelectorAll("img");
      await Promise.all(Array.from(imgs).map(img =>
        img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
      ));

      try {
        const dataUrl = await toPng(container, { backgroundColor: "#ffffff", pixelRatio: 3 });
        const imgEl = new Image();
        await new Promise<void>((resolve) => { imgEl.onload = () => resolve(); imgEl.src = dataUrl; });

        const imgAspect = imgEl.naturalWidth / imgEl.naturalHeight;
        const usableW = pageWidth - margin * 2;
        const imgH = usableW / imgAspect;

        doc.addImage(dataUrl, "PNG", margin, startY, usableW, imgH);
        startY = startY + imgH + 4;
      } catch {
        startY = 15;
      }

      document.body.removeChild(container);
    }

    doc.setFontSize(14);
    const filterTitle = typeFilter === "all" ? "تقرير السلوك" : `تقرير السلوك - ${TYPE_LABELS[typeFilter]}`;
    doc.text(filterTitle, pageWidth / 2, startY, { align: "center" });
    doc.setFontSize(9);
    doc.text(`من: ${dateFrom}  إلى: ${dateTo}`, pageWidth / 2, startY + 6, { align: "center" });

    // Summary statistics table
    const totalFiltered = filteredData.length;
    const summaryTypes = typeFilter === "all"
      ? (["positive", "neutral", "negative"] as const)
      : ([typeFilter] as const);
    const summaryData = summaryTypes.map((t) => {
      const count = filteredData.filter((r) => r.type === t).length;
      return { type: t, label: TYPE_LABELS[t], count };
    });

    const summaryColorMap: Record<string, [number, number, number]> = {
      positive: [46, 125, 50],
      neutral: [249, 168, 37],
      negative: [198, 40, 40],
    };

    autoTable(doc, {
      startY: startY + 10,
      head: [summaryData.map((s) => s.label)],
      body: [summaryData.map((s) => `${s.count}`)],
      ...tableStyles,
      headStyles: {
        ...tableStyles.headStyles,
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontSize: 10,
      },
      bodyStyles: {
        ...tableStyles.bodyStyles,
        fontSize: 11,
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: Object.fromEntries(
        summaryData.map((s, i) => [i, { textColor: summaryColorMap[s.type] || [0, 0, 0] }])
      ),
      theme: "grid",
      margin: { left: margin, right: margin },
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`إجمالي السجلات: ${totalFiltered}`, pageWidth / 2, currentY, { align: "center" });
    doc.setTextColor(0, 0, 0);
    currentY += 8;

    const pdfTypeGroups =
      typeFilter === "all"
        ? [
            { type: "positive", label: "إيجابي", headerColor: [46, 125, 50] as [number, number, number], rowColor: [232, 245, 233] as [number, number, number] },
            { type: "neutral", label: "محايد", headerColor: [249, 168, 37] as [number, number, number], rowColor: [255, 249, 230] as [number, number, number] },
            { type: "negative", label: "سلبي", headerColor: [198, 40, 40] as [number, number, number], rowColor: [255, 235, 238] as [number, number, number] },
          ]
        : [{
            type: typeFilter,
            label: TYPE_LABELS[typeFilter],
            headerColor: (typeFilter === "positive" ? [46, 125, 50] : typeFilter === "negative" ? [198, 40, 40] : [249, 168, 37]) as [number, number, number],
            rowColor: (typeFilter === "positive" ? [232, 245, 233] : typeFilter === "negative" ? [255, 235, 238] : [255, 249, 230]) as [number, number, number],
          }];

    for (const group of pdfTypeGroups) {
      const rows = filteredData.filter((r) => r.type === group.type);
      if (rows.length === 0) continue;

      // Section title
      doc.setFontSize(12);
      doc.setTextColor(group.headerColor[0], group.headerColor[1], group.headerColor[2]);
      doc.text(`${group.label} (${rows.length})`, pageWidth / 2, currentY, { align: "center" });
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: currentY + 3,
        head: [["ملاحظات", "مستوى الخطورة", "التاريخ", "اسم الطالب", "#"]],
        body: rows.map((r, i) => [r.note, formatSeverity(r.severity), r.date, r.student_name, String(i + 1)]),
        ...tableStyles,
        headStyles: {
          ...tableStyles.headStyles,
          fillColor: group.headerColor,
        },
        alternateRowStyles: {
          fillColor: group.rowColor,
        },
        columnStyles: { 3: { halign: "right" } },
        margin: { left: margin, right: margin },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    finalizePDF(doc, `تقرير_السلوك_${dateFrom}_${dateTo}.pdf`, watermark);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        {loading && (
          <span className="text-sm text-muted-foreground">جارٍ التحميل...</span>
        )}
        {data.length > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPDF}>
            <FileText className="h-4 w-4" />
            تصدير PDF
          </Button>
        )}
      </div>

      {data.length > 0 && (
        <div className="print-area space-y-4">
          <ReportPrintHeader reportType="behavior" />
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card
              className={`cursor-pointer transition-all ${typeFilter === "all" ? "ring-2 ring-primary shadow-md" : "hover:bg-muted/50"}`}
              onClick={() => setTypeFilter("all")}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{data.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${typeFilter === "positive" ? "ring-2 shadow-md" : "hover:bg-muted/50"}`}
              style={typeFilter === "positive" ? { borderColor: TYPE_COLORS.positive, boxShadow: `0 0 0 2px ${TYPE_COLORS.positive}40` } : {}}
              onClick={() => setTypeFilter(typeFilter === "positive" ? "all" : "positive")}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: TYPE_COLORS.positive }}>{positive}</p>
                <p className="text-xs text-muted-foreground">إيجابي</p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${typeFilter === "negative" ? "ring-2 shadow-md" : "hover:bg-muted/50"}`}
              style={typeFilter === "negative" ? { borderColor: TYPE_COLORS.negative, boxShadow: `0 0 0 2px ${TYPE_COLORS.negative}40` } : {}}
              onClick={() => setTypeFilter(typeFilter === "negative" ? "all" : "negative")}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: TYPE_COLORS.negative }}>{negative}</p>
                <p className="text-xs text-muted-foreground">سلبي</p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all ${typeFilter === "neutral" ? "ring-2 shadow-md" : "hover:bg-muted/50"}`}
              style={typeFilter === "neutral" ? { borderColor: TYPE_COLORS.neutral, boxShadow: `0 0 0 2px ${TYPE_COLORS.neutral}40` } : {}}
              onClick={() => setTypeFilter(typeFilter === "neutral" ? "all" : "neutral")}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold" style={{ color: TYPE_COLORS.neutral }}>{neutral}</p>
                <p className="text-xs text-muted-foreground">محايد</p>
              </CardContent>
            </Card>
          </div>

          {typeFilter !== "all" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>تصفية: <strong className="text-foreground">{TYPE_LABELS[typeFilter]}</strong> ({filteredData.length} سجل)</span>
              <button onClick={() => setTypeFilter("all")} className="text-primary hover:underline text-xs">إلغاء الفلتر</button>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">توزيع السلوك</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-full" style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "إيجابي" ? TYPE_COLORS.positive :
                              entry.name === "سلبي" ? TYPE_COLORS.negative :
                              TYPE_COLORS.neutral
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}`, ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{data.length}</p>
                      <p className="text-[10px] text-muted-foreground">إجمالي</p>
                    </div>
                  </div>
                </div>
                {/* Custom legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {pieData.map((entry) => {
                    const pct = ((entry.value / data.length) * 100).toFixed(0);
                    const color =
                      entry.name === "إيجابي" ? TYPE_COLORS.positive :
                      entry.name === "سلبي" ? TYPE_COLORS.negative :
                      TYPE_COLORS.neutral;
                    return (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                        <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-foreground font-medium">{entry.name}</span>
                        <span className="text-muted-foreground">{entry.value} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart per student */}
            <Card className="shadow-card md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">السلوك حسب الطالب</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="max-h-[380px] overflow-auto space-y-3 pe-1">
                  {groupedStudentCards.map((group) => (
                    <div key={group.key}>
                      {group.label && (
                        <div className="flex items-center gap-2 mb-2 mt-1">
                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                          <span className="text-xs font-semibold text-foreground">{group.label}</span>
                          <span className="text-[10px] text-muted-foreground">({group.students.length})</span>
                          <div className="flex-1 border-t border-border/40" />
                        </div>
                      )}
                      <div className="space-y-2">
                        {group.students.map((s) => (
                          <div
                            key={s.name}
                            className="rounded-lg border border-border/60 bg-muted/30 p-2.5 space-y-1.5 hover:bg-muted/60 transition-colors cursor-pointer"
                            onClick={() => setSelectedStudentName(s.name)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{s.name}</span>
                              <span className="text-xs text-muted-foreground">{s.total} سجل</span>
                            </div>
                            <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
                              {s.positive > 0 && (
                                <div className="h-full transition-all" style={{ width: `${(s.positive / s.total) * 100}%`, backgroundColor: TYPE_COLORS.positive }} title={`إيجابي: ${s.positive}`} />
                              )}
                              {s.neutral > 0 && (
                                <div className="h-full transition-all" style={{ width: `${(s.neutral / s.total) * 100}%`, backgroundColor: TYPE_COLORS.neutral }} title={`محايد: ${s.neutral}`} />
                              )}
                              {s.negative > 0 && (
                                <div className="h-full transition-all" style={{ width: `${(s.negative / s.total) * 100}%`, backgroundColor: TYPE_COLORS.negative }} title={`سلبي: ${s.negative}`} />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px]">
                              {s.positive > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS.positive }} />
                                  <span className="text-muted-foreground">إيجابي {s.positive}</span>
                                </span>
                              )}
                              {s.neutral > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS.neutral }} />
                                  <span className="text-muted-foreground">محايد {s.neutral}</span>
                                </span>
                              )}
                              {s.negative > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS.negative }} />
                                  <span className="text-muted-foreground">سلبي {s.negative}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="shadow-card">
            <CardContent className="pt-4">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم الطالب</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">مستوى الخطورة</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.student_name}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.type === "positive" ? "default" :
                              row.type === "negative" ? "destructive" : "secondary"
                            }
                          >
                            {TYPE_LABELS[row.type] || row.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.severity === "high" || row.severity === "critical" ? "destructive" :
                              row.severity === "medium" ? "secondary" : "outline"
                            }
                          >
                            {formatSeverity(row.severity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{row.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={!!selectedStudentName} onOpenChange={(open) => !open && setSelectedStudentName(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              تفاصيل سلوك: {selectedStudentName}
            </DialogTitle>
          </DialogHeader>
          {studentDetailRows.length > 0 && (
            <div className="space-y-3 overflow-auto flex-1 pe-1">
              <div className="flex items-center gap-3 flex-wrap">
                {(["positive", "negative", "neutral"] as const).map((t) => {
                  const count = studentDetailRows.filter((r) => r.type === t).length;
                  if (count === 0) return null;
                  return (
                    <Badge key={t} variant={t === "positive" ? "default" : t === "negative" ? "destructive" : "secondary"} className="gap-1">
                      {TYPE_LABELS[t]} <span className="font-bold">{count}</span>
                    </Badge>
                  );
                })}
                <span className="text-xs text-muted-foreground mr-auto">إجمالي: {studentDetailRows.length}</span>
              </div>
              <div className="space-y-2">
                {studentDetailRows.map((row, i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-3 space-y-1.5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Badge variant={row.type === "positive" ? "default" : row.type === "negative" ? "destructive" : "secondary"} className="text-[11px]">
                        {TYPE_LABELS[row.type] || row.type}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {row.date}
                      </span>
                    </div>
                    {row.note !== "—" && <p className="text-sm text-foreground">{row.note}</p>}
                    {row.severity && (
                      <Badge variant="outline" className="text-[10px]">خطورة: {formatSeverity(row.severity)}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!loading && data.length === 0 && (
        <Card className="print:hidden">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Heart className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">اختر الفصل والتواريخ ثم اضغط "عرض التقرير"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
