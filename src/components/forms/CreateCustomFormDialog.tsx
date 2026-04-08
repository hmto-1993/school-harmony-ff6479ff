import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface CustomField {
  id: string;
  label: string;
  type: "text" | "textarea" | "static";
  placeholder: string;
}

const FORM_ICONS = ["📄", "📝", "📋", "📑", "📌", "📎", "🔖", "📐", "🧾", "📊", "🎓", "🏆", "⭐", "✅"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionTitle: string;
  onSubmit: (data: {
    title: string;
    description: string;
    icon: string;
    body_template: string;
    fields: CustomField[];
    signature_enabled: boolean;
    signature_labels: string[];
    include_auto_fields: boolean;
  }) => Promise<void>;
}

export default function CreateCustomFormDialog({ open, onOpenChange, sectionTitle, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📄");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [fields, setFields] = useState<CustomField[]>([]);
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  const [sigLabels, setSigLabels] = useState("توقيع الطالب, توقيع المعلم");
  const [includeAutoFields, setIncludeAutoFields] = useState(true);
  const [saving, setSaving] = useState(false);

  const addField = () => {
    setFields(prev => [...prev, {
      id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: "",
      type: "text",
      placeholder: "",
    }]);
  };

  const updateField = (idx: number, key: keyof CustomField, val: string) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: val } : f));
  };

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("يرجى إدخال عنوان النموذج"); return; }
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        icon,
        body_template: bodyTemplate,
        fields: fields.filter(f => f.label.trim()),
        signature_enabled: signatureEnabled,
        signature_labels: sigLabels.split(",").map(s => s.trim()).filter(Boolean),
        include_auto_fields: includeAutoFields,
      });
      toast.success("تم إنشاء النموذج بنجاح");
      // Reset
      setTitle(""); setDescription(""); setIcon("📄"); setBodyTemplate("");
      setFields([]); setSignatureEnabled(true); setSigLabels("توقيع الطالب, توقيع المعلم");
      setIncludeAutoFields(true);
      onOpenChange(false);
    } catch { toast.error("فشل إنشاء النموذج"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>إنشاء نموذج جديد</DialogTitle>
          <DialogDescription>في قسم: {sectionTitle}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 py-2">
            {/* Icon */}
            <div className="space-y-1.5">
              <Label className="text-xs">الأيقونة</Label>
              <div className="flex flex-wrap gap-1.5">
                {FORM_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={`text-lg p-1.5 rounded-lg border-2 transition-all ${icon === ic ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                  >{ic}</button>
                ))}
              </div>
            </div>

            {/* Title & Description */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">عنوان النموذج *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: نموذج متابعة أسبوعي" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">وصف مختصر</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف مختصر يظهر في البطاقة" />
              </div>
            </div>

            {/* Auto fields toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">تضمين البيانات التلقائية</p>
                <p className="text-[11px] text-muted-foreground">سحب اسم الطالب، الفصل، الهوية، التاريخ تلقائياً</p>
              </div>
              <Switch checked={includeAutoFields} onCheckedChange={setIncludeAutoFields} />
            </div>

            {/* Body template */}
            <div className="space-y-1">
              <Label className="text-xs">نص النموذج (الديباجة الرسمية)</Label>
              <Textarea
                value={bodyTemplate}
                onChange={e => setBodyTemplate(e.target.value)}
                placeholder="اكتب النص الرسمي هنا... استخدم {student_name} و {class_name} و {national_id} و {date} كمتغيرات تلقائية"
                className="min-h-[100px] text-sm"
                dir="rtl"
              />
              <div className="flex flex-wrap gap-1">
                {["{student_name}", "{class_name}", "{national_id}", "{date}"].map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                    onClick={() => setBodyTemplate(prev => prev + " " + tag)}
                  >{tag}</Badge>
                ))}
              </div>
            </div>

            {/* Custom fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">حقول الإدخال المخصصة</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addField}>
                  <Plus className="h-3 w-3" /> إضافة حقل
                </Button>
              </div>
              {fields.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                  لم تضف حقولاً بعد — اضغط "إضافة حقل" لإنشاء حقل إدخال
                </p>
              )}
              {fields.map((field, idx) => (
                <div key={field.id} className="flex items-start gap-2 border rounded-lg p-2.5 bg-muted/30">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input value={field.label} onChange={e => updateField(idx, "label", e.target.value)}
                        placeholder="اسم الحقل" className="text-xs h-8" />
                      <Select value={field.type} onValueChange={v => updateField(idx, "type", v)}>
                        <SelectTrigger className="w-[110px] text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">نص قصير</SelectItem>
                          <SelectItem value="textarea">نص طويل</SelectItem>
                          <SelectItem value="static">نص ثابت</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input value={field.placeholder} onChange={e => updateField(idx, "placeholder", e.target.value)}
                      placeholder="نص توضيحي (اختياري)" className="text-xs h-7" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => removeField(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">التوقيع الإلكتروني</p>
                <Switch checked={signatureEnabled} onCheckedChange={setSignatureEnabled} />
              </div>
              {signatureEnabled && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">تسميات التوقيع (مفصولة بفاصلة)</Label>
                  <Input value={sigLabels} onChange={e => setSigLabels(e.target.value)} className="text-xs h-8" placeholder="توقيع الطالب, توقيع المعلم" />
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "جارٍ الإنشاء..." : "إنشاء النموذج"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
