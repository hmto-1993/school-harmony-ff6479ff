import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_OPTIONS } from "./constants";

export function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="mt-1 rounded-xl">
        <SelectValue placeholder="اختر التصنيف" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORY_OPTIONS.map(c => (
          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
