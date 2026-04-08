import { Button } from "@/components/ui/button";
import {
  Download, Loader2, MessageCircle, AlertTriangle, Share2, FileStack, Files,
} from "lucide-react";
import type { FormTemplate } from "./form-templates";
import type { StudentOption } from "@/hooks/useFormDialog";

interface BulkExportActionsProps {
  multiStudents: StudentOption[];
  bulkExporting: boolean;
  onBulkSeparate: () => void;
  onBulkMerged: () => void;
}

export function BulkExportActions({ multiStudents, bulkExporting, onBulkSeparate, onBulkMerged }: BulkExportActionsProps) {
  return (
    <>
      <Button
        variant="outline"
        className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
        onClick={onBulkSeparate}
        disabled={bulkExporting}
      >
        {bulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileStack className="h-3.5 w-3.5" />}
        تصدير منفصل ({multiStudents.length})
      </Button>
      <Button
        className="gap-1.5 text-xs"
        onClick={onBulkMerged}
        disabled={bulkExporting}
      >
        {bulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Files className="h-3.5 w-3.5" />}
        تقرير مدمج ({multiStudents.length})
      </Button>
    </>
  );
}

interface SingleExportActionsProps {
  form: FormTemplate;
  selectedStudentId: string;
  exporting: boolean;
  sharing: boolean;
  onExport: () => void;
  onWhatsApp: () => void;
  onAdminAlert: () => void;
  onSharePdf: () => void;
}

export function SingleExportActions({
  form, selectedStudentId, exporting, sharing,
  onExport, onWhatsApp, onAdminAlert, onSharePdf,
}: SingleExportActionsProps) {
  return (
    <>
      {form.adminAlertEnabled && (
        <Button variant="destructive" size="sm" onClick={onAdminAlert} disabled={!selectedStudentId} className="gap-1">
          <AlertTriangle className="h-4 w-4" /> بلاغ عاجل
        </Button>
      )}
      {form.whatsappEnabled && (
        <Button variant="outline" className="text-success border-success/30 hover:bg-success/10" onClick={onWhatsApp} disabled={!selectedStudentId}>
          <MessageCircle className="h-4 w-4 ml-2" /> إرسال عبر واتساب
        </Button>
      )}
      <Button
        variant="outline"
        className="text-success border-success/30 hover:bg-success/10 gap-1"
        onClick={onSharePdf} disabled={sharing || !selectedStudentId}
      >
        {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        إرسال PDF عبر واتساب
      </Button>
      <Button onClick={onExport} disabled={exporting || !selectedStudentId}>
        {exporting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
        تصدير PDF
      </Button>
    </>
  );
}
