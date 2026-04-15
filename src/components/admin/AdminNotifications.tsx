import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Bell,
  Send,
  HelpCircle,
  Users,
  UserCircle,
  Search,
  Mail,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  current_plan: string | null;
  subscription_status: string | null;
}

interface EmailLog {
  id: string;
  email_type: string;
  subject: string;
  recipient_count: number;
  recipient_emails: string[] | null;
  sent_at: string;
  status: string;
  error_message: string | null;
}

type RecipientFilter = "all" | "paid" | "pathfinder";
type SendMode = "in-app" | "email" | "both";

export const AdminNotifications = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("all");
  const [sendMode, setSendMode] = useState<SendMode>("in-app");
  const [emailHistorySearch, setEmailHistorySearch] = useState("");
  const [emailTypeFilter, setEmailTypeFilter] = useState("all");

  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    type: "announcement" as "event_reminder" | "schedule_update" | "retest_available" | "announcement" | "circle_assignment" | "message",
    emailSubject: "",
    emailBody: "",
    ctaUrl: "",
    ctaLabel: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchEmailLogs();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, current_plan, subscription_status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to load members.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailLogs = async () => {
    try {
      const { data } = await supabase
        .from("email_logs" as any)
        .select("id, email_type, subject, recipient_count, recipient_emails, sent_at, status, error_message")
        .order("sent_at", { ascending: false })
        .limit(50);
      setEmailLogs((data as unknown as EmailLog[]) || []);
    } catch (error) {
      console.error("Error fetching email logs:", error);
    }
  };

  const filteredEmailLogs = emailLogs.filter((log) => {
    if (emailTypeFilter !== "all" && log.email_type !== emailTypeFilter) return false;
    if (!emailHistorySearch) return true;
    const s = emailHistorySearch.toLowerCase();
    return (
      log.subject?.toLowerCase().includes(s) ||
      log.email_type?.toLowerCase().includes(s) ||
      (log.recipient_emails as unknown as string[] | null)?.some((e) => e.toLowerCase().includes(s))
    );
  });

  const filteredUsers = users.filter((user) => {
    // Recipient filter
    if (recipientFilter === "paid" && user.subscription_status !== "active") return false;
    if (recipientFilter === "pathfinder" && user.current_plan !== "pathfinder") return false;
    // Search filter
    const s = searchTerm.toLowerCase();
    return (
      !s ||
      user.email?.toLowerCase().includes(s) ||
      user.first_name?.toLowerCase().includes(s) ||
      user.last_name?.toLowerCase().includes(s)
    );
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedUsers(checked ? filteredUsers.map((u) => u.id) : []);
  };

  // Apply filter quick-select
  const applyFilterSelection = (filter: RecipientFilter) => {
    setRecipientFilter(filter);
    setSelectAll(false);
    setSelectedUsers([]);
  };

  const handleSendNotification = async () => {
    if (selectedUsers.length === 0) {
      toast({ title: "No Recipients", description: "Please select at least one user.", variant: "destructive" });
      return;
    }
    const needsTitle = sendMode !== "email" && !notificationForm.title;
    const needsSubject = sendMode !== "in-app" && !notificationForm.emailSubject;
    if (needsTitle || needsSubject) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const selectedProfiles = users.filter((u) => selectedUsers.includes(u.id));

      // In-app notifications
      if (sendMode === "in-app" || sendMode === "both") {
        const notifications = selectedUsers.map((userId) => ({
          user_id: userId,
          title: notificationForm.title,
          message: notificationForm.message,
          type: notificationForm.type,
          is_read: false,
        }));
        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw error;
      }

      // Email
      if (sendMode === "email" || sendMode === "both") {
        const recipients = selectedProfiles
          .filter((p) => p.email)
          .map((p) => ({
            email: p.email!,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || undefined,
          }));

        const { data: { user } } = await supabase.auth.getUser();

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              recipients,
              subject: notificationForm.emailSubject || notificationForm.title,
              title: notificationForm.emailSubject || notificationForm.title,
              body: notificationForm.emailBody || notificationForm.message,
              type: "manual",
              email_type: "manual_blast",
              sent_by: user?.id,
              ...(notificationForm.ctaUrl && { cta_url: notificationForm.ctaUrl, cta_label: notificationForm.ctaLabel || "Learn More" }),
            }),
          }
        );

        if (!res.ok) throw new Error("Email send failed");
        await fetchEmailLogs();
      }

      toast({
        title: "✓ Sent Successfully",
        description: `${sendMode === "both" ? "Notification & email" : sendMode === "email" ? "Email" : "Notification"} sent to ${selectedUsers.length} member(s).`,
      });

      setShowSendDialog(false);
      setSelectedUsers([]);
      setSelectAll(false);
      setNotificationForm({ title: "", message: "", type: "announcement", emailSubject: "", emailBody: "", ctaUrl: "", ctaLabel: "" });
    } catch (error) {
      console.error("Error sending:", error);
      toast({ title: "Error", description: "Failed to send. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const getUserName = (user: Profile) => {
    if (user.first_name || user.last_name) return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return user.email?.split("@")[0] || "Unknown";
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const statusIcon = (status: string) => {
    if (status === "sent") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="send" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="send" className="gap-2"><Bell className="h-4 w-4" /> Send Notifications</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Email History</TabsTrigger>
        </TabsList>

        {/* ─── SEND TAB ─── */}
        <TabsContent value="send" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-lg">Send to Members</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Select members and send in-app notifications, emails, or both. Emails use a branded template from hello@notification.virtue-circles.com.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Button onClick={() => setShowSendDialog(true)} disabled={selectedUsers.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedUsers.length} Member(s)
            </Button>
          </div>

          {/* Filters + Search */}
          <GlowCard className="p-4 space-y-4">
            {/* Recipient filter quick-select */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground self-center">Filter:</span>
              {(["all", "paid", "pathfinder"] as RecipientFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={recipientFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyFilterSelection(f)}
                >
                  {f === "all" ? "All Members" : f === "paid" ? "Paid (Active)" : "Free (Pathfinder)"}
                </Button>
              ))}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={selectAll} onCheckedChange={handleSelectAll} id="select-all" />
                <Label htmlFor="select-all" className="cursor-pointer">
                  Select All ({filteredUsers.length})
                </Label>
              </div>
            </div>
          </GlowCard>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <GlowCard className="p-4">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </GlowCard>
            <GlowCard className="p-4">
              <p className="text-2xl font-bold text-primary">{selectedUsers.length}</p>
              <p className="text-sm text-muted-foreground">Selected</p>
            </GlowCard>
            <GlowCard className="p-4">
              <p className="text-2xl font-bold text-green-500">{filteredUsers.length}</p>
              <p className="text-sm text-muted-foreground">Matching Filter</p>
            </GlowCard>
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <GlowCard className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">No members found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different filter or search term</p>
              </GlowCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedUsers.includes(user.id)) {
                        setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                        setSelectAll(false);
                      } else {
                        setSelectedUsers([...selectedUsers, user.id]);
                      }
                    }}
                  >
                    <GlowCard
                      className={`p-4 transition-colors ${selectedUsers.includes(user.id) ? "border-primary bg-primary/5" : "hover:border-primary/30"}`}
                      hover={false}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedUsers([...selectedUsers, user.id]);
                            else { setSelectedUsers(selectedUsers.filter((id) => id !== user.id)); setSelectAll(false); }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <UserCircle className="h-8 w-8 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{getUserName(user)}</p>
                          {user.email && <p className="text-sm text-muted-foreground truncate">{user.email}</p>}
                        </div>
                        <Badge variant={user.subscription_status === "active" ? "default" : "secondary"} className="text-xs shrink-0">
                          {user.current_plan || "pathfinder"}
                        </Badge>
                      </div>
                    </GlowCard>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── EMAIL HISTORY TAB ─── */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg">Email History</h2>
            <Button variant="outline" size="sm" onClick={fetchEmailLogs}>Refresh</Button>
          </div>
          <GlowCard className="p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              All system emails are logged here — including auth emails (signup, password reset, magic link) and automated emails (welcome, event reminders, admin blasts).
            </p>
          </GlowCard>
          {/* Search / Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject or recipient email..."
                value={emailHistorySearch}
                onChange={(e) => setEmailHistorySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={emailTypeFilter} onValueChange={setEmailTypeFilter}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="signup">Account Confirmation</SelectItem>
                <SelectItem value="recovery">Password Reset</SelectItem>
                <SelectItem value="magiclink">Magic Link</SelectItem>
                <SelectItem value="invite">Invite</SelectItem>
                <SelectItem value="email_change">Email Change</SelectItem>
                <SelectItem value="welcome">Welcome Email</SelectItem>
                <SelectItem value="meetup_reminder">Event Reminder</SelectItem>
                <SelectItem value="manual_blast">Admin Blast</SelectItem>
                <SelectItem value="retest_available">Retest Available</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredEmailLogs.length === 0 ? (
            <GlowCard className="p-8 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium">No emails sent yet</p>
              <p className="text-sm text-muted-foreground mt-1">All sent emails will appear here once triggered</p>
            </GlowCard>
          ) : (
            <div className="space-y-2">
              {filteredEmailLogs.map((log) => (
                <GlowCard key={log.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">{statusIcon(log.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{log.subject}</p>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {({
                            signup: "Account Confirmation",
                            recovery: "Password Reset",
                            magiclink: "Magic Link",
                            invite: "Invite",
                            email_change: "Email Change",
                            reauthentication: "Re-Authentication",
                            welcome: "Welcome Email",
                            meetup_reminder: "Event Reminder",
                            manual_blast: "Admin Blast",
                            retest_available: "Retest Available",
                          } as Record<string, string>)[log.email_type] || log.email_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm text-muted-foreground">{log.recipient_count} recipient(s)</p>
                        <span className="text-muted-foreground/40">·</span>
                        <p className="text-sm text-muted-foreground">{formatDate(log.sent_at)}</p>
                      </div>
                      {log.error_message && (
                        <p className="text-xs text-destructive mt-1 truncate">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── SEND DIALOG ─── */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send to {selectedUsers.length} Member(s)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Send mode toggle */}
            <div>
              <Label className="mb-2 block">Send As</Label>
              <div className="flex gap-2">
                {(["in-app", "email", "both"] as SendMode[]).map((m) => (
                  <Button
                    key={m}
                    variant={sendMode === m ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSendMode(m)}
                    className="flex-1"
                  >
                    {m === "in-app" ? <><Bell className="h-3.5 w-3.5 mr-1" /> In-App</> :
                     m === "email" ? <><Mail className="h-3.5 w-3.5 mr-1" /> Email</> :
                     <><Bell className="h-3.5 w-3.5 mr-1" /><Mail className="h-3.5 w-3.5 mr-1" /> Both</>}
                  </Button>
                ))}
              </div>
              {(sendMode === "email" || sendMode === "both") && (
                <p className="text-xs text-muted-foreground mt-2">
                  📧 Emails will be sent from <span className="font-medium">hello@notification.virtue-circles.com</span>
                </p>
              )}
            </div>

            {/* In-app fields */}
            {(sendMode === "in-app" || sendMode === "both") && (
              <>
                <div>
                  <Label>Notification Type</Label>
                  <Select
                    value={notificationForm.type}
                    onValueChange={(v) => setNotificationForm({ ...notificationForm, type: v as typeof notificationForm.type })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="event_reminder">Event Reminder</SelectItem>
                      <SelectItem value="schedule_update">Schedule Update</SelectItem>
                      <SelectItem value="retest_available">Retest Available</SelectItem>
                      <SelectItem value="circle_assignment">Circle Assignment</SelectItem>
                      <SelectItem value="message">Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notification Title *</Label>
                  <Input
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    placeholder="Enter notification title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Notification Message</Label>
                  <Textarea
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    placeholder="Short message shown in-app"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </>
            )}

            {/* Email fields */}
            {(sendMode === "email" || sendMode === "both") && (
              <>
                {sendMode === "both" && <hr className="border-border" />}
                <div>
                  <Label>Email Subject *</Label>
                  <Input
                    value={notificationForm.emailSubject}
                    onChange={(e) => setNotificationForm({ ...notificationForm, emailSubject: e.target.value })}
                    placeholder="Email subject line"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email Body *</Label>
                  <Textarea
                    value={notificationForm.emailBody}
                    onChange={(e) => setNotificationForm({ ...notificationForm, emailBody: e.target.value })}
                    placeholder="Write your email message here... Use line breaks for paragraphs."
                    className="mt-1"
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CTA Button URL (optional)</Label>
                    <Input
                      value={notificationForm.ctaUrl}
                      onChange={(e) => setNotificationForm({ ...notificationForm, ctaUrl: e.target.value })}
                      placeholder="https://..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>CTA Button Label</Label>
                    <Input
                      value={notificationForm.ctaLabel}
                      onChange={(e) => setNotificationForm({ ...notificationForm, ctaLabel: e.target.value })}
                      placeholder="e.g. Learn More"
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowSendDialog(false)}>Cancel</Button>
              <Button onClick={handleSendNotification} disabled={sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : `Send to ${selectedUsers.length}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
