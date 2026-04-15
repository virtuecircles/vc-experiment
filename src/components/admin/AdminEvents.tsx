import { useState, useEffect, useRef } from "react";
import { AdminMeetupHistory } from "@/components/admin/AdminMeetupHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, CalendarDays } from "lucide-react";
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
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Edit,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  UserX,
  Eye,
  HelpCircle,
  Trash2,
  ImagePlus,
  X,
  Loader2,
  UserPlus,
  Search,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;
type EventRSVP = Tables<"event_rsvps"> & {
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

type MemberResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  primary_virtue: string | null;
  city: string | null;
};

import { useUserRoles } from "@/hooks/useUserRoles";

export const AdminEvents = () => {
  const { toast } = useToast();
  const { isVCGuide, guideEvents: assignedGuideEventIds, isVCManager, isSuperAdmin, isAdmin, loading: rolesLoading } = useUserRoles();
  const canFullyManage = isSuperAdmin || isVCManager || isAdmin;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<EventRSVP[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MemberResult[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [assigningMemberId, setAssigningMemberId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [guides, setGuides] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [eventForm, setEventForm] = useState<{
    title: string;
    description: string;
    event_date: string;
    location: string;
    max_participants: number;
    status: "upcoming" | "active" | "completed" | "cancelled";
    image_url: string;
    venue_name: string;
    venue_address: string;
    venue_city: string;
    meetup_type: string;
    is_completed: boolean;
    event_notes: string;
    lead_guide_id: string;
    circle_id: string;
  }>({
    title: "",
    description: "",
    event_date: "",
    location: "",
    max_participants: 20,
    status: "upcoming",
    image_url: "",
    venue_name: "",
    venue_address: "",
    venue_city: "",
    meetup_type: "in-person",
    is_completed: false,
    event_notes: "",
    lead_guide_id: "",
    circle_id: "",
  });

  useEffect(() => {
    if (!canFullyManage) return;
    // Two-step: get user_ids with vc_guide role, then fetch their profiles
    supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "vc_guide")
      .then(async ({ data: roleRows }) => {
        if (!roleRows?.length) return;
        const ids = roleRows.map((r) => r.user_id);
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", ids);
        setGuides(profileRows || []);
      });
  }, [canFullyManage]);

  useEffect(() => {
    // Wait for roles to finish loading
    if (rolesLoading) return;
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoading, isVCGuide, canFullyManage, assignedGuideEventIds.join(",")]);


  const fetchEvents = async () => {
    try {
      let query = supabase.from("events").select("*").order("event_date", { ascending: false });

      // Guides only see their assigned events — filter at DB level
      if (isVCGuide && !canFullyManage) {
        if (assignedGuideEventIds.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }
        query = query.in("id", assignedGuideEventIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to load events.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchMembers = async (query: string) => {
    setMemberSearch(query);
    if (!query.trim()) {
      setMemberResults([]);
      return;
    }
    setSearchingMembers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, primary_virtue, city")
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setMemberResults(data || []);
    } catch (err) {
      console.error("Error searching members:", err);
    } finally {
      setSearchingMembers(false);
    }
  };

  const handleAssignMember = async (memberId: string) => {
    if (!selectedEvent) return;
    setAssigningMemberId(memberId);
    try {
      // Check capacity (max 6)
      const { data: existing, error: countErr } = await supabase
        .from("event_rsvps")
        .select("id")
        .eq("event_id", selectedEvent.id)
        .in("status", ["pending", "confirmed", "attended"]);

      if (countErr) throw countErr;

      if ((existing || []).length >= 6) {
        toast({
          title: "Meetup is Full",
          description: "Maximum 6 members per circle.",
          variant: "destructive",
        });
        return;
      }

      // Check duplicate
      const { data: dupe } = await supabase
        .from("event_rsvps")
        .select("id")
        .eq("event_id", selectedEvent.id)
        .eq("user_id", memberId)
        .maybeSingle();

      if (dupe) {
        toast({
          title: "Already Assigned",
          description: "This member is already assigned to this meetup.",
          variant: "destructive",
        });
        return;
      }

      // Assign
      const { error } = await supabase.from("event_rsvps").insert({
        user_id: memberId,
        event_id: selectedEvent.id,
        status: "pending",
        responded_at: null,
      });

      if (error) throw error;

      // In-app notification
      await supabase.from("notifications").insert({
        user_id: memberId,
        title: "You've been added to a Circle!",
        message: `You've been matched and assigned to "${selectedEvent.title}". Check your meetups to RSVP.`,
        type: "circle_assignment",
      });

      toast({
        title: "✓ Member Assigned",
        description: "Member has been added and notified.",
      });

      setMemberSearch("");
      setMemberResults([]);
      fetchRSVPs(selectedEvent.id);
    } catch (err) {
      console.error("Error assigning member:", err);
      toast({
        title: "Error",
        description: "Failed to assign member.",
        variant: "destructive",
      });
    } finally {
      setAssigningMemberId(null);
    }
  };

  const fetchRSVPs = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("*")
        .eq("event_id", eventId);

      if (error) throw error;

      // Fetch profiles for each RSVP
      const rsvpsWithProfiles: EventRSVP[] = [];
      for (const rsvp of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", rsvp.user_id)
          .single();
        
        rsvpsWithProfiles.push({
          ...rsvp,
          profile: profile || undefined,
        });
      }

      setRsvps(rsvpsWithProfiles);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("event-images")
        .getPublicUrl(filePath);

      setEventForm({ ...eventForm, image_url: publicUrl });

    toast({
        title: "✓ Image Uploaded",
        description: "Meetup image has been uploaded.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = () => {
    setEventForm({ ...eventForm, image_url: "" });
  };

  const handleSaveEvent = async () => {
    // Validate required fields before submitting
    if (!eventForm.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a meetup title.",
        variant: "destructive",
      });
      return;
    }
    if (!eventForm.event_date) {
      toast({
        title: "Date required",
        description: "Please select a date and time for the meetup.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Convert datetime-local value to proper ISO 8601 timestamp
      const isoDate = new Date(eventForm.event_date).toISOString();

      if (selectedEvent && editMode) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update({
            title: eventForm.title,
            description: eventForm.description,
            event_date: isoDate,
            location: eventForm.location,
            max_participants: eventForm.max_participants,
            status: eventForm.status,
            image_url: eventForm.image_url || null,
            venue_name: eventForm.venue_name || null,
            venue_city: eventForm.venue_city || null,
            meetup_type: eventForm.meetup_type || "in-person",
            lead_guide_id: eventForm.lead_guide_id || null,
            event_notes: eventForm.event_notes || null,
          })
          .eq("id", selectedEvent.id);

        if (error) throw error;
        toast({
          title: "✓ Meetup Updated",
          description: "Meetup has been updated successfully.",
        });
      } else {
        // Create new meetup — always set created_by from session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to create a meetup");

        const { error } = await supabase.from("events").insert({
          title: eventForm.title,
          description: eventForm.description,
          event_date: isoDate,
          location: eventForm.location,
          max_participants: eventForm.max_participants,
          status: eventForm.status,
          image_url: eventForm.image_url || null,
          created_by: user.id,
          venue_name: eventForm.venue_name || null,
          venue_city: eventForm.venue_city || null,
          meetup_type: eventForm.meetup_type || "in-person",
          lead_guide_id: eventForm.lead_guide_id || null,
          event_notes: eventForm.event_notes || null,
        });

        if (error) throw error;
        toast({
          title: "✓ Meetup Created",
          description: "New meetup has been created successfully.",
        });
      }

      setShowEventDialog(false);
      setEditMode(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error: unknown) {
      console.error("Error saving event:", error);
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Unknown error";
      toast({
        title: "Error saving meetup",
        description: message || "Failed to save event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRSVP = async (rsvpId: string, status: string, attended: boolean = false) => {
    try {
      const updateData: Record<string, unknown> = { status };
      if (attended) {
        updateData.attended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("event_rsvps")
        .update(updateData)
        .eq("id", rsvpId);

      if (error) throw error;

      toast({
        title: "✓ RSVP Updated",
        description: "RSVP status has been updated.",
      });

      if (selectedEvent) {
        fetchRSVPs(selectedEvent.id);
      }
    } catch (error) {
      console.error("Error updating RSVP:", error);
      toast({
        title: "Error",
        description: "Failed to update RSVP.",
        variant: "destructive",
      });
    }
  };

  const handleUnassignMember = async (rsvpId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this meetup? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("event_rsvps").delete().eq("id", rsvpId);
      if (error) throw error;
      toast({ title: "✓ Member Removed", description: `${memberName} has been unassigned from this meetup.` });
      if (selectedEvent) fetchRSVPs(selectedEvent.id);
    } catch (error) {
      console.error("Error unassigning member:", error);
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this meetup? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;

      toast({
        title: "✓ Meetup Deleted",
        description: "Meetup has been deleted successfully.",
      });
      fetchEvents();
    } catch (error) {
      console.error("Error deleting meetup:", error);
      toast({
        title: "Error",
        description: "Failed to delete meetup.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-500/20 text-blue-500">Upcoming</Badge>;
      case "active":
        return <Badge className="bg-green-500/20 text-green-500">Active</Badge>;
      case "completed":
        return <Badge className="bg-gray-500/20 text-gray-500">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRSVPBadge = (status: string | null) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "declined":
        return <Badge className="bg-red-500/20 text-red-500"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      case "attended":
        return <Badge className="bg-blue-500/20 text-blue-500"><UserCheck className="h-3 w-3 mr-1" />Attended</Badge>;
      case "no_show":
        return <Badge className="bg-gray-500/20 text-gray-500"><UserX className="h-3 w-3 mr-1" />No Show</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // For guides: always clamp to assigned meetups regardless of fetch timing
  const visibleEvents = (isVCGuide && !canFullyManage)
    ? events.filter((e) => assignedGuideEventIds.includes(e.id))
    : events;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="meetups" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="meetups" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Meetups
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-0">
          <AdminMeetupHistory allowedEventIds={(isVCGuide && !canFullyManage) ? assignedGuideEventIds : undefined} />
        </TabsContent>

        <TabsContent value="meetups" className="mt-0">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-lg">Meetups</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Create and manage meetups. Click "Manage RSVPs" to see who's attending and update their status.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {canFullyManage && (
          <Button
            onClick={() => {
              setEventForm((f) => ({ ...f, venue_name: "", venue_address: "", venue_city: "", meetup_type: "in-person", is_completed: false, event_notes: "", lead_guide_id: "", circle_id: "" }));
              setSelectedEvent(null);
              setEventForm((f) => ({ ...f, venue_name: "", venue_address: "", venue_city: "", meetup_type: "in-person", is_completed: false, event_notes: "", lead_guide_id: "", circle_id: "" }));
              setEditMode(false);
              setEventForm((f) => ({ ...f, venue_name: "", venue_address: "", venue_city: "", meetup_type: "in-person", is_completed: false, event_notes: "", lead_guide_id: "", circle_id: "", title: "", description: "", event_date: "", location: "", max_participants: 20, status: "upcoming", image_url: "" }));
              setShowEventDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Meetup
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlowCard className="p-4">
          <p className="text-2xl font-bold">{visibleEvents.length}</p>
          <p className="text-sm text-muted-foreground">Total Meetups</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-blue-500">
            {visibleEvents.filter((e) => e.status === "upcoming").length}
          </p>
          <p className="text-sm text-muted-foreground">Upcoming</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">
            {visibleEvents.filter((e) => e.status === "active").length}
          </p>
          <p className="text-sm text-muted-foreground">Active</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-gray-500">
            {visibleEvents.filter((e) => e.status === "completed").length}
          </p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </GlowCard>
      </div>

      {/* Meetups List */}
      {visibleEvents.length === 0 ? (
        <GlowCard className="p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium">No meetups yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isVCGuide && !canFullyManage
              ? "You have no meetups assigned to you yet."
              : 'Click "Create Meetup" to add your first meetup'}
          </p>
        </GlowCard>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((event) => (
            <GlowCard key={event.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    {getStatusBadge(event.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(event.event_date)}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Max {event.max_participants} participants
                    </span>
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEvent(event);
                      fetchRSVPs(event.id);
                      setShowRSVPDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {isVCGuide && !canFullyManage ? "Mark Attendance" : "Manage RSVPs"}
                  </Button>
                  {canFullyManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEvent(event);
                          setEditMode(true);
                          setEventForm({
                            title: event.title,
                            description: event.description || "",
                            event_date: event.event_date,
                            location: event.location || "",
                            max_participants: event.max_participants || 20,
                            status: event.status || "upcoming",
                            image_url: event.image_url || "",
                            venue_name: (event as any).venue_name || "",
                            venue_address: (event as any).venue_address || "",
                            venue_city: (event as any).venue_city || "",
                            meetup_type: (event as any).meetup_type || "in-person",
                            is_completed: (event as any).is_completed || false,
                            event_notes: (event as any).event_notes || "",
                            lead_guide_id: (event as any).lead_guide_id || "",
                            circle_id: (event as any).circle_id || "",
                          });
                          setShowEventDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Meetup Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? "Edit Meetup" : "Create New Meetup"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Meetup Title *</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="Enter meetup title"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Enter meetup description"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Date & Time *</Label>
              <Input
                type="datetime-local"
                value={eventForm.event_date}
                onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Venue Name</Label>
                <Input
                  value={eventForm.venue_name}
                  onChange={(e) => setEventForm({ ...eventForm, venue_name: e.target.value })}
                  placeholder="e.g. The Rustic Tap"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Venue City</Label>
                <Input
                  value={eventForm.venue_city}
                  onChange={(e) => setEventForm({ ...eventForm, venue_city: e.target.value })}
                  placeholder="e.g. Austin"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Venue Address</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="Street address"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Meetup Type</Label>
                <Select
                  value={eventForm.meetup_type}
                  onValueChange={(v) => setEventForm({ ...eventForm, meetup_type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-person">In-Person</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={eventForm.status}
                  onValueChange={(value: "upcoming" | "active" | "completed" | "cancelled") =>
                    setEventForm({ ...eventForm, status: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Lead Guide</Label>
                <Select
                  value={eventForm.lead_guide_id || "none"}
                  onValueChange={(v) => setEventForm({ ...eventForm, lead_guide_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select guide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No guide assigned —</SelectItem>
                    {guides.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.first_name} {g.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={eventForm.max_participants}
                  onChange={(e) => setEventForm({ ...eventForm, max_participants: parseInt(e.target.value) || 20 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Meetup Image</Label>
              <div className="mt-1">
                {eventForm.image_url ? (
                  <div className="relative">
                    <img
                      src={eventForm.image_url}
                      alt="Meetup preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Click to upload meetup image</p>
                        <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG/WebP</p>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent} disabled={saving || !eventForm.title || !eventForm.event_date}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Meetup"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RSVP Management Dialog */}
      <Dialog open={showRSVPDialog} onOpenChange={setShowRSVPDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {isVCGuide && !canFullyManage ? "Mark Attendance" : "RSVPs"} — {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {/* Event metadata */}
          {selectedEvent && (
            <div className="border-b border-border pb-3 mb-1 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Created By</span>
                <span className="font-medium">{selectedEvent.created_by ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Created At</span>
                <span className="text-muted-foreground">
                  {selectedEvent.created_at
                    ? new Date(selectedEvent.created_at).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "—"}
                </span>
              </div>
            </div>
          )}
          <div className="space-y-4 mt-2">
            {rsvps.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No RSVPs yet for this meetup</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rsvps.map((rsvp) => (
                  <GlowCard key={rsvp.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {rsvp.profile?.first_name || rsvp.profile?.last_name
                            ? `${rsvp.profile.first_name || ""} ${rsvp.profile.last_name || ""}`.trim()
                            : rsvp.profile?.email || "Unknown User"}
                        </p>
                        {rsvp.profile?.email && (
                          <p className="text-sm text-muted-foreground">{rsvp.profile.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getRSVPBadge(rsvp.status)}
                        <Select
                          value={rsvp.status || "pending"}
                          onValueChange={(value) => handleUpdateRSVP(rsvp.id, value, value === "attended")}
                          disabled={isVCGuide && !canFullyManage && rsvp.status !== "confirmed" && rsvp.status !== "attended" && rsvp.status !== "no_show"}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {canFullyManage && <SelectItem value="pending">Pending</SelectItem>}
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            {canFullyManage && <SelectItem value="declined">Declined</SelectItem>}
                            <SelectItem value="attended">Attended</SelectItem>
                            <SelectItem value="no_show">No Show</SelectItem>
                          </SelectContent>
                        </Select>
                        {canFullyManage && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const name = rsvp.profile?.first_name || rsvp.profile?.last_name
                                    ? `${rsvp.profile.first_name || ""} ${rsvp.profile.last_name || ""}`.trim()
                                    : rsvp.profile?.email || "this member";
                                  handleUnassignMember(rsvp.id, name);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unassign member</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </GlowCard>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
