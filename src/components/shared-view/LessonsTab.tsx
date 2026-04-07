import type { ClassSummary } from "./types";

export function LessonsTab({ classes }: { classes: ClassSummary[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold" style={{ color: 'var(--sv-text)' }}>خطط الدروس</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls, i) => {
          const pct = cls.lessonPlans.total > 0 ? Math.round((cls.lessonPlans.completed / cls.lessonPlans.total) * 100) : 0;
          const color = pct >= 80 ? 'hsl(160,84%,45%)' : pct >= 50 ? 'hsl(38,92%,55%)' : 'hsl(0,84%,60%)';
          return (
            <div key={cls.id} className="relative overflow-hidden backdrop-blur-sm rounded-2xl p-5 transition-all duration-300 group animate-fade-in" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)', animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}>
              <h3 className="font-bold mb-4" style={{ color: 'var(--sv-text)' }}>{cls.name}</h3>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--sv-text-dim)' }}>الإنجاز</span>
                  <span className="font-bold" style={{ color: 'var(--sv-text-secondary)' }}>{cls.lessonPlans.completed}/{cls.lessonPlans.total}</span>
                </div>
                <div className="flex justify-center">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" style={{ stroke: 'var(--sv-divider)' }} />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${pct * 2.64} 264`}
                        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 0.8s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black" style={{ color: 'var(--sv-text)' }}>{pct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
