import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CollapsibleSettingsCard from "@/components/settings/CollapsibleSettingsCard";

interface SmsSettingsCardProps {
  smsProvider: string;
  setSmsProvider: (v: string) => void;
  providerUsername: string;
  setProviderUsername: (v: string) => void;
  providerApiKey: string;
  setProviderApiKey: (v: string) => void;
  providerSender: string;
  setProviderSender: (v: string) => void;
  savingProvider: boolean;
  handleSaveProvider: () => void;
  testingSms: boolean;
  setTestingSms: (v: boolean) => void;
}

export function SmsSettingsCard(props: SmsSettingsCardProps) {
  const handleTestSms = async () => {
    props.setTestingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone: props.providerSender, message: "رسالة اختبارية من النظام - Test SMS" },
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
    props.setTestingSms(false);
  };

  return (
    <CollapsibleSettingsCard icon={MessageSquare} iconGradient="from-cyan-500 to-blue-600" iconShadow="shadow-lg shadow-cyan-500/20" title="إعدادات مزود خدمة SMS" description="ربط مزود الرسائل النصية">
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>المزود</Label>
          <Select value={props.smsProvider} onValueChange={props.setSmsProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="msegat">MSEGAT</SelectItem>
              <SelectItem value="unifonic">Unifonic</SelectItem>
              <SelectItem value="taqnyat">Taqnyat (تقنيات)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {props.smsProvider === "msegat" && (
          <div className="space-y-2">
            <Label>اسم المستخدم</Label>
            <Input value={props.providerUsername} onChange={(e) => props.setProviderUsername(e.target.value)} placeholder="اسم مستخدم MSEGAT" dir="ltr" />
          </div>
        )}
        <div className="space-y-2">
          <Label>{props.smsProvider === "msegat" ? "مفتاح API" : props.smsProvider === "unifonic" ? "App SID" : "Bearer Token"}</Label>
          <Input type="password" value={props.providerApiKey} onChange={(e) => props.setProviderApiKey(e.target.value)}
            placeholder={props.smsProvider === "unifonic" ? "App SID" : props.smsProvider === "taqnyat" ? "Bearer Token" : "API Key"} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label>اسم المرسل (Sender ID)</Label>
          <Input value={props.providerSender} onChange={(e) => props.setProviderSender(e.target.value)} placeholder="Sender Name" dir="ltr" />
          {props.smsProvider === "unifonic" && <p className="text-xs text-muted-foreground">اختياري - سيُستخدم الافتراضي إن ترك فارغاً</p>}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={props.handleSaveProvider} disabled={props.savingProvider} className="gap-1.5">
            <Save className="h-4 w-4" />{props.savingProvider ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
          <Button variant="outline" disabled={props.testingSms || !props.providerApiKey || !props.providerSender} className="gap-1.5" onClick={handleTestSms}>
            <MessageSquare className="h-4 w-4" />{props.testingSms ? "جارٍ الاختبار..." : "اختبار الاتصال"}
          </Button>
        </div>
      </div>
    </CollapsibleSettingsCard>
  );
}
