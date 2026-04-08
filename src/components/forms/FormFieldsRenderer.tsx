import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { FormField } from "./form-templates";
import ComboboxField from "./ComboboxField";

interface Props {
  fields: FormField[];
  fieldValues: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
}

export default function FormFieldsRenderer({ fields, fieldValues, onFieldChange }: Props) {
  const visibleFields = fields.filter(f => f.type !== "auto" && !f.hidden);

  return (
    <>
      {visibleFields.map(field => {
        const value = fieldValues[field.id] || "";

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
