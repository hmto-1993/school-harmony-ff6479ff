import { ICON_OPTIONS } from "./constants";

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2 mt-2">
      {ICON_OPTIONS.map(opt => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
              value === opt.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
