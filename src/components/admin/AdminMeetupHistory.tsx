import { useState, useEffect, useCallback } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Calendar,
  Users,
  BarChart3,
  Trophy,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  MapPin,
  Eye,
  CheckCircle,
  XCircle,
  MinusCircle,
  X,
  Save,
} from "lucide-react";

interface MeetupRow {
  event_id: string;
  title: string;
  event_date: string;
  meetup_type: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_city: string | null;
  is_completed: boolean | null;
  event_notes: string | null;
  circle_id: string | null;
  circle_name: string | null;
  lead_guide_id: string | null;
  guide_name: string | null;
  total_invited: number;
  total_attended: number;
  total_no_show: number;
  total_declined: number;
  attendance_rate: number;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  attended: boolean | null;
  rsvp_status: string | null;
  notes: string | null;
  member_name: string;
  member_email: string | null;
  member_virtue: string | null;
}

interface CircleOption { id: string; name: string; }
interface GuideOption { id: string; name: string; }

const MEETUP_TYPE_LABELS: Record<string, string> = {
  "in-person": "In-Person",
  virtual: "Virtual",
  hybrid: "Hybrid",
};

function attendanceBadge(rate: number) {
  if (rate >= 80) return <Badge className="bg-green-500/20 text-green-400">{rate}%</Badge>;
  if (rate >= 50) return <Badge className="bg-amber-500/20 text-amber-400">{rate}%</Badge>;
  return <Badge className="bg-red-500/20 text-red-400">{rate}%</Badge>;
}

function typeBadge(type: string | null) {
  switch (type) {
    case "virtual": return <Badge className="bg-blue-500/20 text-blue-400">Virtual</Badge>;
    case "hybrid": return <Badge className="bg-purple-500/20 text-purple-400">Hybrid</Badge>;
    default: return <Badge className="bg-green-500/20 text-green-400">In-Person</Badge>;
  }
}

export const AdminMeetupHistory = ({ allowedEventIds }: { allowedEventIds?: string[] }) => {
  const { toast } = useToast();
  const [meetups, setMeetups] = useState<MeetupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<CircleOption[]>([]);
  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attendanceByEvent, setAttendanceByEvent] = useState<Record<string, AttendanceRecord[]>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [markingEvent, setMarkingEvent] = useState<MeetupRow | null>(null);
  const [markAttendanceData, setMarkAttendanceData] = useState<AttendanceRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    circleId: "",
    guideId: "",
    meetupType: "",
    venueSearch: "",
    attendanceMin: "",
    attendanceMax: "",
  });

  const fetchOptions = useCallback(async () => {
    if (allowedEventIds !== undefined) {
      // VC Guide: only load circles/guides relevant to their assigned events
      if (allowedEventIds.length === 0) return;
      const { data: eventsData } = await supabase
        .from("events")
        .select("circle_id, lead_guide_id")
        .in("id", allowedEventIds);
      const circleIds = [...new Set((eventsData || []).map((e: any) => e.circle_id).filter(Boolean))];
      const guideIds = [...new Set((eventsData || []).map((e: any) => e.lead_guide_id).filter(Boolean))];
      if (circleIds.length > 0) {
        const { data: circlesData } = await supabase.from("circles").select("id, name").in("id", circleIds);
        setCircles(circlesData || []);
      }
      if (guideIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", guideIds);
        setGuides((profiles || []).map((p) => ({ id: p.id, name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id })));
      }
      return;
    }
    // Admin/manager: load all circles and guides
    const [circlesRes, guidesRes] = await Promise.all([
      supabase.from("circles").select("id, name").order("name"),
      supabase.from("user_roles").select("user_id").eq("role", "vc_guide"),
    ]);
    setCircles(circlesRes.data || []);
    if (guidesRes.data && guidesRes.data.length > 0) {
      const ids = guidesRes.data.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", ids);
      setGuides(
        (profiles || []).map((p) => ({
          id: p.id,
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id,
        }))
      );
    }
  }, [allowedEventIds]);

  const fetchMeetups = useCallback(async () => {
    setLoading(true);
    try {
      // Build query from events + joins
      let query = supabase
        .from("events")
        .select(`
          id,
          title,
          event_date,
          meetup_type,
          venue_name,
          venue_address,
          venue_city,
          is_completed,
          event_notes,
          circle_id,
          lead_guide_id,
          circles!events_circle_id_fkey(name),
          meetup_attendance(id, attended, rsvp_status)
        `)
        .or("is_completed.eq.true,status.eq.completed");

      // Scope to guide's assigned events if provided (VC Guide scoping)
      if (allowedEventIds !== undefined) {
        if (allowedEventIds.length === 0) {
          // Guide has no assigned events — show nothing
          setMeetups([]);
          setLoading(false);
          return;
        }
        query = query.in("id", allowedEventIds);
      }

      if (filters.circleId) query = query.eq("circle_id", filters.circleId);
      if (filters.meetupType) query = query.eq("meetup_type", filters.meetupType);
      if (filters.dateFrom) query = query.gte("event_date", filters.dateFrom);
      if (filters.dateTo) query = query.lte("event_date", filters.dateTo + "T23:59:59");
      if (filters.venueSearch) {
        query = query.or(
          `venue_name.ilike.%${filters.venueSearch}%,venue_city.ilike.%${filters.venueSearch}%`
        );
      }

      query = query.order("event_date", { ascending: sortDir === "asc" });

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with guide names
      const guideIds = [...new Set((data || []).map((e: any) => e.lead_guide_id).filter(Boolean))];
      let guideMap: Record<string, string> = {};
      if (guideIds.length > 0) {
        const { data: gProfiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", guideIds);
        (gProfiles || []).forEach((p) => {
          guideMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id;
        });
      }

      const rows: MeetupRow[] = (data || []).map((e: any) => {
        const att: any[] = e.meetup_attendance || [];
        const total_invited = att.length;
        const total_attended = att.filter((a: any) => a.attended).length;
        const total_no_show = att.filter((a: any) => a.rsvp_status === "no_show").length;
        const total_declined = att.filter((a: any) => a.rsvp_status === "declined").length;
        const attendance_rate = total_invited > 0 ? Math.round((total_attended / total_invited) * 100) : 0;
        return {
          event_id: e.id,
          title: e.title,
          event_date: e.event_date,
          meetup_type: e.meetup_type,
          venue_name: e.venue_name,
          venue_address: e.venue_address,
          venue_city: e.venue_city,
          is_completed: e.is_completed,
          event_notes: e.event_notes,
          circle_id: e.circle_id,
          circle_name: e.circles?.name || null,
          lead_guide_id: e.lead_guide_id,
          guide_name: e.lead_guide_id ? (guideMap[e.lead_guide_id] || "Unknown") : null,
          total_invited,
          total_attended,
          total_no_show,
          total_declined,
          attendance_rate,
        };
      });

      // Filter by guide ID after enrichment
      const filtered = filters.guideId
        ? rows.filter((r) => r.lead_guide_id === filters.guideId)
        : rows;

      // Filter by attendance rate
      const attFiltered = filtered.filter((r) => {
        if (filters.attendanceMin && r.attendance_rate < Number(filters.attendanceMin)) return false;
        if (filters.attendanceMax && r.attendance_rate > Number(filters.attendanceMax)) return false;
        return true;
      });

      setMeetups(attFiltered);
    } catch (e) {
      console.error(e);
      toast({ title: "Error loading meetup history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters, sortDir, allowedEventIds]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchMeetups();
  }, [fetchMeetups]);

  const loadAttendance = async (eventId: string, circleId?: string | null) => {
    setAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from("meetup_attendance")
        .select("id, user_id, attended, rsvp_status, notes")
        .eq("event_id", eventId);
      if (error) throw error;

      let enriched: AttendanceRecord[] = [];

      if (data && data.length > 0) {
        const userIds = data.map((a) => a.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, primary_virtue")
          .in("id", userIds);
        const profileMap: Record<string, { name: string; email: string | null; virtue: string | null }> = {};
        (profiles || []).forEach((p) => {
          profileMap[p.id] = {
            name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown",
            email: p.email,
            virtue: p.primary_virtue,
          };
        });
        enriched = data.map((a) => ({
          id: a.id,
          user_id: a.user_id,
          attended: a.attended,
          rsvp_status: a.rsvp_status,
          notes: a.notes,
          member_name: profileMap[a.user_id]?.name || "Unknown",
          member_email: profileMap[a.user_id]?.email || null,
          member_virtue: profileMap[a.user_id]?.virtue || null,
        }));
      } else if (circleId) {
        // No attendance records yet — show circle members with pending status
        const { data: members } = await supabase
          .from("circle_members")
          .select("user_id")
          .eq("circle_id", circleId)
          .eq("status", "active");
        const userIds = (members || []).map((m) => m.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email, primary_virtue")
            .in("id", userIds);
          enriched = (profiles || []).map((p) => ({
            id: "",
            user_id: p.id,
            attended: null,
            rsvp_status: null,
            notes: null,
            member_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown",
            member_email: p.email,
            member_virtue: p.primary_virtue,
          }));
        }
      }

      setAttendanceByEvent((prev) => ({ ...prev, [eventId]: enriched }));
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const toggleExpand = (eventId: string) => {
    if (expandedId === eventId) {
      setExpandedId(null);
    } else {
      setExpandedId(eventId);
      const row = meetups.find((m) => m.event_id === eventId);
      loadAttendance(eventId, row?.circle_id);
    }
  };

  const openMarkAttendance = async (row: MeetupRow) => {
    setMarkingEvent(row);
    setMarkModalOpen(true);
    // Load or pre-populate from circle members if no attendance records exist
    const { data: existing } = await supabase
      .from("meetup_attendance")
      .select("id, user_id, attended, rsvp_status, notes")
      .eq("event_id", row.event_id);

    let records: AttendanceRecord[] = [];

    if (existing && existing.length > 0) {
      const userIds = existing.map((a) => a.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, primary_virtue")
        .in("id", userIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });
      records = existing.map((a) => ({
        id: a.id,
        user_id: a.user_id,
        attended: a.attended,
        rsvp_status: a.rsvp_status,
        notes: a.notes,
        member_name: profileMap[a.user_id]
          ? [profileMap[a.user_id].first_name, profileMap[a.user_id].last_name].filter(Boolean).join(" ") || profileMap[a.user_id].email
          : "Unknown",
        member_email: profileMap[a.user_id]?.email || null,
        member_virtue: profileMap[a.user_id]?.primary_virtue || null,
      }));
    } else if (row.circle_id) {
      // Pre-populate from circle members
      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", row.circle_id)
        .eq("status", "active");
      const userIds = (members || []).map((m) => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, primary_virtue")
          .in("id", userIds);
        records = (profiles || []).map((p) => ({
          id: "",
          user_id: p.id,
          attended: false,
          rsvp_status: "pending",
          notes: null,
          member_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown",
          member_email: p.email,
          member_virtue: p.primary_virtue,
        }));
      }
    }
    setMarkAttendanceData(records);
  };

  const saveAttendance = async () => {
    if (!markingEvent) return;
    setSaving(true);
    try {
      for (const rec of markAttendanceData) {
        const payload = {
          event_id: markingEvent.event_id,
          user_id: rec.user_id,
          circle_id: markingEvent.circle_id,
          guide_id: markingEvent.lead_guide_id,
          attended: rec.attended,
          rsvp_status: rec.rsvp_status,
          notes: rec.notes,
        };
        if (rec.id) {
          await supabase.from("meetup_attendance").update(payload).eq("id", rec.id);
        } else {
          await supabase.from("meetup_attendance").upsert(payload, { onConflict: "event_id,user_id" });
        }
      }
      toast({ title: "✓ Attendance saved" });
      setMarkModalOpen(false);
      fetchMeetups();
      if (expandedId === markingEvent.event_id) loadAttendance(markingEvent.event_id, markingEvent.circle_id);
    } catch (e) {
      toast({ title: "Error saving attendance", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Date","Circle","Guide","Venue","City","Type","Invited","Attended","No Show","Declined","Attendance Rate %"];
    const rows = meetups.map((r) => [
      new Date(r.event_date).toLocaleDateString(),
      r.circle_name || "",
      r.guide_name || "",
      r.venue_name || "",
      r.venue_city || "",
      r.meetup_type || "in-person",
      r.total_invited,
      r.total_attended,
      r.total_no_show,
      r.total_declined,
      r.attendance_rate,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meetup-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () =>
    setFilters({ dateFrom: "", dateTo: "", circleId: "", guideId: "", meetupType: "", venueSearch: "", attendanceMin: "", attendanceMax: "" });

  // Summary stats
  const totalAttended = meetups.reduce((s, r) => s + r.total_attended, 0);
  const avgRate = meetups.length > 0 ? Math.round(meetups.reduce((s, r) => s + r.attendance_rate, 0) / meetups.length) : 0;
  const circleCount: Record<string, number> = {};
  meetups.forEach((r) => { if (r.circle_name) circleCount[r.circle_name] = (circleCount[r.circle_name] || 0) + 1; });
  const mostActive = Object.entries(circleCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlowCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{meetups.length}</p>
              <p className="text-xs text-muted-foreground">Total Meetups</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg"><Users className="h-4 w-4 text-green-500" /></div>
            <div>
              <p className="text-2xl font-bold">{totalAttended}</p>
              <p className="text-xs text-muted-foreground">Total Attendance</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg"><BarChart3 className="h-4 w-4 text-blue-500" /></div>
            <div>
              <p className="text-2xl font-bold">{avgRate}%</p>
              <p className="text-xs text-muted-foreground">Avg Attendance Rate</p>
            </div>
          </div>
        </GlowCard>
        <GlowCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg"><Trophy className="h-4 w-4 text-amber-500" /></div>
            <div>
              <p className="text-lg font-bold truncate">{mostActive}</p>
              <p className="text-xs text-muted-foreground">Most Active Circle</p>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Filters */}
      <GlowCard className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2"><Search className="h-4 w-4" /> Filters</h3>
          <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Date From</Label>
            <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Date To</Label>
            <Input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Circle</Label>
            <Select value={filters.circleId || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, circleId: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Circles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Circles</SelectItem>
                {circles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {allowedEventIds === undefined && (
            <div>
              <Label className="text-xs">Guide</Label>
              <Select value={filters.guideId || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, guideId: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Guides" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guides</SelectItem>
                  {guides.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={filters.meetupType || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, meetupType: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in-person">In-Person</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Venue Search</Label>
            <Input placeholder="Search venue..." value={filters.venueSearch} onChange={(e) => setFilters((f) => ({ ...f, venueSearch: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Min Attendance %</Label>
            <Input type="number" min="0" max="100" value={filters.attendanceMin} onChange={(e) => setFilters((f) => ({ ...f, attendanceMin: e.target.value }))} className="h-8 text-sm" placeholder="0" />
          </div>
          <div>
            <Label className="text-xs">Max Attendance %</Label>
            <Input type="number" min="0" max="100" value={filters.attendanceMax} onChange={(e) => setFilters((f) => ({ ...f, attendanceMax: e.target.value }))} className="h-8 text-sm" placeholder="100" />
          </div>
        </div>
      </GlowCard>

      {/* Table header + export */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{meetups.length} completed meetup{meetups.length !== 1 ? "s" : ""}</p>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : meetups.length === 0 ? (
        <GlowCard className="p-12 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-xl font-display font-bold mb-2">No completed meetups yet</h3>
          <p className="text-muted-foreground">Completed meetups will appear here. Mark events as completed to track history.</p>
        </GlowCard>
      ) : (
        <div className="space-y-2">
          {meetups.map((row) => (
            <GlowCard key={row.event_id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Date */}
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-semibold">
                      {new Date(row.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  {/* Circle */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{row.title}</p>
                    {row.circle_name && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs mt-0.5">{row.circle_name}</Badge>
                    )}
                  </div>
                  {/* Guide */}
                  <div className="flex items-center gap-1 text-sm w-32 shrink-0">
                    <GraduationCap className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">{row.guide_name || "—"}</span>
                  </div>
                  {/* Venue */}
                  <div className="flex items-center gap-1 text-sm w-36 shrink-0">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate text-muted-foreground">
                      {row.venue_name ? `${row.venue_name}${row.venue_city ? ` · ${row.venue_city}` : ""}` : "—"}
                    </span>
                  </div>
                  {/* Type */}
                  <div className="w-20 shrink-0">{typeBadge(row.meetup_type)}</div>
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-sm shrink-0">
                    <span className="text-muted-foreground">{row.total_invited} inv.</span>
                    <span className="text-green-400">{row.total_attended} ✓</span>
                    <span className="text-amber-400">{row.total_no_show} no-show</span>
                    {attendanceBadge(row.attendance_rate)}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(row.event_id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      {expandedId === row.event_id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === row.event_id && (
                <div className="border-t border-border/40 p-4 bg-card/50">
                  <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="space-y-1">
                      <p><span className="text-muted-foreground">Date:</span> {new Date(row.event_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      <p><span className="text-muted-foreground">Circle:</span> {row.circle_name || "—"}</p>
                      <p><span className="text-muted-foreground">Guide:</span> {row.guide_name || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p><span className="text-muted-foreground">Venue:</span> {row.venue_name ? `${row.venue_name}${row.venue_address ? `, ${row.venue_address}` : ""}${row.venue_city ? ` · ${row.venue_city}` : ""}` : "—"}</p>
                      <p><span className="text-muted-foreground">Type:</span> {MEETUP_TYPE_LABELS[row.meetup_type || "in-person"] || row.meetup_type}</p>
                      <p><span className="text-muted-foreground">Attendance:</span> {row.total_attended}/{row.total_invited} ({row.attendance_rate}%)</p>
                    </div>
                  </div>
                  {row.event_notes && (
                    <p className="text-sm mb-4 p-3 bg-muted/20 rounded-lg italic">📝 {row.event_notes}</p>
                  )}
                  <h4 className="font-semibold text-sm mb-2">Member Attendance</h4>
                  {attendanceLoading ? (
                    <div className="py-4 text-center text-muted-foreground text-sm">Loading...</div>
                  ) : (attendanceByEvent[row.event_id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No attendance records yet. Use "Mark Attendance" to add them.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 text-muted-foreground text-xs">
                            <th className="text-left py-2 pr-4">Member</th>
                            <th className="text-left py-2 pr-4">Virtue</th>
                            <th className="text-left py-2 pr-4">RSVP</th>
                            <th className="text-left py-2">Attended</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(attendanceByEvent[row.event_id] || []).map((a) => (
                            <tr key={a.id || a.user_id} className="border-b border-border/20">
                              <td className="py-2 pr-4 font-medium">{a.member_name}</td>
                              <td className="py-2 pr-4 text-muted-foreground capitalize">{a.member_virtue || "—"}</td>
                              <td className="py-2 pr-4">
                                <Badge variant="outline" className="text-xs capitalize">{a.rsvp_status || "—"}</Badge>
                              </td>
                              <td className="py-2">
                                {a.rsvp_status === "declined" ? (
                                  <span className="text-muted-foreground flex items-center gap-1"><MinusCircle className="h-3 w-3" />Declined</span>
                                ) : a.attended === true ? (
                                  <span className="text-green-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Attended</span>
                                ) : a.attended === false && a.id ? (
                                  <span className="text-amber-400 flex items-center gap-1"><XCircle className="h-3 w-3" />No-Show</span>
                                ) : (
                                  <span className="text-muted-foreground flex items-center gap-1"><MinusCircle className="h-3 w-3" />Not Marked</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </GlowCard>
          ))}
        </div>
      )}

      {/* Mark Attendance Modal */}
      <Dialog open={markModalOpen} onOpenChange={setMarkModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark Attendance — {markingEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {markAttendanceData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No members found for this meetup. Assign a circle to pre-populate members.</p>
            ) : (
              markAttendanceData.map((rec, i) => (
                <div key={rec.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rec.member_name}</p>
                    <p className="text-xs text-muted-foreground">{rec.member_virtue || "No virtue"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={rec.rsvp_status || "pending"}
                      onValueChange={(v) => {
                        setMarkAttendanceData((prev) => prev.map((r, idx) => idx === i ? { ...r, rsvp_status: v } : r));
                      }}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                        <SelectItem value="no_show">No Show</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={!!rec.attended}
                        onCheckedChange={(v) => {
                          setMarkAttendanceData((prev) => prev.map((r, idx) => idx === i ? { ...r, attended: v } : r));
                        }}
                      />
                      <span className="text-xs text-muted-foreground w-14">{rec.attended ? "Attended" : "No-Show"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={saveAttendance} disabled={saving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Attendance"}
            </Button>
            <Button variant="outline" onClick={() => setMarkModalOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
