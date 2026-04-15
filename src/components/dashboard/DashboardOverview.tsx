import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Calendar, 
  Users, 
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

interface ConfirmedEvent {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
}

interface DashboardOverviewProps {
  profile: {
    first_name: string | null;
    current_plan: string | null;
    primary_virtue: string | null;
  } | null;
  upcomingEvent: {
    title: string;
    event_date: string;
  } | null;
  stats: {
    eventsMatched: number;
    eventsAttended: number;
  };
  onTabChange: (tab: string) => void;
  userId: string;
}

interface ActionItem {
  id: string;
  message: string;
  link?: string;
  tab?: string;
  linkText: string;
}

const virtueIcons: Record<string, string> = {
  Courage: "⚔️",
  Temperance: "⚖️",
  Justice: "🏛️",
  Wisdom: "🦉",
  Prudence: "🔮",
  Fortitude: "🛡️",
  Humanity: "❤️",
  Transcendence: "✨",
};

export const DashboardOverview = ({ 
  profile, 
  upcomingEvent, 
  stats,
  onTabChange,
  userId
}: DashboardOverviewProps) => {
  const navigate = useNavigate();
  const { subscribed, subscriptionTier, subscriptionStatus, founding100 } = useSubscription();
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [confirmedEvents, setConfirmedEvents] = useState<ConfirmedEvent[]>([]);
  const [eventsMatched, setEventsMatched] = useState(stats.eventsMatched);
  const [eventsAttended, setEventsAttended] = useState(stats.eventsAttended);
  const [completionSteps, setCompletionSteps] = useState<{ label: string; done: boolean }[]>([]);
  const [stepsLoaded, setStepsLoaded] = useState(false);
  
  const planLabels: Record<string, string> = {
    pathfinder: "Pathfinder",
    virtue_circles: "Virtue Circles",
    soulmatch_ai: "SoulMatch AI",
    founding_100: "Virtue Circles",
  };

  // Derive live plan name and status
  const livePlanKey = subscribed
    ? "virtue_circles"
    : (profile?.current_plan || "pathfinder");
  const livePlanName = planLabels[livePlanKey] || "Pathfinder";

  const statusLabel = subscriptionStatus === "trialing"
    ? "🎁 Trial"
    : subscriptionStatus === "active"
    ? "Active"
    : subscriptionStatus === "past_due"
    ? "⚠️ Past Due"
    : null;

  useEffect(() => {
    if (userId) {
      checkPendingActions();
      fetchEventStats();
    }
  }, [userId]);

  const fetchEventStats = async () => {
    try {
      // Fetch confirmed RSVPs with event details
      const { data: rsvpData, error: rsvpError } = await supabase
        .from("event_rsvps")
        .select(`
          event_id,
          status,
          attended_at,
          events (
            id,
            title,
            event_date,
            location
          )
        `)
        .eq("user_id", userId)
        .eq("status", "confirmed");

      if (rsvpError) throw rsvpError;

      // Also fetch events through circle membership
      const { data: circleData, error: circleError } = await supabase
        .from("circle_members")
        .select(`
          circle_id,
          status,
          circles (
            event_id,
            events (
              id,
              title,
              event_date,
              location
            )
          )
        `)
        .eq("user_id", userId)
        .eq("status", "active");

      if (circleError) throw circleError;

      // Combine events from RSVPs and circle memberships
      const rsvpEvents = (rsvpData || [])
        .filter((r: any) => r.events && new Date(r.events.event_date) >= new Date())
        .map((r: any) => ({
          id: r.events.id,
          title: r.events.title,
          event_date: r.events.event_date,
          location: r.events.location,
          source: 'rsvp'
        }));

      const circleEvents = (circleData || [])
        .filter((c: any) => c.circles?.events && new Date(c.circles.events.event_date) >= new Date())
        .map((c: any) => ({
          id: c.circles.events.id,
          title: c.circles.events.title,
          event_date: c.circles.events.event_date,
          location: c.circles.events.location,
          source: 'circle'
        }));

      // Merge and deduplicate by event id
      const allEvents = [...rsvpEvents, ...circleEvents];
      const uniqueEvents = allEvents.reduce((acc: ConfirmedEvent[], event) => {
        if (!acc.find(e => e.id === event.id)) {
          acc.push(event);
        }
        return acc;
      }, []);

      const sortedEvents = uniqueEvents.sort((a, b) => 
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      setConfirmedEvents(sortedEvents);

      // Count total events matched (RSVPs + circle events)
      const { count: rsvpCount } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const circleEventCount = (circleData || []).filter((c: any) => c.circles?.event_id).length;
      
      // Count unique events (avoid double counting)
      const rsvpEventIds = (rsvpData || []).map((r: any) => r.event_id);
      const uniqueCircleEvents = (circleData || []).filter((c: any) => 
        c.circles?.event_id && !rsvpEventIds.includes(c.circles.event_id)
      ).length;

      setEventsMatched((rsvpCount || 0) + uniqueCircleEvents);

      // Count events attended
      const { count: attendedCount } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("attended_at", "is", null);

      setEventsAttended(attendedCount || 0);
    } catch (error) {
      console.error("Error fetching event stats:", error);
    }
  };

  const checkPendingActions = async () => {
    const actions: ActionItem[] = [];

    try {
      // Run all checks in parallel
      const [quizResult, profileResult, waiverResult, rsvpResult] = await Promise.all([
        supabase.from("quiz_progress").select("current_step, completed_at, demographics").eq("id", userId).single(),
        supabase.from("profiles").select("id_verified, first_name, last_name, phone, city, zip_code, date_of_birth, primary_virtue").eq("id", userId).single(),
        supabase.from("user_waivers").select("waiver_type").eq("user_id", userId),
        supabase.from("event_rsvps").select("event_id").eq("user_id", userId).not("attended_at", "is", null),
      ]);

      const quizData = quizResult.data;
      const profileData = profileResult.data;
      const waiverData = waiverResult.data;
      const signedWaivers = (waiverData || []).map(w => w.waiver_type);
      const demo = (quizData?.demographics || {}) as Record<string, string>;

      const quizDone = !!(quizData?.completed_at) || !!(profileData?.primary_virtue);
      const liabilityWaiverDone = signedWaivers.includes("liability_waiver");
      const conductWaiverDone = signedWaivers.includes("code_of_conduct");
      const idVerified = !!(profileData?.id_verified);
      // Check profile fields, falling back to quiz demographics so the step
      // shows as done if the data exists in either place
      const profileInfoDone = !!(
        (profileData?.first_name || demo.firstName) &&
        (profileData?.last_name || demo.lastName) &&
        (profileData?.phone || demo.phone) &&
        (profileData?.city || demo.city) &&
        (profileData?.zip_code || demo.zipCode) &&
        (profileData?.date_of_birth || demo.dateOfBirth)
      );

      // Build completion steps (used for the progress bar)
      setCompletionSteps([
        { label: "Complete virtue quiz", done: quizDone },
        { label: "Fill in profile info (name, phone, city, zip, DOB)", done: profileInfoDone },
        { label: "Sign liability waiver", done: liabilityWaiverDone },
        { label: "Sign code of conduct", done: conductWaiverDone },
        { label: "ID verification", done: idVerified },
      ]);

      if (!quizDone) {
        actions.push({
          id: "quiz",
          message: "Complete your virtue quiz to unlock personalized matching",
          link: "/quiz",
          linkText: "Continue Quiz",
        });
      }

      if (!profileInfoDone) {
        actions.push({
          id: "profile_info",
          message: "Complete your profile — name, phone, city, zip code & date of birth required",
          tab: "profile",
          linkText: "Update Profile",
        });
      }

      if (!liabilityWaiverDone) {
        actions.push({
          id: "waiver",
          message: "Sign the liability waiver to join meetups",
          tab: "safety",
          linkText: "Sign Waiver",
        });
      }

      if (!conductWaiverDone) {
        actions.push({
          id: "conduct_waiver",
          message: "Sign the code of conduct to join meetups",
          tab: "safety",
          linkText: "Sign Code of Conduct",
        });
      }

      if (!idVerified) {
        actions.push({
          id: "id_verification",
          message: "Submit your ID to an admin for identity verification",
          tab: "profile",
          linkText: "View Profile",
        });
      }

      // Check pending event feedback
      const rsvpData = rsvpResult.data;
      if (rsvpData && rsvpData.length > 0) {
        const { data: feedbackData } = await supabase
          .from("event_feedback")
          .select("event_id")
          .eq("user_id", userId);

        const feedbackEventIds = (feedbackData || []).map(f => f.event_id);
        const pendingFeedback = rsvpData.filter(r => !feedbackEventIds.includes(r.event_id));

        if (pendingFeedback.length > 0) {
          actions.push({
            id: "feedback",
            message: `You have ${pendingFeedback.length} meetup(s) awaiting feedback`,
            tab: "feedback",
            linkText: "Leave Feedback",
          });
        }
      }

      setActionItems(actions);
      setStepsLoaded(true);
    } catch (error) {
      console.error("Error checking pending actions:", error);
    }
  };

  const handleActionClick = (action: ActionItem) => {
    if (action.link) {
      navigate(action.link);
    } else if (action.tab) {
      onTabChange(action.tab);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Required Section */}
      {actionItems.length > 0 && (
        <div className="space-y-2">
          {actionItems.map((action) => (
            <div
              key={action.id}
              className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium">{action.message}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/20"
                onClick={() => handleActionClick(action)}
              >
                {action.linkText}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold mb-2">
          Welcome back, <span className="gradient-text">{profile?.first_name || "Explorer"}</span>
        </h2>
        <p className="text-muted-foreground">
          Your journey to virtuous living continues
        </p>
      </div>


      {/* Plan & Virtue Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlowCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <div className="flex items-center gap-2">
                <p className="font-display font-bold text-lg">
                  {livePlanName}
                </p>
                {statusLabel && (
                  <Badge className={
                    subscriptionStatus === "trialing"
                      ? "bg-accent/20 text-accent text-xs"
                      : subscriptionStatus === "active"
                      ? "bg-green-500/20 text-green-500 text-xs"
                      : "bg-destructive/20 text-destructive text-xs"
                  }>
                    {statusLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-secondary/20 text-2xl">
              {profile?.primary_virtue === 'Balanced' ? "⚖️" : (profile?.primary_virtue ? virtueIcons[profile.primary_virtue] || "🌟" : "🌟")}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Primary Virtue</p>
              <p className="font-display font-bold text-lg gradient-text">
                {profile?.primary_virtue === 'Balanced' ? 'The Philosopher' : (profile?.primary_virtue || "Not determined")}
              </p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Confirmed Events Section */}
      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Confirmed Meetups</p>
              <p className="font-display font-bold">{confirmedEvents.length} upcoming</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onTabChange("events")}>
            View All Meetups
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
        
        {confirmedEvents.length > 0 ? (
          <div className="space-y-3">
            {confirmedEvents.slice(0, 3).map((event) => (
              <div 
                key={event.id} 
                className="p-3 bg-muted/50 rounded-lg border border-border/50"
              >
                <p className="font-semibold">{event.title}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {confirmedEvents.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                +{confirmedEvents.length - 3} more events
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No confirmed events yet. RSVP to an event to see it here.
          </p>
        )}
      </GlowCard>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <GlowCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{eventsMatched}</p>
              <p className="text-sm text-muted-foreground">Meetups Matched</p>
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{eventsAttended}</p>
              <p className="text-sm text-muted-foreground">Meetups Attended</p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* CTA Buttons */}
      <div className="grid gap-3 md:grid-cols-3">
        <Button variant="neon" onClick={() => onTabChange("virtue-profile")} className="w-full">
          View Virtue Profile
        </Button>
        <Button variant="outline" onClick={() => onTabChange("events")} className="w-full">
          RSVP to Meetup
        </Button>
        <Button variant="outline" onClick={() => navigate("/plans")} className="w-full">
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
};
