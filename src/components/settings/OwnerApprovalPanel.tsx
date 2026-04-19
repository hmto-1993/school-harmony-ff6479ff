import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldX, UserCheck, Mail, Phone, Loader2, Inbox, Crown, Shield, School, BookOpen } from "lucide-react";

type TierChoice = "basic" | "premium";

type PendingProfile = {
  id: string;
  user_id: string;
  full_name: string;
  national_id: string | null;
  phone: string | null;
  school: string | null;
  specialty: string | null;
  requested_tier: TierChoice | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function OwnerApprovalPanel() {
  const [items, setItems] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "rejected">("pending");
  const [tierChoice, setTierChoice] = useState<Record<string, TierChoice>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, national_id, phone, school, specialty, requested_tier, approval_status, created_at")
      .in("approval_status", ["pending", "rejected"])
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "تعذر تحميل القائمة", description: error.message, variant: "destructive" });
    } else {
      const list = ((data as any) || []) as PendingProfile[];
      setItems(list);
      const initial: Record<string, TierChoice> = {};
      list.forEach((p) => { if (p.requested_tier) initial[p.user_id] = p.requested_tier; });
      setTierChoice((prev) => ({ ...initial, ...prev }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (userId: string, status: "approved" | "rejected") => {
    setBusyId(userId);
    // If approving, also set the chosen tier (default basic)
    if (status === "approved") {
      const chosenTier = tierChoice[userId] || "basic";
      const { error: tierError } = await supabase.rpc("set_user_tier", {
        _target_user: userId,
        _tier: chosenTier,
      });
      if (tierError) {
        setBusyId(null);
        toast({ title: "تعذر تعيين الباقة", description: tierError.message, variant: "destructive" });
        return;
      }
    }
    const { error } = await supabase.rpc("set_user_approval", {
      _target_user: userId,
      _status: status,
    });
    setBusyId(null);
    if (error) {
      toast({ title: "تعذر تنفيذ الإجراء", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: status === "approved" ? "تم تفعيل الحساب" : "تم رفض الطلب",
      description: status === "approved"
        ? `تم تفعيل المستخدم بباقة ${(tierChoice[userId] || "basic") === "premium" ? "بريميوم 👑" : "أساسية"}`
        : "تم تحديث حالة الطلب",
    });
    load();
  };

  const filtered = items.filter((i) => i.approval_status === tab);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="h-5 w-5 text-primary" />
          طلبات تفعيل الحسابات
          {items.filter(i => i.approval_status === "pending").length > 0 && (
            <Badge variant="destructive" className="mr-1">
              {items.filter(i => i.approval_status === "pending").length}
            </Badge>
          )}
        </CardTitle>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant={tab === "pending" ? "default" : "outline"}
            onClick={() => setTab("pending")}
          >
            قيد المراجعة
          </Button>
          <Button
            size="sm"
            variant={tab === "rejected" ? "default" : "outline"}
            onClick={() => setTab("rejected")}
          >
            المرفوضة
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد طلبات {tab === "pending" ? "قيد المراجعة" : "مرفوضة"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground truncate">{p.full_name || "بدون اسم"}</span>
                    {p.approval_status === "rejected" && (
                      <Badge variant="destructive" className="text-[10px]">مرفوض</Badge>
                    )}
                    {p.approval_status === "pending" && (
                      <Badge variant="secondary" className="text-[10px]">جديد</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {p.national_id && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {p.national_id}
                      </span>
                    )}
                    {p.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {p.phone}
                      </span>
                    )}
                    <span>سُجِّل: {new Date(p.created_at).toLocaleDateString("ar-SA")}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  {p.approval_status === "pending" ? (
                    <>
                      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
                        <button
                          type="button"
                          onClick={() => setTierChoice((s) => ({ ...s, [p.user_id]: "basic" }))}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                            (tierChoice[p.user_id] || "basic") === "basic"
                              ? "bg-muted-foreground/20 text-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Shield className="h-3 w-3" />
                          أساسية
                        </button>
                        <button
                          type="button"
                          onClick={() => setTierChoice((s) => ({ ...s, [p.user_id]: "premium" }))}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                            tierChoice[p.user_id] === "premium"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Crown className="h-3 w-3" />
                          بريميوم
                        </button>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setStatus(p.user_id, "approved")}
                        disabled={busyId === p.user_id}
                        className="gap-1"
                      >
                        {busyId === p.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        تفعيل
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(p.user_id, "rejected")}
                        disabled={busyId === p.user_id}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <ShieldX className="h-4 w-4" />
                        رفض
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(p.user_id, "approved")}
                      disabled={busyId === p.user_id}
                      className="gap-1"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      تفعيل
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
