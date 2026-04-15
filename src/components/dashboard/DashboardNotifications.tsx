import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, RefreshCw, Megaphone, Users, MessageSquare, Check, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean | null;
  created_at: string | null;
  metadata: unknown;
}

interface ActionItem {
  id: string;
  title: string;
  message: string;
  link: string;
  linkText: string;
  type: "quiz" | "verification" | "waiver" | "feedback";
}

interface DashboardNotificationsProps {
  userId: string;
  onReadUpdate?: (delta: number) => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  event_reminder: <Calendar className="h-5 w-5" />,
  schedule_update: <Calendar className="h-5 w-5" />,
  retest_available: <RefreshCw className="h-5 w-5" />,
  announcement: <Megaphone className="h-5 w-5" />,
  circle_assignment: <Users className="h-5 w-5" />,
  message: <MessageSquare className="h-5 w-5" />,
};

const notificationColors: Record<string, string> = {
  event_reminder: "text-primary",
  schedule_update: "text-amber-500",
  retest_available: "text-green-500",
  announcement: "text-secondary",
  circle_assignment: "text-accent",
  message: "text-blue-500",
};

export const DashboardNotifications = ({ userId, onReadUpdate }: DashboardNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    checkActionItems();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkActionItems = async () => {
    const actions: ActionItem[] = [];

    try {
      // Check incomplete quiz
      const { data: quizData } = await supabase
        .from("quiz_progress")
        .select("current_step, completed_at")
        .eq("id", userId)
        .single();

      if (quizData && !quizData.completed_at) {
        actions.push({
          id: "quiz",
          title: "Complete Your Quiz",
          message: "Finish your virtue quiz to unlock personalized matching",
          link: "/quiz",
          linkText: "Continue Quiz",
          type: "quiz",
        });
      }

      // Check ID verification
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id_verified")
        .eq("id", userId)
        .single();

      if (profileData && !profileData.id_verified) {
        actions.push({
          id: "verification",
          title: "ID Verification Required",
          message: "Submit your ID to an admin for verification.",
          link: "",
          linkText: "",
          type: "verification",
        });
      }

      // Check unsigned waivers
      const { data: waiverData } = await supabase
        .from("user_waivers")
        .select("waiver_type")
        .eq("user_id", userId);

      const signedWaivers = (waiverData || []).map(w => w.waiver_type);
      if (!signedWaivers.includes("liability_waiver")) {
        actions.push({
          id: "waiver",
          title: "Sign Waiver",
          message: "Sign the participation waiver to join meetups",
          link: "/dashboard?tab=safety",
          linkText: "Sign Now",
          type: "waiver",
        });
      }

      // Check pending event feedback
      const { data: rsvpData } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("user_id", userId)
        .not("attended_at", "is", null);

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
            title: "Leave Event Feedback",
            message: `You have ${pendingFeedback.length} meetup(s) awaiting your feedback`,
            link: "/dashboard?tab=feedback",
            linkText: "Leave Feedback",
            type: "feedback",
          });
        }
      }

      setActionItems(actions);
    } catch (error) {
      console.error("Error checking action items:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const notif = notifications.find(n => n.id === notificationId);
      if (!notif || notif.is_read) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      onReadUpdate?.(-1);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const currentUnread = notifications.filter(n => !n.is_read).length;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      if (currentUnread > 0) onReadUpdate?.(-currentUnread);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Required Section */}
      {actionItems.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Action Required
          </h3>
          <div className="space-y-3">
            {actionItems.map((action) => (
              <GlowCard key={action.id} className="p-4 border-amber-500/50 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-display font-bold text-amber-600 dark:text-amber-400">
                      {action.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">{action.message}</p>
                  </div>
                  {action.link && action.linkText && (
                    <Link to={action.link}>
                      <Button variant="outline" size="sm" className="border-amber-500/50 hover:bg-amber-500/10">
                        {action.linkText}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-display font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge className="bg-primary/20 text-primary">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`cursor-pointer transition-all ${
                !notification.is_read ? "" : "opacity-70"
              }`}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <GlowCard className={`p-4 ${!notification.is_read ? "border-primary/50 bg-primary/5" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted ${notificationColors[notification.type] || "text-muted-foreground"}`}>
                  {notificationIcons[notification.type] || <Bell className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-display font-bold">{notification.title}</h4>
                    {!notification.is_read && (
                      <Badge className="bg-primary text-primary-foreground text-xs">New</Badge>
                    )}
                  </div>
                  {notification.message && (
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {notification.created_at && new Date(notification.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              </GlowCard>
            </div>
          ))}
        </div>
      ) : (
        <GlowCard className="p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-display font-bold mb-2">No Notifications</h4>
          <p className="text-muted-foreground">
            You're all caught up! New notifications will appear here.
          </p>
        </GlowCard>
      )}
    </div>
  );
};
