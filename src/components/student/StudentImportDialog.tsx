import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileSpreadsheet, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { ImportRow } from "@/hooks/useStudentsData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  classes: { id: string; name: string }[];
  importClassId: string;
  setImportClassId: (v: string) => void;
  importRows: ImportRow[];
  importing: boolean;
  importDone: boolean;
  importStats: { success: number; failed: number };
  parsingPdf: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImport: () => void;
  resetImport: () => void;
}

export default function StudentImportDialog({
  open, onOpenChange, classes, importClassId, setImportClassId,
  importRows, importing, importDone, importStats, parsingPdf,
  fileRef, handleFileSelect, handleImport, resetImport,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetImport(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          استيراد
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            استيراد الطلاب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-2">
            <p className="font-medium">كيفية الاستيراد من منصة نور أو مدرستي:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>سجّل الدخول في منصة <strong>نور</strong> أو <strong>مدرستي</strong></li>
              <li>انتقل إلى قائمة الطلاب واختر الفصل المطلوب</li>
              <li>صدّر البيانات كملف <strong>Excel</strong> أو <strong>PDF</strong></li>
              <li>ارفع الملف هنا واختر الفصل المستهدف</li>
            </ol>
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                <span>Excel / CSV</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-destructive" />
                <span>PDF (تحليل ذكي)</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>الفصل المستهدف</Label>
            <Select value={importClassId} onValueChange={setImportClassId}>
              <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>ملف Excel أو CSV أو PDF</Label>
            <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFileSelect} className="cursor-pointer" disabled={parsingPdf} />
            {parsingPdf && (
              <div className="flex items-center gap-2 text-sm text-primary animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جارٍ تحليل ملف PDF بالذكاء الاصطناعي...</span>
              </div>
            )}
          </div>

          {importRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>معاينة البيانات ({importRows.filter((r) => r.valid).length} صالح من {importRows.length})</Label>
                {importDone && (
                  <div className="flex gap-2 text-sm">
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {importStats.success} نجاح</Badge>
                    {importStats.failed > 0 && <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> {importStats.failed} فشل</Badge>}
                  </div>
                )}
              </div>
              <div className="max-h-[250px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">رقم الهوية</TableHead>
                      <TableHead className="text-right">جوال ولي الأمر</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.slice(0, 50).map((row, i) => (
                      <TableRow key={i} className={!row.valid ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">{row.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{row.national_id || "—"}</TableCell>
                        <TableCell dir="ltr" className="text-muted-foreground">{row.parent_phone || "—"}</TableCell>
                        <TableCell>
                          {row.valid ? <Badge variant="secondary" className="text-xs">صالح</Badge> : <Badge variant="destructive" className="text-xs">{row.error}</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {importRows.length > 50 && <p className="text-xs text-muted-foreground">يتم عرض أول 50 صف فقط من أصل {importRows.length}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">إغلاق</Button></DialogClose>
          {importRows.length > 0 && !importDone && (
            <Button onClick={handleImport} disabled={importing || !importClassId || importRows.filter((r) => r.valid).length === 0}>
              <Upload className="h-4 w-4 ml-1.5" />
              {importing ? "جارٍ الاستيراد..." : `استيراد ${importRows.filter((r) => r.valid).length} طالب`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
