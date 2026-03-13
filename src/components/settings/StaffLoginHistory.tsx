import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Clock, Monitor } from "lucide-react";

interface StaffLogin {
  id: string;
  user_id: string;
  ip_address: string | null;
  logged_in_at: string;
}

interface StaffLoginHistoryProps {
  teachers: { user_id: string; full_name: string; email: string }[];
  currentUserId: string;
  currentUserName: string;
}

export default function StaffLoginHistory({ teachers, currentUserId, currentUserName }: StaffLoginHistoryProps) {
  const [logins, setLogins] = useState<StaffLogin[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterUser, setFilterUser] = useState("all");

  const allStaff = [
    { user_id: currentUserId, full_name: currentUserName },
    ...teachers,
  ];

  const fetchLogins = async () => {
    setLoading(true);
    let query = supabase
      .from("staff_logins")
      .select("*")
      .order("logged_in_at", { ascending: false })
      .limit(100);

    if (filterUser !== "all") {
      query = query.eq("user_id", filterUser);
    }

    const { data } = await query;
    setLogins((data as StaffLogin[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogins();
  }, [filterUser]);

  const getName = (userId: string) => {
    const staff = allStaff.find((s) => s.user_id === userId);
    return staff?.full_name || "غير معروف";
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
    const time = d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  };

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="جميع المستخدمين" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المستخدمين</SelectItem>
              {allStaff.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogins} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {logins.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد سجلات دخول بعد</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الوقت</TableHead>
                <TableHead className="text-right hidden sm:table-cell">منذ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logins.map((login) => {
                const { date, time } = formatDate(login.logged_in_at);
                return (
                  <TableRow key={login.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                          <Monitor className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{getName(login.user_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{date}</TableCell>
                    <TableCell className="text-sm font-mono" dir="ltr">{time}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {getRelativeTime(login.logged_in_at)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center">يتم عرض آخر 100 عملية دخول</p>
    </div>
  );
}
