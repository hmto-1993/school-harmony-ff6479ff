import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicWeek } from "@/hooks/useAcademicWeek";
import { toast } from "@/hooks/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import { MOE_PRESETS } from "../moeCalendarPresets";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  defaultAcademicYear: string;
  saving: boolean;
  onApplyPreset: (preset: typeof MOE_PRESETS[string]) => void;
}

export default function CalendarMoeTab({ defaultAcademicYear, saving, onApplyPreset }: Props) {
  const { calendarData, refetch } = useAcademicWeek();
  const [deletingPresetKey, setDeletingPresetKey] = useState<string | null>(null);

  const currentYear = defaultAcademicYear || "1447-1448";
  const currentPresets = Object.entries(MOE_PRESETS).filter(([, p]) => p.academic_year === currentYear);
  const oldPresets = Object.entries(MOE_PRESETS).filter(([, p]) => p.academic_year !== currentYear);

  return (
    <div className="space-y-3 mt-4">
      <p className="text-xs text-muted-foreground">
        اختر الفصل الدراسي لاستيراد وحفظ التقويم الأكاديمي الرسمي لوزارة التعليم السعودية تلقائياً
      </p>

      {currentPresets.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-primary font-semibold">العام الحالي ({currentYear} هـ)</Label>
          {currentPresets.map(([key, preset]) => (
            <Button
              key={key}
              variant="outline"
              className="w-full justify-between h-auto py-3 px-4 border-primary/30 bg-primary/5"
              disabled={saving}
              onClick={() => onApplyPreset(preset)}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {preset.start_date} → {preset.end_date} • {preset.total_weeks} أسبوع • {preset.holidays.length} إجازة
                </span>
              </div>
              <Badge variant="default" className="text-[10px]">{preset.academic_year} هـ</Badge>
            </Button>
          ))}
        </div>
      )}

      {oldPresets.length > 0 && (
        <div className="space-y-2 mt-4 pt-3 border-t border-dashed">
          <Label className="text-xs text-muted-foreground font-semibold">أعوام سابقة</Label>
          {oldPresets.map(([key, preset]) => (
            <div key={key} className="flex items-center gap-1">
              <Button
                variant="outline"
                className="flex-1 justify-between h-auto py-2 px-3 opacity-70 hover:opacity-100"
                disabled={saving}
                onClick={() => onApplyPreset(preset)}
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-xs font-medium">{preset.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {preset.start_date} → {preset.end_date} • {preset.total_weeks} أسبوع
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px]">{preset.academic_year} هـ</Badge>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={deletingPresetKey === key}
                  >
                    {deletingPresetKey === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف تقويم {preset.label}؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف أي تقويم محفوظ لهذا الفصل من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setDeletingPresetKey(key);
                        const { error } = await supabase
                          .from("academic_calendar").delete()
                          .eq("semester", preset.semester)
                          .eq("academic_year", preset.academic_year);
                        setDeletingPresetKey(null);
                        if (error) {
                          toast({ title: "خطأ", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "تم الحذف", description: `تم حذف تقويم ${preset.label}` });
                          await refetch();
                        }
                      }}
                    >
                      حذف التقويم
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {saving && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        * التواريخ مبنية على التقويم الدراسي المعتمد من وزارة التعليم للعام ١٤٤٦-١٤٤٧هـ و ١٤٤٧-١٤٤٨هـ
      </p>
    </div>
  );
}
