import { useEffect, useState } from "react";
import { useCalendarType, formatDateShort } from "@/hooks/use-calendar-type";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target_class_ids: string[];
  created_at: string;
}

interface StudentAnnouncementsProps {
  classId?: string | null;
}

export default function StudentAnnouncements({ classId }: StudentAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      // Filter: show "all" announcements + ones targeting student's class
      const filtered = (data as Announcement[]).filter((a) => {
        if (a.target_type === "all") return true;
        if (classId && a.target_class_ids?.includes(classId)) return true;
        return false;
      });
      setAnnouncements(filtered);
    }
  };

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        الإعلانات
      </h2>
      {announcements.map((ann) => (
        <Card key={ann.id} className="border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{ann.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ann.body}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(ann.created_at).toLocaleDateString("ar-SA")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
