/**
 * DataPurgeSettings — تفريغ البيانات (حذف جماعي)
 * إجراءات خطيرة لحذف جميع الدرجات أو سجلات الحضور
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, AlertTriangle, ChevronDown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function DataPurgeSettings() {
  const purgeTable = async (table: "grades" | "attendance_records", label: string) => {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التفريغ ✅", description: `تم حذف جميع سجلات ${label} بنجاح` });
    }
  };

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden border-destructive/20">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/20 text-white">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">تفريغ البيانات</h3>
                <p className="text-xs text-muted-foreground">حذف جميع سجلات الدرجات أو الحضور</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-4">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>تحذير: هذه العمليات لا يمكن التراجع عنها. تأكد قبل المتابعة.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { table: "grades" as const, label: "الدرجات", title: "تأكيد تفريغ جميع الدرجات", desc: "سيتم حذف جميع سجلات الدرجات لكل الطلاب والفصول بشكل نهائي." },
                { table: "attendance_records" as const, label: "الحضور", title: "تأكيد تفريغ جميع سجلات الحضور", desc: "سيتم حذف جميع سجلات الحضور والغياب لكل الطلاب والفصول بشكل نهائي." },
              ].map((item) => (
                <AlertDialog key={item.table}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2 h-12 rounded-xl">
                      <Trash2 className="h-4 w-4" />
                      تفريغ جميع {item.label}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        {item.title}
                      </AlertDialogTitle>
                      <AlertDialogDescription>{item.desc} هل أنت متأكد؟</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row-reverse gap-2">
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => purgeTable(item.table, item.label)}
                      >
                        نعم، تفريغ {item.label}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
