import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon, Plus, Trash2, Save, GraduationCap, Users,
  Eye, EyeOff, UserCircle, KeyRound, Printer, Upload, Download,
  FileSpreadsheet, Pencil, Check, X, MessageSquare, Megaphone,
  ChevronDown, ArrowUp, ArrowDown, Palette, History, RotateCcw,
  CalendarDays, ClipboardCheck, Lock, LockOpen, Trophy, Crown,
  AlertTriangle, Heart, ClipboardList, Table2,
} from "lucide-react";
import PrintHeaderEditor from "@/components/settings/PrintHeaderEditor";
import AcademicCalendarSettings from "@/components/dashboard/AcademicCalendarSettings";
import LessonPlanSettings from "@/components/settings/LessonPlanSettings";
import WhatsAppTemplatesSettings from "@/components/settings/WhatsAppTemplatesSettings";
import TimetableEditor from "@/components/settings/TimetableEditor";
import BehaviorSuggestionsSettings from "@/components/settings/BehaviorSuggestionsSettings";
import TeacherManagementCard from "@/components/settings/TeacherManagementCard";
import StaffLoginHistory from "@/components/settings/StaffLoginHistory";
import DataPurgeSection from "@/components/settings/DataPurgeSection";
import CollapsibleSettingsCard from "@/components/settings/CollapsibleSettingsCard";
import { QUIZ_COLOR_OPTIONS } from "@/hooks/use-quiz-colors";
import { useSettingsData } from "@/hooks/useSettingsData";

// Extracted card components
import { ClassesSettingsCard } from "@/components/settings/ClassesSettingsCard";
import { CategoriesSettingsCard } from "@/components/settings/CategoriesSettingsCard";
import { StudentVisibilityCard } from "@/components/settings/StudentVisibilityCard";
import { PopupSettingsCard } from "@/components/settings/PopupSettingsCard";
import { CalendarYearCard } from "@/components/settings/CalendarYearCard";
import { AttendanceSettingsCard } from "@/components/settings/AttendanceSettingsCard";
import { ParentPortalCard } from "@/components/settings/ParentPortalCard";

export default function SettingsPage() {
  const s = useSettingsData();

  if (s.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">الإعدادات</h1>
          <p className="text-muted-foreground">
            {s.isAdmin ? "إدارة الفصول وفئات التقييم" : "عرض إحصائيات الفصول والتقييمات"}
          </p>
        </div>
        {!s.isAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            للاطلاع فقط
          </span>
        )}
      </div>

      {/* ===== البطاقات الرئيسية ===== */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gradient-to-l from-primary/40 to-transparent" />
        <h2 className="text-sm font-bold text-primary tracking-wide">⚙️ الإعدادات الأساسية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "classes", icon: Users, label: "الفصول الدراسية", desc: `${s.classes.length} فصل`, gradient: "from-sky-500 to-blue-600", shadow: "shadow-sky-500/20" },
          { key: "categories", icon: GraduationCap, label: "فئات التقييم", desc: `${s.categories.length} فئة`, gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/20" },
          { key: "print", icon: Printer, label: "ورقة الطباعة والتصدير", desc: "ترويسة وتنسيق مشترك", gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/20", adminOnly: true },
          { key: "colors", icon: Palette, label: "ألوان الاختبارات", desc: "تخصيص الألوان", gradient: "", shadow: "", customBg: "linear-gradient(135deg, #0ea5e9, #f59e0b, #14b8a6)", adminOnly: true },
          { key: "visibility", icon: Eye, label: "عرض الطالب", desc: s.honorRollEnabled ? "لوحة الشرف مفعّلة" : "التحكم بالبيانات", gradient: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/20", adminOnly: true },
          { key: "popup", icon: Megaphone, label: "رسالة منبثقة", desc: s.popupEnabled ? (s.popupRepeat === "daily" ? "مفعّلة · يومياً" : s.popupRepeat === "weekly" ? "مفعّلة · أسبوعياً" : "مفعّلة · مرة واحدة") : "معطّلة", gradient: "from-orange-500 to-amber-600", shadow: "shadow-orange-500/20", adminOnly: true },
          { key: "calendar_year", icon: CalendarDays, label: "التقويم والعام الدراسي", desc: `${s.calendarTypeLocal === "hijri" ? "هجري" : "ميلادي"} · ${s.defaultAcademicYear}`, gradient: "from-rose-500 to-pink-600", shadow: "shadow-rose-500/20", adminOnly: true },
          { key: "academic_calendar", icon: CalendarDays, label: "التقويم الأكاديمي", desc: "الأسابيع والاختبارات", gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/20", adminOnly: true },
          { key: "attendance_settings", icon: ClipboardCheck, label: "إعدادات التحضير", desc: `${s.attendanceOverrideLock ? "القفل معطّل" : "قفل تلقائي"} · حد الإنذار: ${s.absenceMode === "sessions" && s.absenceAllowedSessions > 0 ? `${s.absenceAllowedSessions} حصة` : `${s.absenceThreshold}%`}`, gradient: "from-teal-500 to-emerald-600", shadow: "shadow-teal-500/20", adminOnly: true },
          { key: "parent_portal", icon: Heart, label: "بوابة ولي الأمر", desc: s.parentWelcomeEnabled ? "مفعّلة" : "معطّلة", gradient: "from-pink-500 to-rose-600", shadow: "shadow-pink-500/20", adminOnly: true },
          { key: "lesson_plans", icon: CalendarDays, label: "خطة الدروس", desc: "تخطيط الحصص الأسبوعية", gradient: "from-indigo-500 to-blue-600", shadow: "shadow-indigo-500/20", adminOnly: false },
          { key: "timetable", icon: Table2, label: "جدول الحصص", desc: "تصميم الجدول الأسبوعي", gradient: "from-sky-500 to-cyan-600", shadow: "shadow-sky-500/20", adminOnly: false },
          { key: "behavior_suggestions", icon: Heart, label: "وصف السلوك", desc: "مقترحات وصف السلوك", gradient: "from-green-500 to-emerald-600", shadow: "shadow-green-500/20", adminOnly: true },
        ].filter(c => !c.adminOnly || s.isAdmin).map((card) => (
          <button
            key={card.key}
            onClick={() => s.setActiveCard(s.activeCard === card.key ? null : card.key)}
            className={cn(
              "relative flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 transition-all duration-300 text-center group",
              s.activeCard === card.key
                ? "border-primary bg-primary/5 shadow-xl scale-[1.02]"
                : "border-border/50 bg-card/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-primary/30 hover:scale-[1.01]"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center h-12 w-12 rounded-xl shadow-lg text-white transition-transform duration-300 group-hover:scale-110",
                !card.customBg && `bg-gradient-to-br ${card.gradient} ${card.shadow}`
              )}
              style={card.customBg ? { background: card.customBg } : undefined}
            >
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{card.label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              {card.key === "popup" && s.popupCountdown && (
                <div className={cn(
                  "mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                  s.popupCountdown === "منتهية" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                )}>
                  ⏱ {s.popupCountdown === "منتهية" ? "منتهية الصلاحية" : `متبقي: ${s.popupCountdown}`}
                </div>
              )}
            </div>
            {s.activeCard === card.key && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card border-b-2 border-r-2 border-primary" />
            )}
          </button>
        ))}
      </div>

      {/* ===== Extracted Card Components ===== */}
      <ClassesSettingsCard s={s} />
      <CategoriesSettingsCard s={s} />
      <StudentVisibilityCard s={s} />
      <PopupSettingsCard s={s} />
      <CalendarYearCard s={s} />
      <AttendanceSettingsCard s={s} />
      <ParentPortalCard s={s} />

      {/* ===== Inline Small Cards ===== */}
      {s.activeCard === "print" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Printer className="h-5 w-5 text-primary" />ورقة الطباعة والتصدير</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><PrintHeaderEditor /></CardContent>
        </Card>
      )}

      {s.activeCard === "colors" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Palette className="h-5 w-5 text-primary" />ألوان الاختبارات</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "لون أسئلة الاختيار من متعدد", value: s.quizColorMcq, setter: s.setQuizColorMcq },
                { label: "لون أسئلة الصح والخطأ", value: s.quizColorTf, setter: s.setQuizColorTf },
                { label: "لون الإجابة المختارة", value: s.quizColorSelected, setter: s.setQuizColorSelected },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <Label className="text-sm font-semibold">{item.label}</Label>
                  <div className="flex flex-wrap gap-2">
                    {QUIZ_COLOR_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => item.setter(opt.value)}
                        className={cn("w-9 h-9 rounded-xl border-2 transition-all hover:scale-110",
                          item.value === opt.value ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                        )} style={{ backgroundColor: opt.value }} title={opt.label} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: item.value }} />
                    <span className="text-xs text-muted-foreground">المحدد: {QUIZ_COLOR_OPTIONS.find(o => o.value === item.value)?.label || item.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-semibold mb-2">معاينة:</p>
              <div className="flex gap-3">
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: s.quizColorMcq }}>اختياري</div>
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: s.quizColorTf }}>صح/خطأ</div>
                <div className="flex-1 rounded-lg p-3 text-center text-xs font-bold text-white" style={{ backgroundColor: s.quizColorSelected }}>الإجابة</div>
              </div>
            </div>
            <Button disabled={s.savingQuizColors} className="gap-1.5"
              onClick={async () => {
                s.setSavingQuizColors(true);
                const results = await Promise.all([
                  supabase.from("site_settings").upsert({ id: "quiz_color_mcq", value: s.quizColorMcq }),
                  supabase.from("site_settings").upsert({ id: "quiz_color_tf", value: s.quizColorTf }),
                  supabase.from("site_settings").upsert({ id: "quiz_color_selected", value: s.quizColorSelected }),
                ]);
                s.setSavingQuizColors(false);
                if (results.some(r => r.error)) { toast({ title: "خطأ", description: "فشل حفظ ألوان الاختبارات", variant: "destructive" }); }
                else { toast({ title: "تم الحفظ", description: "تم تحديث ألوان الاختبارات بنجاح" }); }
              }}>
              <Save className="h-4 w-4" />{s.savingQuizColors ? "جارٍ الحفظ..." : "حفظ الألوان"}
            </Button>
          </CardContent>
        </Card>
      )}

      {s.activeCard === "academic_calendar" && s.isAdmin && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" />التقويم الأكاديمي</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><AcademicCalendarSettings onClose={() => s.setActiveCard(null)} /></CardContent>
        </Card>
      )}

      {s.activeCard === "lesson_plans" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" />خطة الدروس الأسبوعية</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><LessonPlanSettings classes={s.classes.map((c) => ({ id: c.id, name: c.name }))} /></CardContent>
        </Card>
      )}

      {s.activeCard === "timetable" && (
        <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><Table2 className="h-5 w-5 text-primary" />جدول الحصص الأسبوعي</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent><TimetableEditor classes={s.classes.map(c => ({ id: c.id, name: c.name }))} /></CardContent>
        </Card>
      )}

      {s.activeCard === "behavior_suggestions" && s.isAdmin && (
        <BehaviorSuggestionsSettings onClose={() => s.setActiveCard(null)} />
      )}

      {/* ===== إعدادات إضافية ===== */}
      <div className="flex items-center gap-3 mb-2 mt-6">
        <div className="h-px flex-1 bg-gradient-to-l from-muted-foreground/30 to-transparent" />
        <h2 className="text-sm font-bold text-muted-foreground tracking-wide">🔧 إعدادات إضافية</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/30 to-transparent" />
      </div>
      <div className="space-y-4">
        <CollapsibleSettingsCard icon={UserCircle} iconGradient="from-pink-500 to-rose-600" iconShadow="shadow-lg shadow-pink-500/20" title="الملف الشخصي" description="تعديل بياناتك الشخصية وكلمة المرور">
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={s.profileName} onChange={(e) => s.setProfileName(e.target.value)} placeholder="الاسم الكامل" />
            </div>
            <div className="space-y-2">
              <Label>رقم الجوال</Label>
              <Input value={s.profilePhone} onChange={(e) => s.setProfilePhone(e.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="text-right" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهوية الوطنية</Label>
              <Input value={s.profileNationalId} onChange={(e) => s.setProfileNationalId(e.target.value)} placeholder="1XXXXXXXXX" dir="ltr" className="text-right" inputMode="numeric" />
            </div>
            <Button onClick={s.handleSaveProfile} disabled={s.savingProfile} className="gap-1.5">
              <Save className="h-4 w-4" />{s.savingProfile ? "جارٍ الحفظ..." : "حفظ الملف الشخصي"}
            </Button>
            <div className="border-t pt-4 mt-4 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2"><KeyRound className="h-4 w-4" />تغيير كلمة المرور</h4>
              <div className="space-y-2">
                <Label>كلمة المرور الحالية</Label>
                <Input type="password" value={s.currentPassword} onChange={(e) => s.setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>كلمة المرور الجديدة</Label>
                <Input type="password" value={s.newOwnPassword} onChange={(e) => s.setNewOwnPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>تأكيد كلمة المرور</Label>
                <Input type="password" value={s.confirmOwnPassword} onChange={(e) => s.setConfirmOwnPassword(e.target.value)} />
              </div>
              <Button onClick={s.handleChangeOwnPassword} disabled={s.changingOwnPassword} variant="outline" className="gap-1.5">
                <KeyRound className="h-4 w-4" />{s.changingOwnPassword ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </Button>
            </div>
          </div>
        </CollapsibleSettingsCard>

        {s.isAdmin && (
          <>
            <Card className="border border-border/50 bg-card/80 backdrop-blur-sm shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl shadow-lg text-white bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">وضع القراءة فقط للمديرين</h3>
                      <p className="text-xs text-muted-foreground">{s.adminReadOnly ? "مفعّل — المديرون الآخرون للاطلاع فقط" : "معطّل — الكل يمكنه التعديل"}</p>
                    </div>
                  </div>
                  <Switch checked={s.adminReadOnly} disabled={s.savingAdminReadOnly}
                    onCheckedChange={async (checked) => {
                      s.setSavingAdminReadOnly(true); s.setAdminReadOnly(checked);
                      await Promise.all([
                        supabase.from("site_settings").upsert({ id: "admin_read_only", value: String(checked) }),
                        supabase.from("site_settings").upsert({ id: "admin_primary_id", value: s.user?.id || "" }),
                      ]);
                      s.setSavingAdminReadOnly(false);
                      toast({ title: checked ? "تم التفعيل" : "تم التعطيل", description: checked ? "المديرون الآخرون يمكنهم الاطلاع فقط بدون تعديل" : "تم إلغاء تقييد المديرين" });
                    }} />
                </div>
              </CardContent>
            </Card>

            <TeacherManagementCard teachers={s.teachers} setTeachers={s.setTeachers} />

            <CollapsibleSettingsCard icon={History} iconGradient="from-cyan-500 to-blue-600" iconShadow="shadow-lg shadow-cyan-500/20" title="سجل الدخول" description="استعراض تاريخ دخول المعلمين والمديرين">
              <StaffLoginHistory teachers={s.teachers} currentUserId={s.user?.id || ""} currentUserName={s.profileName || "المدير"} />
            </CollapsibleSettingsCard>

            <WhatsAppTemplatesSettings />

            <CollapsibleSettingsCard icon={MessageSquare} iconGradient="from-cyan-500 to-blue-600" iconShadow="shadow-lg shadow-cyan-500/20" title="إعدادات مزود خدمة SMS" description="ربط مزود الرسائل النصية">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>المزود</Label>
                  <Select value={s.smsProvider} onValueChange={s.setSmsProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="msegat">MSEGAT</SelectItem>
                      <SelectItem value="unifonic">Unifonic</SelectItem>
                      <SelectItem value="taqnyat">Taqnyat (تقنيات)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {s.smsProvider === "msegat" && (
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input value={s.providerUsername} onChange={(e) => s.setProviderUsername(e.target.value)} placeholder="اسم مستخدم MSEGAT" dir="ltr" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{s.smsProvider === "msegat" ? "مفتاح API" : s.smsProvider === "unifonic" ? "App SID" : "Bearer Token"}</Label>
                  <Input type="password" value={s.providerApiKey} onChange={(e) => s.setProviderApiKey(e.target.value)}
                    placeholder={s.smsProvider === "unifonic" ? "App SID" : s.smsProvider === "taqnyat" ? "Bearer Token" : "API Key"} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>اسم المرسل (Sender ID)</Label>
                  <Input value={s.providerSender} onChange={(e) => s.setProviderSender(e.target.value)} placeholder="Sender Name" dir="ltr" />
                  {s.smsProvider === "unifonic" && <p className="text-xs text-muted-foreground">اختياري - سيُستخدم الافتراضي إن ترك فارغاً</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={s.handleSaveProvider} disabled={s.savingProvider} className="gap-1.5">
                    <Save className="h-4 w-4" />{s.savingProvider ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                  </Button>
                  <Button variant="outline" disabled={s.testingSms || !s.providerApiKey || !s.providerSender} className="gap-1.5"
                    onClick={async () => {
                      s.setTestingSms(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("send-sms", { body: { phone: s.providerSender, message: "رسالة اختبارية من النظام - Test SMS" } });
                        if (error) { toast({ title: "فشل الاختبار", description: error.message, variant: "destructive" }); }
                        else if (data?.success) { toast({ title: "نجح الاختبار ✅", description: "تم إرسال الرسالة الاختبارية بنجاح" }); }
                        else { toast({ title: "فشل الاختبار", description: data?.error || "لم يتم الإرسال", variant: "destructive" }); }
                      } catch (err: any) { toast({ title: "خطأ", description: err.message, variant: "destructive" }); }
                      s.setTestingSms(false);
                    }}>
                    <MessageSquare className="h-4 w-4" />{s.testingSms ? "جارٍ الاختبار..." : "اختبار الاتصال"}
                  </Button>
                </div>
              </div>
            </CollapsibleSettingsCard>

            <CollapsibleSettingsCard icon={Trash2} iconGradient="from-red-500 to-rose-600" iconShadow="shadow-lg shadow-red-500/20" title="تفريغ البيانات" description="حذف جميع سجلات الدرجات أو الحضور" className="border-destructive/20">
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>تحذير: هذه العمليات لا يمكن التراجع عنها. تأكد قبل المتابعة.</span>
                </div>
                <DataPurgeSection />
              </div>
            </CollapsibleSettingsCard>

            <CollapsibleSettingsCard icon={SettingsIcon} iconGradient="from-indigo-500 to-violet-600" iconShadow="shadow-lg shadow-indigo-500/20" title="إعدادات صفحة تسجيل الدخول" description="تخصيص شعار واسم المدرسة">
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label>شعار المدرسة</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
                      {s.schoolLogoUrl ? (<img src={s.schoolLogoUrl} alt="شعار المدرسة" className="h-full w-full object-cover rounded-xl" />) : (<Upload className="h-6 w-6 text-muted-foreground" />)}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input ref={s.logoInputRef} type="file" accept="image/*" className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          s.setUploadingLogo(true);
                          const filePath = `school-logo-${Date.now()}.${file.name.split('.').pop()}`;
                          const { error: uploadError } = await supabase.storage.from("school-assets").upload(filePath, file, { upsert: true });
                          if (uploadError) { toast({ title: "خطأ في رفع الشعار", description: uploadError.message, variant: "destructive" }); s.setUploadingLogo(false); return; }
                          const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(filePath);
                          await supabase.from("site_settings").upsert({ id: "school_logo_url", value: urlData.publicUrl });
                          s.setSchoolLogoUrl(urlData.publicUrl); s.setUploadingLogo(false);
                          toast({ title: "تم رفع الشعار بنجاح" }); e.target.value = "";
                        }} />
                      <Button type="button" variant="outline" size="sm" disabled={s.uploadingLogo} onClick={() => s.logoInputRef.current?.click()} className="gap-1.5">
                        <Upload className="h-4 w-4" />{s.uploadingLogo ? "جارٍ الرفع..." : "تغيير الشعار"}
                      </Button>
                      {s.schoolLogoUrl && (
                        <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={async () => { await supabase.from("site_settings").upsert({ id: "school_logo_url", value: "" }); s.setSchoolLogoUrl(""); toast({ title: "تم إزالة الشعار" }); }}>
                          <Trash2 className="h-4 w-4" />إزالة
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2"><Label>اسم المدرسة</Label><Input value={s.loginSchoolName} onChange={(e) => s.setLoginSchoolName(e.target.value)} placeholder="مثال: ثانوية الفيصلية" /></div>
                <div className="space-y-2"><Label>الوصف الفرعي</Label><Input value={s.loginSubtitle} onChange={(e) => s.setLoginSubtitle(e.target.value)} placeholder="مثال: نظام إدارة المدرسة" /></div>
                <div className="space-y-2">
                  <Label>عنوان لوحة التحكم</Label>
                  <Input value={s.dashboardTitle} onChange={(e) => s.setDashboardTitle(e.target.value)} placeholder="لوحة التحكم" />
                  <p className="text-[11px] text-muted-foreground">يظهر في أعلى لوحة التحكم الرئيسية</p>
                </div>
                <Button disabled={s.savingLogin} className="gap-1.5"
                  onClick={async () => {
                    s.setSavingLogin(true);
                    const results = await Promise.all([
                      supabase.from("site_settings").upsert({ id: "school_name", value: s.loginSchoolName }),
                      supabase.from("site_settings").upsert({ id: "school_subtitle", value: s.loginSubtitle }),
                      supabase.from("site_settings").upsert({ id: "dashboard_title", value: s.dashboardTitle }),
                    ]);
                    s.setSavingLogin(false);
                    if (results.some((r) => r.error)) { toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" }); }
                    else { toast({ title: "تم الحفظ", description: "تم تحديث إعدادات صفحة الدخول" }); }
                  }}>
                  <Save className="h-4 w-4" />{s.savingLogin ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
              </div>
            </CollapsibleSettingsCard>
          </>
        )}
      </div>
    </div>
  );
}
