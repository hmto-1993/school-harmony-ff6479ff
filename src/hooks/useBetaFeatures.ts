import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BetaFeature {
  id: string;
  feature_key: string;
  name: string;
  description: string;
  icon: string;
  is_globally_enabled: boolean;
  change_type?: "new" | "updated";
  last_changed_at?: string;
}

export interface BetaEnrollment {
  id: string;
  feature_id: string;
  user_id: string;
  enabled: boolean;
}

/** Hook for the current subscriber: returns features enabled for them. */
export function useMyBetaFeatures() {
  const [features, setFeatures] = useState<BetaFeature[]>([]);
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { setFeatures([]); setEnabledKeys(new Set()); return; }

      const { data: feats } = await supabase
        .from("beta_features")
        .select("*")
        .order("created_at", { ascending: true });

      const { data: enrolls } = await supabase
        .from("beta_feature_enrollments")
        .select("feature_id, enabled")
        .eq("user_id", uid);

      const list = (feats ?? []) as BetaFeature[];
      const enrolledMap = new Map((enrolls ?? []).map((e: any) => [e.feature_id, e.enabled]));
      const visible = list.filter(f => f.is_globally_enabled || enrolledMap.get(f.id) === true);
      setFeatures(visible);
      setEnabledKeys(new Set(visible.map(f => f.feature_key)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { features, enabledKeys, loading, reload: load, isEnabled: (k: string) => enabledKeys.has(k) };
}
