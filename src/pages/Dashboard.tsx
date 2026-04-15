import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateVirtueScores } from "@/lib/virtueScoring";

const formatDobForDb = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  let iso: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    iso = raw; // Already YYYY-MM-DD
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [mm, dd, yyyy] = raw.split('/');
    iso = `${yyyy}-${mm}-${dd}`; // MM/DD/YYYY → YYYY-MM-DD
  } else if (/^\d{8}$/.test(raw)) {
    const yr = parseInt(raw.slice(0, 4), 10);
    if (yr >= 1900 && yr <= 2100) {
      // YYYYMMDD format
      iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    } else {
      // MMDDYYYY format
      iso = `${raw.slice(4, 8)}-${raw.slice(0, 2)}-${raw.slice(2, 4)}`;
    }
  } else {
    return null;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return iso;
};
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  User,
  Sparkles,
  RefreshCw,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  MessageCircle,
  CreditCard,
  Shield,
  AlertCircle,
} from "lucide-react";

import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { DashboardProfile } from "@/components/dashboard/DashboardProfile";
import { DashboardVirtueProfile } from "@/components/dashboard/DashboardVirtueProfile";
import { DashboardRetest } from "@/components/dashboard/DashboardRetest";
import { DashboardCircles } from "@/components/dashboard/DashboardCircles";
import { DashboardEvents } from "@/components/dashboard/DashboardEvents";
import { DashboardMessages } from "@/components/dashboard/DashboardMessages";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { DashboardFeedback } from "@/components/dashboard/DashboardFeedback";
import { DashboardBilling } from "@/components/dashboard/DashboardBilling";
import { DashboardSafety } from "@/components/dashboard/DashboardSafety";
import { CityUnavailableCard } from "@/components/quiz/CityUnavailableCard";

interface Profile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender_identity: string | null;
  orientation: string | null;
  occupation: string | null;
  annual_income: string | null;
  communication_preference: "email" | "sms" | "both" | null;
  availability: Record<string, string[]> | null;
  current_plan: string | null;
  plan_started_at: string | null;
  created_at: string | null;
  primary_virtue: string | null;
  secondary_virtue: string | null;
  virtue_scores: Record<string, number> | null;
  city_id: string | null;
}

interface QuizProgress {
  current_step: number;
  completed_at: string | null;
  open_ended_responses?: Record<string, unknown> | null;
  demographics?: Record<string, unknown> | null;
  likert_responses?: Record<string, unknown> | null;
}

interface UpcomingEvent {
  title: string;
  event_date: string;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quizProgress, setQuizProgress] = useState<QuizProgress | null>(null);
  const [upcomingEvent, setUpcomingEvent] = useState<UpcomingEvent | null>(null);
  const [stats, setStats] = useState({ eventsMatched: 0, eventsAttended: 0 });
  const [loading, setLoading] = useState(true);
  const tabFromUrl = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync tab from URL param
  useEffect(() => {
    const t = searchParams.get("tab") || "overview";
    setActiveTab(t);
  }, [searchParams]);
  const [showIncompleteQuizDialog, setShowIncompleteQuizDialog] = useState(false);
  const [canRetest, setCanRetest] = useState(false);
  const [cityInfo, setCityInfo] = useState<{ name: string; state: string; active: boolean } | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Realtime subscription for notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!payload.new.is_read) {
            setUnreadNotifCount(c => c + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.is_read && !payload.old.is_read) {
            setUnreadNotifCount(c => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);
  const [quizAttemptCount, setQuizAttemptCount] = useState(0);

  // Realtime subscription for quiz_progress — refetches dashboard when admin edits demographics
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`quiz_progress:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'quiz_progress', filter: `id=eq.${user.id}` },
        () => {
          fetchUserData();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Wait for auth session to be fully restored before fetching data
  // This prevents a race condition where RLS policies see auth.uid() as null
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    // Confirm session is fully ready before querying
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData();
      } else {
        navigate("/auth");
      }
    });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      toast({
        title: "🎉 Welcome to Virtue Circles!",
        description: "Your membership is now active. Explore your dashboard to get started.",
      });
      // Clean up the URL param without triggering a navigation
      setSearchParams((prev) => {
        prev.delete("subscription");
        return prev;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      // Don't setProfile here yet — we'll set it after backfill so UI always gets patched data
      // Set attempt count from profile
      setQuizAttemptCount((profileData?.quiz_attempt_count as number) || 0);

      // Check if user's city is active — block dashboard for waitlist members
      if (profileData?.city_id) {
        const { data: cityData } = await supabase
          .from("cities")
          .select("name, state, is_active")
          .eq("id", profileData.city_id)
          .single();
        if (cityData) {
          setCityInfo({ name: cityData.name, state: cityData.state, active: cityData.is_active });
          if (!cityData.is_active) {
            setLoading(false);
            return; // Stop here — don't load the rest of the dashboard
          }
        }
      }

      // Fetch quiz progress (include demographics + likert for profile fallback)
      const { data: quizData, error: quizError } = await supabase
        .from("quiz_progress")
        .select("current_step, completed_at, demographics, likert_responses, open_ended_responses")
        .eq("id", user.id)
        .single();

      if (quizError && quizError.code !== "PGRST116") throw quizError;
      setQuizProgress(quizData ? {
        current_step: quizData.current_step,
        completed_at: quizData.completed_at,
        open_ended_responses: quizData.open_ended_responses as Record<string, unknown> | null,
        demographics: quizData.demographics as Record<string, unknown> | null,
        likert_responses: quizData.likert_responses as Record<string, unknown> | null,
      } : null);

      // Backfill profile fields from quiz data if missing
      if (profileData && quizData) {
        const demo = (quizData.demographics || {}) as Record<string, string>;
        const patch: Record<string, any> = {};
        const quizIsCompleted = !!(quizData.completed_at);

        // Only backfill missing profile fields from quiz demographics — never overwrite.
        // profiles is the authoritative source; admin edits write directly to profiles.
        if (demo.firstName && !profileData.first_name) patch.first_name = demo.firstName;
        if (demo.lastName && !profileData.last_name) patch.last_name = demo.lastName;
        if (demo.phone && !profileData.phone) patch.phone = demo.phone;
        if (demo.city && !profileData.city) patch.city = demo.city;
        if (demo.state && !profileData.state) patch.state = demo.state;
        if (demo.address && !profileData.address) patch.address = demo.address;
        if (demo.zipCode && !profileData.zip_code) patch.zip_code = demo.zipCode;
        if (demo.occupation && !profileData.occupation) patch.occupation = demo.occupation;
        if (demo.annualIncome && !profileData.annual_income) patch.annual_income = demo.annualIncome;
        if (demo.sex && !profileData.gender_identity) patch.gender_identity = demo.sex;
        if (demo.orientation && !profileData.orientation) patch.orientation = demo.orientation;
        if (demo.dateOfBirth && !profileData.date_of_birth) {
          const formatted = formatDobForDb(demo.dateOfBirth);
          if (formatted) patch.date_of_birth = formatted;
        }

        // Backfill availability and communication from open-ended quiz responses
        const openEnded = (quizData.open_ended_responses || {}) as Record<string, unknown>;
        if (!profileData.availability || Object.keys(profileData.availability as object).length === 0) {
          const avRaw = openEnded["availability"];
          const avArr: string[] = Array.isArray(avRaw) ? avRaw : avRaw ? [String(avRaw)] : [];
          if (avArr.length > 0) patch.availability = { meetup_times: avArr };
        }
        if (!profileData.communication_preference || profileData.communication_preference === "email") {
          const commRaw = openEnded["communication"];
          const commArr: string[] = Array.isArray(commRaw) ? commRaw : commRaw ? [String(commRaw)] : [];
          if (commArr.length > 0) {
            const hasEmail = commArr.some(c => c.toLowerCase().includes("email"));
            const hasSms = commArr.some(c => c.toLowerCase().includes("text") || c.toLowerCase().includes("sms"));
            if (hasEmail && hasSms) patch.communication_preference = "both";
            else if (hasSms) patch.communication_preference = "sms";
          }
        }

        // Sync virtues from likert_responses — always overwrite when quiz is completed
        // to ensure dashboard reflects exactly what was shown on the results page.
        // Exception: if primary_virtue is 'Balanced' (Philosopher profile), preserve it.
        const hasLikertData = quizData.likert_responses && Object.keys(quizData.likert_responses as object).length > 0;
        const isPhilosopher = profileData.primary_virtue === 'Balanced';
        if (!isPhilosopher && hasLikertData && (quizIsCompleted || !profileData.primary_virtue || !profileData.secondary_virtue || !profileData.virtue_scores)) {
          const virtueResults = calculateVirtueScores(quizData.likert_responses as Record<number, number>);
          
          // If the calculated result is balanced, set as Philosopher
          if (virtueResults.isBalanced) {
            patch.primary_virtue = 'Balanced';
            patch.secondary_virtue = 'Balanced';
          } else {
            patch.primary_virtue = virtueResults.primary.virtue;
            patch.secondary_virtue = virtueResults.secondary.virtue;
          }
          patch.virtue_scores = {
            normalized_scores: virtueResults.normalizedScores,
            raw_scores: virtueResults.rawScores,
            all_virtues_ranked: virtueResults.allVirtues,
            is_balanced: virtueResults.isBalanced,
          };
        }

        if (Object.keys(patch).length > 0) {
          const { error: patchError } = await supabase.from("profiles").update(patch).eq("id", user.id);
          if (!patchError) {
            setProfile({ ...profileData, ...patch } as Profile);
          } else {
            console.error("Profile backfill error:", patchError);
            setProfile(profileData as Profile);
          }
        } else {
          // No backfill needed — profile is complete
          setProfile(profileData as Profile);
        }
      } else if (profileData) {
        // No quiz data yet — just set profile from DB
        setProfile(profileData as Profile);
      }

      // Show incomplete quiz dialog if quiz is in progress but not completed
      if (quizData && !quizData.completed_at && quizData.current_step > 1) {
        setShowIncompleteQuizDialog(true);
      }

      // Fetch upcoming event
      const { data: eventData } = await supabase
        .from("event_rsvps")
        .select(`
          events (
            title,
            event_date
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .gte("events.event_date", new Date().toISOString())
        .order("events(event_date)", { ascending: true })
        .limit(1)
        .single();

      if (eventData?.events) {
        setUpcomingEvent(eventData.events as unknown as UpcomingEvent);
      }

      // Fetch stats
      const { count: matchedCount } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: attendedCount } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("attended_at", "is", null);

      setStats({
        eventsMatched: matchedCount || 0,
        eventsAttended: attendedCount || 0,
      });

      // Check retest permission
      const { data: retestData } = await supabase
        .rpc('can_user_retest', { user_uuid: user.id });
      setCanRetest(retestData || false);

      // Fetch unread notification count
      const { count: unreadCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadNotifCount(unreadCount || 0);

    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load your profile data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueQuiz = () => {
    setShowIncompleteQuizDialog(false);
    navigate("/quiz");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Block waitlist members (inactive city) from accessing the dashboard
  if (cityInfo && !cityInfo.active) {
    return <CityUnavailableCard cityName={cityInfo.name} stateName={cityInfo.state} />;
  }

  // Derive communication options from quiz open-ended responses
  const quizCommunicationOptions: string[] | null = (() => {
    const raw = quizProgress?.open_ended_responses?.["communication"];
    if (Array.isArray(raw)) return raw as string[];
    if (raw) return [String(raw)];
    return null;
  })();

  const quizAvailabilityOptions: string[] | null = (() => {
    const raw = quizProgress?.open_ended_responses?.["availability"];
    if (Array.isArray(raw)) return raw as string[];
    if (raw) return [String(raw)];
    return null;
  })();

  const quizRelationshipStatus: string | null = (() => {
    const raw = quizProgress?.open_ended_responses?.["relationship_status"];
    return raw ? String(raw) : null;
  })();

  const quizDisability: string | null = (() => {
    const raw = quizProgress?.open_ended_responses?.["disability"];
    return raw ? String(raw) : null;
  })();

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "profile", label: "Profile", icon: User },
    { id: "virtue-profile", label: "Virtue Profile", icon: Sparkles },
    ...(canRetest ? [{ id: "retest", label: "Retest", icon: RefreshCw }] : []),
    { id: "circles", label: "Circles", icon: Users },
    { id: "events", label: "Meetups", icon: Calendar },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "feedback", label: "Feedback", icon: MessageCircle },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "safety", label: "Safety", icon: Shield },
  ];

  return (
    <div className="min-h-full flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(t) => { setSearchParams({ tab: t }); }} className="flex flex-col flex-1">
          {/* Tab Navigation hidden — global persistent nav bar in Layout handles navigation */}
          <TabsList className="hidden">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="overview" className="mt-0 pb-8">
            <DashboardOverview
              profile={profile}
              upcomingEvent={upcomingEvent}
              stats={stats}
              onTabChange={(t) => setSearchParams({ tab: t })}
              userId={user?.id || ""}
            />
          </TabsContent>

          <TabsContent value="profile" className="mt-0 pb-8">
            <DashboardProfile
              profile={profile}
              userId={user?.id || ""}
              onProfileUpdate={(updatedProfile) => setProfile(updatedProfile as Profile)}
              quizCommunicationOptions={quizCommunicationOptions}
              quizAvailabilityOptions={quizAvailabilityOptions}
              quizRelationshipStatus={quizRelationshipStatus}
              quizDisability={quizDisability}
            />
          </TabsContent>

          <TabsContent value="virtue-profile" className="mt-0 pb-8">
            <DashboardVirtueProfile
              virtueData={{
                primary_virtue: profile?.primary_virtue || null,
                secondary_virtue: profile?.secondary_virtue || null,
                virtue_scores: profile?.virtue_scores || null,
              }}
              quizAttemptCount={quizAttemptCount}
              manuallyAssigned={(profile as any)?.manually_assigned || false}
            />
          </TabsContent>

          {canRetest && (
            <TabsContent value="retest" className="mt-0 pb-8">
              <DashboardRetest userId={user?.id || ""} />
            </TabsContent>
          )}

          <TabsContent value="circles" className="mt-0 pb-8">
            <DashboardCircles userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="events" className="mt-0 pb-8">
            <DashboardEvents userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="messages" className="mt-0" style={{ height: "calc(100vh - 180px)" }}>
            <DashboardMessages userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 pb-8">
            <DashboardNotifications userId={user?.id || ""} onReadUpdate={(delta) => setUnreadNotifCount(c => Math.max(0, c + delta))} />
          </TabsContent>

          <TabsContent value="feedback" className="mt-0 pb-8">
            <DashboardFeedback userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="billing" className="mt-0 pb-8">
            <DashboardBilling profile={profile} />
          </TabsContent>

          <TabsContent value="safety" className="mt-0 pb-8">
            <DashboardSafety userId={user?.id || ""} />
          </TabsContent>
        </Tabs>

        {/* Incomplete Quiz Dialog */}
        <Dialog open={showIncompleteQuizDialog} onOpenChange={setShowIncompleteQuizDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                Unfinished Quiz
              </DialogTitle>
              <DialogDescription>
                You have an incomplete virtue quiz. Would you like to continue where you left off?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowIncompleteQuizDialog(false)} className="flex-1">
                Later
              </Button>
              <Button variant="neon" onClick={handleContinueQuiz} className="flex-1">
                Continue Quiz
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
