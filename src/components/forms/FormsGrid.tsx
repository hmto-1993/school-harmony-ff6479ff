import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formTemplates, categoryLabels, type FormTemplate } from "./form-templates";

interface Props {
  onSelect: (form: FormTemplate) => void;
}

const categories = ["general", "behavior", "confidential"] as const;

export default function FormsGrid({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory
    ? formTemplates.filter((f) => f.category === activeCategory)
    : formTemplates;

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
            !activeCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:bg-secondary"
          )}
        >
          الكل ({formTemplates.length})
        </button>
        {categories.map((cat) => {
          const info = categoryLabels[cat];
          const count = formTemplates.filter((f) => f.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                activeCategory === cat
                  ? "text-primary-foreground border-transparent"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              )}
              style={activeCategory === cat ? { backgroundColor: info.color, borderColor: info.color } : {}}
            >
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((form) => {
          const catInfo = categoryLabels[form.category];
          return (
            <Card
              key={form.id}
              className={cn(
                "cursor-pointer group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-2",
                form.confidentialWatermark
                  ? "border-destructive/20 hover:border-destructive/40 bg-destructive/[0.02]"
                  : "border-transparent hover:border-primary/30"
              )}
              onClick={() => onSelect(form)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{form.icon}</span>
                  <div className="flex gap-1">
                    {form.confidentialWatermark && (
                      <Badge variant="destructive" className="text-[9px] px-1.5">سري</Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold"
                      style={{ borderColor: catInfo.color, color: catInfo.color }}
                    >
                      {catInfo.label}
                    </Badge>
                  </div>
                </div>
                <h3 className={cn(
                  "font-bold text-sm transition-colors leading-tight",
                  form.confidentialWatermark
                    ? "text-destructive group-hover:text-destructive/80"
                    : "text-foreground group-hover:text-primary"
                )}>
                  {form.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
