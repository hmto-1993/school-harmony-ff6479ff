import { safePrint } from "@/lib/print-utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import {
  ClipboardCheck, GraduationCap, Printer, Send, ChevronDown, MessageCircle, Users2, FileBarChart, BarChart3,
} from "lucide-react";
import ComprehensiveExport from "@/components/reports/ComprehensiveExport";

interface ReportsHeaderProps {
  sendingSMS: boolean;
  selectedStudent: string;
  handleSendSMS: (sections: { attendance: boolean; grades: boolean }) => void;
  handleSendWhatsApp: (sections: { attendance: boolean; grades: boolean }) => void;
  setBulkConfirm: (val: any) => void;
  classes: { id: string; name: string }[];
}

export default function ReportsHeader({
  sendingSMS,
  selectedStudent,
  handleSendSMS,
  handleSendWhatsApp,
  setBulkConfirm,
  classes,
}: ReportsHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/90 via-card/70 to-primary/5 backdrop-blur-xl shadow-lg print:hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-accent/15 blur-3xl" aria-hidden />

      <div className="relative flex items-center justify-between flex-wrap gap-3 p-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
            <BarChart3 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-l from-primary via-accent to-primary bg-clip-text text-transparent">
              مركز التقارير والإحصائيات
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
              تقارير ذكية وتصدير احترافي بنقرة واحدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Comprehensive Export — slim trigger */}
          <ComprehensiveExport classes={classes} variant="header" />

          <Button
            size="sm"
            variant="outline"
            onClick={() => safePrint()}
            className="gap-1.5 bg-background/60 backdrop-blur"
          >
            <Printer className="h-4 w-4" />
            طباعة
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={sendingSMS}
                className="gap-1.5 text-white shadow-md"
                style={{ backgroundColor: "hsl(var(--report-btn-send))" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-send-hover))")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-send))")}
              >
                <Send className="h-4 w-4" />
                {sendingSMS ? "جارٍ الإرسال..." : "إرسال لولي الأمر"}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {selectedStudent !== "all" && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">إرسال فردي عبر SMS</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSendSMS({ attendance: true, grades: true })}>
                    <Send className="h-4 w-4 ml-2" />
                    تقرير شامل (حضور + درجات)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendSMS({ attendance: true, grades: false })}>
                    <ClipboardCheck className="h-4 w-4 ml-2" />
                    تقرير الحضور فقط
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendSMS({ attendance: false, grades: true })}>
                    <GraduationCap className="h-4 w-4 ml-2" />
                    تقرير الدرجات فقط
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">إرسال فردي عبر واتساب</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSendWhatsApp({ attendance: true, grades: true })}>
                    <MessageCircle className="h-4 w-4 ml-2 text-green-500" />
                    تقرير شامل (حضور + درجات)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendWhatsApp({ attendance: true, grades: false })}>
                    <MessageCircle className="h-4 w-4 ml-2 text-green-500" />
                    تقرير الحضور فقط
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendWhatsApp({ attendance: false, grades: true })}>
                    <MessageCircle className="h-4 w-4 ml-2 text-green-500" />
                    تقرير الدرجات فقط
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                <Users2 className="h-3 w-3 inline ml-1" />
                إرسال جماعي لكل الفصل عبر SMS
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setBulkConfirm({ open: true, sections: { attendance: true, grades: true } })}>
                <Users2 className="h-4 w-4 ml-2" />
                تقرير شامل لجميع الطلاب
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkConfirm({ open: true, sections: { attendance: true, grades: false } })}>
                <Users2 className="h-4 w-4 ml-2" />
                تقرير الحضور لجميع الطلاب
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkConfirm({ open: true, sections: { attendance: false, grades: true } })}>
                <Users2 className="h-4 w-4 ml-2" />
                تقرير الدرجات لجميع الطلاب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
