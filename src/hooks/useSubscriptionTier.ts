import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionTier = "basic" | "premium";

export interface TierStatus {
  loaded: boolean;
  tier: SubscriptionTier;
  isPremium: boolean;
  /** True if user is the developer/super-owner with full access bypass */
  isDeveloper: boolean;
}

/**
 * Returns the effective subscription tier for the current authenticated user.
 * - Super owner / primary owner → always premium (full developer access).
 * - Anyone else → reads from `subscription_tiers`, defaults to 'basic'.
 */
export function useSubscriptionTier(): TierStatus {
  const { user, isSuperOwner, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<TierStatus>({
    loaded: false,
    tier: "basic",
    isPremium: false,
    isDeveloper: false,
  });

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setStatus({ loaded: true, tier: "basic", isPremium: false, isDeveloper: false });
      return;
    }
    const { data } = await supabase.rpc("get_user_tier", { _user_id: user.id });
    const tier = (data as SubscriptionTier) || "basic";
    setStatus({
      loaded: true,
      tier,
      isPremium: tier === "premium",
      isDeveloper: !!isSuperOwner,
    });
  }, [user, authLoading, isSuperOwner]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return status;
}
