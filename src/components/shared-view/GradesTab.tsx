import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClassSummary } from "./types";

export function GradesTab({ classes, categories, isPrint }: { classes: ClassSummary[]; categories: any[]; isPrint?: boolean }) {
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const toggleClass = (classId: string) => {
    setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>ملخص الدرجات</h2>
      {classes.map((cls) => {
        const isExpanded = isPrint || expandedClasses[cls.id] || false;
        const classCategories = categories.filter((c: any) => c.class_id === cls.id || c.class_id === null);
        const gradesByStudent: Record<string, Record<string, { sum: number; count: number }>> = {};

        cls.students.forEach((s) => {
          gradesByStudent[s.id] = {};
        });

        cls.grades.forEach((g: any) => {
          if (!gradesByStudent[g.student_id]) return;
          const catId = g.category_id;
          if (!gradesByStudent[g.student_id][catId]) gradesByStudent[g.student_id][catId] = { sum: 0, count: 0 };
          if (g.score !== null) {
            gradesByStudent[g.student_id][catId].sum += Number(g.score);
            gradesByStudent[g.student_id][catId].count++;
          }
        });

        cls.manualScores.forEach((m: any) => {
          if (!gradesByStudent[m.student_id]) return;
          gradesByStudent[m.student_id][m.category_id] = { sum: Number(m.score), count: 1 };
        });

        const sortedCats = classCategories.sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 6);

        return (
          <div key={cls.id} className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
            <button
              onClick={() => toggleClass(cls.id)}
              className="w-full px-4 py-3 font-bold flex items-center justify-between transition-colors"
              style={{ background: 'var(--sv-card-subtle)', borderBottom: '1px solid var(--sv-divider)', color: 'var(--sv-text-secondary)' }}
            >
              <span>{cls.name} ({cls.studentCount} طالب)</span>
              <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} style={{ color: 'var(--sv-text-dim)' }} />
            </button>
            {isExpanded && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
                      <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>الطالب</th>
                      {sortedCats.map((cat: any) => (
                        <th key={cat.id} className="text-center px-2 py-2 font-medium text-xs max-w-[80px] truncate" title={cat.name} style={{ color: 'var(--sv-text-dim)' }}>
                          {cat.name}
                        </th>
                      ))}
                      <th className="text-center px-2 py-2 font-bold text-xs" style={{ color: 'var(--sv-green)', borderRight: '2px solid var(--sv-green)' }}>
                        المكتسبة
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cls.students.map((s) => {
                      // Calculate earned total: sum of ALL classwork grades for this student
                      const earnedTotal = cls.grades
                        .filter((g: any) => g.student_id === s.id && g.score !== null && g.score !== undefined)
                        .reduce((sum: number, g: any) => sum + Number(g.score), 0);

                      return (
                        <tr key={s.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)' }}>
                          <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: 'var(--sv-text-secondary)' }}>{s.full_name}</td>
                          {sortedCats.map((cat: any) => {
                            const entry = gradesByStudent[s.id]?.[cat.id];
                            const avg = entry && entry.count > 0 ? Math.round(entry.sum / entry.count) : null;
                            return (
                              <td key={cat.id} className="text-center px-2 py-2">
                                {avg !== null ? (
                                  <span className="text-xs font-semibold" style={{ color: avg >= cat.max_score * 0.8 ? 'var(--sv-green)' : avg >= cat.max_score * 0.5 ? 'var(--sv-amber)' : 'var(--sv-red)' }}>
                                    {avg}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--sv-text-ghost)' }}>—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center px-2 py-2 font-bold" style={{ color: 'var(--sv-green)', borderRight: '2px solid var(--sv-green)' }}>
                            {earnedTotal > 0 ? earnedTotal : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
