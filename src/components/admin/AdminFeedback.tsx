import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Star,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Calendar,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type EventFeedback = Tables<"event_feedback"> & {
  event?: {
    title: string;
  };
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

export const AdminFeedback = () => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<EventFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<EventFeedback | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from("event_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch event and profile details
      const feedbackWithDetails: EventFeedback[] = [];
      for (const item of data || []) {
        const [eventRes, profileRes] = await Promise.all([
          supabase.from("events").select("title").eq("id", item.event_id).single(),
          supabase.from("profiles").select("first_name, last_name, email").eq("id", item.user_id).single(),
        ]);

        feedbackWithDetails.push({
          ...item,
          event: eventRes.data || undefined,
          profile: profileRes.data || undefined,
        });
      }

      setFeedback(feedbackWithDetails);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load feedback.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getUserName = (profile: EventFeedback["profile"]) => {
    if (!profile) return "Unknown User";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email?.split("@")[0] || "Unknown User";
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">No rating</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground"
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating}/5</span>
      </div>
    );
  };

  // Stats
  const totalFeedback = feedback.length;
  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
    : "0";
  const fiveStarCount = feedback.filter((f) => f.rating === 5).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="font-display font-semibold text-lg">Customer Feedback</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Review customer feedback from events. All feedback is shown here for admin review.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlowCard className="p-4">
          <p className="text-2xl font-bold">{totalFeedback}</p>
          <p className="text-sm text-muted-foreground">Total Feedback</p>
        </GlowCard>
        <GlowCard className="p-4">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-amber-500">{avgRating}</p>
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          </div>
          <p className="text-sm text-muted-foreground">Average Rating</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">{fiveStarCount}</p>
          <p className="text-sm text-muted-foreground">5-Star Reviews</p>
        </GlowCard>
      </div>

      {/* Feedback List */}
      {feedback.length === 0 ? (
        <GlowCard className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium">No feedback yet</p>
          <p className="text-sm text-muted-foreground mt-1">Customer feedback will appear here after events</p>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <GlowCard key={item.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold">{getUserName(item.profile)}</p>
                    {renderStars(item.rating)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {item.event?.title || "Unknown Event"}
                    </span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  {item.feedback && (
                    <p className="text-sm mt-2 line-clamp-2">{item.feedback}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFeedback(item);
                    setShowDetailDialog(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full
                </Button>
              </div>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Feedback Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Feedback Details
            </DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">From</p>
                <p className="font-medium">{getUserName(selectedFeedback.profile)}</p>
                {selectedFeedback.profile?.email && (
                  <p className="text-sm text-muted-foreground">{selectedFeedback.profile.email}</p>
                )}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Event</p>
                <p className="font-medium">{selectedFeedback.event?.title || "Unknown Event"}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Rating</p>
                {renderStars(selectedFeedback.rating)}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Feedback</p>
                <p className="mt-1">{selectedFeedback.feedback || "No written feedback provided"}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Submitted</p>
                <p className="font-medium">{formatDate(selectedFeedback.created_at)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
