import { cn } from "@/lib/utils";

export function StatCard({ label, value, icon: Icon, gradient }: { label: string; value: string | number; icon: any; gradient: string }) {
  return (
    <div className="relative group overflow-hidden rounded-2xl p-5 text-center transition-all duration-500 hover:scale-[1.02]" style={{ background: 'var(--sv-card)', border: '1px solid var(--sv-card-border)' }}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500", gradient)} />
      <div className="relative">
        <div className={cn("w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", gradient)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="text-3xl font-black tabular-nums" style={{ color: 'var(--sv-text)' }}>{value}</div>
        <div className="text-xs font-medium mt-1.5" style={{ color: 'var(--sv-text-faint)' }}>{label}</div>
      </div>
    </div>
  );
}

export function Row({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--sv-text-faint)' }}>{label}</span>
      <span className={cn("font-semibold", valueColor)} style={!valueColor ? { color: 'var(--sv-text-secondary)' } : undefined}>{value}</span>
    </div>
  );
}
