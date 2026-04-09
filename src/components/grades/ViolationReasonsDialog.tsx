import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plus, Trash2, RotateCcw } from "lucide-react";
import type { ViolationReason } from "@/hooks/useViolationReasons";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reasons: ViolationReason[];
  defaultReasons: ViolationReason[];
  onSave: (reasons: ViolationReason[]) => void;
}

export default function ViolationReasonsDialog({ open, onOpenChange, reasons, defaultReasons, onSave }: Props) {
  const [items, setItems] = useState<ViolationReason[]>(reasons);
  const [newLabel, setNewLabel] = useState("");
  const [newScore, setNewScore] = useState(1);

  React.useEffect(() => {
    if (open) setItems([...reasons]);
  }, [open, reasons]);

  const addItem = () => {
    const label = newLabel.trim();
    if (!label) return;
    setItems(prev => [...prev, { label, defaultScore: newScore }]);
    setNewLabel("");
    setNewScore(1);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLabel = (idx: number, label: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, label } : item));
  };

  const updateScore = (idx: number, score: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, defaultScore: Math.max(0, score) } : item));
  };

  const handleSave = () => {
    onSave(items);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">إدارة أسباب المخالفات</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/50">
              <Input
                value={item.label}
                onChange={(e) => updateLabel(i, e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">خصم:</span>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={item.defaultScore}
                  onChange={(e) => updateScore(i, Number(e.target.value))}
                  className="w-14 h-8 text-center text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-destructive/60 hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">لا توجد أسباب محددة</p>
          )}
        </div>

        {/* Add new */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-1 block">سبب جديد</label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="مثال: عدم إحضار الكتاب"
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
          </div>
          <div className="w-16">
            <label className="text-[10px] text-muted-foreground mb-1 block">الخصم</label>
            <Input
              type="number"
              min={0}
              max={10}
              value={newScore}
              onChange={(e) => setNewScore(Number(e.target.value))}
              className="h-8 text-center text-xs"
            />
          </div>
          <Button size="sm" variant="outline" onClick={addItem} className="h-8 gap-1">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setItems([...defaultReasons])}
            className="text-muted-foreground text-xs gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            استعادة الافتراضي
          </Button>
          <Button onClick={handleSave} size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
