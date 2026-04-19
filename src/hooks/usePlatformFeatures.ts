import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformFeature {
  id: string;
  feature_key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  required_tier: "basic" | "premium";
  sort_order: number;
  is_active: boolean;
}

/**
 * Subscribes to public.platform_features in real-time.
 * Any change made by the owner reflects instantly across all clients.
 */
export function usePlatformFeatures() {
  const [features, setFeatures] = useState<PlatformFeature[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("platform_features")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    setFeatures((data ?? []) as PlatformFeature[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("platform_features_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_features" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { features, loading, reload: load };
}
