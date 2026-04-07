import { useMemo } from "react";
import type { SharedData } from "./types";
import { computeStudentAvgUI, getGradeLevel, LEVEL_INFO } from "./helpers";
import { Row } from "./SharedUIComponents";

export function OverviewTab({ data }: { data: SharedData }) {
  const classStats = useMemo(() => {
    return data.classes.map(cls => {
      const avgs: number[] = [];
      cls.students.forEach(s => {
        const avg = computeStudentAvgUI(cls, s.id, data.categories);
        if (avg !== null) avgs.push(avg);
      });
      const classAvg = avgs.length > 0 ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
      const levelCounts = [0, 0, 0, 0, 0];
      avgs.forEach(a => levelCounts[getGradeLevel(a).index]++);
      return { cls, classAvg, levelCounts, totalGraded: avgs.length };
    });
  }, [data]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>ملخص الفصول</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classStats.map(({ cls, classAvg, levelCounts, totalGraded }, i) => {
          const level = classAvg !== null ? getGradeLevel(classAvg) : null;
          return (
            <div key={cls.id} className="relative overflow-hidden backdrop-blur-sm rounded-2xl p-5 transition-all duration-300 group animate-fade-in" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)', animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-[hsl(195,100%,50%)] to-[hsl(270,75%,55%)] opacity-60 group-hover:opacity-100 transition-opacity" />
              <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--sv-text)' }}>{cls.name}</h3>
              <div className="space-y-2 text-sm">
                <Row label="عدد الطلاب" value={cls.studentCount} />
                <Row label="حاضرون اليوم" value={cls.attendance.present} valueColor="text-[var(--sv-green)]" />
                <Row label="غائبون" value={cls.attendance.absent} valueColor="text-[var(--sv-red)]" />
                <Row label="متأخرون" value={cls.attendance.late} valueColor="text-[var(--sv-amber)]" />
                <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--sv-card-border)' }}>
                  <Row label="خطط الدروس" value={`${cls.lessonPlans.completed}/${cls.lessonPlans.total}`} />
                  <Row label="سلوك إيجابي" value={cls.behavior.positive} valueColor="text-[var(--sv-green)]" />
                  <Row label="سلوك سلبي" value={cls.behavior.negative} valueColor="text-[var(--sv-red)]" />
                </div>
                {classAvg !== null && (
                  <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--sv-card-border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: 'var(--sv-text-faint)' }}>المعدل العام</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black" style={{ color: level?.color }}>{classAvg}%</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: level?.color ? `${level.color.replace(')', ',0.15)')}` : undefined, color: level?.color }}>{level?.label}</span>
                      </div>
                    </div>
                    <div className="flex rounded-full overflow-hidden h-2 gap-[1px]">
                      {levelCounts.map((count, li) => {
                        if (count === 0) return null;
                        const pct = (count / totalGraded) * 100;
                        return (
                          <div key={li} style={{ width: `${pct}%`, backgroundColor: LEVEL_INFO[li].color, minWidth: '3px' }} title={`${LEVEL_INFO[li].label}: ${count}`} />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      {levelCounts.map((count, li) => count > 0 ? (
                        <span key={li} className="text-[9px] font-semibold" style={{ color: LEVEL_INFO[li].color }}>{count}</span>
                      ) : null)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
