import { useState, useEffect, useRef } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Lock, Users, Flag, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  created_at: string | null;
  user_id: string;
  circle_id: string;
  sender_name?: string;
  is_guide?: boolean;
}

interface Circle {
  id: string;
  name: string;
  status: string | null;
  primary_virtue?: string | null;
}

interface GuideCircleAssignment {
  circle_id: string;
  circles: Circle;
}

interface FlaggedMessage {
  id: string;
  message_id: string;
  reason: string | null;
  status: string | null;
  flagged_at: string;
  flagged_by: string;
  circle_messages: {
    id: string;
    content: string;
    user_id: string;
    circle_id: string;
    created_at: string | null;
    sender_name?: string;
  } | null;
  flagger_name?: string;
}

interface DashboardMessagesProps {
  userId: string;
}

const virtueIcons: Record<string, string> = {
  Wisdom: "🦉",
  Courage: "🔥",
  Humanity: "❤️",
  Justice: "⚖️",
  Temperance: "🏛️",
  Transcendence: "✨",
  Balanced: "⚖️",
};

const FLAG_REASONS = [
  { value: "inappropriate", label: "🚫 Inappropriate content" },
  { value: "harassment", label: "⚠️ Harassment or bullying" },
  { value: "spam", label: "📢 Spam or irrelevant" },
  { value: "other", label: "💬 Other" },
];

// ─── Flag Modal ───────────────────────────────────────────────────────────────
const FlagModal = ({
  message,
  onClose,
  onSubmit,
}: {
  message: Message;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) => {
  const [selected, setSelected] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl p-7 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-display font-bold mb-1 flex items-center gap-2">
          <Flag className="h-5 w-5 text-destructive" /> Flag This Message
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Our VC Guide and team will review this message. Thank you for helping keep Virtue Circles safe.
        </p>

        {/* Preview */}
        <div className="bg-muted/40 border border-border rounded-lg p-3 mb-5">
          <p className="text-xs text-muted-foreground mb-1">Message from {message.sender_name}</p>
          <p className="text-sm text-foreground/80 italic">
            "{message.content.length > 100 ? message.content.slice(0, 100) + "…" : message.content}"
          </p>
        </div>

        <p className="text-sm text-muted-foreground mb-3">Reason for flagging:</p>
        <div className="flex flex-col gap-2 mb-6">
          {FLAG_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                selected === r.value
                  ? "bg-primary/20 border-primary/50 text-foreground"
                  : "bg-muted/20 border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="neon"
            className="flex-1"
            disabled={!selected || submitting}
            onClick={async () => {
              setSubmitting(true);
              await onSubmit(selected);
              setSubmitting(false);
            }}
          >
            {submitting ? "Submitting…" : "Submit Flag"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({
  message,
  isOwn,
  onFlag,
}: {
  message: Message;
  isOwn: boolean;
  onFlag: () => void;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2 items-end`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar for others */}
      {!isOwn && (
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            message.is_guide
              ? "bg-gradient-to-br from-primary/60 to-accent/60 text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {message.is_guide ? "🏛️" : (message.sender_name?.[0]?.toUpperCase() || "?")}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Name + guide badge */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-xs text-muted-foreground">{message.sender_name || "Member"}</span>
            {message.is_guide && (
              <span className="text-[10px] font-semibold bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full tracking-wide">
                VC GUIDE
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isOwn
              ? "bg-primary/80 text-primary-foreground rounded-br-sm"
              : message.is_guide
              ? "bg-primary/10 border border-primary/20 text-foreground rounded-bl-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Timestamp + flag */}
        <div className={`flex items-center gap-2 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-[11px] text-muted-foreground/60">
            {message.created_at &&
              new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {!isOwn && hovered && (
            <button
              onClick={onFlag}
              className="text-[11px] text-destructive/50 hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <Flag className="h-3 w-3" /> Flag
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Chat Window ──────────────────────────────────────────────────────────────
const CircleChatWindow = ({
  circle,
  userId,
  isGuide,
}: {
  circle: Circle;
  userId: string;
  isGuide: boolean;
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [flagModal, setFlagModal] = useState<Message | null>(null);
  const nameCache = useRef<Record<string, { name: string; isGuide: boolean }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const isCircleActive = circle.status === "active";

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
  };

  const scrollToBottom = () => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const resolveSender = async (uid: string, forceRefresh = false): Promise<{ name: string; isGuide: boolean }> => {
    // Only use cache if we have a real name (not a fallback)
    const cached = nameCache.current[uid];
    if (cached && !forceRefresh && cached.name !== "Member") return cached;

    // Always use safe_member_profiles for circle-mate name resolution.
    // This view exposes only (id, first_name, last_name, city, virtues) — no PII.
    // Guides additionally get their own profile via the profiles table (own row access).
    const [safeRes, roleRes] = await Promise.all([
      supabase.from("safe_member_profiles" as "profiles").select("id, first_name, last_name").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "vc_guide").maybeSingle(),
    ]);
    const src = safeRes.data as { first_name: string | null; last_name: string | null } | null;
    const name = src
      ? [src.first_name, src.last_name].filter(Boolean).join(" ") || "Member"
      : "Member";
    const result = { name, isGuide: !!roleRes.data };
    nameCache.current[uid] = result;
    return result;
  };

  useEffect(() => {
    const load = async () => {
      // Pre-cache current user
      resolveSender(userId);

      const { data } = await supabase
        .from("circle_messages")
        .select("*")
        .eq("circle_id", circle.id)
        .order("created_at", { ascending: true })
        .limit(100);

      const uids = [...new Set((data || []).map((m) => m.user_id))];
      await Promise.all(uids.map((uid) => resolveSender(uid)));

      setMessages(
        (data || []).map((m) => ({
          ...m,
          sender_name: nameCache.current[m.user_id]?.name || "Member",
          is_guide: nameCache.current[m.user_id]?.isGuide || false,
        }))
      );
      isNearBottom.current = true;
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
    };

    load();

    const channel = supabase
      .channel(`circle-messages-${circle.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "circle_messages", filter: `circle_id=eq.${circle.id}` },
        async (payload) => {
          const msg = payload.new as Message;
          if (msg.user_id === userId) return;
          const sender = await resolveSender(msg.user_id);
          setMessages((prev) => [...prev, { ...msg, sender_name: sender.name, is_guide: sender.isGuide }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circle.id, userId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      toast({ title: "Message too long", description: "Max 2,000 characters.", variant: "destructive" });
      return;
    }

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const sender = nameCache.current[userId] || { name: "You", isGuide };
    const optimistic: Message = {
      id: tempId, content: trimmed, created_at: new Date().toISOString(),
      user_id: userId, circle_id: circle.id, sender_name: sender.name, is_guide: sender.isGuide,
    };
    setMessages((p) => [...p, optimistic]);
    setNewMessage("");
    isNearBottom.current = true;

    try {
      const { data, error } = await supabase
        .from("circle_messages")
        .insert({ circle_id: circle.id, user_id: userId, content: trimmed })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setMessages((p) => p.map((m) => m.id === tempId ? { ...data, sender_name: sender.name, is_guide: sender.isGuide } : m));
      }
    } catch {
      setMessages((p) => p.filter((m) => m.id !== tempId));
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleFlag = async (messageId: string, reason: string) => {
    const { data: existing } = await supabase
      .from("message_flags")
      .select("id")
      .eq("message_id", messageId)
      .eq("flagged_by", userId)
      .maybeSingle();

    if (existing) {
      toast({ title: "Already flagged", description: "You have already flagged this message." });
      return;
    }

    const { error } = await supabase.from("message_flags").insert({
      message_id: messageId,
      flagged_by: userId,
      reason,
      status: "pending",
    });

    if (error) {
      toast({ title: "Error", description: "Could not flag message.", variant: "destructive" });
    } else {
      toast({ title: "✓ Flagged", description: "Our team will review this message shortly." });
    }
    setFlagModal(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <GlowCard className="p-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-xl">
            {virtueIcons[circle.primary_virtue || ""] || "🏛️"}
          </div>
          <div>
            <h3 className="font-display font-bold">{circle.name}</h3>
            <p className="text-sm text-muted-foreground">
              Circle Chat · messages only visible to your circle
            </p>
          </div>
          {isGuide && (
            <Badge className="ml-auto bg-primary/20 text-primary border border-primary/30 text-xs">
              VC GUIDE
            </Badge>
          )}
        </div>
      </GlowCard>

      {/* Messages + Input */}
      <GlowCard className="flex flex-col flex-1 p-4 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.user_id === userId}
                onFlag={() => setFlagModal(msg)}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {isCircleActive ? (
          <div className="flex gap-2 pt-3 flex-shrink-0 border-t border-border/40 mt-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder="Type a message..."
              disabled={sending}
            />
            <Button variant="neon" size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 pt-3 flex-shrink-0 border-t border-border/40 mt-3 text-muted-foreground text-sm">
            <Lock className="h-4 w-4" />
            This circle is completed — messaging is closed.
          </div>
        )}
      </GlowCard>

      {flagModal && (
        <FlagModal
          message={flagModal}
          onClose={() => setFlagModal(null)}
          onSubmit={(reason) => handleFlag(flagModal.id, reason)}
        />
      )}
    </div>
  );
};

// ─── Flagged Messages Panel (Guide/Admin) ─────────────────────────────────────
const FlaggedMessagesPanel = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [flags, setFlags] = useState<FlaggedMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFlags(); }, []);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_flags")
        .select(`
          id, message_id, reason, status, flagged_at, flagged_by,
          circle_messages ( id, content, user_id, circle_id, created_at )
        `)
        .eq("status", "pending")
        .order("flagged_at", { ascending: false });

      if (error) throw error;

      // Resolve flagger names — use safe_member_profiles to avoid PII exposure
      const enriched = await Promise.all(
        (data || []).map(async (f) => {
          const { data: p } = await supabase
            .from("safe_member_profiles" as "profiles")
            .select("id, first_name, last_name")
            .eq("id", f.flagged_by)
            .maybeSingle();
          const sp = p as { first_name: string | null; last_name: string | null } | null;
          return {
            ...f,
            circle_messages: f.circle_messages as FlaggedMessage["circle_messages"],
            flagger_name: sp ? [sp.first_name, sp.last_name].filter(Boolean).join(" ") || "Member" : "Unknown",
          };
        })
      );
      setFlags(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, flagId: string) => {
    await supabase.from("circle_messages").update({
      content: "[This message was removed by a moderator]",
    }).eq("id", messageId);
    await supabase.from("message_flags").update({
      status: "actioned", reviewed_by: userId, reviewed_at: new Date().toISOString(),
    }).eq("id", flagId);
    setFlags((p) => p.filter((f) => f.id !== flagId));
    toast({ title: "✓ Message removed" });
  };

  const handleDismiss = async (flagId: string) => {
    await supabase.from("message_flags").update({
      status: "dismissed", reviewed_by: userId, reviewed_at: new Date().toISOString(),
    }).eq("id", flagId);
    setFlags((p) => p.filter((f) => f.id !== flagId));
    toast({ title: "✓ Flag dismissed" });
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <GlowCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-display font-bold">Flagged Messages</h3>
        {flags.length > 0 && <Badge className="bg-destructive/20 text-destructive border-destructive/30">{flags.length} pending</Badge>}
      </div>
      {flags.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No pending flagged messages.</p>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.id} className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                  🚩 {flag.reason?.replace("_", " ") || "Flagged"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(flag.flagged_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 mb-3">
                <p className="text-xs text-muted-foreground mb-1">Message:</p>
                <p className="text-sm text-foreground/80">"{flag.circle_messages?.content}"</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Flagged by: {flag.flagger_name}</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                  onClick={() => flag.circle_messages && handleDeleteMessage(flag.circle_messages.id, flag.id)}
                >
                  🗑️ Remove Message
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-500 border-green-500/30 hover:bg-green-500/10 text-xs"
                  onClick={() => handleDismiss(flag.id)}
                >
                  ✓ Dismiss Flag
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DashboardMessages = ({ userId }: DashboardMessagesProps) => {
  const { isVCGuide, hasAnyAdminAccess } = useUserRoles();
  const [memberCircles, setMemberCircles] = useState<Circle[]>([]);
  const [guideCircles, setGuideCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"chat" | "flags">("chat");

  useEffect(() => {
    const load = async () => {
      if (isVCGuide || hasAnyAdminAccess) {
        // Guide: load all assigned circles (active only for messaging)
        const { data } = await supabase
          .from("guide_circle_assignments")
          .select("circle_id, circles ( id, name, status, primary_virtue )")
          .eq("guide_id", userId)
          .eq("is_active", true);

        const circles = (data || [])
          .map((d: any) => d.circles)
          .filter((c: any) => c && c.status === "active") as Circle[];
        setGuideCircles(circles);
        if (circles.length > 0) setSelectedCircle(circles[0]);
      } else {
        // Member: load only circles with status=active
        const { data } = await supabase
          .from("circle_members")
          .select("circles ( id, name, status, primary_virtue )")
          .eq("user_id", userId)
          .eq("status", "active")
          .is("left_at", null);

        const circles = (data || [])
          .map((d: any) => d.circles)
          .filter((c: any) => c && c.status === "active") as Circle[];
        setMemberCircles(circles);
        if (circles.length > 0) setSelectedCircle(circles[0]);
      }
      setLoading(false);
    };
    load();
  }, [userId, isVCGuide, hasAnyAdminAccess]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isGuide = isVCGuide || hasAnyAdminAccess;
  // Combine guide + member circles for tab rendering
  const allCircles = isGuide ? guideCircles : memberCircles;

  // ── Shared circle tab bar + chat renderer ──────────────────────────────────
  const circleTabBar = (
    <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto scrollbar-none">
      {allCircles.map((c) => (
        <button
          key={c.id}
          onClick={() => { setSelectedCircle(c); setView("chat"); }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
            selectedCircle?.id === c.id && view === "chat"
              ? "bg-gradient-to-r from-primary to-accent text-white border-transparent"
              : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40"
          }`}
        >
          {virtueIcons[c.primary_virtue || ""] || "🏛️"} {c.name}
        </button>
      ))}
      {isGuide && (
        <button
          onClick={() => setView("flags")}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ml-auto ${
            view === "flags"
              ? "bg-destructive/20 border-destructive/50 text-destructive"
              : "bg-muted/40 border-border text-muted-foreground hover:border-destructive/40"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Flagged
        </button>
      )}
    </div>
  );

  // ── Guide / Admin view ─────────────────────────────────────────────────────
  if (isGuide) {
    if (guideCircles.length === 0 && view === "chat") {
      return (
        <div className="flex flex-col h-full gap-3">
          {/* Always show Flagged tab even if no active circles */}
          <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setView("flags")}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ml-auto bg-muted/40 border-border text-muted-foreground hover:border-destructive/40"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Flagged
            </button>
          </div>
          <GlowCard className="p-8 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-bold mb-1">No active circles assigned</p>
            <p className="text-sm text-muted-foreground">You have no active circles. Completed circles are read-only.</p>
          </GlowCard>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full gap-3">
        {/* Tab bar — always visible for guides, showing all active circles */}
        <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto scrollbar-none">
          {guideCircles.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedCircle(c); setView("chat"); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedCircle?.id === c.id && view === "chat"
                  ? "bg-gradient-to-r from-primary to-accent text-white border-transparent"
                  : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {virtueIcons[c.primary_virtue || ""] || "🏛️"} {c.name}
            </button>
          ))}
          <button
            onClick={() => setView("flags")}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ml-auto ${
              view === "flags"
                ? "bg-destructive/20 border-destructive/50 text-destructive"
                : "bg-muted/40 border-border text-muted-foreground hover:border-destructive/40"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Flagged
          </button>
        </div>
        {view === "flags" ? (
          <div className="flex-1 overflow-y-auto">
            <FlaggedMessagesPanel userId={userId} />
          </div>
        ) : selectedCircle ? (
          <CircleChatWindow circle={selectedCircle} userId={userId} isGuide={true} />
        ) : null}
      </div>
    );
  }

  // ── Member view ────────────────────────────────────────────────────────────
  if (memberCircles.length === 0) {
    return (
      <GlowCard className="p-8">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-display font-bold mb-2">No Active Circle</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You'll be able to message your circle members once you've been assigned to a circle.
            Complete your virtue quiz to get matched!
          </p>
        </div>
      </GlowCard>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {memberCircles.length > 1 && circleTabBar}
      {selectedCircle
        ? <CircleChatWindow circle={selectedCircle} userId={userId} isGuide={false} />
        : null
      }
    </div>
  );
};
