import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Save, X, Eye, Trash2, RotateCcw, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SettingsData } from "./settings-types";

export function PopupSettingsCard({ s }: { s: SettingsData }) {
  if (s.activeCard !== "popup" || !s.isAdmin) return null;

  return (
    <>
      <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="h-5 w-5 text-primary" />
              رسالة منبثقة للطلاب
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => s.setActiveCard(null)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-bold">تفعيل الرسالة المنبثقة</Label>
            <button onClick={() => s.setPopupEnabled(!s.popupEnabled)}
              className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200", s.popupEnabled ? "bg-primary" : "bg-muted")}>
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200", s.popupEnabled ? "translate-x-1" : "translate-x-6")} />
            </button>
          </div>
          <div className="space-y-2">
            <Label>عنوان الرسالة</Label>
            <Input value={s.popupTitle} onChange={(e) => s.setPopupTitle(e.target.value)} placeholder="مثال: تنبيه مهم" />
          </div>
          <div className="space-y-2">
            <Label>نص الرسالة</Label>
            <Textarea value={s.popupMessage} onChange={(e) => s.setPopupMessage(e.target.value)} placeholder="اكتب الرسالة التي تريد عرضها للطلاب..." rows={4} />
          </div>
          <div className="space-y-2">
            <Label>تاريخ انتهاء الرسالة (اختياري)</Label>
            <Input type="datetime-local" value={s.popupExpiry} onChange={(e) => s.setPopupExpiry(e.target.value)} dir="ltr" className="text-right" />
            {s.popupExpiry && <p className="text-xs text-muted-foreground">ستختفي الرسالة تلقائياً بعد: {new Date(s.popupExpiry).toLocaleString("ar-SA")}</p>}
          </div>
          <div className="space-y-2">
            <Label>استهداف الفصول</Label>
            <Select value={s.popupTargetType} onValueChange={(v: "all" | "specific") => { s.setPopupTargetType(v); if (v === "all") s.setPopupTargetClassIds([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلاب</SelectItem>
                <SelectItem value="specific">فصول محددة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {s.popupTargetType === "specific" && (
            <div className="space-y-2">
              <Label>اختر الفصول</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 max-h-40 overflow-y-auto">
                {s.classes.map((c) => {
                  const isSelected = s.popupTargetClassIds.includes(c.id);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => s.setPopupTargetClassIds((prev) => isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id])}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border/40 hover:border-primary/40"
                      )}>{c.name}</button>
                  );
                })}
              </div>
              {s.popupTargetClassIds.length > 0 && <p className="text-xs text-muted-foreground">تم اختيار {s.popupTargetClassIds.length} فصل</p>}
            </div>
          )}
          <div className="space-y-2">
            <Label>التوجيه عند الضغط (اختياري)</Label>
            <Select value={s.popupAction} onValueChange={s.setPopupAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون توجيه</SelectItem>
                <SelectItem value="grades">الدرجات</SelectItem>
                <SelectItem value="attendance">الحضور</SelectItem>
                <SelectItem value="behavior">السلوك</SelectItem>
                <SelectItem value="activities">الأنشطة</SelectItem>
                <SelectItem value="library">المكتبة</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">عند اختيار وجهة، سيظهر للطالب زر للانتقال مباشرة إلى القسم المحدد</p>
          </div>
          <div className="space-y-2">
            <Label>تكرار الرسالة</Label>
            <Select value={s.popupRepeat} onValueChange={s.setPopupRepeat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون تكرار (مرة واحدة)</SelectItem>
                <SelectItem value="daily">يومياً</SelectItem>
                <SelectItem value="weekly">أسبوعياً</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {s.popupRepeat === "daily" && "ستظهر الرسالة للطالب مرة واحدة كل يوم"}
              {s.popupRepeat === "weekly" && "ستظهر الرسالة للطالب مرة واحدة كل أسبوع"}
              {s.popupRepeat === "none" && "ستظهر الرسالة مرة واحدة فقط للطالب"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button disabled={s.savingPopup} className="gap-1.5"
              onClick={async () => {
                s.setSavingPopup(true);
                const updates = [
                  supabase.from("site_settings").upsert({ id: "student_popup_enabled", value: String(s.popupEnabled) }),
                  supabase.from("site_settings").upsert({ id: "student_popup_title", value: s.popupTitle }),
                  supabase.from("site_settings").upsert({ id: "student_popup_message", value: s.popupMessage }),
                  supabase.from("site_settings").upsert({ id: "student_popup_expiry", value: s.popupExpiry }),
                  supabase.from("site_settings").upsert({ id: "student_popup_target_type", value: s.popupTargetType }),
                  supabase.from("site_settings").upsert({ id: "student_popup_target_classes", value: JSON.stringify(s.popupTargetClassIds) }),
                  supabase.from("site_settings").upsert({ id: "student_popup_action", value: s.popupAction }),
                  supabase.from("site_settings").upsert({ id: "student_popup_repeat", value: s.popupRepeat }),
                ];
                const results = await Promise.all(updates);
                if (s.popupTitle.trim() && s.popupMessage.trim() && s.user) {
                  await supabase.from("popup_messages").insert({
                    title: s.popupTitle, message: s.popupMessage, expiry: s.popupExpiry || null,
                    target_type: s.popupTargetType, target_class_ids: s.popupTargetClassIds, created_by: s.user.id,
                  } as any);
                  const { data: historyData } = await supabase.from("popup_messages").select("*").order("created_at", { ascending: false }).limit(20);
                  if (historyData) s.setPopupHistory(historyData as any);
                }
                s.setSavingPopup(false);
                if (results.some((r) => r.error)) {
                  toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
                } else {
                  toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الرسالة المنبثقة" });
                }
              }}>
              <Save className="h-4 w-4" />
              {s.savingPopup ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
            <Button variant="outline" className="gap-1.5"
              onClick={() => { s.setPreviewTitle(s.popupTitle); s.setPreviewMessage(s.popupMessage); s.setPopupPreviewOpen(true); }}
              disabled={!s.popupTitle.trim() && !s.popupMessage.trim()}>
              <Eye className="h-4 w-4" />
              معاينة
            </Button>
          </div>
          {s.popupHistory.length > 0 && (
            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <History className="h-4 w-4 text-muted-foreground" />
                سجل الرسائل السابقة
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {s.popupHistory.map((msg) => (
                  <div key={msg.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{msg.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{msg.message}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{new Date(msg.created_at).toLocaleDateString("ar-SA")}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{msg.target_type === "all" ? "جميع الطلاب" : `${(msg.target_class_ids || []).length} فصل`}</Badge>
                        {msg.expiry && <Badge variant="outline" className="text-[10px] px-1.5 py-0">ينتهي: {new Date(msg.expiry).toLocaleDateString("ar-SA")}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7"
                        onClick={() => {
                          s.setPopupTitle(msg.title); s.setPopupMessage(msg.message); s.setPopupExpiry(msg.expiry || "");
                          s.setPopupTargetType(msg.target_type as "all" | "specific"); s.setPopupTargetClassIds(msg.target_class_ids || []);
                          s.setPopupEnabled(true); toast({ title: "تم تحميل الرسالة", description: "اضغط حفظ لتفعيلها" });
                        }}>
                        <RotateCcw className="h-3 w-3" />
                        تفعيل
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                            حذف
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الرسالة المنبثقة؟</AlertDialogTitle>
                            <AlertDialogDescription>سيتم حذف الرسالة نهائياً. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                await supabase.from("popup_messages").delete().eq("id", msg.id);
                                s.setPopupHistory((prev) => prev.filter((m) => m.id !== msg.id));
                                toast({ title: "تم الحذف" });
                              }}>حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popup Preview Dialog */}
      <Dialog open={s.popupPreviewOpen} onOpenChange={s.setPopupPreviewOpen}>
        <DialogContent dir="rtl" className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-l from-primary to-accent p-6 text-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Megaphone className="h-7 w-7 text-white" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">{s.previewTitle || "رسالة من الإدارة"}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap text-center">{s.previewMessage}</p>
            <DialogFooter>
              <Button onClick={() => s.setPopupPreviewOpen(false)} className="w-full rounded-2xl h-11 text-base font-bold bg-gradient-to-l from-primary to-accent hover:opacity-90">حسناً</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
