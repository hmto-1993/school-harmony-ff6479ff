import { useEffect, useState } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, GraduationCap, Megaphone, MessageSquare, FileImage } from "lucide-react";
import AnnouncementsTab from "@/components/announcements/AnnouncementsTab";
import ParentMessagesInbox from "@/components/parent/ParentMessagesInbox";
import SMSTab from "@/components/notifications/SMSTab";
import ExcuseReviewTab from "@/components/notifications/ExcuseReviewTab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTeacherPermissions } from "@/hooks/useTeacherPermissions";

interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  students: { full_name: string } | null;
}

export default function NotificationsPage() {
  const { perms } = useTeacherPermissions();
  const isReadOnly = perms.read_only_mode;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = usePersistedState("notifications_active_tab", "announcements");

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, message, is_read, created_at, students(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications((data as Notification[]) || []);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        <p className="text-muted-foreground">إشعارات النظام وإرسال رسائل SMS لأولياء الأمور</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="announcements" className="gap-1.5">
            <Megaphone className="h-4 w-4" />
            الإعلانات العامة
          </TabsTrigger>
          <TabsTrigger value="excuses" className="gap-1.5">
            <FileImage className="h-4 w-4" />
            مراجعة الأعذار
          </TabsTrigger>
          {!isReadOnly && (
            <TabsTrigger value="send-sms" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              إرسال رسالة SMS
            </TabsTrigger>
          )}
          <TabsTrigger value="parent-messages" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            رسائل أولياء الأمور
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Bell className="h-4 w-4" />
            سجل الإشعارات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements">
          <AnnouncementsTab readOnly={isReadOnly} />
        </TabsContent>

        <TabsContent value="excuses" className="space-y-4">
          <ExcuseReviewTab isReadOnly={isReadOnly} />
        </TabsContent>

        {!isReadOnly && (
          <TabsContent value="send-sms" className="space-y-4">
            <SMSTab isReadOnly={isReadOnly} onNotificationSent={fetchNotifications} />
          </TabsContent>
        )}

        <TabsContent value="parent-messages">
          <ParentMessagesInbox />
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-3 opacity-30" />
                  <p>لا توجد إشعارات</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((n) => (
                <Card key={n.id} className={`shadow-card transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        n.type === "absent" ? "bg-destructive/10 text-destructive"
                        : n.type === "summon" ? "bg-orange-100 text-orange-600"
                        : n.type === "grades" ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {n.type === "summon" ? <Megaphone className="h-4 w-4" />
                         : n.type === "grades" ? <GraduationCap className="h-4 w-4" />
                         : <Bell className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">{n.students?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleDateString("ar-SA")} -{" "}
                          {new Date(n.created_at).toLocaleTimeString("ar-SA")}
                        </p>
                      </div>
                    </div>
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
