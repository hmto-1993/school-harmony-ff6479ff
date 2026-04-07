import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Save, X, Check, RotateCcw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SettingsData } from "./settings-types";

export function CalendarYearCard({ s }: { s: SettingsData }) {
  if (s.activeCard !== "calendar_year" || !s.isAdmin) return null;

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            التقويم والعام الدراسي
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">🗓️ نوع التقويم الافتراضي</h3>
          <p className="text-xs text-muted-foreground">يُستخدم في جميع صفحات التحضير والدرجات والتقارير.</p>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {[
              { value: "gregorian" as const, label: "ميلادي", sub: "Gregorian", emoji: "🌍" },
              { value: "hijri" as const, label: "هجري", sub: "Hijri (أم القرى)", emoji: "🕌" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => s.setGlobalCalendarType(opt.value)}
                className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200",
                  s.calendarTypeLocal === opt.value
                    ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                    : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/50"
                )}>
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-sm font-bold text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground">{opt.sub}</span>
                {s.calendarTypeLocal === opt.value && (
                  <Badge variant="default" className="text-[10px] px-2 py-0">
                    <Check className="h-3 w-3 ml-1" />
                    مُفعّل
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="h-px bg-border/50" />
        <div className="space-y-3 max-w-md">
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">🎓 العام الدراسي الافتراضي</h3>
          <p className="text-xs text-muted-foreground">يُستخدم عند إنشاء فصول جديدة.</p>
          <div className="space-y-2">
            <Label>العام الدراسي</Label>
            <Input value={s.defaultAcademicYear} onChange={(e) => s.setDefaultAcademicYear(e.target.value)} placeholder="مثال: 1446-1447" dir="ltr" className="text-center text-lg font-bold" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["1445-1446", "1446-1447", "1447-1448", "1448-1449"].map((yr) => (
              <button key={yr} onClick={() => s.setDefaultAcademicYear(yr)}
                className={cn("px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all duration-200",
                  s.defaultAcademicYear === yr ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30"
                )}>{yr}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button disabled={s.savingAcademicYear || !s.defaultAcademicYear.trim()} className="gap-1.5"
              onClick={async () => {
                s.setSavingAcademicYear(true);
                const { error } = await supabase.from("site_settings").upsert({ id: "default_academic_year", value: s.defaultAcademicYear }, { onConflict: "id" });
                s.setSavingAcademicYear(false);
                if (error) {
                  toast({ title: "خطأ", description: "فشل حفظ العام الدراسي", variant: "destructive" });
                } else {
                  s.setNewYear(s.defaultAcademicYear);
                  toast({ title: "تم الحفظ", description: `العام الدراسي الافتراضي: ${s.defaultAcademicYear}` });
                }
              }}>
              <Save className="h-4 w-4" />
              {s.savingAcademicYear ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                  <RotateCcw className="h-4 w-4" />
                  تحديث جميع الفصول ({s.classes.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>تحديث العام الدراسي لجميع الفصول؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم تحديث العام الدراسي لجميع الفصول ({s.classes.length} فصل) إلى "{s.defaultAcademicYear}". هل أنت متأكد؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    const updates = s.classes.map(cls =>
                      supabase.from("classes").update({ academic_year: s.defaultAcademicYear }).eq("id", cls.id)
                    );
                    const results = await Promise.all(updates);
                    if (results.some(r => r.error)) {
                      toast({ title: "خطأ", description: "فشل تحديث بعض الفصول", variant: "destructive" });
                    } else {
                      toast({ title: "تم التحديث", description: `تم تحديث ${s.classes.length} فصل إلى ${s.defaultAcademicYear}` });
                      s.fetchData();
                    }
                  }}>تحديث الكل</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
