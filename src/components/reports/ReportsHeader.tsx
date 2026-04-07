import { safePrint } from "@/lib/print-utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import {
  ClipboardCheck, GraduationCap, Printer, Send, ChevronDown, MessageCircle, Users2,
} from "lucide-react";

interface ReportsHeaderProps {
  sendingSMS: boolean;
  selectedStudent: string;
  handleSendSMS: (sections: { attendance: boolean; grades: boolean }) => void;
  handleSendWhatsApp: (sections: { attendance: boolean; grades: boolean }) => void;
  setBulkConfirm: (val: any) => void;
}

export default function ReportsHeader({
  sendingSMS,
  selectedStudent,
  handleSendSMS,
  handleSendWhatsApp,
  setBulkConfirm,
}: ReportsHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">التقارير والإحصائيات</h1>
        <p className="text-muted-foreground">تقارير يومية وأسبوعية للحضور والدرجات مع إمكانية التصدير</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => safePrint()}
          className="gap-1.5 text-white"
          style={{ backgroundColor: "hsl(var(--report-btn-print))" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-print-hover))")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--report-btn-print))")}
        >
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              disabled={sendingSMS}
              className="gap-1.5 text-white"
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
  );
}
