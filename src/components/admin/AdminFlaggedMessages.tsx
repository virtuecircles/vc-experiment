import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Search, RefreshCw, Flag } from "lucide-react";

interface FlaggedItem {
  id: string;
  message_id: string;
  reason: string | null;
  status: string | null;
  flagged_at: string;
  flagged_by: string;
  flagger_name: string;
  message_content: string;
  message_sender: string;
  circle_name: string;
  circle_id: string;
}

export const AdminFlaggedMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [flags, setFlags] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"pending" | "actioned" | "dismissed" | "all">("pending");

  useEffect(() => { fetchFlags(); }, [filter]);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("message_flags")
        .select(`
          id, message_id, reason, status, flagged_at, flagged_by,
          circle_messages ( id, content, user_id, circle_id,
            circles ( name )
          )
        `)
        .order("flagged_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      } else {
        // "all" shows everything — no additional filter needed
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with names
      const enriched = await Promise.all(
        (data || []).map(async (f) => {
          const [flaggerRes, senderRes] = await Promise.all([
            supabase.from("profiles").select("first_name, last_name, email").eq("id", f.flagged_by).single(),
            f.circle_messages?.user_id
              ? supabase.from("profiles").select("first_name, last_name, email").eq("id", f.circle_messages.user_id).single()
              : Promise.resolve({ data: null }),
          ]);

          const flaggerData = flaggerRes.data;
          const senderData = (senderRes as any).data;

          return {
            id: f.id,
            message_id: f.message_id,
            reason: f.reason,
            status: f.status,
            flagged_at: f.flagged_at,
            flagged_by: f.flagged_by,
            flagger_name: flaggerData
              ? [flaggerData.first_name, flaggerData.last_name].filter(Boolean).join(" ") || flaggerData.email || "Unknown"
              : "Unknown",
            message_content: (f.circle_messages as any)?.content || "[deleted]",
            message_sender: senderData
              ? [senderData.first_name, senderData.last_name].filter(Boolean).join(" ") || senderData.email || "Unknown"
              : "Unknown",
            circle_name: (f.circle_messages as any)?.circles?.name || "Unknown Circle",
            circle_id: (f.circle_messages as any)?.circle_id || "",
          };
        })
      );

      setFlags(enriched);
    } catch (e) {
      console.error("Error fetching flagged messages:", e);
      toast({ title: "Error", description: "Failed to load flagged messages.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, flagId: string) => {
    if (!confirm("Remove this message? It will be replaced with a moderation notice.")) return;
    try {
      await supabase.from("circle_messages").update({
        content: "[This message was removed by a moderator]",
      }).eq("id", messageId);

      await supabase.from("message_flags").update({
        status: "actioned",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", flagId);

      toast({ title: "✓ Message removed" });
      fetchFlags();
    } catch {
      toast({ title: "Error", description: "Failed to remove message.", variant: "destructive" });
    }
  };

  const handleDismiss = async (flagId: string) => {
    try {
      await supabase.from("message_flags").update({
        status: "dismissed",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", flagId);

      toast({ title: "✓ Flag dismissed" });
      fetchFlags();
    } catch {
      toast({ title: "Error", description: "Failed to dismiss flag.", variant: "destructive" });
    }
  };

  const filtered = flags.filter((f) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      f.message_content.toLowerCase().includes(s) ||
      f.flagger_name.toLowerCase().includes(s) ||
      f.message_sender.toLowerCase().includes(s) ||
      f.circle_name.toLowerCase().includes(s)
    );
  });

  const pendingCount = flags.filter((f) => f.status === "pending").length;

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "pending": return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">Pending</Badge>;
      case "actioned": return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Actioned</Badge>;
      case "dismissed": return <Badge className="bg-muted text-muted-foreground">Dismissed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 className="font-display font-semibold text-lg">Flagged Messages</h2>
          {pendingCount > 0 && (
            <Badge className="bg-destructive/20 text-destructive border-destructive/30">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchFlags()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages, senders, circles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["pending", "actioned", "dismissed", "all"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlowCard className="p-3 text-center">
          <p className="text-xl font-bold text-amber-500">{flags.filter(f => f.status === "pending").length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </GlowCard>
        <GlowCard className="p-3 text-center">
          <p className="text-xl font-bold text-destructive">{flags.filter(f => f.status === "actioned").length}</p>
          <p className="text-xs text-muted-foreground">Actioned</p>
        </GlowCard>
        <GlowCard className="p-3 text-center">
          <p className="text-xl font-bold text-muted-foreground">{flags.filter(f => f.status === "dismissed").length}</p>
          <p className="text-xs text-muted-foreground">Dismissed</p>
        </GlowCard>
      </div>

      {/* Flag list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <GlowCard className="p-8 text-center">
          <Flag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">No flagged messages</p>
          <p className="text-sm text-muted-foreground">
            {filter === "pending" ? "No pending flags to review." : "No flags match your search."}
          </p>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((flag) => (
            <GlowCard key={flag.id} className="p-4 border-destructive/10">
              <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                    🚩 {flag.reason?.replace(/_/g, " ") || "Flagged"}
                  </span>
                  <span className="text-xs text-muted-foreground">· {flag.circle_name}</span>
                  {statusBadge(flag.status)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(flag.flagged_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="bg-muted/30 rounded-lg p-3 mb-3">
                <p className="text-xs text-muted-foreground mb-1">
                  From: <span className="text-foreground">{flag.message_sender}</span>
                </p>
                <p className="text-sm text-foreground/80 italic">"{flag.message_content}"</p>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                Flagged by: <span className="text-foreground">{flag.flagger_name}</span>
              </p>

              {flag.status === "pending" && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                    onClick={() => handleDeleteMessage(flag.message_id, flag.id)}
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
              )}
            </GlowCard>
          ))}
        </div>
      )}
    </div>
  );
};
