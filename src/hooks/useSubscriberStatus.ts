import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriberStatus {
  loaded: boolean;
  /** True if this user is the very first user in the system (system primary owner). */
  isPrimaryOwner: boolean;
  /** True if this user is a subscriber (signed up via subscription page, isolated workspace). */
  isSubscriber: boolean;
}

/**
 * Determines whether the current authenticated user is:
 * - the system primary owner (first user, full platform admin), or
 * - a subscriber (signed up themselves, gets isolated workspace, restricted UI).
 *
 * Subscribers see only the whitelisted tools and never see system-wide settings.
 */
export function useSubscriberStatus(): SubscriberStatus {
  const { user, role, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriberStatus>({
    loaded: false,
    isPrimaryOwner: false,
    isSubscriber: false,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus({ loaded: true, isPrimaryOwner: false, isSubscriber: false });
      return;
    }

    let cancelled = false;
    (async () => {
      const [primaryRes, profileRes] = await Promise.all([
        supabase.rpc("is_primary_owner", { _user_id: user.id }),
        supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);

      if (cancelled) return;

      const isPrimary = primaryRes.data === true;
      const profileRole = profileRes.data?.role;
      // Subscriber owners are admins inside their own isolated workspace, but not platform owners.
      const isSubscriber = !isPrimary && profileRole === "owner";

      setStatus({
        loaded: true,
        isPrimaryOwner: isPrimary,
        isSubscriber,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, role, authLoading]);

  return status;
}
