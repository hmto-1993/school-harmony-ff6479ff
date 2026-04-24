import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
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
  return (
    <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 print:hidden">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 min-w-[180px]">
            <Label className="text-xs font-semibold text-muted-foreground">الفصل</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="اختر الفصل" />
              </SelectTrigger>
              <SelectContent>
                {classes.length > 1 && (
                  <SelectItem value="all">جميع الفصول</SelectItem>
                )}
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[180px]">
            <Label className="text-xs font-semibold text-muted-foreground">الطالب</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
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
              <SelectTrigger className="w-36">
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
              <Label className="text-xs font-semibold text-muted-foreground">التاريخ</Label>
              <HijriDatePicker
                date={dateFromDate}
                onDateChange={(d) => {
                  setDateFromDate(d);
                  setDateToDate(d);
                }}
              />
            </div>
          ) : reportType === "semester" ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">النطاق</Label>
              <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm">
                <span className="font-medium">📅 كامل الفصل الدراسي</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {format(dateFromDate, "yyyy-MM-dd")} → {format(dateToDate, "yyyy-MM-dd")}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">الأسابيع</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-64 justify-between text-sm font-normal" dir="rtl">
                    <span className="truncate">
                      {selectedWeeks.length === 0
                        ? "اختر الأسابيع"
                        : selectedWeeks.length === getWeeksInfo().length
                          ? "الجميع (كل الأسابيع)"
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
              {selectedWeeks.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {format(dateFromDate, "yyyy-MM-dd")} → {format(dateToDate, "yyyy-MM-dd")}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
