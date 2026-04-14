import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RadarSettingsCardProps {
  onClose: () => void;
}

export default function RadarSettingsCard({ onClose }: RadarSettingsCardProps) {
  const [speed, setSpeed] = useState<"fast" | "medium" | "slow">("medium");
  const [sessionMemory, setSessionMemory] = useState(true);
  const [visualEffect, setVisualEffect] = useState<"radar" | "slots" | "spotlight">("radar");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["radar_speed", "radar_session_memory", "radar_visual_effect"])
      .then(({ data }) => {
        (data || []).forEach((s: any) => {
          if (s.id === "radar_speed") setSpeed(s.value as any);
          if (s.id === "radar_session_memory") setSessionMemory(s.value !== "false");
          if (s.id === "radar_visual_effect") setVisualEffect(s.value as any);
        });
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("site_settings").upsert([
      { id: "radar_speed", value: speed },
      { id: "radar_session_memory", value: String(sessionMemory) },
      { id: "radar_visual_effect", value: visualEffect },
    ]);
    setSaving(false);
    toast({ title: "تم الحفظ", description: "تم حفظ اعدادات الرادار بنجاح" });
  };

  return (
    <Card className="border-2 border-primary/20 shadow-xl bg-card animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radar className="h-5 w-5 text-primary" />
            اعدادات الرادار الذكي
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Speed */}
        <div className="space-y-2">
          <Label className="text-sm font-bold">سرعة دوران الرادار</Label>
          <Select value={speed} onValueChange={(v) => setSpeed(v as any)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">سريع</SelectItem>
              <SelectItem value="medium">متوسط</SelectItem>
              <SelectItem value="slow">بطيء</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Memory */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold">ذاكرة الحصة</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              عدم تكرار اختيار الطالب خلال نفس الحصة
            </p>
          </div>
          <Switch checked={sessionMemory} onCheckedChange={setSessionMemory} />
        </div>

        {/* Visual Effect */}
        <div className="space-y-2">
          <Label className="text-sm font-bold">التاثير البصري</Label>
          <Select value={visualEffect} onValueChange={(v) => setVisualEffect(v as any)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="radar">رادار دائري</SelectItem>
              <SelectItem value="slots">بطاقات متحركة</SelectItem>
              <SelectItem value="spotlight">تسليط الضوء</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ الاعدادات"}
        </Button>
      </CardContent>
    </Card>
  );
}
