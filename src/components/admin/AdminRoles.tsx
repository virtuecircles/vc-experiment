import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles, AppRole, getRoleDisplayName, getRoleDescription, getRoleColor } from "@/hooks/useUserRoles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Search,
  ShieldCheck,
  ShieldAlert,
  Shield,
  UserPlus,
  Trash2,
  Crown,
  HelpCircle,
  UserCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Sparkles,
  Users,
  UserCheck,
} from "lucide-react";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

interface ProfileInfo {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Region {
  id: string;
  name: string;
  description: string | null;
}

interface Event {
  id: string;
  title: string;
  event_date: string;
  status: string | null;
}

interface UserWithRole extends ProfileInfo {
  roles: UserRole[];
  managerRegions?: string[];
  guideEvents?: string[];
}

const ROLE_OPTIONS: AppRole[] = ["super_admin", "admin", "vc_manager", "vc_guide", "vc_member"];

const getRoleIcon = (role: AppRole) => {
  switch (role) {
    case "super_admin": return Crown;
    case "vc_manager": return Sparkles;
    case "vc_guide": return Users;
    case "vc_member": return UserCheck;
    case "admin": return Crown;
    case "moderator": return ShieldCheck;
    default: return Shield;
  }
};

export const AdminRoles = () => {
  const { toast } = useToast();
  const { isSuperAdmin, canManageRoles } = useUserRoles();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all" | "no_role">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showRemoveRoleDialog, setShowRemoveRoleDialog] = useState(false);
  const [showRegionDialog, setShowRegionDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("vc_guide");
  const [roleToRemove, setRoleToRemove] = useState<UserRole | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const usersPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles, roles, regions, events in parallel
      const [profilesRes, rolesRes, regionsRes, eventsRes, managerRegionsRes, guideEventsRes] = await Promise.all([
        supabase.from("profiles").select("id, email, first_name, last_name").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("regions").select("*"),
        supabase.from("events").select("id, title, event_date, status").order("event_date", { ascending: false }),
        supabase.from("manager_regions").select("*"),
        supabase.from("guide_events").select("*"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setRegions(regionsRes.data || []);
      setEvents(eventsRes.data || []);

      // Combine data
      const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map((profile) => ({
        ...profile,
        roles: (rolesRes.data || []).filter((r) => r.user_id === profile.id) as UserRole[],
        managerRegions: (managerRegionsRes.data || [])
          .filter((mr) => mr.user_id === profile.id)
          .map((mr) => mr.region_id),
        guideEvents: (guideEventsRes.data || [])
          .filter((ge) => ge.user_id === profile.id)
          .map((ge) => ge.event_id),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load users and roles.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.email?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower);

    const matchesRole =
      roleFilter === "all"
        ? true
        : roleFilter === "no_role"
        ? user.roles.length === 0
        : user.roles.some((r) => r.role === roleFilter);

    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const getDisplayName = (user: ProfileInfo) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "Unknown User";
  };

  const handleAddRole = async () => {
    if (!selectedUser || !canManageRoles) return;
    
    // Check if user already has this role
    if (selectedUser.roles.some((r) => r.role === selectedRole)) {
      toast({
        title: "Role Already Exists",
        description: `${getDisplayName(selectedUser)} already has the ${getRoleDisplayName(selectedRole)} role.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.id,
          role: selectedRole,
        });

      if (error) throw error;

      toast({
        title: "✓ Role Added",
        description: `${getDisplayName(selectedUser)} is now a ${getRoleDisplayName(selectedRole)}.`,
      });
      
      setShowAddRoleDialog(false);
      
      // If VC Manager, prompt for region assignment
      if (selectedRole === "vc_manager") {
        setSelectedRegions([]);
        setShowRegionDialog(true);
      }
      // If VC Guide, prompt for meetup assignment
      else if (selectedRole === "vc_guide") {
        setSelectedEvents([]);
        setShowEventDialog(true);
      } else {
        fetchData();
      }
    } catch (error) {
      console.error("Error adding role:", error);
      toast({
        title: "Error",
        description: "Failed to add role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async () => {
    if (!roleToRemove || !canManageRoles) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleToRemove.id);

      if (error) throw error;

      // Also remove related assignments
      if (roleToRemove.role === "vc_manager" && selectedUser) {
        await supabase.from("manager_regions").delete().eq("user_id", selectedUser.id);
      }
      if (roleToRemove.role === "vc_guide" && selectedUser) {
        await supabase.from("guide_events").delete().eq("user_id", selectedUser.id);
      }

      toast({
        title: "✓ Role Removed",
        description: "The role has been removed successfully.",
      });
      
      setShowRemoveRoleDialog(false);
      setRoleToRemove(null);
      fetchData();
    } catch (error) {
      console.error("Error removing role:", error);
      toast({
        title: "Error",
        description: "Failed to remove role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignRegions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Remove existing region assignments
      await supabase.from("manager_regions").delete().eq("user_id", selectedUser.id);

      // Add new assignments
      if (selectedRegions.length > 0) {
        const assignments = selectedRegions.map((regionId) => ({
          user_id: selectedUser.id,
          region_id: regionId,
        }));
        
        const { error } = await supabase.from("manager_regions").insert(assignments);
        if (error) throw error;
      }

      toast({
        title: "✓ Regions Updated",
        description: `Assigned ${selectedRegions.length} region(s) to ${getDisplayName(selectedUser)}.`,
      });
      
      setShowRegionDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error assigning regions:", error);
      toast({
        title: "Error",
        description: "Failed to assign regions.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAssignEvents = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // Remove existing event assignments
      await supabase.from("guide_events").delete().eq("user_id", selectedUser.id);

      // Add new assignments
      if (selectedEvents.length > 0) {
        const assignments = selectedEvents.map((eventId) => ({
          user_id: selectedUser.id,
          event_id: eventId,
        }));
        
        const { error } = await supabase.from("guide_events").insert(assignments);
        if (error) throw error;
      }

      toast({
        title: "✓ Meetups Updated",
        description: `Assigned ${selectedEvents.length} meetup(s) to ${getDisplayName(selectedUser)}.`,
      });
      
      setShowEventDialog(false);
      fetchData();
    } catch (error) {
      console.error("Error assigning events:", error);
        toast({
          title: "Error",
          description: "Failed to assign meetups.",
          variant: "destructive",
        });
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const superAdminCount = users.filter((u) => u.roles.some((r) => r.role === "super_admin")).length;
  const adminCount = users.filter((u) => u.roles.some((r) => r.role === "admin")).length;
  const managerCount = users.filter((u) => u.roles.some((r) => r.role === "vc_manager")).length;
  const guideCount = users.filter((u) => u.roles.some((r) => r.role === "vc_guide")).length;
  const memberCount = users.filter((u) => u.roles.some((r) => r.role === "vc_member")).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canManageRoles) {
    return (
      <GlowCard className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">
          Only Super Admins can manage user roles.
        </p>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-amber-500">{superAdminCount}</p>
              <p className="text-sm text-muted-foreground">Super Admins</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-red-500">{adminCount}</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-purple-500">{managerCount}</p>
              <p className="text-sm text-muted-foreground">VC Managers</p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-blue-500">{guideCount}</p>
              <p className="text-sm text-muted-foreground">VC Guides</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-green-500">{memberCount}</p>
              <p className="text-sm text-muted-foreground">VC Members</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl md:text-3xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
            <div className="p-2 bg-muted rounded-lg">
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Search */}
      <GlowCard className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users to manage roles..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value as AppRole | "all" | "no_role");
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-44">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="vc_manager">VC Manager</SelectItem>
              <SelectItem value="vc_guide">VC Guide</SelectItem>
              <SelectItem value="vc_member">VC Member</SelectItem>
              <SelectItem value="no_role">No Role</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {filteredUsers.length} of {users.length} users</span>
            {(searchTerm || roleFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setRoleFilter("all"); }} className="h-7 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
        </div>
      </GlowCard>

      {/* Role Permission Legend */}
      <GlowCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">Role Hierarchy</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Click on a user to add or remove roles. Assign regions to VC Managers and meetups to VC Guides.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="flex items-start gap-3 p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
            <Crown className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-500">Super Admin</p>
              <p className="text-xs text-muted-foreground">Full access: all features, revenue, pricing, refunds, role management</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/20">
            <ShieldCheck className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-500">Admin</p>
              <p className="text-xs text-muted-foreground">Admin access: manage users, content, and platform settings</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
            <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <p className="font-medium text-purple-500">VC Manager</p>
              <p className="text-xs text-muted-foreground">Regional access: meetups, groups, guides, retest. Read-only revenue</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-500">VC Guide</p>
              <p className="text-xs text-muted-foreground">Meetup-specific: assigned meetups, member profiles (read-only), group messaging</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20">
            <UserCheck className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium text-green-500">VC Member</p>
              <p className="text-xs text-muted-foreground">Basic access: own profile, circles, meetup RSVPs, group chat</p>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Users List */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-lg px-1">Manage User Roles</h2>

        {paginatedUsers.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? "Try a different search term" : "Users will appear here once they sign up"}
            </p>
          </GlowCard>
        ) : (
          <div className="space-y-2">
            {paginatedUsers.map((user) => {
              const RoleIcon = user.roles.length > 0 
                ? getRoleIcon(user.roles[0].role as AppRole)
                : UserCircle;
              
              return (
                <GlowCard key={user.id} className="p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        <RoleIcon className={`h-8 w-8 ${
                          user.roles.some(r => r.role === "super_admin") ? "text-amber-500" :
                          user.roles.some(r => r.role === "vc_manager") ? "text-purple-500" :
                          user.roles.some(r => r.role === "vc_guide") ? "text-blue-500" :
                          user.roles.some(r => r.role === "vc_member") ? "text-green-500" :
                          "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{getDisplayName(user)}</p>
                        {user.email && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </p>
                        )}
                        {/* Show assigned regions for managers */}
                        {user.managerRegions && user.managerRegions.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-purple-500">
                            <MapPin className="h-3 w-3" />
                            {user.managerRegions.map(regionId => 
                              regions.find(r => r.id === regionId)?.name
                            ).filter(Boolean).join(", ")}
                          </div>
                        )}
                        {/* Show assigned meetups for guides */}
                        {user.guideEvents && user.guideEvents.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-blue-500">
                            <Calendar className="h-3 w-3" />
                            {user.guideEvents.length} meetup(s) assigned
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Current Roles */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline" className="bg-muted/50">
                            <Shield className="h-3 w-3 mr-1" />
                            VC Member
                          </Badge>
                        ) : (
                          user.roles.map((role) => {
                            const RoleIconComponent = getRoleIcon(role.role as AppRole);
                            return (
                              <Tooltip key={role.id}>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    className={`cursor-pointer flex items-center gap-1.5 ${getRoleColor(role.role as AppRole)}`}
                                    onClick={() => {
                                      setRoleToRemove(role);
                                      setSelectedUser(user);
                                      setShowRemoveRoleDialog(true);
                                    }}
                                  >
                                    <RoleIconComponent className="h-3 w-3" />
                                    {getRoleDisplayName(role.role as AppRole)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getRoleDescription(role.role as AppRole)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">Click to remove</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {user.roles.some(r => r.role === "vc_manager") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedRegions(user.managerRegions || []);
                              setShowRegionDialog(true);
                            }}
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            Regions
                          </Button>
                        )}
                        {user.roles.some(r => r.role === "vc_guide") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedEvents(user.guideEvents || []);
                              setShowEventDialog(true);
                            }}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Meetups
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setSelectedRole("vc_guide");
                            setShowAddRoleDialog(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Role
                        </Button>
                      </div>
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

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Role to User
            </DialogTitle>
            <DialogDescription>
              Grant permissions to {selectedUser ? getDisplayName(selectedUser) : "this user"}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => {
                    const RoleIconComponent = getRoleIcon(role);
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <RoleIconComponent className={`h-4 w-4 ${
                            role === "super_admin" ? "text-amber-500" :
                            role === "vc_manager" ? "text-purple-500" :
                            role === "vc_guide" ? "text-blue-500" :
                            "text-green-500"
                          }`} />
                          <span>{getRoleDisplayName(role)}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{getRoleDescription(selectedRole)}</p>
            </div>

            {selectedRole === "super_admin" && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-500">Warning: Super Admin Access</p>
                  <p className="text-muted-foreground">This grants FULL access including revenue editing, pricing changes, refunds, and role management.</p>
                </div>
              </div>
            )}

            {selectedRole === "vc_manager" && (
              <div className="flex items-start gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <MapPin className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-purple-500">Region Assignment Required</p>
                  <p className="text-muted-foreground">After adding this role, you'll assign which regions this manager can access.</p>
                </div>
              </div>
            )}

            {selectedRole === "vc_guide" && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <Calendar className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-500">Meetup Assignment Required</p>
                  <p className="text-muted-foreground">After adding this role, you'll assign which meetups this guide can access.</p>
                </div>
              </div>
            )}

            {selectedRole === "vc_member" && (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <UserCheck className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-green-500">Basic Member Permissions</p>
                  <p className="text-muted-foreground">Standard access to view profile, join circles, RSVP to meetups, and participate in group chat.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={saving}>
              {saving ? "Adding..." : "Add Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Region Assignment Dialog */}
      <Dialog open={showRegionDialog} onOpenChange={setShowRegionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-500" />
              Assign Regions
            </DialogTitle>
            <DialogDescription>
              Select which regions {selectedUser ? getDisplayName(selectedUser) : "this manager"} can access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4 max-h-64 overflow-y-auto">
            {regions.map((region) => (
              <div
                key={region.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <Checkbox
                  checked={selectedRegions.includes(region.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRegions([...selectedRegions, region.id]);
                    } else {
                      setSelectedRegions(selectedRegions.filter(id => id !== region.id));
                    }
                  }}
                />
                <div>
                  <p className="font-medium">{region.name}</p>
                  {region.description && (
                    <p className="text-sm text-muted-foreground">{region.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRegions} disabled={saving}>
              {saving ? "Saving..." : `Assign ${selectedRegions.length} Region(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meetup Assignment Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Assign Meetups
            </DialogTitle>
            <DialogDescription>
              Select which meetups {selectedUser ? getDisplayName(selectedUser) : "this guide"} can access.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4 max-h-64 overflow-y-auto">
            {events.filter(e => e.status !== "cancelled").map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <Checkbox
                  checked={selectedEvents.includes(event.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedEvents([...selectedEvents, event.id]);
                    } else {
                      setSelectedEvents(selectedEvents.filter(id => id !== event.id));
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{event.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.event_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {event.status || "upcoming"}
                </Badge>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignEvents} disabled={saving}>
              {saving ? "Saving..." : `Assign ${selectedEvents.length} Meetup(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Role Confirmation */}
      <AlertDialog open={showRemoveRoleDialog} onOpenChange={setShowRemoveRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Remove Role
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the <strong>{roleToRemove ? getRoleDisplayName(roleToRemove.role as AppRole) : ""}</strong> role from{" "}
              <strong>{selectedUser ? getDisplayName(selectedUser) : "this user"}</strong>?
              <br /><br />
              This will revoke their permissions immediately.
              {roleToRemove?.role === "vc_manager" && " Their region assignments will also be removed."}
              {roleToRemove?.role === "vc_guide" && " Their meetup assignments will also be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToRemove(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Removing..." : "Remove Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
