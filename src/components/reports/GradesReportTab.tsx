import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, Users, Eye } from "lucide-react";
import GradesChart from "@/components/reports/GradesChart";
import ReportPrintHeader from "@/components/reports/ReportPrintHeader";
import PrintWatermark from "@/components/shared/PrintWatermark";
import ReportExportDialog from "@/components/reports/ReportExportDialog";
import type { GradeRow } from "@/hooks/useReportSending";

interface GradesReportTabProps {
  gradeData: GradeRow[];
  categoryNames: string[];
  loadingGrades: boolean;
  selectedClass: string;
  fetchGrades: () => void;
  onPreview: () => void;
  exportGradesExcel: () => void;
  exportGradesPDF: () => void;
  shareGradesWhatsApp: () => void;
}

export default function GradesReportTab({
  gradeData,
  categoryNames,
  loadingGrades,
  selectedClass,
  fetchGrades,
  onPreview,
  exportGradesExcel,
  exportGradesPDF,
  shareGradesWhatsApp,
}: GradesReportTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <Button onClick={fetchGrades} disabled={loadingGrades || !selectedClass}>
          <BarChart3 className="h-4 w-4 ml-1.5" />
          {loadingGrades ? "جارٍ التحميل..." : "عرض التقرير"}
        </Button>
        {gradeData.length > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={onPreview} className="gap-1.5">
              <Eye className="h-4 w-4" />
              معاينة
            </Button>
            <ReportExportDialog
              title="تصدير تقرير الدرجات"
              onExportExcel={exportGradesExcel}
              onExportPDF={exportGradesPDF}
              onShareWhatsApp={shareGradesWhatsApp}
            />
          </>
        )}
      </div>

      {gradeData.length > 0 && (
        <div className="print-area space-y-4">
          <ReportPrintHeader reportType="grades" />
          <PrintWatermark reportType="grades" />
          <GradesChart data={gradeData} categoryNames={categoryNames} />

          <Card className="border-0 shadow-lg bg-card">
            <CardContent className="pt-4">
              <div className="max-h-[400px] overflow-auto rounded-xl border border-border/30">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-l from-success/5 to-primary/5 dark:from-success/10 dark:to-primary/10">
                      <TableHead className="text-right font-semibold">اسم الطالب</TableHead>
                      {categoryNames.map((name) => (
                        <TableHead key={name} className="text-center font-semibold">
                          {name}
                        </TableHead>
                      ))}
                      <TableHead className="text-center font-semibold">المجموع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeData.map((row, i) => (
                      <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                        <TableCell className="font-medium">{row.student_name}</TableCell>
                        {categoryNames.map((name) => (
                          <TableCell key={name} className="text-center text-muted-foreground">
                            {row.categories[name] !== null ? row.categories[name] : "—"}
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0 font-bold">
                            {row.total}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loadingGrades && gradeData.length === 0 && (
        <Card className="print:hidden border-0 shadow-lg bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="rounded-2xl bg-gradient-to-br from-success/10 to-primary/10 p-4 mb-4">
              <Users className="h-10 w-10 text-success/40" />
            </div>
            <p className="text-sm">اختر الفصل ثم اضغط "عرض التقرير"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
