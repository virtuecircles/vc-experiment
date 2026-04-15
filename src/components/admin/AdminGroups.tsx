import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Plus,
  Edit,
  Save,
  HelpCircle,
  Trash2,
  UserPlus,
  MapPin,
  Calendar,
  Eye,
  Search,
  Filter,
  UserCheck,
  UserX,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Circle = Tables<"circles">;
type CircleMember = Tables<"circle_members"> & {
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};
type Event = Tables<"events">;

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  primary_virtue: string | null;
  secondary_virtue: string | null;
  city: string | null;
}

interface GuideAssignment {
  id: string;
  guide_id: string;
  circle_id: string;
  is_active: boolean;
  guide_name?: string;
  guide_email?: string;
}

interface GuideProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const VIRTUES = ["Wisdom", "Humanity", "Courage", "Justice", "Temperance", "Transcendence"];

export const AdminGroups = () => {
  const { toast } = useToast();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allGroupedUserIds, setAllGroupedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCircleDialog, setShowCircleDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  // Guide assignment state
  const [guideAssignments, setGuideAssignments] = useState<GuideAssignment[]>([]);
  const [allGuides, setAllGuides] = useState<GuideProfile[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string>("");
  const [assigningGuide, setAssigningGuide] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  
  // Filter states for Add Members dialog
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [virtueFilter, setVirtueFilter] = useState("all");
  const [groupedFilter, setGroupedFilter] = useState<"all" | "grouped" | "ungrouped">("all");
  
  const [circleForm, setCircleForm] = useState<{
    name: string;
    description: string;
    primary_virtue: string;
    max_members: number;
    status: "forming" | "active" | "completed" | "archived";
    event_id: string | null;
  }>({
    name: "",
    description: "",
    primary_virtue: "",
    max_members: 8,
    status: "forming",
    event_id: null,
  });

  useEffect(() => {
    fetchData();
    fetchAllGuides();
  }, []);

  const fetchData = async () => {
    try {
      const [circlesRes, eventsRes, usersRes, allMembersRes] = await Promise.all([
        supabase.from("circles").select("*").order("created_at", { ascending: false }),
        supabase.from("events").select("*").order("event_date", { ascending: false }),
        supabase.from("profiles").select("id, first_name, last_name, email, primary_virtue, secondary_virtue, city"),
        supabase.from("circle_members").select("user_id").eq("status", "active"),
      ]);

      if (circlesRes.error) throw circlesRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (usersRes.error) throw usersRes.error;

      setCircles(circlesRes.data || []);
      setEvents(eventsRes.data || []);
      setAllUsers(usersRes.data || []);
      
      // Build set of all grouped user IDs
      const groupedIds = new Set<string>();
      (allMembersRes.data || []).forEach((m) => {
        if (m.user_id) groupedIds.add(m.user_id);
      });
      setAllGroupedUserIds(groupedIds);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (circleId: string) => {
    try {
      const { data, error } = await supabase
        .from("circle_members")
        .select("*")
        .eq("circle_id", circleId);

      if (error) throw error;

      const membersWithProfiles: CircleMember[] = [];
      for (const member of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", member.user_id)
          .single();
        
        membersWithProfiles.push({
          ...member,
          profile: profile || undefined,
        });
      }

      setMembers(membersWithProfiles);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchAllGuides = async () => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vc_guide");
      if (!roleData || roleData.length === 0) return;
      const guideIds = roleData.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", guideIds);
      setAllGuides(profiles || []);
    } catch (e) {
      console.error("Error fetching guides:", e);
    }
  };

  const fetchGuideAssignments = async (circleId: string) => {
    try {
      const { data } = await supabase
        .from("guide_circle_assignments")
        .select("id, guide_id, circle_id, is_active")
        .eq("circle_id", circleId)
        .eq("is_active", true);
      
      const enriched = await Promise.all(
        (data || []).map(async (a) => {
          const { data: p } = await supabase.from("profiles").select("first_name, last_name, email").eq("id", a.guide_id).single();
          return {
            ...a,
            guide_name: p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown" : "Unknown",
            guide_email: p?.email || "",
          };
        })
      );
      setGuideAssignments(enriched);
    } catch (e) {
      console.error("Error fetching guide assignments:", e);
    }
  };

  const handleAssignGuide = async () => {
    if (!selectedCircle || !selectedGuideId) return;
    setAssigningGuide(true);
    try {
      const { error } = await supabase.from("guide_circle_assignments").upsert({
        guide_id: selectedGuideId,
        circle_id: selectedCircle.id,
        is_active: true,
      }, { onConflict: "guide_id,circle_id" });
      if (error) throw error;
      toast({ title: "✓ Guide Assigned", description: "Guide has been assigned to this circle." });
      setSelectedGuideId("");
      fetchGuideAssignments(selectedCircle.id);
    } catch (e) {
      toast({ title: "Error", description: "Failed to assign guide.", variant: "destructive" });
    } finally {
      setAssigningGuide(false);
    }
  };

  const handleRemoveGuide = async (assignmentId: string) => {
    try {
      await supabase.from("guide_circle_assignments").update({ is_active: false }).eq("id", assignmentId);
      toast({ title: "✓ Guide Removed" });
      if (selectedCircle) fetchGuideAssignments(selectedCircle.id);
    } catch {
      toast({ title: "Error", description: "Failed to remove guide.", variant: "destructive" });
    }
  };

  const handleSaveCircle = async () => {
    setSaving(true);
    try {
      if (selectedCircle && editMode) {
        const { error } = await supabase
          .from("circles")
          .update({
            name: circleForm.name,
            description: circleForm.description,
            primary_virtue: circleForm.primary_virtue,
            max_members: circleForm.max_members,
            status: circleForm.status,
            event_id: circleForm.event_id,
          })
          .eq("id", selectedCircle.id);

        if (error) throw error;

        // Auto-create RSVPs when a meetup is assigned/changed
        const newEventId = circleForm.event_id;
        const oldEventId = selectedCircle.event_id;
        if (newEventId && newEventId !== oldEventId) {
          const { data: activeMembers } = await supabase
            .from("circle_members")
            .select("user_id")
            .eq("circle_id", selectedCircle.id)
            .eq("status", "active");

          if (activeMembers && activeMembers.length > 0) {
            const memberIds = activeMembers.map((m) => m.user_id);
            const { data: existingRsvps } = await supabase
              .from("event_rsvps")
              .select("user_id")
              .eq("event_id", newEventId)
              .in("user_id", memberIds);

            const alreadyAssigned = new Set(existingRsvps?.map((r) => r.user_id) || []);
            const rsvpsToCreate = memberIds
              .filter((uid) => !alreadyAssigned.has(uid))
              .map((userId) => ({
                event_id: newEventId,
                user_id: userId,
                status: "pending" as const,
              }));

            if (rsvpsToCreate.length > 0) {
              await supabase.from("event_rsvps").insert(rsvpsToCreate);
            }
          }
        }

        toast({
          title: "✓ Circle Updated",
          description: newEventId && newEventId !== oldEventId
            ? "Circle updated and meetup RSVP invitations sent to all members."
            : "Circle has been updated successfully.",
        });
      } else {
        const { error } = await supabase.from("circles").insert({
          name: circleForm.name,
          description: circleForm.description,
          primary_virtue: circleForm.primary_virtue,
          max_members: circleForm.max_members,
          status: circleForm.status,
          event_id: circleForm.event_id,
        });

        if (error) throw error;
        toast({
          title: "✓ Circle Created",
          description: "New circle has been created successfully.",
        });
      }

      setShowCircleDialog(false);
      setEditMode(false);
      setSelectedCircle(null);
      fetchData();
    } catch (error) {
      console.error("Error saving circle:", error);
      toast({
        title: "Error",
        description: "Failed to save circle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedCircle || selectedUsersToAdd.length === 0) return;

    setSaving(true);
    try {
      const membersToAdd = selectedUsersToAdd.map((userId) => ({
        circle_id: selectedCircle.id,
        user_id: userId,
        status: "active",
        approved_by_admin: true,
        approved_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("circle_members").insert(membersToAdd);
      if (error) throw error;

      // Auto-create RSVPs only if the circle has an ACTIVE/UPCOMING meetup assigned (not completed/cancelled)
      if (selectedCircle.event_id) {
        const { data: eventData } = await supabase
          .from("events")
          .select("status, is_completed")
          .eq("id", selectedCircle.event_id)
          .single();

        const isActiveEvent = eventData &&
          !eventData.is_completed &&
          eventData.status !== "completed" &&
          eventData.status !== "cancelled";

        if (isActiveEvent) {
          const { data: existingRsvps } = await supabase
            .from("event_rsvps")
            .select("user_id")
            .eq("event_id", selectedCircle.event_id)
            .in("user_id", selectedUsersToAdd);

          const alreadyAssigned = new Set(existingRsvps?.map((r) => r.user_id) || []);
          const rsvpsToCreate = selectedUsersToAdd
            .filter((uid) => !alreadyAssigned.has(uid))
            .map((userId) => ({
              event_id: selectedCircle.event_id!,
              user_id: userId,
              status: "pending" as const,
            }));

          if (rsvpsToCreate.length > 0) {
            await supabase.from("event_rsvps").insert(rsvpsToCreate);
          }
        }
      }

      toast({
        title: "✓ Members Added",
        description: selectedCircle.event_id
          ? `${selectedUsersToAdd.length} member(s) added and invited to the assigned meetup.`
          : `${selectedUsersToAdd.length} member(s) added to the circle.`,
      });

      setShowAddMembersDialog(false);
      setSelectedUsersToAdd([]);
      fetchMembers(selectedCircle.id);
    } catch (error) {
      console.error("Error adding members:", error);
      toast({
        title: "Error",
        description: "Failed to add members.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    try {
      // Find which circle this member belongs to
      const member = members.find(m => m.id === memberId);
      
      const { error } = await supabase
        .from("circle_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      // Also remove pending RSVPs for this circle's assigned meetup
      if (member && selectedCircle?.event_id) {
        await supabase
          .from("event_rsvps")
          .delete()
          .eq("user_id", memberUserId)
          .eq("event_id", selectedCircle.event_id)
          .in("status", ["pending", "confirmed"]);
      }

      toast({
        title: "✓ Member Removed",
        description: "Member has been removed from the circle and their meetup invitation cancelled.",
      });

      if (selectedCircle) {
        fetchMembers(selectedCircle.id);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCircle = async (circleId: string) => {
    if (!confirm("Are you sure you want to delete this circle? This action cannot be undone.")) {
      return;
    }

    try {
      // First delete all members
      await supabase.from("circle_members").delete().eq("circle_id", circleId);
      // Then delete the circle
      const { error } = await supabase.from("circles").delete().eq("id", circleId);
      if (error) throw error;

      toast({
        title: "✓ Group Deleted",
        description: "Circle has been deleted successfully.",
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting circle:", error);
      toast({
        title: "Error",
        description: "Failed to delete circle.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "forming":
        return <Badge className="bg-amber-500/20 text-amber-500">Forming</Badge>;
      case "active":
        return <Badge className="bg-green-500/20 text-green-500">Active</Badge>;
      case "completed":
        return <Badge className="bg-gray-500/20 text-gray-500">Completed</Badge>;
      case "archived":
        return <Badge className="bg-red-500/20 text-red-500">Archived</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getEventName = (eventId: string | null) => {
    if (!eventId) return "No meetup assigned";
    const event = events.find((e) => e.id === eventId);
    return event?.title || "Unknown event";
  };

  const getUserName = (user: Profile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ""} ${user.last_name || ""}`.trim();
    }
    return user.email?.split("@")[0] || "Unknown";
  };

  // Get users not in the selected circle, then apply filters
  const availableUsers = allUsers
    .filter((user) => !members.some((m) => m.user_id === user.id))
    .filter((user) => {
      // Search filter
      if (memberSearchTerm) {
        const searchLower = memberSearchTerm.toLowerCase();
        const nameMatch = getUserName(user).toLowerCase().includes(searchLower);
        const emailMatch = user.email?.toLowerCase().includes(searchLower);
        if (!nameMatch && !emailMatch) return false;
      }
      
      // Virtue filter
      if (virtueFilter !== "all") {
        const hasVirtue = 
          user.primary_virtue?.toLowerCase() === virtueFilter.toLowerCase() ||
          user.secondary_virtue?.toLowerCase() === virtueFilter.toLowerCase();
        if (!hasVirtue) return false;
      }
      
      // Grouped status filter
      if (groupedFilter === "grouped" && !allGroupedUserIds.has(user.id)) return false;
      if (groupedFilter === "ungrouped" && allGroupedUserIds.has(user.id)) return false;
      
      return true;
    });

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-lg">Circles</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Create circles of up to 8 people for meetups. Members will see their circle and venue info in their dashboard.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button
          onClick={() => {
            setSelectedCircle(null);
            setEditMode(false);
            setCircleForm({
              name: "",
              description: "",
              primary_virtue: "",
              max_members: 8,
              status: "forming",
              event_id: null,
            });
            setShowCircleDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Circle
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlowCard className="p-4">
          <p className="text-2xl font-bold">{circles.length}</p>
          <p className="text-sm text-muted-foreground">Total Circles</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-amber-500">
            {circles.filter((c) => c.status === "forming").length}
          </p>
          <p className="text-sm text-muted-foreground">Forming</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">
            {circles.filter((c) => c.status === "active").length}
          </p>
          <p className="text-sm text-muted-foreground">Active</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-gray-500">
            {circles.filter((c) => c.status === "completed" || c.status === "archived").length}
          </p>
          <p className="text-sm text-muted-foreground">Completed/Archived</p>
        </GlowCard>
      </div>

      {/* Groups List */}
      {circles.length === 0 ? (
        <GlowCard className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium">No circles yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "Create Circle" to add your first circle</p>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {circles.map((circle) => (
            <GlowCard key={circle.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{circle.name}</h3>
                    {getStatusBadge(circle.status)}
                    {circle.primary_virtue && (
                      <Badge variant="outline">{circle.primary_virtue}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Max {circle.max_members} members
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {getEventName(circle.event_id)}
                    </span>
                  </div>
                  {circle.description && (
                    <p className="text-sm text-muted-foreground mt-2">{circle.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCircle(circle);
                      fetchMembers(circle.id);
                      fetchGuideAssignments(circle.id);
                      setShowMembersDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Members
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCircle(circle);
                      setEditMode(true);
                      setCircleForm({
                        name: circle.name,
                        description: circle.description || "",
                        primary_virtue: circle.primary_virtue || "",
                        max_members: circle.max_members || 8,
                        status: circle.status || "forming",
                        event_id: circle.event_id,
                      });
                      setShowCircleDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteCircle(circle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Create/Edit Group Dialog */}
      <Dialog open={showCircleDialog} onOpenChange={setShowCircleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit Group" : "Create New Group"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Group Name *</Label>
              <Input
                value={circleForm.name}
                onChange={(e) => setCircleForm({ ...circleForm, name: e.target.value })}
                placeholder="e.g., Courage Circle - March 2024"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={circleForm.description}
                onChange={(e) => setCircleForm({ ...circleForm, description: e.target.value })}
                placeholder="Enter group description"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Virtue</Label>
                <Input
                  value={circleForm.primary_virtue}
                  onChange={(e) => setCircleForm({ ...circleForm, primary_virtue: e.target.value })}
                  placeholder="e.g., Courage"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max Members</Label>
                <Input
                  type="number"
                  max={8}
                  value={circleForm.max_members}
                  onChange={(e) => setCircleForm({ ...circleForm, max_members: Math.min(parseInt(e.target.value) || 8, 8) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={circleForm.status}
                  onValueChange={(value: "forming" | "active" | "completed" | "archived") => 
                    setCircleForm({ ...circleForm, status: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forming">Forming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign to Meetup</Label>
                <Select
                  value={circleForm.event_id || "none"}
                  onValueChange={(value) => 
                    setCircleForm({ ...circleForm, event_id: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a meetup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No meetup</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCircleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCircle} disabled={saving || !circleForm.name}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {selectedCircle?.name} Members
              </DialogTitle>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedUsersToAdd([]);
                  setShowAddMembersDialog(true);
                }}
                disabled={members.length >= (selectedCircle?.max_members || 8)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Guide Assignments */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-primary">🏛️</span> Assigned Guides
              </p>
              {guideAssignments.length === 0 ? (
                <p className="text-xs text-muted-foreground mb-2">No guides assigned to this circle yet.</p>
              ) : (
                <div className="space-y-1 mb-2">
                  {guideAssignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-1.5">
                      <div>
                        <span className="text-sm font-medium">{a.guide_name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{a.guide_email}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive" onClick={() => handleRemoveGuide(a.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue placeholder="Select a VC Guide..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allGuides.filter(g => !guideAssignments.some(a => a.guide_id === g.id)).map((guide) => (
                      <SelectItem key={guide.id} value={guide.id}>
                        {[guide.first_name, guide.last_name].filter(Boolean).join(" ") || guide.email || guide.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8" disabled={!selectedGuideId || assigningGuide} onClick={handleAssignGuide}>
                  {assigningGuide ? "Assigning…" : "Assign"}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {members.length} of {selectedCircle?.max_members || 8} members
            </p>
            {members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No members in this group yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <GlowCard key={member.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {member.profile?.first_name || member.profile?.last_name
                            ? `${member.profile.first_name || ""} ${member.profile.last_name || ""}`.trim()
                            : member.profile?.email || "Unknown User"}
                        </p>
                        {member.profile?.email && (
                          <p className="text-sm text-muted-foreground">{member.profile.email}</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </GlowCard>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={showAddMembersDialog} onOpenChange={(open) => {
        setShowAddMembersDialog(open);
        if (!open) {
          // Reset filters when closing
          setMemberSearchTerm("");
          setVirtueFilter("all");
          setGroupedFilter("all");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Members to {selectedCircle?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Filters Section */}
            <div className="p-4 bg-muted/30 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Virtue Filter */}
                <div>
                  <Label className="text-xs text-muted-foreground">Primary/Secondary Virtue</Label>
                  <Select value={virtueFilter} onValueChange={setVirtueFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Virtues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Virtues</SelectItem>
                      {VIRTUES.map((virtue) => (
                        <SelectItem key={virtue} value={virtue.toLowerCase()}>
                          {virtue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Grouped Status Filter */}
                <div>
                  <Label className="text-xs text-muted-foreground">Group Status</Label>
                  <Select 
                    value={groupedFilter} 
                    onValueChange={(v: "all" | "grouped" | "ungrouped") => setGroupedFilter(v)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="ungrouped">
                        <span className="flex items-center gap-2">
                          <UserX className="h-3 w-3" />
                          Not in any group
                        </span>
                      </SelectItem>
                      <SelectItem value="grouped">
                        <span className="flex items-center gap-2">
                          <UserCheck className="h-3 w-3" />
                          Already grouped
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Results Info */}
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Showing {availableUsers.length} users • Can add {(selectedCircle?.max_members || 8) - members.length} more
              </p>
              {selectedUsersToAdd.length > 0 && (
                <Badge variant="secondary">
                  {selectedUsersToAdd.length} selected
                </Badge>
              )}
            </div>
            
            {/* Users List */}
            {availableUsers.length === 0 ? (
              <div className="text-center py-8 bg-muted/20 rounded-lg">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No users match your filters</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setMemberSearchTerm("");
                    setVirtueFilter("all");
                    setGroupedFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {availableUsers.map((user) => {
                  const isGrouped = allGroupedUserIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedUsersToAdd.includes(user.id) 
                          ? "bg-primary/10 border-primary/30" 
                          : "bg-muted/30 border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedUsersToAdd.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const maxToAdd = (selectedCircle?.max_members || 8) - members.length;
                            if (selectedUsersToAdd.length < maxToAdd) {
                              setSelectedUsersToAdd([...selectedUsersToAdd, user.id]);
                            }
                          } else {
                            setSelectedUsersToAdd(selectedUsersToAdd.filter((id) => id !== user.id));
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{getUserName(user)}</p>
                          {isGrouped ? (
                            <Badge variant="outline" className="text-xs shrink-0 bg-green-500/10 text-green-600 border-green-500/30">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Grouped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                              <UserX className="h-3 w-3 mr-1" />
                              Ungrouped
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {user.email && (
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          )}
                        </div>
                        {(user.primary_virtue || user.secondary_virtue) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {user.primary_virtue && (
                              <Badge variant="secondary" className="text-xs">
                                {user.primary_virtue}
                              </Badge>
                            )}
                            {user.secondary_virtue && (
                              <Badge variant="outline" className="text-xs">
                                {user.secondary_virtue}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddMembersDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={saving || selectedUsersToAdd.length === 0}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {saving ? "Adding..." : `Add ${selectedUsersToAdd.length} Member(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
