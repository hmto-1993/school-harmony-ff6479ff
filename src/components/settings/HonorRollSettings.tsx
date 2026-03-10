/**
 * HonorRollSettings — إعدادات لوحة الشرف
 * التحكم في تفعيل/تعطيل لوحة الشرف للطلاب
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function HonorRollSettings() {
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "honor_roll_enabled")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEnabled(data.value === "true");
      });
  }, []);

  const toggle = async () => {
    setSaving(true);
    const newVal = !enabled;
    await supabase.from("site_settings").upsert({ id: "honor_roll_enabled", value: String(newVal) });
    setEnabled(newVal);
    setSaving(false);
    toast({
      title: newVal ? "تم التفعيل" : "تم التعطيل",
      description: newVal ? "لوحة الشرف مرئية للطلاب الآن" : "تم إخفاء لوحة الشرف",
    });
  };

  return (
    <Card className="border-2 border-amber-400/30 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-amber-500" />
            لوحة الشرف
          </CardTitle>
          <Badge variant={enabled ? "default" : "secondary"} className={cn(enabled && "bg-amber-500 text-amber-950")}>
            {enabled ? "مفعّلة" : "معطّلة"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-400/20">
              <Crown className="h-7 w-7 text-amber-950" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-1">نظام لوحة الشرف</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">يتم عرض الطلاب المتميزين تلقائياً بناءً على المعايير التالية:</p>
              <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <strong>انتظام كامل:</strong> صفر غياب خلال الشهر الحالي
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <strong>درجة كاملة:</strong> في أحدث اختبار فترة
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
          <div>
            <p className="font-medium text-foreground">نشر لوحة الشرف</p>
            <p className="text-xs text-muted-foreground mt-0.5">تظهر للطلاب في صفحتهم الرئيسية</p>
          </div>
          <Button
            variant={enabled ? "default" : "outline"}
            size="sm"
            className={cn("gap-2 min-w-[100px]", enabled && "bg-amber-500 hover:bg-amber-600 text-amber-950")}
            disabled={saving}
            onClick={toggle}
          >
            {saving ? <span className="animate-spin">⏳</span> : enabled ? <><Eye className="h-4 w-4" /> مفعّلة</> : <><EyeOff className="h-4 w-4" /> معطّلة</>}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          <strong>ملاحظة:</strong> يظهر شعار النجمة الماسية 💎⭐ بجانب أسماء الطلاب المتميزين في جميع أنحاء التطبيق. الخصوصية محفوظة: تُعرض الأسماء والإنجازات فقط، بدون درجات خاصة.
        </div>
      </CardContent>
    </Card>
  );
}
