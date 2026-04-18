import { useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentAttendance, AttendanceStatus, AbsenceAlert } from "@/hooks/useAttendanceData";
import { statusOptions } from "@/hooks/useAttendanceData";

const DELAY_PRESETS = [5, 10, 15, 20, 30, 45];

const EXCUSED_MARKER = "بعذر";

const extractMinutes = (notes: string): number => {
  const match = notes.match(/تأخر\s*(\d+)\s*دقيقة/);
  return match ? parseInt(match[1], 10) : 0;
};

const hasExcuse = (notes: string): boolean => /تأخر\s*بعذر/.test(notes);

function LateMinutesPicker({
  value,
  excused,
  onChange,
  onToggleExcuse,
}: {
  value: number;
  excused: boolean;
  onChange: (mins: number) => void;
  onToggleExcuse: () => void;
}) {
  return (
    <div className="flex items-center gap-1 mt-1.5 animate-fade-in">
      <Clock className="h-3 w-3 text-warning shrink-0" />
      <div className="flex gap-0.5 flex-wrap">
        {DELAY_PRESETS.map((mins) => {
          const isActive = value === mins && !excused;
          return (
            <button
              key={mins}
              type="button"
              onClick={() => onChange(isActive ? 0 : mins)}
              className={cn(
                "h-6 min-w-[32px] px-1.5 rounded-md text-[10px] font-bold border transition-all duration-200",
                isActive
                  ? "bg-warning/20 text-warning border-warning/40 ring-1 ring-warning/20 shadow-sm scale-105"
                  : "bg-background text-muted-foreground border-border/50 hover:bg-warning/10 hover:text-warning hover:border-warning/30 hover:scale-105"
              )}
            >
              {mins}د
            </button>
          );
        })}
        <button
          type="button"
          onClick={onToggleExcuse}
          className={cn(
            "h-6 px-2 rounded-md text-[10px] font-bold border transition-all duration-200",
            excused
              ? "bg-info/20 text-info border-info/40 ring-1 ring-info/20 shadow-sm scale-105"
              : "bg-background text-muted-foreground border-border/50 hover:bg-info/10 hover:text-info hover:border-info/30 hover:scale-105"
          )}
        >
          بعذر
        </button>
      </div>
    </div>
  );
}

interface Props {
  records: StudentAttendance[];
  allRecords: StudentAttendance[];
  absenceAlerts: Record<string, AbsenceAlert>;
  updateStatus: (studentId: string, status: AttendanceStatus) => void;
  updateNotes: (studentId: string, notes: string) => void;
}

export default function AttendanceTable({ records, allRecords, absenceAlerts, updateStatus, updateNotes }: Props) {
  const rowIndexMap = useMemo(
    () => Object.fromEntries(allRecords.map((record, index) => [record.student_id, index + 1])),
    [allRecords]
  );

  return (
    <div className="overflow-auto overscroll-contain max-h-[70vh] rounded-xl border border-border/40 shadow-sm bg-card">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="bg-gradient-to-l from-primary/10 via-accent/5 to-primary/5 dark:from-primary/20 dark:via-accent/10 dark:to-primary/10">
            <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 first:rounded-tr-xl w-12">#</th>
            <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الطالب</th>
            <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20">الحالة</th>
            <th className="text-right p-3 font-semibold text-primary text-xs border-b-2 border-primary/20 last:rounded-tl-xl">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record, i) => {
            const idx = rowIndexMap[record.student_id] ?? i + 1;
            const isEven = i % 2 === 0;
            const isLast = i === records.length - 1;
            return (
              <tr
                key={record.student_id}
                className={cn(
                  "group transition-all duration-200 cursor-default hover:bg-sky-100/60 dark:hover:bg-sky-900/30",
                  isEven ? "bg-card" : "bg-muted/30 dark:bg-muted/20",
                  !isLast && "border-b border-border/20"
                )}
              >
                <td className={cn("p-3 text-muted-foreground font-medium border-l border-border/10 transition-colors duration-200 group-hover:text-primary", isLast && "first:rounded-br-xl")}>{idx}</td>
                <td className="p-3 font-semibold border-l border-border/10 transition-all duration-200 group-hover:bg-sky-100/40 dark:group-hover:bg-sky-900/20 group-hover:text-primary">
                  <div className="flex items-center gap-2">
                    <span>{record.full_name}</span>
                    {absenceAlerts[record.student_id]?.exceeded && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 gap-0.5 shrink-0 animate-pulse">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        محروم
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-3 border-l border-border/10">
                  <div className="flex flex-wrap gap-1">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          updateStatus(record.student_id, opt.value);
                          if (opt.value === "late" && !record.notes.match(/تأخر.*دقيقة/)) {
                            updateNotes(record.student_id, record.notes ? record.notes : "");
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                          record.status === opt.value
                            ? opt.color + " font-medium ring-1 ring-current/20 shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {record.status === "late" && (
                    <LateMinutesPicker
                      value={extractMinutes(record.notes)}
                      excused={hasExcuse(record.notes)}
                      onChange={(mins) => {
                        const cleanNote = record.notes
                          .replace(/تأخر\s*بعذر\s*[·\-–]?\s*/g, "")
                          .replace(/تأخر\s*\d+\s*دقيقة\s*[·\-–]?\s*/g, "")
                          .trim();
                        const prefix = mins > 0 ? `تأخر ${mins} دقيقة${cleanNote ? " · " : ""}` : "";
                        updateNotes(record.student_id, prefix + cleanNote);
                      }}
                      onToggleExcuse={() => {
                        const currentlyExcused = hasExcuse(record.notes);
                        const cleanNote = record.notes
                          .replace(/تأخر\s*بعذر\s*[·\-–]?\s*/g, "")
                          .replace(/تأخر\s*\d+\s*دقيقة\s*[·\-–]?\s*/g, "")
                          .trim();
                        const prefix = currentlyExcused ? "" : `تأخر ${EXCUSED_MARKER}${cleanNote ? " · " : ""}`;
                        updateNotes(record.student_id, prefix + cleanNote);
                      }}
                    />
                  )}
                </td>
                <td className={cn("p-3", isLast && "last:rounded-bl-xl")}>
                  <Textarea
                    value={record.notes}
                    onChange={(e) => updateNotes(record.student_id, e.target.value)}
                    placeholder="ملاحظات..."
                    className="min-h-[36px] h-9 resize-none text-xs"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
