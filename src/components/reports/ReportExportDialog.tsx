import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet, FileText, MessageCircle } from "lucide-react";

interface ReportExportDialogProps {
  title: string;
  onExportExcel: () => void | Promise<void>;
  onExportPDF: () => void | Promise<void>;
  onShareWhatsApp?: () => void | Promise<void>;
}

export default function ReportExportDialog({ title, onExportExcel, onExportPDF, onShareWhatsApp }: ReportExportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleExcel = async () => {
    await onExportExcel();
    setOpen(false);
  };

  const handlePDF = async () => {
    await onExportPDF();
    setOpen(false);
  };

  const handleWhatsApp = async () => {
    if (onShareWhatsApp) {
      await onShareWhatsApp();
    }
    setOpen(false);
  };

  const hasTabs = onShareWhatsApp ? 3 : 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-4 w-4" />
          تصدير
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="excel" dir="rtl">
          <TabsList className={`grid w-full ${hasTabs === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="excel" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </TabsTrigger>
            {onShareWhatsApp && (
              <TabsTrigger value="whatsapp" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                واتساب
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="excel" className="pt-4">
            <Button onClick={handleExcel} className="w-full gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              تصدير Excel
            </Button>
          </TabsContent>
          <TabsContent value="pdf" className="pt-4">
            <Button onClick={handlePDF} className="w-full gap-2">
              <FileText className="h-4 w-4" />
              تصدير PDF
            </Button>
          </TabsContent>
          {onShareWhatsApp && (
            <TabsContent value="whatsapp" className="pt-4">
              <Button onClick={handleWhatsApp} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="h-4 w-4" />
                إرسال عبر واتساب
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                سيتم إنشاء ملف PDF ومشاركته عبر واتساب
              </p>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
