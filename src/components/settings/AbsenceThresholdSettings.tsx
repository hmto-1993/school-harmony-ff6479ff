/**
 * AbsenceThresholdSettings — إعدادات حد إنذار الغياب
 * تحديد نسبة/عدد حصص الغياب المسموح بها قبل الإنذار
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, Save, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AbsenceThresholdSettings() {
  const [threshold, setThreshold] = useState(20);
  const [allowedSessions, setAllowedSessions] = useState(0);
  const [mode, setMode] = useState<"percentage" | "sessions">("percentage");
  const [totalSessions, setTotalSessions] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["absence_threshold", "absence_allowed_sessions", "absence_mode", "total_term_sessions"])
      .then(({ data }) => {
        (data || []).forEach((s) => {
          if (s.id === "absence_threshold" && s.value) setThreshold(Number(s.value) || 20);
          if (s.id === "absence_allowed_sessions" && s.value) setAllowedSessions(Number(s.value) || 0);
          if (s.id === "absence_mode" && s.value) setMode(s.value as "percentage" | "sessions");
          if (s.id === "total_term_sessions" && s.value) setTotalSessions(Number(s.value) || 0);
        });
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      supabase.from("site_settings").upsert({ id: "absence_threshold", value: String(threshold) }),
      supabase.from("site_settings").upsert({ id: "absence_allowed_sessions", value: String(allowedSessions) }),
      supabase.from("site_settings").upsert({ id: "absence_mode", value: mode }),
      supabase.from("site_settings").upsert({ id: "total_term_sessions", value: String(totalSessions) }),
    ]);
    setSaving(false);
    toast({
      title: "تم الحفظ",
      description: `تم تعيين حد الإنذار: ${mode === "sessions" && allowedSessions > 0 ? `${allowedSessions} حصة` : `${threshold}%`}`,
    });
  };

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-destructive to-destructive/80 shadow-lg shadow-destructive/20 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">حد إنذار الغياب</h3>
                <p className="text-xs text-muted-foreground">تحديد نسبة الغياب التي يتم عندها إنذار الطالب — الحالي: {threshold}%</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-5 max-w-lg">
            {/* طريقة التحديد */}
            <div className="space-y-2">
              <Label>طريقة تحديد الحد</Label>
              <div className="flex gap-2">
                <Button variant={mode === "percentage" ? "default" : "outline"} size="sm" className="h-9 text-xs flex-1" onClick={() => setMode("percentage")}>
                  بالنسبة المئوية (%)
                </Button>
                <Button variant={mode === "sessions" ? "default" : "outline"} size="sm" className="h-9 text-xs flex-1" onClick={() => setMode("sessions")}>
                  بعدد الحصص
                </Button>
              </div>
            </div>

            {/* إجمالي الحصص */}
            <div className="space-y-2">
              <Label>إجمالي حصص الفصل الدراسي</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={10}
                  max={500}
                  value={totalSessions || ""}
                  onChange={(e) => {
                    const val = Math.min(500, Math.max(0, Number(e.target.value) || 0));
                    setTotalSessions(val);
                    if (mode === "percentage" && val > 0) setAllowedSessions(Math.round((threshold / 100) * val));
                    if (mode === "sessions" && val > 0 && allowedSessions > 0) setThreshold(Math.round((allowedSessions / val) * 100));
                  }}
                  className="w-28 text-center font-bold text-lg"
                  dir="ltr"
                  placeholder="مثال: 90"
                />
                <span className="text-sm text-muted-foreground">حصة</span>
              </div>
            </div>

            {/* النسبة */}
            <div className="space-y-2">
              <Label>نسبة الغياب المسموح بها (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={threshold}
                  onChange={(e) => {
                    const val = Math.min(50, Math.max(5, Number(e.target.value) || 20));
                    setThreshold(val);
                    if (totalSessions > 0) setAllowedSessions(Math.round((val / 100) * totalSessions));
                  }}
                  className={cn("w-24 text-center font-bold text-lg", mode === "percentage" && "ring-2 ring-primary")}
                  dir="ltr"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[10, 15, 20, 25, 30].map((v) => (
                  <Button
                    key={v}
                    variant={threshold === v ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setThreshold(v);
                      if (totalSessions > 0) setAllowedSessions(Math.round((v / 100) * totalSessions));
                    }}
                  >
                    {v}%
                  </Button>
                ))}
              </div>
            </div>

            {/* عدد الحصص */}
            <div className="space-y-2">
              <Label>عدد الحصص المسموح بها</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={allowedSessions || ""}
                  onChange={(e) => {
                    const val = Math.min(200, Math.max(0, Number(e.target.value) || 0));
                    setAllowedSessions(val);
                    if (totalSessions > 0 && val > 0) setThreshold(Math.round((val / totalSessions) * 100));
                  }}
                  className={cn("w-24 text-center font-bold text-lg", mode === "sessions" && "ring-2 ring-primary")}
                  dir="ltr"
                  placeholder="مثال: 5"
                />
                <span className="text-sm text-muted-foreground">حصة</span>
              </div>
              {totalSessions > 0 && allowedSessions > 0 && (
                <p className="text-xs text-info font-medium">= {Math.round((allowedSessions / totalSessions) * 100)}% من إجمالي {totalSessions} حصة</p>
              )}
            </div>

            {/* تحذير */}
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
              <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                إجراء تلقائي عند التجاوز
              </p>
              <p className="text-xs text-muted-foreground">
                عند تجاوز الطالب عدد الحصص المسموح بها ({allowedSessions > 0 ? `${allowedSessions} حصة` : `${threshold}%`})، يتم تحويل حالته تلقائياً إلى <strong className="text-destructive">"محروم من دخول الاختبار"</strong>.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
