import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ICON_OPTIONS = ["📁", "📋", "📌", "📎", "🗂️", "📑", "📂", "🏷️", "⚙️", "🎯", "📐", "🧪", "📊", "🔬"];
const COLOR_OPTIONS = [
  "hsl(210, 60%, 50%)", "hsl(160, 60%, 45%)", "hsl(280, 55%, 55%)",
  "hsl(340, 65%, 50%)", "hsl(30, 80%, 55%)", "hsl(190, 70%, 45%)",
  "hsl(45, 85%, 50%)", "hsl(0, 65%, 50%)",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, icon: string, color: string) => Promise<void>;
}

export default function CreateSectionDialog({ open, onOpenChange, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📁");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("يرجى إدخال اسم القسم"); return; }
    setSaving(true);
    try {
      await onSubmit(title.trim(), icon, color);
      toast.success("تم إنشاء القسم بنجاح");
      setTitle(""); setIcon("📁"); setColor(COLOR_OPTIONS[0]);
      onOpenChange(false);
    } catch { toast.error("فشل إنشاء القسم"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة بطاقة جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">اسم القسم</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: نماذج مخصصة" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الأيقونة</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`text-xl p-2 rounded-lg border-2 transition-all ${icon === ic ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">اللون</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110 ring-2 ring-offset-2 ring-primary" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "جارٍ الإنشاء..." : "إنشاء القسم"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
