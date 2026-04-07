import { useState, useMemo } from "react";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SharedData } from "./types";
import { STATUS_COLORS, STATUS_LABELS, getWeekNum, getCurrentWeekNum } from "./helpers";

export function WeeklyAttendanceTab({ data, isPrint }: { data: SharedData; isPrint?: boolean }) {
  const [selectedClassId, setSelectedClassId] = useState(data.classes[0]?.id || "");
  const [weekFilter, setWeekFilter] = useState<"current" | "all">("current");
  const cal = data.academicCalendar;

  const currentWeek = cal ? getCurrentWeekNum(cal.start_date) : 1;

  const weeklyData = useMemo(() => {
    if (!cal || !selectedClassId) return null;

    const cls = data.classes.find(c => c.id === selectedClassId);
    if (!cls) return null;

    const classRecords = data.weeklyAttendance.filter(r => r.class_id === selectedClassId);
    const schedule = data.classSchedules.find(s => s.class_id === selectedClassId);
    const periodsPerWeek = schedule?.periods_per_week || 5;

    const weekDatesMap: Record<number, string[]> = {};
    classRecords.forEach(r => {
      const wk = getWeekNum(r.date, cal.start_date);
      if (wk < 1 || wk > cal.total_weeks) return;
      if (!weekDatesMap[wk]) weekDatesMap[wk] = [];
      if (!weekDatesMap[wk].includes(r.date)) weekDatesMap[wk].push(r.date);
    });

    const allWeeks: { weekNum: number; dates: string[] }[] = [];
    for (let w = 1; w <= cal.total_weeks; w++) {
      allWeeks.push({ weekNum: w, dates: (weekDatesMap[w] || []).sort() });
    }

    const showAll = isPrint || weekFilter === "all";
    const weeks = showAll ? allWeeks : allWeeks.filter(w => w.weekNum === currentWeek);

    const studentRows = cls.students.map(s => {
      const studentRecords = classRecords.filter(r => r.student_id === s.id);
      const weekStatuses: Record<number, string[]> = {};
      let totalAbsent = 0;
      let totalLate = 0;

      studentRecords.forEach(r => {
        const wk = getWeekNum(r.date, cal.start_date);
        if (wk < 1 || wk > cal.total_weeks) return;
        if (!weekStatuses[wk]) weekStatuses[wk] = [];
        weekStatuses[wk].push(r.status);
        if (r.status === 'absent') totalAbsent++;
        if (r.status === 'late') totalLate++;
      });

      return {
        id: s.id,
        name: s.full_name,
        weekStatuses,
        totalAbsent,
        totalLate,
        isAtRisk: totalAbsent >= 3,
      };
    });

    return { weeks, studentRows, periodsPerWeek };
  }, [data, selectedClassId, cal, weekFilter, isPrint, currentWeek]);

  if (!cal) {
    return (
      <div className="backdrop-blur-sm rounded-2xl p-8 text-center" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
        <CalendarDays className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--sv-text-ghost)' }} />
        <p className="font-medium" style={{ color: 'var(--sv-text-dim)' }}>لا يوجد تقويم أكاديمي محدد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>تقرير الحضور الأسبوعي</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'var(--sv-tab-inactive)', border: '1px solid var(--sv-card-border)' }}>
            <button
              onClick={() => setWeekFilter("current")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                weekFilter === "current"
                  ? "bg-gradient-to-l from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)] text-white shadow-sm"
                  : ""
              )}
              style={weekFilter !== "current" ? { color: 'var(--sv-text-dim)' } : undefined}
            >
              الأسبوع الحالي (ع{currentWeek})
            </button>
            <button
              onClick={() => setWeekFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                weekFilter === "all"
                  ? "bg-gradient-to-l from-[hsl(195,100%,45%)] to-[hsl(210,90%,50%)] text-white shadow-sm"
                  : ""
              )}
              style={weekFilter !== "all" ? { color: 'var(--sv-text-dim)' } : undefined}
            >
              جميع الأسابيع
            </button>
          </div>
          {data.classes.map(cls => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                selectedClassId === cls.id
                  ? "bg-gradient-to-l from-[hsl(270,75%,55%)] to-[hsl(290,70%,50%)] text-white shadow-sm"
                  : ""
              )}
              style={selectedClassId !== cls.id ? { background: 'var(--sv-tab-inactive)', color: 'var(--sv-text-dim)', border: '1px solid var(--sv-card-border)' } : undefined}
            >
              {cls.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap text-xs">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[key] }} />
            <span style={{ color: 'var(--sv-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {weeklyData && (
        <div className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
                  <th className="text-right px-3 py-2 font-semibold sticky right-0 z-10 min-w-[120px]" style={{ color: 'var(--sv-text-muted)', background: 'var(--sv-sticky)' }}>الطالب</th>
                  {weeklyData.weeks.map(w => (
                    <th key={w.weekNum} className="text-center px-1 py-2 font-medium min-w-[36px]" style={{ color: w.weekNum === currentWeek ? 'var(--sv-current-week-text)' : 'var(--sv-text-dim)', background: w.weekNum === currentWeek ? 'var(--sv-current-week-bg)' : undefined }}>
                      <div className="writing-mode-vertical text-[10px]">ع{w.weekNum}</div>
                    </th>
                  ))}
                  <th className="text-center px-2 py-2 font-semibold min-w-[40px]" style={{ color: 'var(--sv-red)' }}>غ</th>
                  <th className="text-center px-2 py-2 font-semibold min-w-[40px]" style={{ color: 'var(--sv-amber)' }}>تأخر</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.studentRows.map((student) => (
                  <tr key={student.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)', background: student.isAtRisk ? 'var(--sv-at-risk-bg)' : undefined }}>
                    <td className="px-3 py-1.5 font-medium whitespace-nowrap sticky right-0 z-10" style={{ color: 'var(--sv-text-secondary)', background: 'var(--sv-sticky)' }}>
                      <div className="flex items-center gap-1">
                        {student.isAtRisk && <AlertTriangle className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--sv-red)' }} />}
                        <span className="truncate max-w-[100px]">{student.name}</span>
                      </div>
                    </td>
                    {weeklyData.weeks.map(w => {
                      const statuses = student.weekStatuses[w.weekNum] || [];
                      return (
                        <td key={w.weekNum} className="text-center px-0.5 py-1" style={{ background: w.weekNum === currentWeek ? 'var(--sv-current-week-bg)' : undefined }}>
                          <div className="flex flex-wrap justify-center gap-0.5">
                            {statuses.length === 0 ? (
                              <span style={{ color: 'var(--sv-text-invisible)' }}>·</span>
                            ) : (
                              statuses.map((s, i) => (
                                <span
                                  key={i}
                                  className="w-2.5 h-2.5 rounded-full inline-block"
                                  style={{ backgroundColor: STATUS_COLORS[s] || '#ccc' }}
                                  title={STATUS_LABELS[s] || s}
                                />
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center px-2 py-1.5 font-bold" style={{ color: 'var(--sv-red)' }}>{student.totalAbsent || '—'}</td>
                    <td className="text-center px-2 py-1.5 font-bold" style={{ color: 'var(--sv-amber)' }}>{student.totalLate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
