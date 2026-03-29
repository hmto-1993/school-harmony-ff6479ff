import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MessageCircle, CalendarClock, Mail, MailOpen, Reply, Send, Loader2, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ParentMessage {
  id: string;
  student_id: string;
  class_id: string | null;
  message_type: string;
  subject: string;
  body: string;
  parent_name: string;
  parent_phone: string;
  status: string;
  teacher_reply: string;
  replied_at: string | null;
  created_at: string;
  students?: { full_name: string; class_id: string | null } | null;
}

export default function ParentMessagesInbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ParentMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("parent_messages")
      .select("*, students(full_name, class_id)")
      .order("created_at", { ascending: false })
      .limit(100);
    setMessages((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim() || !user) return;
    setReplying(true);

    const { error } = await supabase
      .from("parent_messages")
      .update({
        status: "replied",
        teacher_reply: replyText.trim(),
        replied_by: user.id,
        replied_at: new Date().toISOString(),
      })
      .eq("id", selectedMessage.id);

    setReplying(false);
    if (error) {
      toast({ title: "خطأ", description: "فشل إرسال الرد", variant: "destructive" });
    } else {
      toast({ title: "تم الرد ✓", description: "تم إرسال ردك بنجاح" });
      setSelectedMessage(null);
      setReplyText("");
      fetchMessages();
    }
  };

  const markAsRead = async (msg: ParentMessage) => {
    if (msg.status === "pending") {
      await supabase.from("parent_messages").update({ status: "read" }).eq("id", msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: "read" } : m));
    }
    setSelectedMessage(msg.status === "pending" ? { ...msg, status: "read" } : msg);
    setReplyText(msg.teacher_reply || "");
  };

  const pendingCount = messages.filter(m => m.status === "pending").length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px]">جديدة</Badge>;
      case "read":
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px]">مقروءة</Badge>;
      case "replied":
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]">تم الرد</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Inbox className="h-5 w-5 text-blue-500" />
              رسائل أولياء الأمور
              {pendingCount > 0 && (
                <Badge className="bg-amber-500 text-white text-xs px-2">{pendingCount} جديدة</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد رسائل من أولياء الأمور حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => markAsRead(msg)}
                  className={cn(
                    "w-full text-right p-4 rounded-xl border-2 transition-all hover:shadow-md",
                    msg.status === "pending"
                      ? "border-amber-400/40 bg-amber-50/50 dark:bg-amber-900/10"
                      : "border-border/40 bg-muted/20 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                      {msg.status === "pending" ? (
                        <Mail className="h-4 w-4 text-amber-500" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                      {msg.message_type === "appointment" ? (
                        <CalendarClock className="h-4 w-4 text-purple-500" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-sm font-bold truncate", msg.status === "pending" && "text-amber-700 dark:text-amber-400")}>
                          {msg.subject}
                        </p>
                        {statusBadge(msg.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {msg.parent_name} — الطالب: {(msg as any).students?.full_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(msg.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message detail dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(o) => { if (!o) setSelectedMessage(null); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMessage?.message_type === "appointment" ? (
                <CalendarClock className="h-5 w-5 text-purple-500" />
              ) : (
                <MessageCircle className="h-5 w-5 text-blue-500" />
              )}
              {selectedMessage?.message_type === "appointment" ? "طلب موعد" : "رسالة ولي أمر"}
            </DialogTitle>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-4">
              {/* Meta */}
              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{selectedMessage.parent_name}</span>
                  {statusBadge(selectedMessage.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  الطالب: {(selectedMessage as any).students?.full_name || "—"}
                </p>
                {selectedMessage.parent_phone && (
                  <p className="text-xs text-muted-foreground" dir="ltr">📱 {selectedMessage.parent_phone}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(selectedMessage.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* Subject & Body */}
              <div>
                <p className="text-sm font-bold text-foreground mb-1">{selectedMessage.subject}</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>

              {/* Previous reply */}
              {selectedMessage.status === "replied" && selectedMessage.teacher_reply && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border-2 border-emerald-500/20">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <Reply className="h-3 w-3" />
                    ردك السابق
                  </p>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{selectedMessage.teacher_reply}</p>
                </div>
              )}

              {/* Reply form */}
              {selectedMessage.status !== "replied" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">الرد على ولي الأمر</Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="min-h-[80px] resize-none rounded-xl"
                    maxLength={1000}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>إغلاق</Button>
            {selectedMessage?.status !== "replied" && (
              <Button
                onClick={handleReply}
                disabled={replying || !replyText.trim()}
                className="gap-2 bg-gradient-to-l from-blue-600 to-indigo-600 text-white"
              >
                {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                إرسال الرد
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
