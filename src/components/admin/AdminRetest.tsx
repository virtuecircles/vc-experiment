import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  HelpCircle,
  Search,
  UserCircle,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";

interface RetestPermission {
  id: string;
  user_id: string;
  enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
  expires_at: string | null;
  reason: string | null;
  notes: string | null;
}

interface UserWithRetest {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  primary_virtue: string | null;
  quizCompleted: boolean;
  retestPermission: RetestPermission | null;
}

export const AdminRetest = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isSuperAdmin, isVCManager, canEnableRetest } = useUserRoles();
  const [users, setUsers] = useState<UserWithRetest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRetest | null>(null);
  const [saving, setSaving] = useState(false);
  const [retestForm, setRetestForm] = useState({
    expiresIn: "7", // days
    reason: "",
    notes: "",
  });

  useEffect(() => {
    if (canEnableRetest) {
      fetchUsers();
    }
  }, [canEnableRetest]);

  const fetchUsers = async () => {
    try {
      // Fetch profiles and quiz progress
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, primary_virtue")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: quizProgress } = await supabase
        .from("quiz_progress")
        .select("id, completed_at");

      const { data: retestPerms } = await supabase
        .from("retest_permissions")
        .select("*");

      const usersWithRetest: UserWithRetest[] = (profiles || []).map((profile) => {
        const quiz = quizProgress?.find((q) => q.id === profile.id);
        const retest = retestPerms?.find((r) => r.user_id === profile.id);

        return {
          ...profile,
          quizCompleted: !!quiz?.completed_at,
          retestPermission: retest || null,
        };
      });

      setUsers(usersWithRetest);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableRetest = async () => {
    if (!selectedUser || !user) return;

    setSaving(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(retestForm.expiresIn));

      // Check if permission already exists
      if (selectedUser.retestPermission) {
        // Update existing
        const { error } = await supabase
          .from("retest_permissions")
          .update({
            enabled: true,
            enabled_at: new Date().toISOString(),
            enabled_by: user.id,
            expires_at: expiresAt.toISOString(),
            reason: retestForm.reason || null,
            notes: retestForm.notes || null,
          })
          .eq("id", selectedUser.retestPermission.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("retest_permissions").insert({
          user_id: selectedUser.id,
          enabled: true,
          enabled_at: new Date().toISOString(),
          enabled_by: user.id,
          expires_at: expiresAt.toISOString(),
          reason: retestForm.reason || null,
          notes: retestForm.notes || null,
        });

        if (error) throw error;
      }

      toast({
        title: "✓ Retest Enabled",
        description: `${getDisplayName(selectedUser)} can now retake the quiz.`,
      });

      setShowEnableDialog(false);
      setRetestForm({ expiresIn: "7", reason: "", notes: "" });
      fetchUsers();
    } catch (error) {
      console.error("Error enabling retest:", error);
      toast({
        title: "Error",
        description: "Failed to enable retest. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisableRetest = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("retest_permissions")
        .update({ enabled: false })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "✓ Retest Disabled",
        description: "Retest permission has been revoked.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error disabling retest:", error);
      toast({
        title: "Error",
        description: "Failed to disable retest.",
        variant: "destructive",
      });
    }
  };

  const getDisplayName = (user: UserWithRetest) => {
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
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isRetestActive = (permission: RetestPermission | null) => {
    if (!permission || !permission.enabled) return false;
    if (permission.expires_at && new Date(permission.expires_at) < new Date()) return false;
    return true;
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const activeRetests = users.filter((u) => isRetestActive(u.retestPermission)).length;
  const completedQuizzes = users.filter((u) => u.quizCompleted).length;

  if (!canEnableRetest) {
    return (
      <GlowCard className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">
          Only Super Admins and VC Managers can manage retest permissions.
        </p>
      </GlowCard>
    );
  }

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
        <h2 className="font-display font-semibold text-lg">Retest Management</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Enable users to retake the virtue quiz. Permissions are time-bound. Old results are archived when retaken.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlowCard className="p-4">
          <p className="text-2xl font-bold">{users.length}</p>
          <p className="text-sm text-muted-foreground">Total Users</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">{completedQuizzes}</p>
          <p className="text-sm text-muted-foreground">Quiz Completed</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-blue-500">{activeRetests}</p>
          <p className="text-sm text-muted-foreground">Active Retests</p>
        </GlowCard>
      </div>

      {/* Search */}
      <GlowCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </GlowCard>

      {/* Users List */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No users found</p>
          </GlowCard>
        ) : (
          filteredUsers.map((u) => {
            const retestActive = isRetestActive(u.retestPermission);

            return (
              <GlowCard key={u.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{getDisplayName(u)}</p>
                      {u.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {u.quizCompleted ? (
                          <Badge className="bg-green-500/20 text-green-500 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Quiz Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Quiz Incomplete
                          </Badge>
                        )}
                        {u.primary_virtue && (
                          <Badge variant="outline" className="text-xs">
                            {u.primary_virtue}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {retestActive ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-500">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retest Enabled
                        </Badge>
                        {u.retestPermission?.expires_at && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires: {formatDate(u.retestPermission.expires_at)}
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisableRetest(u.id)}
                        >
                          Disable
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setShowEnableDialog(true);
                        }}
                        disabled={false}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Enable Retest
                      </Button>
                    )}
                  </div>
                </div>
              </GlowCard>
            );
          })
        )}
      </div>

      {/* Enable Retest Dialog */}
      <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Enable Quiz Retest
            </DialogTitle>
            <DialogDescription>
              Allow {selectedUser ? getDisplayName(selectedUser) : "this user"} to retake the virtue quiz.
              Their current results will be archived.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Expires In (Days)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={retestForm.expiresIn}
                onChange={(e) => setRetestForm({ ...retestForm, expiresIn: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Permission will expire after this many days
              </p>
            </div>

            <div>
              <Label>Reason (Optional)</Label>
              <Input
                value={retestForm.reason}
                onChange={(e) => setRetestForm({ ...retestForm, reason: e.target.value })}
                placeholder="e.g., User requested retest after life event"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Input
                value={retestForm.notes}
                onChange={(e) => setRetestForm({ ...retestForm, notes: e.target.value })}
                placeholder="Internal notes for tracking"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnableRetest} disabled={saving}>
              {saving ? "Enabling..." : "Enable Retest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
