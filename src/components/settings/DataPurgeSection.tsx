import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PurgeItem {
  label: string;
  title: string;
  description: string;
  action: () => Promise<void>;
}

const PURGE_ITEMS: PurgeItem[] = [
  {
    label: "تفريغ جميع الدرجات",
    title: "تأكيد تفريغ جميع الدرجات",
    description: "سيتم حذف جميع الدرجات المسجلة لكل الطلاب والفصول بشكل نهائي. هل أنت متأكد؟",
    action: async () => {
      const r1 = await supabase.from("grades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r2 = await supabase.from("manual_category_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (r1.error || r2.error) {
        toast({ title: "خطأ", description: r1.error?.message || r2.error?.message, variant: "destructive" });
      } else {
        toast({ title: "تم التفريغ ✅", description: "تم حذف جميع سجلات الدرجات بنجاح" });
      }
    },
  },
  {
    label: "تفريغ جميع الحضور",
    title: "تأكيد تفريغ جميع سجلات الحضور",
    description: "سيتم حذف جميع سجلات الحضور والغياب لكل الطلاب والفصول بشكل نهائي. هل أنت متأكد؟",
    action: async () => {
      const { error } = await supabase.from("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم التفريغ ✅", description: "تم حذف جميع سجلات الحضور بنجاح" });
      }
    },
  },
  {
    label: "تفريغ سجلات السلوك",
    title: "تأكيد تفريغ سجلات السلوك",
    description: "سيتم حذف جميع سجلات السلوك (الإيجابية والسلبية) لكل الطلاب بشكل نهائي.",
    action: async () => {
      const { error } = await supabase.from("behavior_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم التفريغ ✅", description: "تم حذف جميع سجلات السلوك بنجاح" });
      }
    },
  },
  {
    label: "تفريغ الإشعارات",
    title: "تأكيد تفريغ جميع الإشعارات",
    description: "سيتم حذف جميع الإشعارات المرسلة لأولياء الأمور بشكل نهائي.",
    action: async () => {
      const { error } = await supabase.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم التفريغ ✅", description: "تم حذف جميع الإشعارات بنجاح" });
      }
    },
  },
  {
    label: "تفريغ الأنشطة والاختبارات",
    title: "تأكيد تفريغ الأنشطة والاختبارات",
    description: "سيتم حذف جميع الأنشطة والاختبارات وتسليمات الطلاب بشكل نهائي.",
    action: async () => {
      const r1 = await supabase.from("quiz_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r2 = await supabase.from("student_file_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r3 = await supabase.from("quiz_questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r4 = await supabase.from("activity_class_targets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const r5 = await supabase.from("teacher_activities").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const err = r1.error || r2.error || r3.error || r4.error || r5.error;
      if (err) {
        toast({ title: "خطأ", description: err.message, variant: "destructive" });
      } else {
        toast({ title: "تم التفريغ ✅", description: "تم حذف جميع الأنشطة والاختبارات بنجاح" });
      }
    },
  },
  {
    label: "تفريغ الإعلانات",
    title: "تأكيد تفريغ الإعلانات",
    description: "سيتم حذف جميع الإعلانات المنشورة بشكل نهائي.",
    action: async () => {
      const { error } = await supabase.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم التفريغ ✅", description: "تم حذف جميع الإعلانات بنجاح" });
      }
    },
  },
];

export default function DataPurgeSection() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {PURGE_ITEMS.map((item, i) => (
        <AlertDialog key={i}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2 h-12 rounded-xl">
              <Trash2 className="h-4 w-4" />
              {item.label}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {item.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span dangerouslySetInnerHTML={{ __html: item.description.replace(/جميع/g, '<strong>جميع</strong>') }} />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={item.action}
              >
                نعم، {item.label}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
    </div>
  );
}
