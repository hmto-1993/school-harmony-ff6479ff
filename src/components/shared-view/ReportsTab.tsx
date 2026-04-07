import { useMemo } from "react";
import { BookOpen, UserCheck, AlertTriangle, TrendingDown } from "lucide-react";
import type { SharedData } from "./types";
import { computeStudentAvgUI, getGradeLevel, LEVEL_INFO } from "./helpers";
import { StatCard } from "./SharedUIComponents";

export function ReportsTab({ data }: { data: SharedData }) {
  const totalAbsences = data.classes.reduce((a, c) => a + c.totalAbsences, 0);
  const totalBehaviorPositive = data.classes.reduce((a, c) => a + c.behavior.positive, 0);
  const totalBehaviorNegative = data.classes.reduce((a, c) => a + c.behavior.negative, 0);

  const gradeAnalytics = useMemo(() => {
    const allAvgs: { name: string; className: string; avg: number; classId: string }[] = [];
    const classAvgs: { name: string; avg: number; levelCounts: number[] }[] = [];

    data.classes.forEach(cls => {
      const avgs: number[] = [];
      cls.students.forEach(s => {
        const avg = computeStudentAvgUI(cls, s.id, data.categories);
        if (avg !== null) {
          avgs.push(avg);
          allAvgs.push({ name: s.full_name, className: cls.name, avg, classId: cls.id });
        }
      });
      const levelCounts = [0, 0, 0, 0, 0];
      avgs.forEach(a => levelCounts[getGradeLevel(a).index]++);
      const classAvg = avgs.length > 0 ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
      classAvgs.push({ name: cls.name, avg: classAvg, levelCounts });
    });

    allAvgs.sort((a, b) => b.avg - a.avg);
    const top5 = allAvgs.slice(0, 5);
    const bottom5 = allAvgs.slice(-5).reverse();
    const overallLevels = [0, 0, 0, 0, 0];
    allAvgs.forEach(s => overallLevels[getGradeLevel(s.avg).index]++);
    const overallAvg = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b.avg, 0) / allAvgs.length) : 0;

    return { allAvgs, classAvgs, top5, bottom5, overallLevels, overallAvg, totalGraded: allAvgs.length };
  }, [data]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>التقارير والإحصائيات</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="المعدل العام" value={gradeAnalytics.totalGraded > 0 ? `${gradeAnalytics.overallAvg}%` : "—"} icon={BookOpen} gradient="from-[hsl(270,75%,55%)] to-[hsl(290,70%,50%)]" />
        <StatCard label="إجمالي الغياب (30 يوم)" value={totalAbsences} icon={TrendingDown} gradient="from-[hsl(0,84%,60%)] to-[hsl(350,80%,55%)]" />
        <StatCard label="سلوك إيجابي" value={totalBehaviorPositive} icon={UserCheck} gradient="from-[hsl(160,84%,39%)] to-[hsl(145,70%,42%)]" />
        <StatCard label="سلوك سلبي" value={totalBehaviorNegative} icon={AlertTriangle} gradient="from-[hsl(38,92%,50%)] to-[hsl(25,90%,52%)]" />
      </div>

      {/* Grade Level Distribution Donut */}
      {gradeAnalytics.totalGraded > 0 && (
        <div className="backdrop-blur-sm rounded-2xl p-6" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <h3 className="font-bold mb-5 text-center" style={{ color: 'var(--sv-text)' }}>📊 توزيع المستويات الأكاديمية</h3>
          <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
            <div className="relative w-44 h-44 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  let offset = 0;
                  const circumference = 2 * Math.PI * 38;
                  return gradeAnalytics.overallLevels.map((count, i) => {
                    if (count === 0) return null;
                    const pct = (count / gradeAnalytics.totalGraded) * 100;
                    const dashLen = (pct / 100) * circumference;
                    const el = (
                      <circle
                        key={i}
                        cx="50" cy="50" r="38"
                        fill="none"
                        strokeWidth="12"
                        stroke={LEVEL_INFO[i].color}
                        strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                        strokeDashoffset={-offset}
                        style={{ transition: 'all 0.8s ease', filter: `drop-shadow(0 0 4px ${LEVEL_INFO[i].color})` }}
                      />
                    );
                    offset += dashLen;
                    return el;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black" style={{ color: 'var(--sv-text)' }}>{gradeAnalytics.overallAvg}%</span>
                <span className="text-[10px] font-medium" style={{ color: 'var(--sv-text-dim)' }}>المعدل العام</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
              {LEVEL_INFO.map((level, i) => {
                const count = gradeAnalytics.overallLevels[i];
                const pct = gradeAnalytics.totalGraded > 0 ? Math.round((count / gradeAnalytics.totalGraded) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: level.color, boxShadow: `0 0 8px ${level.color}40` }} />
                    <div>
                      <span className="text-sm font-bold" style={{ color: level.color }}>{pct}%</span>
                      <span className="text-xs ml-1.5" style={{ color: 'var(--sv-text-dim)' }}>{level.label} ({count})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Class Performance Comparison */}
      {gradeAnalytics.classAvgs.length > 0 && gradeAnalytics.totalGraded > 0 && (
        <div className="backdrop-blur-sm rounded-2xl p-6" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <h3 className="font-bold mb-5" style={{ color: 'var(--sv-text)' }}>📈 مقارنة أداء الفصول</h3>
          <div className="space-y-4">
            {gradeAnalytics.classAvgs.map((cls, i) => {
              const level = getGradeLevel(cls.avg);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold" style={{ color: 'var(--sv-text-secondary)' }}>{cls.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${level.color.replace(')', ',0.15)')}`, color: level.color }}>{level.label}</span>
                      <span className="font-black text-lg" style={{ color: level.color }}>{cls.avg}%</span>
                    </div>
                  </div>
                  <div className="flex rounded-full overflow-hidden h-4 gap-[1px]" style={{ background: 'var(--sv-divider)' }}>
                    {cls.levelCounts.map((count, li) => {
                      if (count === 0) return null;
                      const total = cls.levelCounts.reduce((a, b) => a + b, 0);
                      const pct = (count / total) * 100;
                      return (
                        <div key={li} className="flex items-center justify-center transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: LEVEL_INFO[li].color, minWidth: count > 0 ? '16px' : '0' }}>
                          {pct > 12 && <span className="text-[9px] font-bold text-white">{count}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {cls.levelCounts.map((count, li) => count > 0 ? (
                      <span key={li} className="text-[10px] font-medium" style={{ color: LEVEL_INFO[li].color }}>
                        {LEVEL_INFO[li].label}: {count}
                      </span>
                    ) : null)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 5 / Bottom 5 */}
      {gradeAnalytics.totalGraded > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="backdrop-blur-sm rounded-2xl p-5 relative overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-[hsl(160,84%,39%)] to-[hsl(145,70%,42%)]" />
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--sv-green)' }}>
              <span className="text-lg">⭐</span> أفضل 5 طلاب
            </h3>
            <div className="space-y-3">
              {gradeAnalytics.top5.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: i === 0 ? 'linear-gradient(135deg, hsl(45,93%,47%), hsl(38,92%,50%))' : i === 1 ? 'linear-gradient(135deg, hsl(0,0%,68%), hsl(0,0%,58%))' : i === 2 ? 'linear-gradient(135deg, hsl(25,70%,50%), hsl(20,65%,45%))' : 'var(--sv-divider)' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--sv-text-secondary)' }}>{s.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--sv-text-dim)' }}>{s.className}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sv-divider)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.avg}%`, backgroundColor: getGradeLevel(s.avg).color }} />
                    </div>
                    <span className="text-sm font-black min-w-[3ch] text-left" style={{ color: getGradeLevel(s.avg).color }}>{s.avg}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="backdrop-blur-sm rounded-2xl p-5 relative overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-[hsl(0,84%,60%)] to-[hsl(350,80%,55%)]" />
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--sv-red)' }}>
              <span className="text-lg">⚠</span> أدنى 5 طلاب
            </h3>
            <div className="space-y-3">
              {gradeAnalytics.bottom5.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--sv-divider)', color: 'var(--sv-text-dim)' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--sv-text-secondary)' }}>{s.name}</div>
                    <div className="text-[10px]" style={{ color: 'var(--sv-text-dim)' }}>{s.className}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sv-divider)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.avg}%`, backgroundColor: getGradeLevel(s.avg).color }} />
                    </div>
                    <span className="text-sm font-black min-w-[3ch] text-left" style={{ color: getGradeLevel(s.avg).color }}>{s.avg}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Trend Chart */}
      {data.attendanceReport.length > 0 && (
        <div className="backdrop-blur-sm rounded-2xl p-5" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--sv-text)' }}>📅 اتجاه الحضور (آخر 30 يوم)</h3>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[600px] h-40">
              {data.attendanceReport.slice(0, 30).reverse().map((day) => {
                const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${rate}%`}>
                    <span className="text-[9px] font-medium" style={{ color: 'var(--sv-text-dim)' }}>{rate}%</span>
                    <div className="w-full rounded-t transition-all duration-300" style={{
                      height: `${rate}%`,
                      background: rate >= 80 ? 'linear-gradient(to top, hsl(160,84%,39%), hsl(160,84%,50%))' : rate >= 60 ? 'linear-gradient(to top, hsl(38,92%,50%), hsl(38,92%,60%))' : 'linear-gradient(to top, hsl(0,84%,50%), hsl(0,84%,60%))',
                      minHeight: '2px',
                      boxShadow: rate >= 80 ? '0 0 8px hsl(160,84%,39%,0.3)' : rate >= 60 ? '0 0 8px hsl(38,92%,50%,0.3)' : '0 0 8px hsl(0,84%,50%,0.3)',
                    }} />
                    <span className="text-[8px] -rotate-45 origin-center whitespace-nowrap" style={{ color: 'var(--sv-text-ghost)' }}>
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Absentees */}
      {data.classes.map((cls) => (
        cls.topAbsentees.length > 0 && (
          <div key={cls.id} className="backdrop-blur-sm rounded-2xl p-5" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
            <h3 className="font-bold mb-3" style={{ color: 'var(--sv-text)' }}>{cls.name} — الأكثر غياباً</h3>
            <div className="space-y-2">
              {cls.topAbsentees.map((s, i) => {
                const maxCount = cls.topAbsentees[0]?.count || 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-medium text-sm flex-1" style={{ color: 'var(--sv-text-muted)' }}>{s.name}</span>
                    <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--sv-divider)' }}>
                      <div className="h-full rounded-full" style={{ width: `${(s.count / maxCount) * 100}%`, background: 'linear-gradient(to left, hsl(0,84%,60%), hsl(350,80%,55%))' }} />
                    </div>
                    <span className="font-bold text-sm min-w-[3ch] text-left" style={{ color: 'var(--sv-red)' }}>{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ))}

      {/* Daily Attendance Log */}
      {data.attendanceReport.length > 0 && (
        <div className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <div className="px-4 py-3 font-bold" style={{ borderBottom: '1px solid var(--sv-divider)', color: 'var(--sv-text-muted)' }}>سجل الحضور اليومي</div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: 'var(--sv-sticky)' }}>
                <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
                  <th className="text-right px-4 py-2 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>التاريخ</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-green)' }}>حاضر</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-red)' }}>غائب</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-amber)' }}>متأخر</th>
                  <th className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>النسبة</th>
                </tr>
              </thead>
              <tbody>
                {data.attendanceReport.map((day) => {
                  const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                  return (
                    <tr key={day.date} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)' }}>
                      <td className="px-4 py-2 font-medium" style={{ color: 'var(--sv-text-secondary)' }}>{day.date}</td>
                      <td className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-green)' }}>{day.present}</td>
                      <td className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-red)' }}>{day.absent}</td>
                      <td className="text-center px-4 py-2 font-semibold" style={{ color: 'var(--sv-amber)' }}>{day.late}</td>
                      <td className="text-center px-4 py-2">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{
                          background: rate >= 80 ? 'var(--sv-rate-good-bg)' : rate >= 60 ? 'var(--sv-rate-mid-bg)' : 'var(--sv-rate-bad-bg)',
                          color: rate >= 80 ? 'var(--sv-rate-good-text)' : rate >= 60 ? 'var(--sv-rate-mid-text)' : 'var(--sv-rate-bad-text)',
                        }}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
