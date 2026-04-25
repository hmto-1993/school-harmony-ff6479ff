import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Filter, ChevronUp, SlidersHorizontal, CalendarDays, Users, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { HijriDatePicker } from "@/components/ui/hijri-date-picker";

interface ReportFiltersProps {
  classes: { id: string; name: string }[];
  selectedClass: string;
  setSelectedClass: (v: string) => void;
  students: { id: string; full_name: string; class_id?: string | null }[];
  selectedStudent: string;
  setSelectedStudent: (v: string) => void;
  reportType: "daily" | "periodic" | "semester";
  setReportType: (v: "daily" | "periodic" | "semester") => void;
  dateFromDate: Date;
  setDateFromDate: (d: Date) => void;
  dateToDate: Date;
  setDateToDate: (d: Date) => void;
  selectedWeeks: number[];
  toggleWeek: (weekNum: number) => void;
  toggleAllWeeks: () => void;
  getWeeksInfo: () => { weekNumber: number; startDate: Date; endDate: Date; type: string; label: string }[];
  currentWeek: number;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  daily: "يومي",
  periodic: "أسبوعي",
  semester: "الفصلي",
};

export default function ReportFilters({
  classes,
  selectedClass,
  setSelectedClass,
  students,
  selectedStudent,
  setSelectedStudent,
  reportType,
  setReportType,
  dateFromDate,
  setDateFromDate,
  dateToDate,
  setDateToDate,
  selectedWeeks,
  toggleWeek,
  toggleAllWeeks,
  getWeeksInfo,
  currentWeek,
}: ReportFiltersProps) {
  const [open, setOpen] = useState(false);

  const className = selectedClass === "all" ? "جميع الفصول" : (classes.find(c => c.id === selectedClass)?.name || "—");
  const studentName = selectedStudent === "all" ? "كل الطلاب" : (students.find(s => s.id === selectedStudent)?.full_name || "—");

  const dateLabel = reportType === "daily"
    ? format(dateFromDate, "yyyy-MM-dd")
    : reportType === "semester"
    ? "كامل الفصل الدراسي"
    : `${format(dateFromDate, "MM/dd")} → ${format(dateToDate, "MM/dd")}`;

  return (
    <Card className="border border-border/40 shadow-sm backdrop-blur-xl bg-card/70 print:hidden overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        {/* Compact summary bar (always visible) */}
        <div className="flex items-center justify-between gap-2 p-3 border-b border-border/30">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">الفلتر النشط:</span>
            </div>
            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-0">
              <BookOpen className="h-3 w-3" />
              {className}
            </Badge>
            {selectedStudent !== "all" && (
              <Badge variant="secondary" className="gap-1 bg-accent/10 text-accent-foreground border-0">
                <Users className="h-3 w-3" />
                {studentName}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1 bg-background/50">
              {REPORT_TYPE_LABELS[reportType]}
            </Badge>
            <Badge variant="outline" className="gap-1 bg-background/50">
              <CalendarDays className="h-3 w-3" />
              {dateLabel}
            </Badge>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 shrink-0">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">{open ? "إخفاء" : "تعديل"}</span>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="data-[state=open]:animate-fade-in">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1.5 min-w-[180px] flex-1">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  الفصل
                </Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-background/60">
                    <SelectValue placeholder="اختر الفصل" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length > 1 && <SelectItem value="all">جميع الفصول</SelectItem>}
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-[180px] flex-1">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  الطالب
                </Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="bg-background/60">
                    <SelectValue placeholder="جميع الطلاب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الطلاب</SelectItem>
                    {students.map((s) => {
                      const cls = s.class_id ? classes.find(c => c.id === s.class_id) : null;
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name}{cls ? ` (${cls.name})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">نوع التقرير</Label>
                <Select value={reportType} onValueChange={(v: "daily" | "periodic" | "semester") => setReportType(v)}>
                  <SelectTrigger className="w-32 bg-background/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="periodic">أسبوعي</SelectItem>
                    <SelectItem value="semester">الفصلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType === "daily" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    التاريخ
                  </Label>
                  <HijriDatePicker
                    date={dateFromDate}
                    onDateChange={(d) => { setDateFromDate(d); setDateToDate(d); }}
                  />
                </div>
              ) : reportType === "semester" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">النطاق</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm">
                    <span className="font-medium">📅 كامل الفصل الدراسي</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    الأسابيع
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-56 justify-between text-sm font-normal bg-background/60" dir="rtl">
                        <span className="truncate">
                          {selectedWeeks.length === 0
                            ? "اختر الأسابيع"
                            : selectedWeeks.length === getWeeksInfo().length
                              ? "كل الأسابيع"
                              : (() => {
                                  const sorted = [...selectedWeeks].sort((a, b) => a - b);
                                  return `الأسبوع ${sorted[0]} - ${sorted[sorted.length - 1]}`;
                                })()}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start" dir="rtl">
                      <div className="max-h-72 overflow-y-auto">
                        <div
                          className="flex items-center gap-2 px-3 py-2 border-b border-border cursor-pointer hover:bg-muted/50"
                          onClick={toggleAllWeeks}
                        >
                          <Checkbox
                            checked={selectedWeeks.length === getWeeksInfo().length && getWeeksInfo().length > 0}
                            onCheckedChange={toggleAllWeeks}
                          />
                          <span className="text-sm font-medium">📋 الجميع</span>
                        </div>
                        {getWeeksInfo().map((w) => (
                          <div
                            key={w.weekNumber}
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleWeek(w.weekNumber)}
                          >
                            <Checkbox
                              checked={selectedWeeks.includes(w.weekNumber)}
                              onCheckedChange={() => toggleWeek(w.weekNumber)}
                            />
                            <span className="text-sm">
                              {w.weekNumber === currentWeek ? "● " : ""}أسبوع {w.weekNumber} — {w.type !== "normal" ? w.label : "دراسة"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
