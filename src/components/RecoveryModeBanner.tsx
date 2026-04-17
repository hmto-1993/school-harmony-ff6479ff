import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

export default function RecoveryModeBanner() {
  const { user, role, orgRole } = useAuth();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("site_settings")
      .select("value")
      .eq("id", "recovery_mode")
      .maybeSingle()
      .then(({ data }) => setActive(data?.value === "true"));
  }, [user]);

  if (!active) return null;
  // Show only for staff
  if (role !== "admin" && orgRole !== "owner" && orgRole !== "admin") return null;

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/40 text-amber-900 dark:text-amber-200 px-4 py-2 text-sm flex items-center justify-center gap-2">
      <AlertTriangle className="h-4 w-4" />
      <span className="font-semibold">النظام في وضع الاسترداد (Recovery Mode)</span>
      <span className="opacity-80">— سياسات الوصول مُخففة مؤقتاً لاستعادة البيانات.</span>
    </div>
  );
}
