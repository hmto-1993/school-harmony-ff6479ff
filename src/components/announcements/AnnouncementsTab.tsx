import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Megaphone, Send, Trash2, Globe, Users, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface Announcement {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target_class_ids: string[];
  is_active: boolean;
  created_at: string;
  created_by: string;
}

interface ClassOption {
  id: string;
  name: string;
}

export default function AnnouncementsTab() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "classes">("all");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  useEffect(() => {
    fetchAnnouncements();
    fetchClasses();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setAnnouncements((data as Announcement[]) || []);
    setLoading(false);
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("id, name").order("name");
    setClasses(data || []);
  };

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "تنبيه", description: "يرجى ملء العنوان والرسالة", variant: "destructive" });
      return;
    }
    if (targetType === "classes" && selectedClassIds.length === 0) {
      toast({ title: "تنبيه", description: "يرجى اختيار فصل واحد على الأقل", variant: "destructive" });
      return;
    }

    setSending(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      created_by: user?.id || "",
      target_type: targetType,
      target_class_ids: targetType === "classes" ? selectedClassIds : [],
    });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم", description: "تم إرسال الإعلان بنجاح" });
      setTitle("");
      setBody("");
      setTargetType("all");
      setSelectedClassIds([]);
      setDialogOpen(false);
      fetchAnnouncements();

      // Also send push notification
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            title: title.trim(),
            body: body.trim(),
            classIds: targetType === "classes" ? selectedClassIds : [],
          },
        });
      } catch (e) {
        // Push is best-effort
      }
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    fetchAnnouncements();
    toast({ title: "تم", description: "تم حذف الإعلان" });
  };

  const getClassName = (id: string) => classes.find((c) => c.id === id)?.name || id;

  return (
    <div className="space-y-4">
      {/* New Announcement Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">إرسال إعلان عام للطلاب وأولياء الأمور</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Megaphone className="h-4 w-4" />
              إعلان جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>إرسال إعلان جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">عنوان الإعلان</Label>
                <Input
                  placeholder="مثال: إعلان مهم"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">نص الإعلان</Label>
                <Textarea
                  rows={4}
                  placeholder="اكتب نص الإعلان هنا..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="resize-none"
                />
              </div>

              {/* Target Selection */}
              <div className="space-y-2">
                <Label className="text-xs">الجمهور المستهدف</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={targetType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTargetType("all")}
                    className="gap-1.5"
                  >
                    <Globe className="h-4 w-4" />
                    جميع الطلاب
                  </Button>
                  <Button
                    type="button"
                    variant={targetType === "classes" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTargetType("classes")}
                    className="gap-1.5"
                  >
                    <Users className="h-4 w-4" />
                    فصول محددة
                  </Button>
                </div>
              </div>

              {targetType === "classes" && (
                <div className="space-y-2 max-h-40 overflow-auto border rounded-lg p-3">
                  {classes.map((cls) => (
                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1">
                      <Checkbox
                        checked={selectedClassIds.includes(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                      />
                      <span className="text-sm">{cls.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button onClick={handleSend} disabled={sending} className="gap-1.5">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "جارٍ الإرسال..." : "إرسال الإعلان"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Megaphone className="h-12 w-12 mb-3 opacity-30" />
            <p>لا توجد إعلانات</p>
          </CardContent>
        </Card>
      ) : (
        announcements.map((ann) => (
          <Card key={ann.id} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ann.body}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={ann.target_type === "all" ? "default" : "secondary"} className="text-xs">
                        {ann.target_type === "all" ? "جميع الطلاب" : `${ann.target_class_ids?.length || 0} فصول`}
                      </Badge>
                      {ann.target_type === "classes" && ann.target_class_ids?.map((cid) => (
                        <Badge key={cid} variant="outline" className="text-xs">{getClassName(cid)}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {new Date(ann.created_at).toLocaleDateString("ar-SA")} - {new Date(ann.created_at).toLocaleTimeString("ar-SA")}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(ann.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
