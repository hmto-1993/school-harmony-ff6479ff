import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AdminRestrictions } from "@/components/settings/AdminRestrictionsCard";

export interface MyAdminPerms {
  can_access_settings: boolean;
  can_manage_teachers: boolean;
  can_purge_data: boolean;
  can_edit_print_header: boolean;
  can_edit_form_identity: boolean;
  isPrimaryAdmin: boolean;
  loaded: boolean;
}

const allTrue: MyAdminPerms = {
  can_access_settings: true,
  can_manage_teachers: true,
  can_purge_data: true,
  can_edit_print_header: true,
  can_edit_form_identity: true,
  isPrimaryAdmin: true,
  loaded: true,
};

export function useAdminPerms(): MyAdminPerms {
  const { user, role } = useAuth();
  const [perms, setPerms] = useState<MyAdminPerms>({ ...allTrue, loaded: false });

  useEffect(() => {
    if (!user || role !== "admin") {
      setPerms({ ...allTrue, loaded: true });
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ["admin_restrictions", "admin_primary_id"]);

      let primaryId = "";
      let restrictions: AdminRestrictions = {};

      (data || []).forEach((s: any) => {
        if (s.id === "admin_primary_id") primaryId = s.value || "";
        if (s.id === "admin_restrictions") {
          try { restrictions = JSON.parse(s.value); } catch {}
        }
      });

      // Only set primary ID if none exists at all (first-time setup)
      if (!primaryId) {
        await supabase.from("site_settings").upsert({ id: "admin_primary_id", value: user.id });
        setPerms({ ...allTrue, loaded: true });
        return;
      }

      // User IS the primary admin
      if (user.id === primaryId) {
        setPerms({ ...allTrue, loaded: true });
        return;
      }

      // Check if this admin has restrictions
      const myRestrictions = restrictions[user.id];
      if (!myRestrictions) {
        setPerms({ ...allTrue, isPrimaryAdmin: false, loaded: true });
        return;
      }

      setPerms({
        can_access_settings: myRestrictions.can_access_settings ?? true,
        can_manage_teachers: myRestrictions.can_manage_teachers ?? true,
        can_purge_data: myRestrictions.can_purge_data ?? true,
        can_edit_print_header: myRestrictions.can_edit_print_header ?? true,
        can_edit_form_identity: myRestrictions.can_edit_form_identity ?? true,
        isPrimaryAdmin: false,
        loaded: true,
      });
    })();
  }, [user, role]);

  return perms;
}
