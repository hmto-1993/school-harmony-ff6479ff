import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Infinity as InfinityIcon, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscriberStatus } from "@/hooks/useSubscriberStatus";

export default function SubscriptionExpiryBadge() {
  const { user, isSuperOwner } = useAuth();
  const { isPrimaryOwner, loaded } = useSubscriberStatus();
  const [endDate, setEndDate] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!user?.id || !loaded || isPrimaryOwner || isSuperOwner) return;
    supabase
      .from("profiles")
      .select("subscription_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setEndDate((data as any)?.subscription_end || null);
        setFetched(true);
      });
  }, [user?.id, loaded, isPrimaryOwner, isSuperOwner]);

  // Super owner gets a distinct "Owner" badge
  if (isSuperOwner) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[11px] font-bold shadow-sm">
        <Crown className="h-3.5 w-3.5" />
        المالك الرئيسي
      </div>
    );
  }

  // Hide for the platform owner or while not yet loaded
  if (!user || !loaded || isPrimaryOwner || !fetched) return null;

  // No expiry set — show subtle infinite badge
  if (!endDate) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-[11px] text-muted-foreground">
        <InfinityIcon className="h-3 w-3" />
        اشتراك مفتوح
      </div>
    );
  }

  const now = Date.now();
  const end = new Date(endDate).getTime();
  const diffMs = end - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let tone = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  let text = `اشتراكك ساري · متبقي ${days} يوماً`;

  if (diffMs <= 0) {
    tone = "bg-destructive/20 text-destructive border-destructive/40";
    text = "انتهى الاشتراك";
  } else if (days === 0) {
    tone = "bg-destructive/15 text-destructive border-destructive/40 animate-pulse";
    text = "ينتهي اشتراكك اليوم";
  } else if (days < 3) {
    tone = "bg-destructive/15 text-destructive border-destructive/40 animate-pulse";
    text = `تنبيه: متبقي ${days} ${days === 1 ? "يوم" : "أيام"}`;
  } else if (days < 7) {
    tone = "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    text = `متبقي ${days} أيام على انتهاء الاشتراك`;
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold", tone)}>
      <CalendarClock className="h-3 w-3" />
      {text}
    </div>
  );
}
