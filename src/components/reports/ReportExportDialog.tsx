import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, FileText, MessageCircle, Filter, Layers } from "lucide-react";

type Scope = "all" | "filtered";

interface ReportExportDialogProps {
  title: string;
  /** When provided, enables a scope selector (Filtered / All). */
  filterActive?: boolean;
  filterLabel?: string;
  filteredCount?: number;
  totalCount?: number;
  onExportExcel: (scope: Scope) => void | Promise<void>;
  onExportPDF: (scope: Scope) => void | Promise<void>;
  onShareWhatsApp?: (scope: Scope) => void | Promise<void>;
}

export default function ReportExportDialog({
  title,
  filterActive = false,
  filterLabel,
  filteredCount,
  totalCount,
  onExportExcel,
  onExportPDF,
  onShareWhatsApp,
}: ReportExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<Scope>(filterActive ? "filtered" : "all");

  // Reset scope when filter state changes
  useEffect(() => {
    setScope(filterActive ? "filtered" : "all");
  }, [filterActive]);

  const handleExcel = async () => {
    await onExportExcel(scope);
    setOpen(false);
  };
  const handlePDF = async () => {
    await onExportPDF(scope);
    setOpen(false);
  };
  const handleWhatsApp = async () => {
    if (onShareWhatsApp) await onShareWhatsApp(scope);
    setOpen(false);
  };

  const hasTabs = onShareWhatsApp ? 3 : 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={filterActive ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
        >
          <Upload className="h-4 w-4" />
          تصدير
          {filterActive && (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px] gap-1">
              <Filter className="h-2.5 w-2.5" />
              مفلتر
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Scope selector — only when a filter is active */}
        {filterActive && (
          <div className="space-y-2 rounded-lg border border-border/40 bg-muted/30 p-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              نطاق التصدير
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                variant={scope === "filtered" ? "default" : "outline"}
                onClick={() => setScope("filtered")}
                className="h-auto py-2 flex-col gap-0.5 text-xs"
              >
                <span className="flex items-center gap-1 font-semibold">
                  <Filter className="h-3 w-3" />
                  المفلتر فقط
                </span>
                {filterLabel && (
                  <span className="text-[10px] opacity-80 truncate max-w-full">
                    {filterLabel}
                    {typeof filteredCount === "number" && ` (${filteredCount})`}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant={scope === "all" ? "default" : "outline"}
                onClick={() => setScope("all")}
                className="h-auto py-2 flex-col gap-0.5 text-xs"
              >
                <span className="font-semibold">كل البيانات</span>
                {typeof totalCount === "number" && (
                  <span className="text-[10px] opacity-80">({totalCount})</span>
                )}
              </Button>
            </div>
          </div>
        )}

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
