import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dynamically updates the favicon and apple-touch-icon
 * when the school logo changes in site_settings.
 */
export function useDynamicFavicon() {
  useEffect(() => {
    const updateIcons = (logoUrl: string) => {
      if (!logoUrl) return;

      // Update favicon
      let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (favicon) {
        favicon.href = logoUrl;
      }

      // Update apple-touch-icon
      let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.href = logoUrl;
      }
    };

    // Fetch current logo
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "school_logo_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) updateIcons(data.value);
      });

    // Listen for realtime changes
    const channel = supabase
      .channel("favicon-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "id=eq.school_logo_url",
        },
        (payload: any) => {
          const newValue = payload.new?.value;
          if (newValue) updateIcons(newValue);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
