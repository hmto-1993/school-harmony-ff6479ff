import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PurgeItem {
  key: string;
  label: string;
  title: string;
  description: string;
  /** Returns count of rows that WILL be deleted */
  count: () => Promise<number>;
  /** Performs the deletion */
  action: () => Promise<void>;
}

const countTable = async (table: string): Promise<number> => {
  const { count, error } = await supabase
    .from(table as any)
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
};

const PURGE_ITEMS: PurgeItem[] = [
  {
    key: "grades",
    label: "تفريغ جميع الدرجات",
    title: "تأكيد تفريغ جميع الدرجات",
    description: "سيتم حذف جميع الدرجات المسجلة لكل الطلاب والفصول (درجات يومية + درجات يدوية) بشكل نهائي.",
    count: async () => (await countTable("grades")) + (await countTable("manual_category_scores")),
    action: async () => {
      const r1 = await supabase.from("grades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r2 = await supabase.from("manual_category_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (r1.error || r2.error) throw new Error(r1.error?.message || r2.error?.message);
    },
  },
  {
    key: "attendance",
    label: "تفريغ جميع الحضور",
    title: "تأكيد تفريغ جميع سجلات الحضور",
    description: "سيتم حذف جميع سجلات الحضور والغياب لكل الطلاب والفصول بشكل نهائي.",
    count: () => countTable("attendance_records"),
    action: async () => {
      const { error } = await supabase.from("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
  },
  {
    key: "behavior",
    label: "تفريغ سجلات السلوك",
    title: "تأكيد تفريغ سجلات السلوك",
    description: "سيتم حذف جميع سجلات السلوك (الإيجابية والسلبية) لكل الطلاب بشكل نهائي.",
    count: () => countTable("behavior_records"),
    action: async () => {
      const { error } = await supabase.from("behavior_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
  },
  {
    key: "notifications",
    label: "تفريغ الإشعارات",
    title: "تأكيد تفريغ جميع الإشعارات",
    description: "سيتم حذف جميع الإشعارات المرسلة لأولياء الأمور بشكل نهائي.",
    count: () => countTable("notifications"),
    action: async () => {
      const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
  },
  {
    key: "activities",
    label: "تفريغ الأنشطة والاختبارات",
    title: "تأكيد تفريغ الأنشطة والاختبارات",
    description: "سيتم حذف جميع الأنشطة والاختبارات وتسليمات الطلاب بشكل نهائي.",
    count: async () =>
      (await countTable("teacher_activities")) +
      (await countTable("quiz_submissions")) +
      (await countTable("student_file_submissions")),
    action: async () => {
      const r1 = await supabase.from("quiz_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r2 = await supabase.from("student_file_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r3 = await supabase.from("quiz_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r4 = await supabase.from("activity_class_targets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r5 = await supabase.from("teacher_activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const err = r1.error || r2.error || r3.error || r4.error || r5.error;
      if (err) throw err;
    },
  },
  {
    key: "announcements",
    label: "تفريغ الإعلانات",
    title: "تأكيد تفريغ الإعلانات",
    description: "سيتم حذف جميع الإعلانات المنشورة بشكل نهائي.",
    count: () => countTable("announcements"),
    action: async () => {
      const { error } = await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
  },
];

const CONFIRM_PHRASE = "أؤكد الحذف";

function PurgeDialog({ item, open, onOpenChange }: { item: PurgeItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [step, setStep] = useState(1);
  const [loadingCount, setLoadingCount] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [executing, setExecuting] = useState(false);

  const reset = () => {
    setStep(1); setCount(null); setAck1(false); setAck2(false); setPhrase(""); setExecuting(false);
  };

  const handleOpen = async (o: boolean) => {
    if (!o) { reset(); onOpenChange(false); return; }
    onOpenChange(true);
    setLoadingCount(true);
    try {
      const c = await item.count();
      setCount(c);
    } catch (e: any) {
      toast({ title: "تعذّر حساب السجلات", description: e?.message || "خطأ", variant: "destructive" });
      setCount(0);
    } finally {
      setLoadingCount(false);
    }
  };

  const execute = async () => {
    setExecuting(true);
    try {
      await item.action();
      toast({ title: "تم التفريغ ✅", description: `تم حذف ${count ?? 0} سجل بنجاح` });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "خطأ في الحذف", description: e?.message || "خطأ غير معروف", variant: "destructive" });
      setExecuting(false);
    }
  };

  const phraseOk = phrase.trim() === CONFIRM_PHRASE;
  const isEmpty = count === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            {item.title}
          </DialogTitle>
          <DialogDescription>الخطوة {step} من 3 — تأكيدات حماية متعددة قبل الحذف النهائي.</DialogDescription>
        </DialogHeader>

        {/* Step 1: count + warning */}
        {step === 1 && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>تحذير</AlertTitle>
              <AlertDescription>{item.description}</AlertDescription>
            </Alert>
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">عدد السجلات التي سيتم حذفها</p>
              {loadingCount ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-destructive" />
              ) : (
                <p className="text-4xl font-bold text-destructive tabular-nums">{(count ?? 0).toLocaleString("ar")}</p>
              )}
            </div>
            {isEmpty && !loadingCount && (
              <p className="text-sm text-emerald-600 text-center">لا توجد سجلات للحذف.</p>
            )}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
              <Checkbox id="ack1" checked={ack1} onCheckedChange={(v) => setAck1(!!v)} disabled={isEmpty} />
              <Label htmlFor="ack1" className="text-sm leading-relaxed cursor-pointer">
                أُقرّ بأن هذه العملية <strong>نهائية</strong> ولا يمكن التراجع عنها.
              </Label>
            </div>
          </div>
        )}

        {/* Step 2: second acknowledgment */}
        {step === 2 && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>تأكيد إضافي</AlertTitle>
              <AlertDescription>
                سيتم حذف <strong className="text-base">{(count ?? 0).toLocaleString("ar")}</strong> سجل من قاعدة البيانات.
                يُنصح بتصدير نسخة احتياطية قبل المتابعة.
              </AlertDescription>
            </Alert>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
              <Checkbox id="ack2" checked={ack2} onCheckedChange={(v) => setAck2(!!v)} />
              <Label htmlFor="ack2" className="text-sm leading-relaxed cursor-pointer">
                أتحمّل المسؤولية الكاملة عن هذا الإجراء، وقد قمت بأخذ نسخة احتياطية إن لزم.
              </Label>
            </div>
          </div>
        )}

        {/* Step 3: type phrase */}
        {step === 3 && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>التأكيد النهائي</AlertTitle>
              <AlertDescription>
                لإتمام حذف <strong>{(count ?? 0).toLocaleString("ar")}</strong> سجل، اكتب العبارة التالية بالضبط:
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <code className="block text-center py-2 rounded-md bg-muted font-bold text-destructive">{CONFIRM_PHRASE}</code>
              <Input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="اكتب العبارة هنا..."
                className="text-center"
                autoFocus
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-row-reverse gap-2">
          {step < 3 ? (
            <Button
              variant="destructive"
              disabled={
                loadingCount ||
                isEmpty ||
                (step === 1 && !ack1) ||
                (step === 2 && !ack2)
              }
              onClick={() => setStep(step + 1)}
            >
              متابعة
            </Button>
          ) : (
            <Button variant="destructive" disabled={!phraseOk || executing} onClick={execute}>
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف نهائي"}
            </Button>
          )}
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={executing}>
              السابق
            </Button>
          )}
          <Button variant="ghost" onClick={() => handleOpen(false)} disabled={executing}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DataPurgeSection() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {PURGE_ITEMS.map((item) => (
        <div key={item.key}>
          <Button
            variant="destructive"
            className="gap-2 h-12 rounded-xl w-full"
            onClick={() => setOpenKey(item.key)}
          >
            <Trash2 className="h-4 w-4" />
            {item.label}
          </Button>
          <PurgeDialog
            item={item}
            open={openKey === item.key}
            onOpenChange={(o) => setOpenKey(o ? item.key : null)}
          />
        </div>
      ))}
    </div>
  );
}
