import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUserRoles } from "@/hooks/useUserRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ShieldCheck,
  RefreshCw,
  Calendar,
  UsersRound,
  Bell,
  MessageSquare,
  FileCheck,
  Crown,
  DollarSign,
  Lock,
  Sparkles,
  MapPin,
  Clock,
  Heart,
  Quote,
  UserPlus,
  Building2,
  Tag,
  ShieldAlert,
  Flag,
  History,
  Camera,
  BookOpen,
} from "lucide-react";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminEvents } from "@/components/admin/AdminEvents";
import { AdminGroups } from "@/components/admin/AdminGroups";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminFeedback } from "@/components/admin/AdminFeedback";
import { AdminWaivers } from "@/components/admin/AdminWaivers";
import { AdminRoles } from "@/components/admin/AdminRoles";
import { AdminRevenue } from "@/components/admin/AdminRevenue";
import { AdminRetest } from "@/components/admin/AdminRetest";
import { AdminCities } from "@/components/admin/AdminCities";
import { AdminWaitlist } from "@/components/admin/AdminWaitlist";
import { AdminSoulmatchWaitlist } from "@/components/admin/AdminSoulmatchWaitlist";
import { AdminTestimonials } from "@/components/admin/AdminTestimonials";
import { AdminGuideApplications } from "@/components/admin/AdminGuideApplications";
import { AdminPartnerApplications } from "@/components/admin/AdminPartnerApplications";
import { AdminPromoCodes } from "@/components/admin/AdminPromoCodes";
import { AdminPiiLog } from "@/components/admin/AdminPiiLog";
import { AdminFlaggedMessages } from "@/components/admin/AdminFlaggedMessages";
import { AdminGallery } from "@/components/admin/AdminGallery";
import { AdminBlogs } from "@/components/admin/AdminBlogs";


interface UserWithDetails {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  date_of_birth: string | null;
  gender_identity: string | null;
  orientation: string | null;
  occupation: string | null;
  annual_income: string | null;
  communication_preference: string | null;
  current_plan: string | null;
  subscription_status: string | null;
  stripe_subscription_id: string | null;
  founding_100: boolean | null;
  founding_discount_until: string | null;
  id_verified: boolean | null;
  id_verified_at: string | null;
  primary_virtue: string | null;
  secondary_virtue: string | null;
  created_at: string;
  quiz_progress: {
    current_step: number;
    completed_at: string | null;
    demographics: Record<string, unknown> | null;
    likert_responses: Record<string, number> | null;
    open_ended_responses: Record<string, unknown> | null;
  } | null;
}

interface AdminStats {
  totalEvents: number;
  totalGroups: number;
  upcomingEvents: number;
  activeGroups: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { 
    loading: rolesLoading, 
    hasAnyAdminAccess,
    isSuperAdmin,
    isVCManager,
    isVCGuide,
    isAdmin,
    canManageRoles,
    canViewRevenue,
    canManageEvents,
    canManageGroups,
    canEnableRetest,
    canViewAllUsers,
  } = useUserRoles();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalEvents: 0,
    totalGroups: 0,
    upcomingEvents: 0,
    activeGroups: 0,
  });

  useEffect(() => {
    if (!rolesLoading && !hasAnyAdminAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    if (hasAnyAdminAccess) {
      fetchUsers();
      fetchAdminStats();
      
      // Set default tab based on role
      if (isVCGuide && !isVCManager && !isSuperAdmin) {
        setActiveTab("events"); // Guides start on events tab
      }
    }
  }, [hasAnyAdminAccess, rolesLoading, navigate, isSuperAdmin, isVCManager, isVCGuide]);

  // Realtime: re-fetch users when profiles or quiz_progress change (INSERT or UPDATE)
  useEffect(() => {
    if (!hasAnyAdminAccess) return;

    const channel = supabase
      .channel("admin-profile-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        fetchUsers();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
        fetchUsers();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quiz_progress" }, () => {
        fetchUsers();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_progress" }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasAnyAdminAccess]);

  const fetchAdminStats = async () => {
    try {
      const [eventsResult, groupsResult] = await Promise.all([
        supabase.from("events").select("id, status"),
        supabase.from("circles").select("id, status"),
      ]);

      const events = eventsResult.data || [];
      const groups = groupsResult.data || [];

      setAdminStats({
        totalEvents: events.length,
        totalGroups: groups.length,
        upcomingEvents: events.filter(e => e.status === "upcoming").length,
        activeGroups: groups.filter(g => g.status === "active" || g.status === "forming").length,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    }
  };

  const fetchUsers = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      
      // Fetch cities to identify inactive ones (waitlist)
      const { data: citiesData } = await supabase
        .from("cities")
        .select("id, is_active");
      
      const inactiveCityIds = (citiesData || [])
        .filter(c => !c.is_active)
        .map(c => c.id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: quizData, error: quizError } = await supabase
        .from("quiz_progress")
        .select("id, current_step, completed_at, demographics, likert_responses, open_ended_responses");

      if (quizError) throw quizError;

      // Filter out waitlist members (users from inactive cities)
      const activeProfiles = (profiles || []).filter(profile => 
        !profile.city_id || !inactiveCityIds.includes(profile.city_id)
      );

      const usersWithQuiz: UserWithDetails[] = activeProfiles.map((profile) => {
        const quiz = quizData?.find((q) => q.id === profile.id);
        return {
          ...profile,
          quiz_progress: quiz ? {
            current_step: quiz.current_step,
            completed_at: quiz.completed_at,
            demographics: quiz.demographics as Record<string, unknown> | null,
            likert_responses: quiz.likert_responses as Record<string, number> | null,
            open_ended_responses: quiz.open_ended_responses as Record<string, unknown> | null,
          } : null,
        };
      });

      setUsers(usersWithQuiz);
      
      if (showRefreshToast) {
        toast({
          title: "✓ Data refreshed",
          description: "Showing the latest information.",
        });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Unable to load data",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return (
        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
          <Crown className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    }
    if (isVCManager) {
      return (
        <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">
          <Sparkles className="h-3 w-3 mr-1" />
          VC Manager
        </Badge>
      );
    }
    if (isVCGuide) {
      return (
        <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
          <Users className="h-3 w-3 mr-1" />
          VC Guide
        </Badge>
      );
    }
    return null;
  };

  if (rolesLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }

  if (!hasAnyAdminAccess) {
    return null;
  }

  // Determine which tabs are visible based on role
  const visibleTabs = {
    users: canViewAllUsers,
    roles: canManageRoles,
    cities: isSuperAdmin, // Only super admins can manage cities
    waitlist: isSuperAdmin, // Only super admins can view waitlist
    soulmatchWaitlist: isSuperAdmin, // Only super admins can view soulmate waitlist
    testimonials: isVCManager || isSuperAdmin, // Managers+ can manage testimonials
    events: canManageEvents || isVCGuide, // Guides can see events (their assigned ones)
    groups: canManageGroups,
    notifications: true, // All staff can send to their scope
    feedback: canManageEvents, // Managers+ can see feedback
    waivers: canManageEvents,
    revenue: canViewRevenue,
    retest: canEnableRetest,
    guideApps: isSuperAdmin || isVCManager,
    partnerApps: isSuperAdmin || isVCManager,
    promoCodes: isSuperAdmin || isVCManager,
    piiLog: isSuperAdmin, // Only super admins can view PII access log
    flaggedMessages: isSuperAdmin || isVCManager || isVCGuide, // All staff can review flags
    meetupHistory: canManageGroups || isVCGuide, // Anyone with group/event access can see history
    gallery: isSuperAdmin || isAdmin, // Super admin + admin can manage gallery
    blogs: isSuperAdmin || isAdmin || isVCManager, // Admins and managers can manage blog posts
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen py-8 px-4 md:py-12">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-display font-bold">Admin Dashboard</h1>
                  {getRoleBadge()}
                </div>
                <p className="text-muted-foreground">
                  {isSuperAdmin && "Full access to all features"}
                  {isVCManager && !isSuperAdmin && "Regional management access"}
                  {isVCGuide && !isVCManager && !isSuperAdmin && "Event-specific access"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  fetchUsers(true);
                  fetchAdminStats();
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Quick Stats - Visible to all staff */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {canViewAllUsers && (
              <GlowCard className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold">{users.length}</p>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </GlowCard>
            )}

            <GlowCard className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-blue-500">{adminStats.totalEvents}</p>
                  <p className="text-sm text-muted-foreground">Total Meetups</p>
                  <p className="text-xs text-muted-foreground">{adminStats.upcomingEvents} upcoming</p>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </GlowCard>

            <GlowCard className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-secondary">{adminStats.totalGroups}</p>
                  <p className="text-sm text-muted-foreground">Total Circles</p>
                  <p className="text-xs text-muted-foreground">{adminStats.activeGroups} active</p>
                </div>
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <UsersRound className="h-5 w-5 text-secondary" />
                </div>
              </div>
            </GlowCard>

            {canViewAllUsers && (
              <GlowCard className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl md:text-3xl font-bold text-green-500">
                      {users.filter(u => u.id_verified).length}
                    </p>
                    <p className="text-sm text-muted-foreground">ID Verified</p>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </GlowCard>
            )}
          </div>

          {/* Tabbed Interface */}
          <GlowCard className="p-4 md:p-6 overflow-hidden isolate relative z-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full justify-start">
                {visibleTabs.users && (
                  <TabsTrigger value="users" className="flex items-center gap-2 py-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Members</span>
                  </TabsTrigger>
                )}
                {visibleTabs.roles && (
                  <TabsTrigger value="roles" className="flex items-center gap-2 py-2">
                    <Crown className="h-4 w-4" />
                    <span className="hidden sm:inline">Roles</span>
                  </TabsTrigger>
                )}
                {visibleTabs.cities && (
                  <TabsTrigger value="cities" className="flex items-center gap-2 py-2">
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">Cities</span>
                  </TabsTrigger>
                )}
                {visibleTabs.waitlist && (
                  <TabsTrigger value="waitlist" className="flex items-center gap-2 py-2">
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">Waitlist</span>
                  </TabsTrigger>
                )}
                {visibleTabs.soulmatchWaitlist && (
                  <TabsTrigger value="soulmatch" className="flex items-center gap-2 py-2">
                    <Heart className="h-4 w-4" />
                    <span className="hidden sm:inline">SoulMatch</span>
                  </TabsTrigger>
                )}
                {visibleTabs.testimonials && (
                  <TabsTrigger value="testimonials" className="flex items-center gap-2 py-2">
                    <Quote className="h-4 w-4" />
                    <span className="hidden sm:inline">Testimonials</span>
                  </TabsTrigger>
                )}
                {visibleTabs.guideApps && (
                  <TabsTrigger value="guideApps" className="flex items-center gap-2 py-2">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Guides</span>
                  </TabsTrigger>
                )}
                {visibleTabs.partnerApps && (
                  <TabsTrigger value="partnerApps" className="flex items-center gap-2 py-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Partners</span>
                  </TabsTrigger>
                )}
                {visibleTabs.events && (
                  <TabsTrigger value="events" className="flex items-center gap-2 py-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Meetups</span>
                  </TabsTrigger>
                )}
                {visibleTabs.groups && (
                  <TabsTrigger value="groups" className="flex items-center gap-2 py-2">
                    <UsersRound className="h-4 w-4" />
                    <span className="hidden sm:inline">Circles</span>
                  </TabsTrigger>
                )}
                {visibleTabs.retest && (
                  <TabsTrigger value="retest" className="flex items-center gap-2 py-2">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Retest</span>
                  </TabsTrigger>
                )}
                {visibleTabs.notifications && (
                  <TabsTrigger value="notifications" className="flex items-center gap-2 py-2">
                    <Bell className="h-4 w-4" />
                    <span className="hidden sm:inline">Notify</span>
                  </TabsTrigger>
                )}
                {visibleTabs.feedback && (
                  <TabsTrigger value="feedback" className="flex items-center gap-2 py-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Feedback</span>
                  </TabsTrigger>
                )}
                {visibleTabs.waivers && (
                  <TabsTrigger value="waivers" className="flex items-center gap-2 py-2">
                    <FileCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Waivers</span>
                  </TabsTrigger>
                )}
                {visibleTabs.revenue && (
                  <TabsTrigger value="revenue" className="flex items-center gap-2 py-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="hidden sm:inline">Revenue</span>
                    {!isSuperAdmin && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </TabsTrigger>
                )}
                {visibleTabs.promoCodes && (
                  <TabsTrigger value="promoCodes" className="flex items-center gap-2 py-2">
                    <Tag className="h-4 w-4" />
                    <span className="hidden sm:inline">Promos</span>
                  </TabsTrigger>
                )}
                {visibleTabs.piiLog && (
                  <TabsTrigger value="piiLog" className="flex items-center gap-2 py-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="hidden sm:inline">Access Log</span>
                  </TabsTrigger>
                )}
                {visibleTabs.flaggedMessages && (
                  <TabsTrigger value="flaggedMessages" className="flex items-center gap-2 py-2">
                    <Flag className="h-4 w-4" />
                    <span className="hidden sm:inline">Flagged</span>
                  </TabsTrigger>
                )}
                {visibleTabs.gallery && (
                  <TabsTrigger value="gallery" className="flex items-center gap-2 py-2">
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">Gallery</span>
                  </TabsTrigger>
                )}
                {visibleTabs.blogs && (
                  <TabsTrigger value="blogs" className="flex items-center gap-2 py-2">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Blog</span>
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="mt-6">
                {visibleTabs.users && (
                  <TabsContent value="users" className="mt-0">
                    <AdminUsers 
                      users={users} 
                      onRefresh={() => {
                        fetchUsers(true);
                        fetchAdminStats();
                      }} 
                      refreshing={refreshing}
                    />
                  </TabsContent>
                )}

                {visibleTabs.roles && (
                  <TabsContent value="roles" className="mt-0">
                    <AdminRoles />
                  </TabsContent>
                )}

                {visibleTabs.cities && (
                  <TabsContent value="cities" className="mt-0">
                    <AdminCities />
                  </TabsContent>
                )}

                {visibleTabs.waitlist && (
                  <TabsContent value="waitlist" className="mt-0">
                    <AdminWaitlist />
                  </TabsContent>
                )}

                {visibleTabs.soulmatchWaitlist && (
                  <TabsContent value="soulmatch" className="mt-0">
                    <AdminSoulmatchWaitlist />
                  </TabsContent>
                )}

                {visibleTabs.events && (
                  <TabsContent value="events" className="mt-0">
                    <AdminEvents />
                  </TabsContent>
                )}

                {visibleTabs.groups && (
                  <TabsContent value="groups" className="mt-0">
                    <AdminGroups />
                  </TabsContent>
                )}

                {visibleTabs.retest && (
                  <TabsContent value="retest" className="mt-0">
                    <AdminRetest />
                  </TabsContent>
                )}

                {visibleTabs.notifications && (
                  <TabsContent value="notifications" className="mt-0">
                    <AdminNotifications />
                  </TabsContent>
                )}

                {visibleTabs.feedback && (
                  <TabsContent value="feedback" className="mt-0">
                    <AdminFeedback />
                  </TabsContent>
                )}

                {visibleTabs.waivers && (
                  <TabsContent value="waivers" className="mt-0">
                    <AdminWaivers />
                  </TabsContent>
                )}

                {visibleTabs.revenue && (
                  <TabsContent value="revenue" className="mt-0">
                    <AdminRevenue />
                  </TabsContent>
                )}

                {visibleTabs.testimonials && (
                  <TabsContent value="testimonials" className="mt-0">
                    <AdminTestimonials />
                  </TabsContent>
                )}

                {visibleTabs.guideApps && (
                  <TabsContent value="guideApps" className="mt-0">
                    <AdminGuideApplications />
                  </TabsContent>
                )}

                {visibleTabs.partnerApps && (
                  <TabsContent value="partnerApps" className="mt-0">
                    <AdminPartnerApplications />
                  </TabsContent>
                )}

                {visibleTabs.promoCodes && (
                  <TabsContent value="promoCodes" className="mt-0">
                    <AdminPromoCodes />
                  </TabsContent>
                )}

                {visibleTabs.piiLog && (
                  <TabsContent value="piiLog" className="mt-0">
                    <AdminPiiLog />
                  </TabsContent>
                )}


                {visibleTabs.flaggedMessages && (
                  <TabsContent value="flaggedMessages" className="mt-0">
                    <AdminFlaggedMessages />
                  </TabsContent>
                )}

                {visibleTabs.gallery && (
                  <TabsContent value="gallery" className="mt-0">
                    <AdminGallery />
                  </TabsContent>
                )}

                {visibleTabs.blogs && (
                  <TabsContent value="blogs" className="mt-0">
                    <AdminBlogs />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </GlowCard>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Admin;
