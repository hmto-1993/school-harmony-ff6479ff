import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, GraduationCap, Users, Trophy, X, Save, RotateCcw, Check, ChevronDown, Layers, BookOpen, AlertTriangle, Hash, MessageSquareText } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
                { key: "grades", label: "الدرجات", icon: GraduationCap, state: s.showGrades, setter: s.setShowGrades },
                { key: "attendance", label: "الحضور والغياب", icon: Users, state: s.showAttendance, setter: s.setShowAttendance },
                { key: "behavior", label: "السلوك", icon: Eye, state: s.showBehavior, setter: s.setShowBehavior },
                { key: "activities", label: "الأنشطة", icon: Layers, state: s.studentShowActivities, setter: s.setStudentShowActivities },
                { key: "library", label: "المكتبة التعليمية", icon: BookOpen, state: s.studentShowLibrary, setter: s.setStudentShowLibrary },
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
          <div className="space-y-4">
            <EvaluationToggles
              showDailyGrades={s.studentShowDailyGrades}
              setShowDailyGrades={s.setStudentShowDailyGrades}
              showClassworkIcons={s.studentShowClassworkIcons}
              setShowClassworkIcons={s.setStudentShowClassworkIcons}
              classworkIconsCount={s.studentClassworkIconsCount}
              setClassworkIconsCount={s.setStudentClassworkIconsCount}
              showDeductions={s.studentShowDeductions}
              setShowDeductions={s.setStudentShowDeductions}
            />
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-2">
              <h4 className="text-sm font-bold mb-2">🔧 عناصر إضافية</h4>
              <div className="space-y-1.5">
                {[
                  { key: "nationalId", label: "رقم الهوية الوطنية", icon: Hash, state: s.studentShowNationalId, setter: s.setStudentShowNationalId },
                  { key: "honorRoll", label: "لوحة الشرف", icon: Trophy, state: s.studentShowHonorRoll, setter: s.setStudentShowHonorRoll },
                  { key: "absenceWarning", label: "إنذارات الغياب", icon: AlertTriangle, state: s.studentShowAbsenceWarning, setter: s.setStudentShowAbsenceWarning },
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
          </div>
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

        {/* Student Welcome Message */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-1.5">
              <MessageSquareText className="h-4 w-4 text-primary" />
              رسالة ترحيبية للطالب
            </h4>
            <Switch checked={s.studentWelcomeEnabled} onCheckedChange={s.setStudentWelcomeEnabled} />
          </div>
          {s.studentWelcomeEnabled && (
            <div className="space-y-2">
              <Textarea
                value={s.studentWelcomeMessage}
                onChange={(e) => s.setStudentWelcomeMessage(e.target.value)}
                placeholder="مرحباً بك {name}.. نتمنى لك يوماً دراسياً مميزاً!"
                className="text-sm min-h-[60px] resize-none"
                dir="rtl"
              />
              <p className="text-[10px] text-muted-foreground">استخدم <code className="bg-muted px-1 rounded">{"{name}"}</code> لإدراج اسم الطالب تلقائياً</p>
            </div>
          )}
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
                supabase.from("site_settings").upsert({ id: "student_show_activities", value: String(s.studentShowActivities) }),
                supabase.from("site_settings").upsert({ id: "student_show_library", value: String(s.studentShowLibrary) }),
                supabase.from("site_settings").upsert({ id: "student_show_honor_roll", value: String(s.studentShowHonorRoll) }),
                supabase.from("site_settings").upsert({ id: "student_show_absence_warning", value: String(s.studentShowAbsenceWarning) }),
                supabase.from("site_settings").upsert({ id: "student_show_national_id", value: String(s.studentShowNationalId) }),
                supabase.from("site_settings").upsert({ id: "student_show_deductions", value: String(s.studentShowDeductions) }),
                supabase.from("site_settings").upsert({ id: "student_welcome_enabled", value: String(s.studentWelcomeEnabled) }),
                supabase.from("site_settings").upsert({ id: "student_welcome_message", value: s.studentWelcomeMessage }),
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
              s.setStudentShowActivities(true); s.setStudentShowLibrary(true);
              s.setStudentShowHonorRoll(true); s.setStudentShowAbsenceWarning(true); s.setStudentShowNationalId(true);
              s.setStudentShowDeductions(true);
              s.setStudentWelcomeEnabled(false); s.setStudentWelcomeMessage("مرحباً بك {name}.. نتمنى لك يوماً دراسياً مميزاً!");
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
