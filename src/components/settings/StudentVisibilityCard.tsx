import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, GraduationCap, Users, Trophy, X, Save, RotateCcw, Check, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import EvaluationToggles from "@/components/settings/EvaluationToggles";
import type { SettingsData } from "./settings-types";

export function StudentVisibilityCard({ s }: { s: SettingsData }) {
  if (s.activeCard !== "visibility" || !s.isAdmin) return null;

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-primary" />
            التحكم بعرض بيانات الطالب
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
            <h4 className="text-sm font-bold mb-2">👁️ الأقسام المعروضة</h4>
            <div className="space-y-1.5">
              {[
                { key: "grades" as const, label: "الدرجات", icon: GraduationCap, state: s.showGrades, setter: s.setShowGrades },
                { key: "attendance" as const, label: "الحضور والغياب", icon: Users, state: s.showAttendance, setter: s.setShowAttendance },
                { key: "behavior" as const, label: "السلوك", icon: Eye, state: s.showBehavior, setter: s.setShowBehavior },
              ].map((item) => (
                <button key={item.key} onClick={() => item.setter(!item.state)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all text-right",
                    item.state ? "border-success/40 bg-success/10 text-success" : "border-border/40 bg-muted/30 text-muted-foreground"
                  )}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.state ? <Eye className="h-3 w-3 shrink-0" /> : <EyeOff className="h-3 w-3 shrink-0" />}
                  <span className="text-[10px]">{item.state ? "ظاهر" : "مخفي"}</span>
                </button>
              ))}
            </div>
          </div>
          <EvaluationToggles
            showDailyGrades={s.studentShowDailyGrades}
            setShowDailyGrades={s.setStudentShowDailyGrades}
            showClassworkIcons={s.studentShowClassworkIcons}
            setShowClassworkIcons={s.setStudentShowClassworkIcons}
            classworkIconsCount={s.studentClassworkIconsCount}
            setClassworkIconsCount={s.setStudentClassworkIconsCount}
          />
        </div>

        {s.showGrades && (() => {
          const uniqueNames = Array.from(new Set(s.categories.map(c => c.name)));
          if (uniqueNames.length === 0) return null;
          const currentHidden = s.hiddenCategories[s.visibilityPeriod];
          return (
            <Collapsible defaultOpen className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/20 transition-colors">
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  فئات التقييم المعروضة
                </h4>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 bg-muted/50 rounded-md p-0.5 flex-1">
                    {([{ key: "p1" as const, label: "الفترة الأولى" }, { key: "p2" as const, label: "الفترة الثانية" }]).map(p => (
                      <button key={p.key} onClick={() => s.setVisibilityPeriod(p.key)}
                        className={cn("flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-bold transition-all",
                          s.visibilityPeriod === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}>
                        {p.label}
                        {s.hiddenCategories[p.key].length > 0 && (
                          <span className="text-[9px] bg-destructive/20 text-destructive px-1 rounded-full">{s.hiddenCategories[p.key].length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-[10px] h-7 shrink-0"
                    onClick={() => {
                      const source = s.hiddenCategories[s.visibilityPeriod];
                      const targetPeriod = s.visibilityPeriod === "p1" ? "p2" : "p1";
                      s.setHiddenCategories(prev => ({ ...prev, [targetPeriod]: [...source] }));
                      toast({ title: "تم النسخ", description: "تم تطبيق على الفترتين" });
                    }}>
                    <Check className="h-3 w-3" />
                    للفترتين
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-auto">
                  {uniqueNames.map(name => {
                    const isHidden = currentHidden.includes(name);
                    return (
                      <button key={name}
                        onClick={() => {
                          s.setHiddenCategories(prev => ({
                            ...prev,
                            [s.visibilityPeriod]: isHidden
                              ? prev[s.visibilityPeriod].filter(n => n !== name)
                              : [...prev[s.visibilityPeriod], name]
                          }));
                        }}
                        className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-all",
                          isHidden ? "bg-destructive/10 text-destructive border-destructive/30 line-through" : "bg-success/10 text-success border-success/30"
                        )}>
                        {isHidden ? <EyeOff className="inline h-2.5 w-2.5 ml-0.5" /> : <Eye className="inline h-2.5 w-2.5 ml-0.5" />}
                        {name}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })()}

        <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <div>
              <h4 className="text-sm font-bold">لوحة الشرف</h4>
              <p className="text-[10px] text-muted-foreground">عرض الطلاب المتميزين (انتظام كامل + درجة كاملة)</p>
            </div>
          </div>
          <Button
            variant={s.honorRollEnabled ? "default" : "outline"}
            size="sm"
            className={cn("gap-1.5 min-w-[90px]", s.honorRollEnabled && "bg-amber-500 hover:bg-amber-600 text-amber-950")}
            disabled={s.savingHonorRoll}
            onClick={async () => {
              s.setSavingHonorRoll(true);
              const newVal = !s.honorRollEnabled;
              await supabase.from("site_settings").upsert({ id: "honor_roll_enabled", value: String(newVal) });
              s.setHonorRollEnabled(newVal);
              s.setSavingHonorRoll(false);
              toast({ title: newVal ? "تم التفعيل" : "تم التعطيل", description: newVal ? "لوحة الشرف مرئية للطلاب" : "تم إخفاء لوحة الشرف" });
            }}>
            {s.honorRollEnabled ? <><Eye className="h-3.5 w-3.5" /> مفعّلة</> : <><EyeOff className="h-3.5 w-3.5" /> معطّلة</>}
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button disabled={s.savingVisibility} className="gap-1.5"
            onClick={async () => {
              s.setSavingVisibility(true);
              const results = await Promise.all([
                supabase.from("site_settings").upsert({ id: "student_show_grades", value: String(s.showGrades) }),
                supabase.from("site_settings").upsert({ id: "student_show_attendance", value: String(s.showAttendance) }),
                supabase.from("site_settings").upsert({ id: "student_show_behavior", value: String(s.showBehavior) }),
                supabase.from("site_settings").upsert({ id: "student_hidden_categories", value: JSON.stringify(s.hiddenCategories) }),
                supabase.from("site_settings").upsert({ id: "student_show_daily_grades", value: String(s.studentShowDailyGrades) }),
                supabase.from("site_settings").upsert({ id: "student_show_classwork_icons", value: String(s.studentShowClassworkIcons) }),
                supabase.from("site_settings").upsert({ id: "student_classwork_icons_count", value: String(s.studentClassworkIconsCount) }),
              ]);
              s.setSavingVisibility(false);
              if (results.some(r => r.error)) {
                toast({ title: "خطأ", description: "فشل حفظ إعدادات العرض", variant: "destructive" });
              } else {
                toast({ title: "تم الحفظ", description: "تم تحديث إعدادات عرض الطالب" });
              }
            }}>
            <Save className="h-4 w-4" />
            {s.savingVisibility ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
          <Button variant="outline" className="gap-1.5 text-xs"
            onClick={() => {
              s.setShowGrades(true); s.setShowAttendance(true); s.setShowBehavior(true);
              s.setHiddenCategories({ p1: [], p2: [] });
              s.setStudentShowDailyGrades(true); s.setStudentShowClassworkIcons(true); s.setStudentClassworkIconsCount(10);
              toast({ title: "تم الاستعادة", description: "تم استعادة الإعدادات الافتراضية — اضغط حفظ لتأكيدها" });
            }}>
            <RotateCcw className="h-3.5 w-3.5" />
            استعادة الافتراضي
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
