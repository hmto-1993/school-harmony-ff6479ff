import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, ChevronDown, Settings, Users, Trash2, Printer, Pencil, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface AdminRestrictions {
  [userId: string]: {
    can_access_settings: boolean;
    can_manage_teachers: boolean;
    can_purge_data: boolean;
    can_edit_print_header: boolean;
    can_edit_form_identity: boolean;
  };
}

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
}

const defaultPerms = {
  can_access_settings: true,
  can_manage_teachers: true,
  can_purge_data: true,
  can_edit_print_header: true,
  can_edit_form_identity: true,
};

export default function AdminRestrictionsCard() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [restrictions, setRestrictions] = useState<AdminRestrictions>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [adminsRes, settingsRes] = await Promise.all([
      supabase.functions.invoke("manage-users", { body: { action: "list_admins" } }),
      supabase.from("site_settings").select("value").eq("id", "admin_restrictions").maybeSingle(),
    ]);

    if (adminsRes.data?.admins) {
      setAdmins(adminsRes.data.admins.filter((a: AdminUser) => a.user_id !== user?.id));
    }

    if (settingsRes.data?.value) {
      try {
        setRestrictions(JSON.parse(settingsRes.data.value));
      } catch {}
    }
    setLoading(false);
  };

  const getPerms = (userId: string) => restrictions[userId] || defaultPerms;

  const togglePerm = async (userId: string, key: keyof typeof defaultPerms) => {
    const current = getPerms(userId);
    const updated = { ...restrictions, [userId]: { ...current, [key]: !current[key] } };
    setRestrictions(updated);

    await Promise.all([
      supabase.from("site_settings").upsert({ id: "admin_restrictions", value: JSON.stringify(updated) }),
      supabase.from("site_settings").upsert({ id: "admin_primary_id", value: user?.id || "" }),
    ]);
    toast({ title: "تم الحفظ", description: "تم تحديث صلاحيات المسؤول" });
  };

  const otherAdmins = admins;

  if (loading) return null;

  const toggles = [
    { key: "can_access_settings" as const, label: "الإعدادات", icon: Settings, desc: "الوصول لصفحة الإعدادات" },
    { key: "can_manage_teachers" as const, label: "إدارة المعلمين", icon: Users, desc: "إنشاء وحذف حسابات" },
    { key: "can_purge_data" as const, label: "تفريغ البيانات", icon: Trash2, desc: "حذف السجلات" },
    { key: "can_edit_print_header" as const, label: "ورقة الطباعة", icon: Printer, desc: "تعديل الترويسة" },
    { key: "can_edit_form_identity" as const, label: "هوية النماذج", icon: Pencil, desc: "تعديل النماذج الرسمية" },
  ];

  return (
    <Collapsible>
      <Card className="border-0 shadow-lg backdrop-blur-sm bg-card/80 overflow-hidden">
        <CollapsibleTrigger className="w-full group">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-right">
                <h3 className="text-base font-bold text-foreground">تقييد صلاحيات المسؤولين</h3>
                <p className="text-xs text-muted-foreground">تحكم بما يمكن للمسؤولين الآخرين الوصول إليه</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{otherAdmins.length} مسؤول</Badge>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-5 pb-5 pt-0 space-y-4">
            {otherAdmins.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Lock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>لا يوجد مسؤولون آخرون حالياً</p>
                <p className="text-xs mt-1">أضف مسؤولاً من بطاقة "إدارة المعلمين" لتتمكن من تقييد صلاحياته</p>
              </div>
            )}
            {otherAdmins.map((admin) => {
              const perms = getPerms(admin.user_id);
              const restrictedCount = toggles.filter(t => !perms[t.key]).length;
              return (
                <div key={admin.user_id} className="rounded-xl border border-border/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{admin.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    {restrictedCount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        <Lock className="h-3 w-3 ml-1" />
                        {restrictedCount} مقيّد
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {toggles.map(t => (
                      <div key={t.key} className="flex items-center justify-between rounded-lg border border-border/30 px-3 py-2 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <t.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-semibold">{t.label}</p>
                            <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={perms[t.key]}
                          onCheckedChange={() => togglePerm(admin.user_id, t.key)}
                          className="scale-75"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
