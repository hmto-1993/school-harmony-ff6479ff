import type { ClassSummary } from "./types";

export function AttendanceTab({ classes }: { classes: ClassSummary[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>تفاصيل الحضور اليوم</h2>
      <div className="backdrop-blur-sm rounded-2xl overflow-hidden" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sv-divider)' }}>
              <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>الفصل</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>الطلاب</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-green)' }}>حاضر</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-red)' }}>غائب</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-amber)' }}>متأخر</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-dim)' }}>لم يُسجل</th>
              <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-text-muted)' }}>النسبة</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => {
              const rate = cls.attendance.total > 0 ? Math.round((cls.attendance.present / cls.attendance.total) * 100) : 0;
              return (
                <tr key={cls.id} className="transition-colors" style={{ borderBottom: '1px solid var(--sv-divider-subtle)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--sv-text-secondary)' }}>{cls.name}</td>
                  <td className="text-center px-4 py-3" style={{ color: 'var(--sv-text-muted)' }}>{cls.studentCount}</td>
                  <td className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-green)' }}>{cls.attendance.present}</td>
                  <td className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-red)' }}>{cls.attendance.absent}</td>
                  <td className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--sv-amber)' }}>{cls.attendance.late}</td>
                  <td className="text-center px-4 py-3" style={{ color: 'var(--sv-text-dim)' }}>{cls.attendance.notRecorded}</td>
                  <td className="text-center px-4 py-3">
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

      {classes.map((cls) => (
        <details key={cls.id} className="backdrop-blur-sm rounded-2xl" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
          <summary className="px-4 py-3 font-semibold cursor-pointer transition-colors" style={{ color: 'var(--sv-text-muted)' }}>{cls.name} — قائمة الطلاب</summary>
          <div className="px-4 pb-3 text-sm" style={{ color: 'var(--sv-text-dim)' }}>
            <p>عدد الطلاب: {cls.studentCount} | حاضر: {cls.attendance.present} | غائب: {cls.attendance.absent}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
