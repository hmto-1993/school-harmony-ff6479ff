import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Atom, Star, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useMyBetaFeatures, type BetaFeature } from "@/hooks/useBetaFeatures";
import { BetaChangeBadge } from "./BetaChangeBadge";

export default function AlphaLabSubscriberCard() {
  const { features, loading } = useMyBetaFeatures();
  const [openId, setOpenId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!openId) return;
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSending(false); return; }
    const { error } = await supabase.from("beta_feature_feedback").insert({
      feature_id: openId, user_id: u.user.id, rating, message: message.trim(),
    });
    setSending(false);
    if (error) { toast({ title: "تعذر الإرسال", description: error.message, variant: "destructive" }); return; }
    toast({ title: "شكراً لك!", description: "تم إرسال ملاحظتك بنجاح" });
    setOpenId(null); setMessage(""); setRating(5);
  };

  if (loading) return null;
  if (features.length === 0) return null;

  return (
    <Card className="border-2 border-violet-500/30 shadow-xl bg-gradient-to-br from-violet-500/5 via-card to-fuchsia-500/5 animate-fade-in overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <FlaskConical className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold bg-gradient-to-l from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              الميزات التجريبية
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              ميزات اعتمدها لك المالك لتجربتها — شاركنا رأيك لتطويرها 🧪
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.map((f: BetaFeature) => (
          <div key={f.id} className="rounded-xl border-2 border-border/50 bg-card p-4 hover:border-violet-500/40 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Atom className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-bold text-sm">{f.name}</h5>
                    <BetaChangeBadge changeType={f.change_type} lastChangedAt={f.last_changed_at} />
                    <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-600">Beta</Badge>
                  </div>
                  {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpenId(f.id)} className="gap-1.5 text-xs shrink-0">
                <Send className="h-3.5 w-3.5" /> ملاحظة
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إرسال ملاحظة على الميزة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">تقييمك:</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} type="button" onClick={() => setRating(i + 1)}>
                    <Star className={`h-7 w-7 transition ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب ملاحظاتك واقتراحاتك..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenId(null)}>إلغاء</Button>
            <Button onClick={submit} disabled={sending} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
