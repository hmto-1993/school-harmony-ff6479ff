import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Upload, FileSpreadsheet, FileText, MessageCircle } from "lucide-react";
import { statusOptions } from "@/hooks/useAttendanceData";
import type { AttendanceStatus } from "@/hooks/useAttendanceData";

interface Props {
  statusFilter: AttendanceStatus | "all";
  onExportExcel: (scope: "all" | "filtered") => void;
  onExportPDF: (scope: "all" | "filtered") => void;
  onExportWhatsApp: (scope: "all" | "filtered") => void;
}

export default function AttendanceExportMenu({ statusFilter, onExportExcel, onExportPDF, onExportWhatsApp }: Props) {
  const filterLabel = statusOptions.find(o => o.value === statusFilter)?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Upload className="h-4 w-4" />
          تصدير
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExportExcel("all")} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          تصدير الكل Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExportPDF("all")} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          تصدير الكل PDF
        </DropdownMenuItem>
        {statusFilter !== "all" && (
          <>
            <DropdownMenuItem onClick={() => onExportExcel("filtered")} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-warning" />
              تصدير المفلتر Excel ({filterLabel})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportPDF("filtered")} className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-warning" />
              تصدير المفلتر PDF ({filterLabel})
            </DropdownMenuItem>
          </>
        )}
        <div className="h-px bg-border/50 my-1" />
        <DropdownMenuItem onClick={() => onExportWhatsApp("all")} className="gap-2 cursor-pointer text-green-600 dark:text-green-400">
          <MessageCircle className="h-4 w-4" />
          إرسال الكل واتساب
        </DropdownMenuItem>
        {statusFilter !== "all" && (
          <DropdownMenuItem onClick={() => onExportWhatsApp("filtered")} className="gap-2 cursor-pointer text-green-600 dark:text-green-400">
            <MessageCircle className="h-4 w-4" />
            إرسال المفلتر واتساب ({filterLabel})
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
