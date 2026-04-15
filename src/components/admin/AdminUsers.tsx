import { useState, useEffect, useRef } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { calculateVirtueScores as calculateFullVirtueScores } from "@/lib/virtueScoring";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  UserCircle,
  Mail,
  Calendar,
  Star,
  Award,
  FileText,
  MessageSquare,
  Edit,
  Save,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  Flag,
} from "lucide-react";
import { likertQuestions, openEndedQuestions, preferenceQuestions } from "@/data/quizQuestions";

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

interface UserWaiver {
  id: string;
  waiver_type: string;
  signed_at: string | null;
  ip_address: string | null;
}

interface BillingInvoice {
  id: string;
  created: number;
  description: string;
  amount_paid: number;
  amount_due: number;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: number;
  period_end: number;
}

interface StripeSubscriptionDetails {
  id: string;
  status: string;
  current_period_end: number;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  billing_interval: string | null;
  default_payment_method: { brand: string; last4: string } | null;
}

interface AdminUsersProps {
  users: UserWithDetails[];
  onRefresh: () => void;
  refreshing: boolean;
}

// Plan badge component
// NOTE: annual subscribers may have subscription_status = "active" OR "active_annual" in DB
// (depending on whether check-subscription has run yet). We detect annual by checking BOTH
// the status field AND the current_plan field to avoid flicker on page load.
const PlanBadge = ({ currentPlan, subscriptionStatus, founding100, isAnnual }: {
  currentPlan: string | null;
  subscriptionStatus: string | null;
  founding100: boolean | null;
  isAnnual?: boolean;
}) => {
  const isActiveOrAnnual = subscriptionStatus === "active" || subscriptionStatus === "active_annual" || subscriptionStatus === "trialing";
  // Annual if DB or caller says so — no async needed
  const isAnnualPlan = subscriptionStatus === "active_annual" || isAnnual || currentPlan === "virtue_circles_annual";

  const getBadge = () => {
    if (subscriptionStatus === "trialing") {
      return { className: "bg-accent/15 border-accent/40 text-accent", label: "🎁 Trial" };
    }
    if (isActiveOrAnnual && isAnnualPlan) {
      return { className: "bg-secondary/20 border-secondary/50 text-secondary", label: "⭐ Annual Plan" };
    }
    if (subscriptionStatus === "active") {
      return { className: "bg-primary/15 border-primary/40 text-primary", label: "✓ Virtue Circles" };
    }
    if (subscriptionStatus === "past_due") {
      return { className: "bg-destructive/15 border-destructive/40 text-destructive", label: "⚠️ Past Due" };
    }
    if (subscriptionStatus === "canceled" || subscriptionStatus === "cancelled") {
      return { className: "bg-muted border-border text-muted-foreground", label: "Cancelled" };
    }
    if (currentPlan === "soulmatch_ai") {
      return { className: "bg-accent/15 border-accent/40 text-accent", label: "SoulMatch AI" };
    }
    return { className: "bg-muted border-border text-muted-foreground", label: "Pathfinder" };
  };

  const badge = getBadge();

  return (
    <div className="flex items-center gap-1.5">
      <Badge className={`${badge.className} border text-[11px] px-2 py-0 font-semibold`}>
        {badge.label}
      </Badge>
      {founding100 && isActiveOrAnnual && (
        <Badge className="bg-accent/10 border border-accent/30 text-accent text-[11px] px-2 py-0 font-semibold">
          🏛️ Founder
        </Badge>
      )}
    </div>
  );
};

export const AdminUsers = ({ users, onRefresh, refreshing }: AdminUsersProps) => {
  const { toast } = useToast();
  const [syncingSubscriptions, setSyncingSubscriptions] = useState(false);
  const { session, user: currentUser } = useAuth();
  const { isSuperAdmin } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedUser, setEditedUser] = useState<Partial<UserWithDetails>>({});
  const [editedDemographics, setEditedDemographics] = useState<Record<string, string>>({});
  const [editedOpenEnded, setEditedOpenEnded] = useState<Record<string, string>>({});
  const [userWaivers, setUserWaivers] = useState<UserWaiver[]>([]);
  const [userEventStats, setUserEventStats] = useState<{ matched: number; attended: number }>({ matched: 0, attended: 0 });
  const [billingHistory, setBillingHistory] = useState<BillingInvoice[]>([]);
  const [stripeSubscription, setStripeSubscription] = useState<StripeSubscriptionDetails | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const lastPiiLogRef = useRef<{ key: string; time: number } | null>(null);
  const usersPerPage = 10;
  const [flaggedProfiles, setFlaggedProfiles] = useState<(UserWithDetails & { flag_reason: string | null; quiz_attempt_count: number })[]>([]);
  const [flaggedLoading, setFlaggedLoading] = useState(false);
  const [showFlaggedSection, setShowFlaggedSection] = useState(false);
  const [assignVirtueDialog, setAssignVirtueDialog] = useState<{ open: boolean; userId: string; name: string }>({ open: false, userId: "", name: "" });
  const [selectedAssignVirtue, setSelectedAssignVirtue] = useState("");

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower);

    const status = user.subscription_status;
    let matchesSub = true;
    if (subscriptionFilter === "active") matchesSub = status === "active";
    else if (subscriptionFilter === "trialing") matchesSub = status === "trialing";
    else if (subscriptionFilter === "paid_and_trial") matchesSub = status === "active" || status === "trialing";
    else if (subscriptionFilter === "past_due") matchesSub = status === "past_due";
    else if (subscriptionFilter === "free") matchesSub = !status || status === "none" || status === "canceled" || status === "cancelled";

    return matchesSearch && matchesSub;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const getQuizStatus = (quiz: UserWithDetails["quiz_progress"]) => {
    if (!quiz) return { 
      status: "Not Started", 
      variant: "secondary" as const,
      icon: XCircle,
      description: "User hasn't begun the quiz yet"
    };
    if (quiz.completed_at) return { 
      status: "Completed", 
      variant: "default" as const,
      icon: CheckCircle2,
      description: "User has finished all quiz sections"
    };
    const progress = Math.round((quiz.current_step / 4) * 100);
    return { 
      status: `${progress}% Done`, 
      variant: "outline" as const,
      icon: Clock,
      description: `User is on step ${quiz.current_step} of 4`
    };
  };

  const calculateVirtueScores = (responses: Record<string, number> | null) => {
    if (!responses) return null;
    const virtueScores: Record<string, { total: number; count: number }> = {};
    likertQuestions.forEach((q) => {
      const response = responses[q.id];
      if (response !== undefined) {
        if (!virtueScores[q.virtue]) {
          virtueScores[q.virtue] = { total: 0, count: 0 };
        }
        virtueScores[q.virtue].total += response;
        virtueScores[q.virtue].count += 1;
      }
    });
    const averages: Record<string, number> = {};
    Object.entries(virtueScores).forEach(([virtue, data]) => {
      averages[virtue] = data.count > 0 ? data.total / data.count : 0;
    });
    return averages;
  };

  const getDisplayName = (user: UserWithDetails) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "Unknown User";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTimestamp = (ts: number) => {
    return new Date(ts * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const fetchUserWaivers = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_waivers")
        .select("*")
        .eq("user_id", userId);
      
      if (error) throw error;
      setUserWaivers(data || []);
    } catch (error) {
      console.error("Error fetching waivers:", error);
      setUserWaivers([]);
    }
  };

  const fetchUserEventStats = async (userId: string) => {
    try {
      const { count: matchedCount } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: attendedCount } = await supabase
        .from("event_rsvps")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("attended_at", "is", null);

      setUserEventStats({
        matched: matchedCount || 0,
        attended: attendedCount || 0,
      });
    } catch (error) {
      console.error("Error fetching event stats:", error);
    }
  };

  const fetchBillingHistory = async (userEmail: string, userId?: string) => {
    if (!session?.access_token) return;
    setBillingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-billing-history", {
        body: { userEmail },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setBillingHistory(data?.invoices || []);
      const stripeSub = data?.subscription || null;
      setStripeSubscription(stripeSub);

      // Auto-sync stale DB records when Stripe data is available and DB is out of date
      // IMPORTANT: preserve annual status — never downgrade active_annual → active
      if (stripeSub && userId) {
        const liveStatus = stripeSub.status;
        const isAnnualInterval = stripeSub.billing_interval === "year";
        const targetStatus = isAnnualInterval && liveStatus === "active" ? "active_annual" : liveStatus;
        const targetPlan = isAnnualInterval ? "virtue_circles_annual" : "virtue_circles";
        const targetUser = users.find(u => u.id === userId);
        // Only sync if the DB is missing plan info (pathfinder) or has a genuinely different status
        // Never overwrite active_annual with active — that would cause the flicker
        const dbStatus = targetUser?.subscription_status;
        const dbPlan = targetUser?.current_plan;
        const needsSync = targetUser && (
          dbPlan === "pathfinder" && (liveStatus === "active" || liveStatus === "trialing")
        ) && dbStatus !== targetStatus;
        if (needsSync) {
          await supabase.from("profiles").update({
            subscription_status: targetStatus,
            current_plan: (targetPlan === "virtue_circles_annual" ? "virtue_circles" : targetPlan) as "pathfinder" | "virtue_circles" | "soulmatch_ai",
          }).eq("id", userId);
          onRefresh();
        }
      }
    } catch (error) {
      console.error("Error fetching billing history:", error);
      setBillingHistory([]);
      setStripeSubscription(null);
    } finally {
      setBillingLoading(false);
    }
  };

  // Keep selectedUser in sync after refresh
  useEffect(() => {
    if (selectedUser) {
      const updated = users.find((u) => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    }
  }, [users]);

  // PII access logger — logs when admin views sensitive member data
  const logPIIAccess = async (memberId: string, fieldsAccessed: string[], accessType: string) => {
    if (!currentUser || !session?.access_token) return;

    // Dedup: skip if same admin+member combo was logged within the last 60 seconds
    const dedupKey = `${currentUser.id}:${memberId}`;
    const now = Date.now();
    if (lastPiiLogRef.current && lastPiiLogRef.current.key === dedupKey && now - lastPiiLogRef.current.time < 60_000) {
      return;
    }
    lastPiiLogRef.current = { key: dedupKey, time: now };

    try {
      await supabase.functions.invoke("log-pii-access", {
        body: {
          member_id: memberId,
          fields_accessed: fieldsAccessed,
          access_type: accessType,
          accessed_by_role: isSuperAdmin ? "super_admin" : "admin",
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch (e) {
      // Non-blocking — log silently
      console.error("PII log error:", e);
    }
  };

  // Always re-sync virtues from quiz_progress when admin opens a completed user profile
  // This ensures the admin view always reflects the authoritative quiz results
  useEffect(() => {
    if (!selectedUser) return;
    if (!selectedUser.quiz_progress?.likert_responses) return;
    if (!selectedUser.quiz_progress?.completed_at) return; // Only sync completed quizzes

    // CRITICAL: Never overwrite a 'Balanced' / Philosopher profile with a raw ranked virtue
    if (selectedUser.primary_virtue === 'Balanced') return;

    const syncVirtues = async () => {
      const virtueResults = calculateFullVirtueScores(
        selectedUser.quiz_progress!.likert_responses as Record<number, number>
      );

      // Check if the quiz result itself is balanced (all scores within 5 points)
      const scores = Object.values(virtueResults.normalizedScores);
      const isBalanced = scores.length === 6 &&
        (Math.max(...scores) - Math.min(...scores)) <= 5;

      // If balanced, set primary_virtue to 'Balanced' and secondary to null
      const primaryVirtue = isBalanced ? 'Balanced' : virtueResults.primary.virtue;
      const secondaryVirtue = isBalanced ? null : virtueResults.secondary.virtue;

      const virtueScoresJson = JSON.parse(JSON.stringify({
        normalized_scores: virtueResults.normalizedScores,
        raw_scores: virtueResults.rawScores,
        all_virtues_ranked: virtueResults.allVirtues,
        is_balanced: isBalanced,
      }));
      const patch = {
        primary_virtue: primaryVirtue,
        secondary_virtue: secondaryVirtue,
        virtue_scores: virtueScoresJson,
      };
      const { error } = await supabase.from("profiles").update(patch).eq("id", selectedUser.id);
      if (!error) {
        setSelectedUser((prev) => prev ? { ...prev, ...patch } : prev);
        onRefresh();
      }
    };

    syncVirtues();
  }, [selectedUser?.id]);

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      // Detect if admin is manually changing the virtue assignment
      const virtueChanged =
        (editedUser.primary_virtue !== undefined && editedUser.primary_virtue !== selectedUser.primary_virtue) ||
        (editedUser.secondary_virtue !== undefined && editedUser.secondary_virtue !== selectedUser.secondary_virtue);

      const newPrimaryVirtue = editedUser.primary_virtue ?? selectedUser.primary_virtue;
      const newSecondaryVirtue = editedUser.secondary_virtue ?? selectedUser.secondary_virtue;

      const updatedFields = {
        first_name: editedUser.first_name ?? selectedUser.first_name,
        last_name: editedUser.last_name ?? selectedUser.last_name,
        email: editedUser.email ?? selectedUser.email,
        phone: editedUser.phone ?? selectedUser.phone,
        address: editedUser.address ?? selectedUser.address,
        city: editedUser.city ?? selectedUser.city,
        state: editedUser.state ?? selectedUser.state,
        zip_code: editedUser.zip_code ?? selectedUser.zip_code,
        current_plan: (editedUser.current_plan ?? selectedUser.current_plan) as "pathfinder" | "virtue_circles" | "soulmatch_ai" | null,
        subscription_status: editedUser.subscription_status ?? selectedUser.subscription_status,
        id_verified: editedUser.id_verified ?? selectedUser.id_verified,
        id_verified_at: editedUser.id_verified ? new Date().toISOString() : selectedUser.id_verified_at,
        primary_virtue: newPrimaryVirtue,
        secondary_virtue: newSecondaryVirtue,
        communication_preference: (editedUser.communication_preference ?? selectedUser.communication_preference) as "email" | "sms" | "both" | null,
        // Mark as manually assigned and clear flag if admin changed virtues
        ...(virtueChanged ? {
          manually_assigned: true,
          manually_assigned_at: new Date().toISOString(),
          flagged_for_review: false,
          flag_reason: null,
        } : {}),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updatedFields)
        .eq("id", selectedUser.id);

      if (profileError) throw profileError;

      // Always update quiz_progress.demographics to stay in sync with both Contact Info edits
      // and Quiz Demographics edits. This is critical because Dashboard.tsx reads from
      // quiz_progress.demographics as the source of truth for completed quizzes.
      if (selectedUser.quiz_progress) {
        // Map profile-level fields (snake_case) → demographics camelCase keys
        const profileToDemoSync: Record<string, string> = {};
        if (updatedFields.first_name != null) profileToDemoSync.firstName = updatedFields.first_name;
        if (updatedFields.last_name != null) profileToDemoSync.lastName = updatedFields.last_name;
        if (updatedFields.phone != null) profileToDemoSync.phone = updatedFields.phone;
        if (updatedFields.address != null) profileToDemoSync.address = updatedFields.address;
        if (updatedFields.city != null) profileToDemoSync.city = updatedFields.city;
        if (updatedFields.state != null) profileToDemoSync.state = updatedFields.state;
        if (updatedFields.zip_code != null) profileToDemoSync.zipCode = updatedFields.zip_code;

        // Build final merged demographics: existing → contact info sync → explicit quiz demo edits
        const mergedDemographics: Record<string, unknown> = {
          ...(selectedUser.quiz_progress.demographics as Record<string, unknown> || {}),
          ...profileToDemoSync,
          ...editedDemographics,
        };

        // Build final merged open-ended responses
        const multiSelectIds = new Set(
          [...openEndedQuestions, ...preferenceQuestions]
            .filter(q => q.type === "multiselect")
            .map(q => q.id)
        );
        const mergedOpenEnded: Record<string, unknown> = {
          ...(selectedUser.quiz_progress.open_ended_responses as Record<string, unknown> || {}),
        };
        for (const [key, val] of Object.entries(editedOpenEnded)) {
          if (multiSelectIds.has(key) && typeof val === "string") {
            mergedOpenEnded[key] = val.split(", ").filter(Boolean);
          } else {
            mergedOpenEnded[key] = val;
          }
        }

        const { error: quizError } = await supabase
          .from("quiz_progress")
          .update({
            demographics: mergedDemographics as any,
            open_ended_responses: mergedOpenEnded as any,
          })
          .eq("id", selectedUser.id);
        if (quizError) throw quizError;

        // Sync ALL quiz demographics fields back to profiles so both tables stay in sync
        const d = mergedDemographics as Record<string, string>;
        const quizToProfilePatch: Record<string, string | null> = {};
        if (d.occupation !== undefined) quizToProfilePatch.occupation = d.occupation || null;
        if (d.annualIncome !== undefined) quizToProfilePatch.annual_income = d.annualIncome || null;
        if (d.orientation !== undefined) quizToProfilePatch.orientation = d.orientation || null;
        const newGender = d.sex ?? d.genderIdentity;
        if (newGender !== undefined) quizToProfilePatch.gender_identity = newGender || null;
        // Also sync location fields from quiz demographics → profiles
        if (d.city !== undefined) quizToProfilePatch.city = d.city || null;
        if (d.state !== undefined) quizToProfilePatch.state = d.state || null;
        if (d.zipCode !== undefined) quizToProfilePatch.zip_code = d.zipCode || null;
        if (d.address !== undefined) quizToProfilePatch.address = d.address || null;
        if (d.firstName !== undefined) quizToProfilePatch.first_name = d.firstName || null;
        if (d.lastName !== undefined) quizToProfilePatch.last_name = d.lastName || null;
        if (d.phone !== undefined) quizToProfilePatch.phone = d.phone || null;
        // Also sync availability and communication from open-ended responses → profiles
        const availabilityVal = mergedOpenEnded["availability"];
        const availabilityArr: string[] = Array.isArray(availabilityVal)
          ? availabilityVal as string[]
          : availabilityVal ? [String(availabilityVal)] : [];
        if (availabilityArr.length > 0) {
          quizToProfilePatch["availability"] = JSON.stringify({ meetup_times: availabilityArr }) as any;
        }

        if (Object.keys(quizToProfilePatch).length > 0) {
          await supabase.from("profiles").update(quizToProfilePatch as any).eq("id", selectedUser.id);
        }

        // Reflect locally
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                ...updatedFields,
                quiz_progress: prev.quiz_progress
                  ? {
                      ...prev.quiz_progress,
                      demographics: mergedDemographics,
                      open_ended_responses: mergedOpenEnded,
                    }
                  : prev.quiz_progress,
              }
            : prev
        );
      } else {
        setSelectedUser((prev) => prev ? { ...prev, ...updatedFields } : prev);
      }

      toast({
        title: "✓ User Updated",
        description: "Changes have been saved successfully.",
      });
      setEditMode(false);
      setEditedDemographics({});
      setEditedOpenEnded({});
      onRefresh();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyId = async (userId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          id_verified: verified,
          id_verified_at: verified ? new Date().toISOString() : null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: verified ? "✓ ID Verified" : "ID Verification Removed",
        description: verified 
          ? "User's ID has been manually verified." 
          : "ID verification has been removed.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error updating ID verification:", error);
      toast({
        title: "Error",
        description: "Failed to update ID verification.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFounder = async (userId: string, enable: boolean) => {
    try {
      const updateData: Record<string, unknown> = {
        founding_100: enable,
      };
      if (enable) {
        // Set founding discount for 3 months from now
        const discountEnd = new Date();
        discountEnd.setMonth(discountEnd.getMonth() + 3);
        updateData.founding_discount_until = discountEnd.toISOString().split("T")[0];
      } else {
        updateData.founding_discount_until = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: enable ? "✓ Founder Discount Applied" : "Founder Discount Removed",
        description: enable
          ? "User has been marked as a founding member."
          : "Founding member status has been removed.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error updating founder status:", error);
      toast({
        title: "Error",
        description: "Failed to update founder status.",
        variant: "destructive",
      });
    }
  };

  // Load flagged profiles
  const loadFlaggedProfiles = async () => {
    setFlaggedLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("flagged_for_review", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      // Merge with users list to get quiz_progress data
      const merged = (data || []).map(p => {
        const userMatch = users.find(u => u.id === p.id);
        return {
          ...(userMatch || p),
          flag_reason: p.flag_reason as string | null,
          quiz_attempt_count: (p.quiz_attempt_count as number) || 0,
        } as UserWithDetails & { flag_reason: string | null; quiz_attempt_count: number };
      });
      setFlaggedProfiles(merged);
    } catch (e) {
      console.error("Error loading flagged profiles:", e);
    } finally {
      setFlaggedLoading(false);
    }
  };

  const handleAssignVirtue = async (userId: string, virtue: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          primary_virtue: virtue,
          flagged_for_review: false,
          flag_reason: null,
          manually_assigned: true,
          manually_assigned_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;
      toast({ title: "✓ Virtue Assigned", description: `${virtue} has been assigned to this member.` });
      setAssignVirtueDialog({ open: false, userId: "", name: "" });
      setSelectedAssignVirtue("");
      loadFlaggedProfiles();
      onRefresh();
    } catch (e) {
      console.error("Error assigning virtue:", e);
      toast({ title: "Error", description: "Failed to assign virtue.", variant: "destructive" });
    }
  };

  const handleClearFlag = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ flagged_for_review: false, flag_reason: null })
        .eq("id", userId);
      if (error) throw error;
      toast({ title: "✓ Flag Cleared", description: "Profile has been unflagged." });
      loadFlaggedProfiles();
    } catch (e) {
      console.error("Error clearing flag:", e);
      toast({ title: "Error", description: "Failed to clear flag.", variant: "destructive" });
    }
  };

  const handleSyncAllSubscriptions = async () => {
    if (!session?.access_token) return;
    setSyncingSubscriptions(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-subscriptions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast({
        title: "Subscription Sync Complete",
        description: `Synced: ${data.synced} | Already correct: ${data.already_correct} | No Stripe record: ${data.no_stripe_customer}${data.errors?.length ? ` | Errors: ${data.errors.length}` : ""}`,
      });
      onRefresh();
    } catch (err) {
      toast({ title: "Sync Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSyncingSubscriptions(false);
    }
  };

  // Stats
  const completedCount = users.filter((u) => u.quiz_progress?.completed_at).length;
  const verifiedCount = users.filter((u) => u.id_verified).length;
  const completionRate = users.length > 0 ? Math.round((completedCount / users.length) * 100) : 0;
  const subscribedCount = users.filter((u) => u.subscription_status === "active" || u.subscription_status === "trialing").length;
  const flaggedCount = users.filter((u) => (u as any).flagged_for_review).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
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

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-green-500">{subscribedCount}</p>
              <p className="text-sm text-muted-foreground">Subscribed</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-green-500">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Quiz Completed</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-blue-500">{verifiedCount}</p>
              <p className="text-sm text-muted-foreground">ID Verified</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold">{completionRate}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Award className="h-5 w-5 text-secondary" />
            </div>
          </div>
          <Progress value={completionRate} className="mt-2 h-1.5" />
        </GlowCard>
      </div>

      {/* Search */}
      <GlowCard className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={subscriptionFilter}
            onValueChange={(val) => {
              setSubscriptionFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-52">
              <SelectValue placeholder="Subscription" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              <SelectItem value="active">Paid (Active)</SelectItem>
              <SelectItem value="trialing">Trial</SelectItem>
              <SelectItem value="paid_and_trial">Paid + Trial</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="free">Free (Pathfinder)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
            {(searchTerm || subscriptionFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setSubscriptionFilter("all"); }} className="h-7 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
        </div>
      </GlowCard>

      {/* Users List */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <h2 className="font-display font-semibold text-lg">All Users</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Click "View" to see full details, billing history, and edit user information.</p>
            </TooltipContent>
          </Tooltip>
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAllSubscriptions}
              disabled={syncingSubscriptions}
              className="ml-auto flex items-center gap-1.5 text-xs"
            >
              {syncingSubscriptions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
              {syncingSubscriptions ? "Syncing..." : "Sync All Subscriptions"}
            </Button>
          )}
        </div>

        {paginatedUsers.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? "Try a different search term" : "Users will appear here once they sign up"}
            </p>
          </GlowCard>
        ) : (
          <div className="space-y-2">
            {paginatedUsers.map((u) => {
              const quizStatus = getQuizStatus(u.quiz_progress);
              const StatusIcon = quizStatus.icon;
              
              return (
                <GlowCard key={u.id} className="p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        <UserCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{getDisplayName(u)}</p>
                          {u.id_verified && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Shield className="h-4 w-4 text-green-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>ID Verified</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          {u.email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{u.email}</span>
                            </span>
                          )}
                          {u.phone && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Phone className="h-3 w-3" />
                              {u.phone}
                            </span>
                          )}
                          {(u.city || u.state) && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <MapPin className="h-3 w-3" />
                              {[u.city, u.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                        {/* Plan Badge Row */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <PlanBadge
                            currentPlan={u.current_plan}
                            subscriptionStatus={u.subscription_status}
                            founding100={u.founding_100}
                          />
                        </div>
                        {/* Virtue Display — fallback to quiz scores if profile fields empty */}
                        {(() => {
                          let primary = u.primary_virtue;
                          let secondary = u.secondary_virtue;

                          // If already marked Balanced, show Philosopher badge immediately
                          if (primary === 'Balanced') {
                            return (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-accent/20 text-accent text-xs border border-accent/30">
                                  ⚖️ The Philosopher
                                </Badge>
                              </div>
                            );
                          }

                          if ((!primary || !secondary) && u.quiz_progress?.likert_responses) {
                            const scores = calculateVirtueScores(u.quiz_progress.likert_responses);
                            if (scores) {
                              const scoreValues = Object.values(scores);
                              const isBalanced = scoreValues.length === 6 &&
                                (Math.max(...scoreValues) - Math.min(...scoreValues)) <= 0.5;
                              if (isBalanced) {
                                return (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge className="bg-accent/20 text-accent text-xs border border-accent/30">
                                      ⚖️ The Philosopher
                                    </Badge>
                                  </div>
                                );
                              }
                              const sorted = Object.entries(scores).sort(([, va], [, vb]) => vb - va);
                              if (!primary && sorted[0]) primary = sorted[0][0];
                              if (!secondary && sorted[1]) secondary = sorted[1][0];
                            }
                          }
                          if (!primary && !secondary) return null;
                          return (
                            <div className="flex items-center gap-2 mt-2">
                              {primary && (
                                <Badge className="bg-primary/20 text-primary text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  {primary}
                                </Badge>
                              )}
                              {secondary && (
                                <Badge className="bg-secondary/20 text-secondary text-xs">
                                  {secondary}
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 md:gap-4">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant={quizStatus.variant} className="cursor-help flex items-center gap-1.5">
                            <StatusIcon className="h-3.5 w-3.5" />
                            {quizStatus.status}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{quizStatus.description}</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setEditedUser({});
                          setEditMode(false);
                          setBillingHistory([]);
                          setStripeSubscription(null);
                          fetchUserWaivers(u.id);
                          fetchUserEventStats(u.id);
                          if (u.email) {
                            fetchBillingHistory(u.email, u.id);
                          }
                          // Log PII access
                          logPIIAccess(u.id, ["phone", "address", "date_of_birth", "orientation", "annual_income", "demographics"], "view_profile");
                          setShowUserDetails(true);
                        }}
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-muted rounded-md">
            <span className="text-sm font-medium">{currentPage}</span>
            <span className="text-sm text-muted-foreground">of {totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={(open) => {
        setShowUserDetails(open);
        if (!open) {
          setEditMode(false);
          setEditedUser({});
          setEditedDemographics({});
          setEditedOpenEnded({});
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <UserCircle className="h-6 w-6 text-primary" />
                {selectedUser ? getDisplayName(selectedUser) : "User Details"}
              </DialogTitle>
              {selectedUser && (
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (editMode) {
                      handleSaveUser();
                    } else {
                      // Initialize editable copies
                      const demo = (selectedUser.quiz_progress?.demographics as Record<string, string>) || {};
                      const oe = (selectedUser.quiz_progress?.open_ended_responses as Record<string, string>) || {};
                      setEditedDemographics({ ...demo });
                      setEditedOpenEnded(
                        Object.fromEntries(
                          Object.entries(oe).map(([k, v]) => [k, Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")])
                        )
                      );
                      setEditMode(true);
                    }
                  }}
                  disabled={saving}
                >
                  {editMode ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Changes"}
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 mt-2">
              {/* Current Plan & Billing Section */}
              {(() => {
                // Derive live plan/status from Stripe data when available
                // This ensures the admin always sees accurate info even if DB is stale
                const liveStatus = stripeSubscription?.status ?? (editedUser.subscription_status ?? selectedUser.subscription_status ?? null);
                const PRODUCT_IDS: Record<string, string> = {
                  "prod_TvRhDp0VAefC95": "virtue_circles",
                  "prod_U0Rntz3wJcLkOi": "virtue_circles_annual",
                  "prod_TvRiawcZqM5rCB": "founding_100",
                };
                // Detect annual plan via billing interval from Stripe
                const isAnnualSub = stripeSubscription?.billing_interval === "year";
                const livePlan = stripeSubscription
                  ? (isAnnualSub ? "virtue_circles_annual" : "virtue_circles")
                  : (editedUser.current_plan ?? selectedUser.current_plan);
                const isLiveData = !!stripeSubscription;
                // Detect DB mismatch — but treat active_annual (DB) + active (Stripe, annual) as equivalent
                const dbEffectiveStatus = selectedUser.subscription_status === "active_annual" ? "active" : selectedUser.subscription_status;
                const dbStatusMismatch = isLiveData && (
                  (dbEffectiveStatus !== liveStatus) ||
                  (selectedUser.current_plan === "pathfinder" && (livePlan === "virtue_circles" || livePlan === "virtue_circles_annual"))
                ) && !(
                  // annual plan: DB stores virtue_circles + active_annual, Stripe returns virtue_circles_annual + active — not a real mismatch
                  isAnnualSub && selectedUser.subscription_status === "active_annual"
                );
                return (
                <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Current Plan & Billing</h3>
                    {isLiveData && (
                      <Badge className="bg-green-500/15 border-green-500/30 text-green-500 text-[10px] px-1.5 py-0 ml-auto">
                        ✓ Live Stripe
                      </Badge>
                    )}
                  </div>

                  {dbStatusMismatch && (
                    <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      ⚠️ DB record is stale — showing live Stripe data. DB shows "{selectedUser.current_plan} / {selectedUser.subscription_status || "none"}" but Stripe shows "{livePlan} / {liveStatus}".
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Plan row — use live Stripe-derived plan */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <PlanBadge
                        currentPlan={livePlan}
                        subscriptionStatus={liveStatus}
                        founding100={selectedUser.founding_100}
                        isAnnual={isAnnualSub}
                      />
                    </div>

                    {/* Status row — prefer live Stripe data */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className="text-sm font-medium capitalize">
                        {liveStatus && liveStatus !== "none" ? liveStatus : "Free"}
                      </span>
                    </div>

                  {/* Payment method from Stripe */}
                  {stripeSubscription?.default_payment_method && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Payment Method</span>
                      <span className="text-sm font-medium">
                        {stripeSubscription.default_payment_method.brand.toUpperCase()} •••• {stripeSubscription.default_payment_method.last4}
                      </span>
                    </div>
                  )}

                  {/* Trial end */}
                  {stripeSubscription?.trial_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Trial Ends</span>
                      <span className="text-sm font-medium">
                        {formatTimestamp(stripeSubscription.trial_end)}
                      </span>
                    </div>
                  )}

                  {/* Period end */}
                  {stripeSubscription?.current_period_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Period Ends</span>
                      <span className="text-sm font-medium">
                        {formatTimestamp(stripeSubscription.current_period_end)}
                      </span>
                    </div>
                  )}

                  {/* Founding discount */}
                  {selectedUser.founding_100 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Founder Discount Until</span>
                      <span className="text-sm font-medium text-accent">
                        {selectedUser.founding_discount_until || "N/A"}
                      </span>
                    </div>
                  )}

                  {/* Stripe subscription link */}
                  {selectedUser.stripe_subscription_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stripe Subscription</span>
                      <a
                        href={`https://dashboard.stripe.com/subscriptions/${selectedUser.stripe_subscription_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        View in Stripe <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border/30">
                  {!selectedUser.founding_100 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFounder(selectedUser.id, true)}
                      className="border-accent/40 text-accent hover:bg-accent/10"
                    >
                      Apply Founder Discount
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFounder(selectedUser.id, false)}
                      className="border-border text-muted-foreground"
                    >
                      Remove Founder Discount
                    </Button>
                  )}
                </div>
              </div>
              );
              })()}

              {/* Billing History Section */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold">Billing History</h3>
                </div>

                {billingLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading billing history...</span>
                  </div>
                ) : billingHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No billing history for this customer.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/30">
                          {["Date", "Period", "Description", "Amount", "Status", "Actions"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {billingHistory.map(item => (
                          <tr key={item.id} className="border-b border-border/10">
                            <td className="px-3 py-3 text-sm">
                              {formatTimestamp(item.created)}
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground">
                              {formatTimestamp(item.period_start)} – {formatTimestamp(item.period_end)}
                            </td>
                            <td className="px-3 py-3 text-sm">
                              {item.description}
                            </td>
                            <td className="px-3 py-3 text-sm font-semibold">
                              ${(item.amount_paid / 100).toFixed(2)}
                              {item.amount_due !== item.amount_paid && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  (due: ${(item.amount_due / 100).toFixed(2)})
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <Badge className={
                                item.status === "paid"
                                  ? "bg-green-500/15 border-green-500/30 text-green-500"
                                  : item.status === "open"
                                  ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-500"
                                  : "bg-destructive/15 border-destructive/30 text-destructive"
                              }>
                                {item.status === "paid" ? "✓ Paid" : item.status || "—"}
                              </Badge>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex gap-2">
                                {item.hosted_invoice_url && (
                                  <a
                                    href={item.hosted_invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                  >
                                    View
                                  </a>
                                )}
                                {item.invoice_pdf && (
                                  <a
                                    href={item.invoice_pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    PDF
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              {(() => {
                // Fallback to quiz_progress.demographics for fields missing in profile
                const demo = selectedUser.quiz_progress?.demographics as Record<string, string> | null;
                const getField = (profileVal: string | null | undefined, demoKey: string) =>
                  profileVal || demo?.[demoKey] || null;

                return (
                  <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserCircle className="h-5 w-5 text-primary" />
                      <h3 className="font-display font-semibold">Contact Information</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">First Name</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.first_name ?? selectedUser.first_name ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, first_name: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.first_name, "firstName") || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Last Name</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.last_name ?? selectedUser.last_name ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, last_name: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.last_name, "lastName") || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.email ?? selectedUser.email ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.email, "email") || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.phone ?? selectedUser.phone ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.phone, "phone") || "—"}</p>
                        )}
                      </div>
                      <div className="md:col-span-3">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Address</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.address ?? selectedUser.address ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, address: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.address, "address") || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">City</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.city ?? selectedUser.city ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, city: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.city, "city") || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">State</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.state ?? selectedUser.state ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, state: e.target.value.toUpperCase().slice(0, 2) })}
                            className="mt-1"
                            maxLength={2}
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.state, "state") || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">ZIP Code</Label>
                        {editMode ? (
                          <Input
                            value={editedUser.zip_code ?? selectedUser.zip_code ?? ""}
                            onChange={(e) => setEditedUser({ ...editedUser, zip_code: e.target.value })}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium mt-1">{getField(selectedUser.zip_code, "zipCode") || "—"}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Account Status */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold">Account Status</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">ID Verification</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Switch
                        checked={editedUser.id_verified ?? selectedUser.id_verified ?? false}
                        onCheckedChange={(checked) => {
                          if (editMode) {
                            setEditedUser({ ...editedUser, id_verified: checked });
                          } else {
                            handleVerifyId(selectedUser.id, checked);
                          }
                        }}
                      />
                      <span className={`font-medium ${(editedUser.id_verified ?? selectedUser.id_verified) ? "text-green-500" : "text-muted-foreground"}`}>
                        {(editedUser.id_verified ?? selectedUser.id_verified) ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                    {selectedUser.id_verified_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Verified on {formatDate(selectedUser.id_verified_at)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Current Plan</Label>
                    {editMode ? (
                      <Select
                        value={editedUser.current_plan ?? selectedUser.current_plan ?? "pathfinder"}
                        onValueChange={(value) => setEditedUser({ ...editedUser, current_plan: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pathfinder">Pathfinder (Free)</SelectItem>
                          <SelectItem value="virtue_circles">Virtue Circles</SelectItem>
                          <SelectItem value="soulmatch_ai">SoulMatch AI</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1">
                        <PlanBadge
                          currentPlan={editedUser.current_plan ?? selectedUser.current_plan}
                          subscriptionStatus={editedUser.subscription_status ?? selectedUser.subscription_status}
                          founding100={selectedUser.founding_100}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Subscription Status</Label>
                    {editMode ? (
                      <Select
                        value={editedUser.subscription_status ?? selectedUser.subscription_status ?? "none"}
                        onValueChange={(value) => setEditedUser({ ...editedUser, subscription_status: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Free)</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="trialing">Trialing</SelectItem>
                          <SelectItem value="past_due">Past Due</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium mt-1 capitalize">
                        {selectedUser.subscription_status && selectedUser.subscription_status !== "none"
                          ? selectedUser.subscription_status
                          : "Free"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Member Since</Label>
                    <p className="font-medium mt-1">{formatDate(selectedUser.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Event Stats & Waivers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Statistics */}
                <div className="p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Event Participation</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-background/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">{userEventStats.matched}</p>
                      <p className="text-xs text-muted-foreground">Events Matched</p>
                    </div>
                    <div className="text-center p-3 bg-background/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">{userEventStats.attended}</p>
                      <p className="text-xs text-muted-foreground">Events Attended</p>
                    </div>
                  </div>
                </div>

                {/* Waivers Status */}
                <div className="p-4 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Waivers</h3>
                  </div>
                  {userWaivers.length > 0 ? (
                    <div className="space-y-2">
                      {userWaivers.map((waiver) => (
                        <div key={waiver.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium capitalize">{waiver.waiver_type} Waiver</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {waiver.signed_at ? formatDate(waiver.signed_at) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg">
                      <XCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-500">No waivers signed yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Virtue Profile Override */}
              <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-5 w-5 text-primary" />
                  <h3 className="font-display font-semibold">Virtue Profile</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>You can manually override the calculated virtues if needed.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {(() => {
                  // Derive virtues from quiz scores if profile fields are empty
                  let derivedPrimary = selectedUser.primary_virtue;
                  let derivedSecondary = selectedUser.secondary_virtue;
                  const isPhilosopher = derivedPrimary === 'Balanced';
                  if (!isPhilosopher && (!derivedPrimary || !derivedSecondary) && selectedUser.quiz_progress?.likert_responses) {
                    const scores = calculateVirtueScores(selectedUser.quiz_progress.likert_responses);
                    if (scores) {
                      const sorted = Object.entries(scores).sort(([a, va], [b, vb]) => vb - va || a.localeCompare(b));
                      if (!derivedPrimary && sorted[0]) derivedPrimary = sorted[0][0];
                      if (!derivedSecondary && sorted[1]) derivedSecondary = sorted[1][0];
                    }
                  }
                  return (
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <Label className="text-xs text-muted-foreground uppercase tracking-wide">Primary Virtue</Label>
                         {editMode ? (
                           <Select
                             value={editedUser.primary_virtue ?? selectedUser.primary_virtue ?? ""}
                             onValueChange={(v) => setEditedUser({ ...editedUser, primary_virtue: v })}
                           >
                             <SelectTrigger className="mt-1">
                               <SelectValue placeholder="Select virtue..." />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Wisdom">🦉 Wisdom</SelectItem>
                               <SelectItem value="Courage">🔥 Courage</SelectItem>
                               <SelectItem value="Humanity">❤️ Humanity</SelectItem>
                               <SelectItem value="Justice">⚖️ Justice</SelectItem>
                               <SelectItem value="Temperance">🏛️ Temperance</SelectItem>
                               <SelectItem value="Transcendence">✨ Transcendence</SelectItem>
                               <SelectItem value="Balanced">⚖️ The Philosopher (Balanced)</SelectItem>
                             </SelectContent>
                           </Select>
                         ) : (
                           <p className={`font-medium mt-1 ${isPhilosopher ? 'text-accent' : 'text-primary'}`}>
                             {isPhilosopher ? '⚖️ The Philosopher' : (derivedPrimary || "Not calculated yet")}
                             {!isPhilosopher && derivedPrimary && !selectedUser.primary_virtue && (
                               <span className="ml-1 text-xs text-muted-foreground">(from quiz)</span>
                             )}
                           </p>
                         )}
                       </div>
                       <div>
                         <Label className="text-xs text-muted-foreground uppercase tracking-wide">Secondary Virtue</Label>
                         {editMode ? (
                           <Select
                             value={editedUser.secondary_virtue ?? selectedUser.secondary_virtue ?? ""}
                             onValueChange={(v) => setEditedUser({ ...editedUser, secondary_virtue: v })}
                           >
                             <SelectTrigger className="mt-1">
                               <SelectValue placeholder="Select virtue..." />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Wisdom">🦉 Wisdom</SelectItem>
                               <SelectItem value="Courage">🔥 Courage</SelectItem>
                               <SelectItem value="Humanity">❤️ Humanity</SelectItem>
                               <SelectItem value="Justice">⚖️ Justice</SelectItem>
                               <SelectItem value="Temperance">🏛️ Temperance</SelectItem>
                               <SelectItem value="Transcendence">✨ Transcendence</SelectItem>
                               <SelectItem value="Balanced">⚖️ The Philosopher (Balanced)</SelectItem>
                             </SelectContent>
                           </Select>
                         ) : (
                           <p className={`font-medium mt-1 ${isPhilosopher ? 'text-accent' : 'text-secondary'}`}>
                             {isPhilosopher ? '⚖️ The Philosopher' : (derivedSecondary || "Not calculated yet")}
                             {!isPhilosopher && derivedSecondary && !selectedUser.secondary_virtue && (
                               <span className="ml-1 text-xs text-muted-foreground">(from quiz)</span>
                             )}
                           </p>
                         )}
                       </div>
                    </div>
                  );
                })()}

                {/* Calculated Scores */}
                {selectedUser.quiz_progress?.likert_responses && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Calculated from Quiz</p>
                    {(() => {
                      const scores = calculateVirtueScores(selectedUser.quiz_progress.likert_responses);
                      if (!scores) return <p className="text-muted-foreground">No scores available</p>;
                      const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);
                      return (
                        <div className="space-y-2">
                          {sortedScores.map(([virtue, score], index) => (
                            <div key={virtue} className="flex items-center gap-3">
                              <span className="text-sm w-24 truncate">{virtue}</span>
                              <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${(score / 5) * 100}%`,
                                    backgroundColor: index === 0 
                                      ? "hsl(var(--primary))" 
                                      : index === 1 
                                        ? "hsl(var(--secondary))" 
                                        : "hsl(var(--muted-foreground))"
                                  }}
                                />
                              </div>
                              <span className="text-sm font-mono w-12 text-right">{score.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Demographics — PII masking for non-super-admins */}
              {selectedUser.quiz_progress?.demographics && Object.keys(selectedUser.quiz_progress.demographics).length > 0 && (
                <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Quiz Demographics</h3>
                    {editMode && <Badge variant="outline" className="text-xs ml-auto">Editing</Badge>}
                  </div>
                  {!isSuperAdmin && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Shield className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-500">
                        🔒 Some sensitive fields (orientation, income, date of birth, address) are restricted to Super Admin access only.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(() => {
                      const SEX_OPTIONS = ["male", "female", "non-binary", "prefer-not-to-say"];
                      const ORIENTATION_OPTIONS = ["straight", "gay", "lesbian", "bisexual", "pansexual", "asexual", "other", "prefer-not-to-say"];
                      const INCOME_OPTIONS = ["<25k", "25k-50k", "50k-75k", "75k-100k", "100k-150k", "150k-200k", ">200k", "prefer-not-to-say"];
                      const dropdownOptions: Record<string, string[]> = {
                        genderIdentity: SEX_OPTIONS,
                        orientation: ORIENTATION_OPTIONS,
                        annualIncome: INCOME_OPTIONS,
                      };

                      // Normalize: merge sex → genderIdentity so there's one canonical key
                      const rawDemo = selectedUser.quiz_progress.demographics as Record<string, unknown>;
                      const normalizedEntries: [string, unknown][] = [];
                      const seenKeys = new Set<string>();
                      for (const [key, val] of Object.entries(rawDemo)) {
                        if (key === "communicationPreference") continue;
                        // Collapse sex → genderIdentity
                        const normalKey = key === "sex" ? "genderIdentity" : key;
                        if (!seenKeys.has(normalKey)) {
                          seenKeys.add(normalKey);
                          normalizedEntries.push([normalKey, val]);
                        }
                      }
                      // Ensure genderIdentity always appears even if only sex was stored
                      if (!seenKeys.has("genderIdentity") && rawDemo.sex !== undefined) {
                        normalizedEntries.push(["genderIdentity", rawDemo.sex]);
                      }

                      return normalizedEntries.map(([key, value]) => {
                        const sensitiveFields = ["orientation", "annualIncome", "dateOfBirth", "address"];
                        const isSensitive = sensitiveFields.includes(key);
                        const isRestricted = isSensitive && !isSuperAdmin;
                        // For genderIdentity, also check editedDemographics["sex"] as fallback
                        const currentVal = editedDemographics[key] !== undefined
                          ? editedDemographics[key]
                          : (key === "genderIdentity" && editedDemographics["sex"] !== undefined)
                            ? editedDemographics["sex"]
                            : String(value ?? "");
                        const label = key.replace(/([A-Z])/g, " $1").trim();
                        const isDropdown = key in dropdownOptions;

                        return (
                          <div key={key}>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
                            {editMode && !isRestricted ? (
                              isDropdown ? (
                                <Select
                                  value={currentVal}
                                  onValueChange={(v) => setEditedDemographics((prev) => ({
                                    ...prev,
                                    [key]: v,
                                    // Keep sex in sync so the original quiz field is also updated
                                    ...(key === "genderIdentity" ? { sex: v } : {}),
                                  }))}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dropdownOptions[key].map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={currentVal}
                                  onChange={(e) => setEditedDemographics((prev) => ({ ...prev, [key]: e.target.value }))}
                                  className="mt-1"
                                />
                              )
                            ) : (
                              <p className={`font-medium mt-1 ${isRestricted ? "text-muted-foreground italic text-sm" : ""}`}>
                                {isRestricted ? "— Restricted —" : (currentVal || "—")}
                              </p>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Quiz Answers */}
              {selectedUser.quiz_progress?.likert_responses && (
                <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-display font-semibold">Quiz Answers</h3>
                    </div>
                    <Badge variant="outline">24 Questions</Badge>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {likertQuestions.map((q) => {
                      const response = selectedUser.quiz_progress?.likert_responses?.[q.id];
                      return (
                        <div key={q.id} className="flex justify-between items-start py-2.5 border-b border-border/30 last:border-0">
                          <div className="flex-1 pr-4">
                            <p className="text-sm">{q.text}</p>
                            <Badge variant="secondary" className="text-xs mt-1">{q.virtue}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <div
                                key={n}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  response === n 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {n}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Open-ended Responses */}
              {selectedUser.quiz_progress?.open_ended_responses && Object.keys(selectedUser.quiz_progress.open_ended_responses).length > 0 && (
                <div className="p-4 bg-muted/50 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Written Responses</h3>
                    {editMode && <Badge variant="outline" className="text-xs ml-auto">Editing</Badge>}
                  </div>
                  <div className="space-y-4">
                    {/* Open-ended text questions */}
                    {openEndedQuestions.map((q) => {
                      const rawResponse = selectedUser.quiz_progress?.open_ended_responses?.[q.id];
                      if (!rawResponse && editedOpenEnded[q.id] === undefined) return null;

                      // Handle multiselect (e.g. availability)
                      if (q.type === "multiselect" && q.options) {
                        const currentArr: string[] = editedOpenEnded[q.id] !== undefined
                          ? (editedOpenEnded[q.id] as string).split(", ").filter(Boolean)
                          : (Array.isArray(rawResponse) ? rawResponse as string[] : rawResponse ? [String(rawResponse)] : []);
                        return (
                          <div key={q.id} className="p-3 bg-background/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">{q.question}</p>
                            {editMode ? (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {q.options.map((opt) => (
                                  <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
                                    <input
                                      type="checkbox"
                                      className="accent-primary"
                                      checked={currentArr.includes(opt)}
                                      onChange={(e) => {
                                        const updated = e.target.checked
                                          ? [...currentArr, opt]
                                          : currentArr.filter((v) => v !== opt);
                                        setEditedOpenEnded((prev) => ({ ...prev, [q.id]: updated.join(", ") }));
                                      }}
                                    />
                                    {opt}
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {currentArr.length > 0
                                  ? currentArr.map((v) => (
                                      <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                                    ))
                                  : <p className="font-medium">—</p>}
                              </div>
                            )}
                          </div>
                        );
                      }

                      const displayVal = editedOpenEnded[q.id] !== undefined
                        ? editedOpenEnded[q.id]
                        : String(rawResponse ?? "");
                      return (
                        <div key={q.id} className="p-3 bg-background/50 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1.5">{q.question}</p>
                          {editMode ? (
                            <Textarea
                              value={displayVal}
                              onChange={(e) => setEditedOpenEnded((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              className="mt-1 min-h-[80px]"
                              placeholder="Enter response..."
                            />
                          ) : (
                            <p className="font-medium">{displayVal || "—"}</p>
                          )}
                        </div>
                      );
                    })}

                    {/* Preference questions (communication, group matching, coaching, etc.) */}
                    {(() => {
                      return preferenceQuestions.map((q) => {
                        const rawResponse = selectedUser.quiz_progress?.open_ended_responses?.[q.id];
                        // Always show preference questions (don't skip if empty)
                        const hasData = rawResponse !== undefined && rawResponse !== null && rawResponse !== "";

                        if (q.type === "multiselect" && q.options) {
                          // Multiselect (e.g. communication) — show checkboxes/badges
                          const currentArr: string[] = editedOpenEnded[q.id] !== undefined
                            ? (editedOpenEnded[q.id] as string).split(", ").filter(Boolean)
                            : (Array.isArray(rawResponse) ? rawResponse as string[] : rawResponse ? [String(rawResponse)] : []);
                          return (
                            <div key={q.id} className="p-3 bg-background/50 rounded-lg">
                              <p className="text-sm text-muted-foreground mb-2">{q.question}</p>
                              {editMode ? (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {q.options.map((opt) => (
                                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none text-sm">
                                      <input
                                        type="checkbox"
                                        className="accent-primary"
                                        checked={currentArr.includes(opt)}
                                        onChange={(e) => {
                                          const updated = e.target.checked
                                            ? [...currentArr, opt]
                                            : currentArr.filter((v) => v !== opt);
                                          setEditedOpenEnded((prev) => ({ ...prev, [q.id]: updated.join(", ") }));
                                        }}
                                      />
                                      {opt}
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {currentArr.length > 0
                                    ? currentArr.map((v) => (
                                        <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                                      ))
                                    : <p className="text-muted-foreground text-sm">—</p>}
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (!hasData && editedOpenEnded[q.id] === undefined) return null;

                        // select / text preference questions
                        const displayVal = editedOpenEnded[q.id] !== undefined
                          ? editedOpenEnded[q.id]
                          : (Array.isArray(rawResponse) ? (rawResponse as string[]).join(", ") : String(rawResponse ?? ""));
                        return (
                          <div key={q.id} className="p-3 bg-background/50 rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1.5">{q.question}</p>
                            {editMode ? (
                              q.type === "select" && q.options ? (
                                <Select
                                  value={displayVal}
                                  onValueChange={(v) => setEditedOpenEnded((prev) => ({ ...prev, [q.id]: v }))}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {q.options.map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Textarea
                                  value={displayVal}
                                  onChange={(e) => setEditedOpenEnded((prev) => ({ ...prev, [q.id]: e.target.value }))}
                                  className="mt-1 min-h-[60px]"
                                  placeholder="Enter response..."
                                />
                              )
                            ) : (
                              <p className="font-medium">{displayVal || "—"}</p>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* No Quiz Data */}
              {!selectedUser.quiz_progress && (
                <div className="p-8 text-center bg-muted/50 rounded-xl">
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-lg font-medium">No Quiz Data Yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This user hasn't started the quiz
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flagged Profiles Section */}
      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-display font-bold">🚩 Flagged Virtue Profiles</h3>
            {flaggedCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/30">
                {flaggedCount} pending review
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowFlaggedSection(!showFlaggedSection);
              if (!showFlaggedSection) loadFlaggedProfiles();
            }}
          >
            {showFlaggedSection ? "Hide" : "View Flagged"}
          </Button>
        </div>

        {showFlaggedSection && (
          <>
            {flaggedLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : flaggedProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No flagged profiles at this time.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Member", "Plan", "Attempts", "Reason", "Actions"].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedProfiles.map((profile) => (
                      <tr key={profile.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3">
                          <p className="font-medium">{getDisplayName(profile)}</p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </td>
                        <td className="py-3 px-3">
                          <PlanBadge
                            currentPlan={profile.current_plan}
                            subscriptionStatus={profile.subscription_status}
                            founding100={profile.founding_100}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary/20 text-secondary border border-secondary/30">
                            {profile.quiz_attempt_count} attempts
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <p className="text-xs text-muted-foreground truncate">{profile.flag_reason || "—"}</p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-primary/40 text-primary hover:bg-primary/10"
                              onClick={() => {
                                setAssignVirtueDialog({ open: true, userId: profile.id, name: getDisplayName(profile) });
                                setSelectedAssignVirtue("");
                              }}
                            >
                              Assign Virtue
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleClearFlag(profile.id)}
                            >
                              Clear Flag
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </GlowCard>

      {/* Assign Virtue Dialog */}
      <Dialog open={assignVirtueDialog.open} onOpenChange={(open) => setAssignVirtueDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Primary Virtue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Manually assign a primary virtue for <strong>{assignVirtueDialog.name}</strong>. This overrides their balanced quiz result.
            </p>
            <Select value={selectedAssignVirtue} onValueChange={setSelectedAssignVirtue}>
              <SelectTrigger>
                <SelectValue placeholder="Select a virtue..." />
              </SelectTrigger>
              <SelectContent>
                {["Transcendence", "Justice", "Humanity", "Temperance", "Wisdom", "Courage"].map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAssignVirtueDialog({ open: false, userId: "", name: "" })}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="flex-1"
                disabled={!selectedAssignVirtue}
                onClick={() => handleAssignVirtue(assignVirtueDialog.userId, selectedAssignVirtue)}
              >
                Assign Virtue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
