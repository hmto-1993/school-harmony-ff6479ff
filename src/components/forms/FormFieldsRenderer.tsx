import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { FormField } from "./form-templates";
import ComboboxField from "./ComboboxField";

interface Props {
  fields: FormField[];
  fieldValues: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
}

function parseSelected(raw: string): string[] {
  if (!raw) return [];
  try {
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j.map(String) : [];
  } catch {
    return raw.split("،").map(s => s.trim()).filter(Boolean);
  }
}

export default function FormFieldsRenderer({ fields, fieldValues, onFieldChange }: Props) {
  const visibleFields = fields.filter(f => f.type !== "auto" && !f.hidden);

  return (
    <>
      {visibleFields.map(field => {
        const value = fieldValues[field.id] || "";

        if (field.type === "checkbox-list" && field.options) {
          const selected = parseSelected(value);
          const toggle = (opt: string) => {
            const next = selected.includes(opt)
              ? selected.filter(s => s !== opt)
              : [...selected, opt];
            onFieldChange(field.id, JSON.stringify(next));
          };
          return (
            <div key={field.id} className="space-y-2">
              <Label className="text-xs font-medium">{field.label}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-md border bg-muted/30">
                {field.options.map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selected.includes(opt)}
                      onCheckedChange={() => toggle(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        }

        if (field.type === "combobox" && field.suggestions) {
          return (
            <ComboboxField
              key={field.id}
              label={field.label}
              value={value}
              onChange={v => onFieldChange(field.id, v)}
              suggestions={field.suggestions}
              placeholder={field.placeholder}
            />
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.id} className="space-y-1">
              <Label className="text-xs font-medium">{field.label}</Label>
              <Textarea
                value={value}
                onChange={e => onFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="min-h-[80px] text-sm"
              />
            </div>
          );
        }

        const isAuto = field.type === "auto";
        return (
          <div key={field.id} className="space-y-1">
            <Label className="text-xs font-medium">{field.label}</Label>
            <Input
              value={value}
              onChange={e => onFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              readOnly={isAuto}
              className={isAuto ? "bg-muted" : ""}
              type={field.type === "date" ? "date" : "text"}
            />
          </div>
        );
      })}
    </>
  );
}
