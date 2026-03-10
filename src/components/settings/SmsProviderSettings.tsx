/**
 * SmsProviderSettings — إعدادات مزود خدمة الرسائل النصية
 */
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, Save, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SmsProviderSettings() {
  const [provider, setProvider] = useState("msegat");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sender, setSender] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("id, value")
      .in("id", ["sms_provider", "sms_provider_username", "sms_provider_api_key", "sms_provider_sender"])
      .then(({ data }) => {
        (data || []).forEach((s) => {
          if (s.id === "sms_provider") setProvider(s.value || "msegat");
          if (s.id === "sms_provider_username") setUsername(s.value || "");
          if (s.id === "sms_provider_api_key") setApiKey(s.value || "");
          if (s.id === "sms_provider_sender") setSender(s.value || "");
        });
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const results = await Promise.all([
      supabase.from("site_settings").update({ value: provider }).eq("id", "sms_provider"),
      supabase.from("site_settings").update({ value: username }).eq("id", "sms_provider_username"),
      supabase.from("site_settings").update({ value: apiKey }).eq("id", "sms_provider_api_key"),
      supabase.from("site_settings").update({ value: sender }).eq("id", "sms_provider_sender"),
    ]);
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast({ title: "خطأ", description: "فشل حفظ إعدادات المزود", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات مزود SMS" });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone: sender, message: "رسالة اختبارية من النظام - Test SMS" },
      });
      if (error) {
        toast({ title: "فشل الاختبار", description: error.message, variant: "destructive" });
      } else if (data?.success) {
        toast({ title: "نجح الاختبار ✅", description: "تم إرسال الرسالة الاختبارية بنجاح" });
      } else {
        toast({ title: "فشل الاختبار", description: data?.error || "لم يتم الإرسال", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setTesting(false);
  };

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">إعدادات مزود خدمة SMS</h3>
                <p className="text-xs text-muted-foreground">ربط مزود الرسائل النصية</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>المزود</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="msegat">MSEGAT</SelectItem>
                  <SelectItem value="unifonic">Unifonic</SelectItem>
                  <SelectItem value="taqnyat">Taqnyat (تقنيات)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {provider === "msegat" && (
              <div className="space-y-2">
                <Label>اسم المستخدم</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم مستخدم MSEGAT" dir="ltr" />
              </div>
            )}
            <div className="space-y-2">
              <Label>{provider === "msegat" ? "مفتاح API" : provider === "unifonic" ? "App SID" : "Bearer Token"}</Label>
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={provider === "unifonic" ? "App SID" : provider === "taqnyat" ? "Bearer Token" : "API Key"} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>اسم المرسل (Sender ID)</Label>
              <Input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Sender Name" dir="ltr" />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" />
                {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
              <Button variant="outline" disabled={testing || !apiKey || !sender} className="gap-1.5" onClick={handleTest}>
                <MessageSquare className="h-4 w-4" />
                {testing ? "جارٍ الاختبار..." : "اختبار الاتصال"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
