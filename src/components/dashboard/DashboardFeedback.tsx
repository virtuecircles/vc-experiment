import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Star, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  event_date: string;
}

interface Feedback {
  id: string;
  event_id: string;
  rating: number | null;
  feedback: string | null;
  created_at: string | null;
  events?: Event;
}

interface DashboardFeedbackProps {
  userId: string;
}

export const DashboardFeedback = ({ userId }: DashboardFeedbackProps) => {
  const { toast } = useToast();
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [submittedFeedback, setSubmittedFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFeedbackData();
  }, [userId]);

  const fetchFeedbackData = async () => {
    try {
      // Fetch submitted feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("event_feedback")
        .select(`
          id,
          event_id,
          rating,
          feedback,
          created_at,
          events (
            id,
            title,
            event_date
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (feedbackError) throw feedbackError;
      setSubmittedFeedback((feedbackData as unknown as Feedback[]) || []);

      // Fetch attended events without feedback (via meetup_attendance OR rsvp confirmed/attended)
      const feedbackEventIds = (feedbackData || []).map(f => f.event_id);

      // Check meetup_attendance for events where user attended
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("meetup_attendance")
        .select(`
          event_id,
          events (
            id,
            title,
            event_date
          )
        `)
        .eq("user_id", userId)
        .eq("attended", true);

      if (attendanceError) throw attendanceError;

      const attendedEvents = (attendanceData || [])
        .map(r => (r as any).events as Event)
        .filter(e => e && !feedbackEventIds.includes(e.id));
      
      setPendingEvents(attendedEvents);
    } catch (error) {
      console.error("Error fetching feedback data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedEvent || rating === 0) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_feedback")
        .insert({
          user_id: userId,
          event_id: selectedEvent,
          rating,
          feedback: feedbackText || null,
        });

      if (error) throw error;
      
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      
      setSelectedEvent(null);
      setRating(0);
      setFeedbackText("");
      fetchFeedbackData();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to submit feedback.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Feedback */}
      {pendingEvents.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Meetups Awaiting Feedback
          </h3>
          
          <div className="space-y-4">
            {pendingEvents.map((event) => (
              <GlowCard key={event.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-display font-bold">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.event_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {selectedEvent === event.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Rating</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-8 w-8 transition-colors ${
                                star <= rating
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="feedback">Feedback (optional)</Label>
                      <Textarea
                        id="feedback"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Share your thoughts about the event..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedEvent(null);
                          setRating(0);
                          setFeedbackText("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="neon"
                        onClick={handleSubmitFeedback}
                        disabled={rating === 0 || submitting}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {submitting ? "Submitting..." : "Submit Feedback"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedEvent(event.id)}
                  >
                    Leave Feedback
                  </Button>
                )}
              </GlowCard>
            ))}
          </div>
        </div>
      )}

      {/* Submitted Feedback History */}
      <div>
        <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Feedback History
        </h3>
        
        {submittedFeedback.length > 0 ? (
          <div className="space-y-4">
            {submittedFeedback.map((feedback) => (
              <GlowCard key={feedback.id} className="p-6 opacity-80">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-display font-bold">{feedback.events?.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feedback.events?.event_date && new Date(feedback.events.event_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= (feedback.rating || 0)
                            ? "fill-amber-500 text-amber-500"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {feedback.feedback && (
                  <p className="text-sm text-muted-foreground mt-2">{feedback.feedback}</p>
                )}
              </GlowCard>
            ))}
          </div>
        ) : (
          <GlowCard className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-display font-bold mb-2">No Feedback Yet</h4>
          <p className="text-muted-foreground">
              Your feedback history will appear here after you attend and review meetups.
            </p>
          </GlowCard>
        )}
      </div>
    </div>
  );
};
