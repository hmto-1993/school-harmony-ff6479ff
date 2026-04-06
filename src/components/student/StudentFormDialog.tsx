import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";

interface Props {
  mode: "add" | "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: { full_name: string; national_id: string; class_id: string; parent_phone: string };
  setForm: (f: any) => void;
  onSubmit: () => void;
  classes: { id: string; name: string }[];
}

export default function StudentFormDialog({ mode, open, onOpenChange, form, setForm, onSubmit, classes }: Props) {
  const isEdit = mode === "edit";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button><Plus className="h-4 w-4 ml-2" />إضافة طالب</Button>
        </DialogTrigger>
      )}
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <><Pencil className="h-5 w-5" />تعديل بيانات الطالب</> : "إضافة طالب جديد"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>الاسم الكامل *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>رقم الهوية الوطنية</Label>
            <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>الفصل</Label>
            <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
              <SelectTrigger><SelectValue placeholder="اختر الفصل" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>رقم جوال ولي الأمر</Label>
            <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} dir="ltr" />
          </div>
          <Button onClick={onSubmit} className="w-full">{isEdit ? "حفظ التعديلات" : "إضافة"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
