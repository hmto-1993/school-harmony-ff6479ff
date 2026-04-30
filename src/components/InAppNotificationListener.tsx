import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "in_app_notif_last_seen";
const OPT_OUT_KEY = "notification_opt_in_dismissed";

interface NotificationPayload {
  title?: string;
  body?: string;
  class_ids?: string[];
  created_at?: string;
}

function showToast(payload: NotificationPayload) {
  if (!payload?.title && !payload?.body) return;
  toast(payload.title || "إشعار جديد", {
    description: payload.body,
    icon: <Bell className="h-4 w-4" />,
    duration: 8000,
  });
}

/**
 * Listens for new notifications stored in site_settings.latest_notification
 * and displays them as in-app toasts. Works for both teachers and students
 * because site_settings is publicly readable.
 *
 * Push notifications outside the app are not active; this guarantees the
 * user actually sees the notification while the app is open.
 */
export default function InAppNotificationListener() {
  const { user, student } = useAuth();
  const lastSeenRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run if user has not opted out of notifications
    if (typeof window !== "undefined" && localStorage.getItem(OPT_OUT_KEY) === "true") {
      return;
    }
    if (!user && !student) return;

    let cancelled = false;
    lastSeenRef.current = localStorage.getItem(STORAGE_KEY);

    const handleRow = (raw: string | null | undefined, isInitial: boolean) => {
      if (!raw || cancelled) return;
      let parsed: NotificationPayload | null = null;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : (raw as any);
      } catch {
        return;
      }
      if (!parsed?.created_at) return;
      // Skip if we've already shown this one
      if (lastSeenRef.current === parsed.created_at) return;
      // On initial load, just record what's there — don't toast old notifications
      if (isInitial) {
        lastSeenRef.current = parsed.created_at;
        localStorage.setItem(STORAGE_KEY, parsed.created_at);
        return;
      }
      lastSeenRef.current = parsed.created_at;
      localStorage.setItem(STORAGE_KEY, parsed.created_at);
      showToast(parsed);
    };

    // Initial fetch — record current value as "seen" so we only toast new ones
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "latest_notification")
      .maybeSingle()
      .then(({ data }) => handleRow(data?.value as string | undefined, true));

    // Realtime subscription
    const channel = supabase
      .channel("in-app-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "id=eq.latest_notification",
        },
        (payload) => {
          const next = (payload.new as any)?.value;
          handleRow(next, false);
        }
      )
      .subscribe();

    // Polling fallback in case Realtime is not enabled for the table
    const interval = window.setInterval(async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("id", "latest_notification")
        .maybeSingle();
      handleRow(data?.value as string | undefined, false);
    }, 30000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [user?.id, student?.id]);

  return null;
}
