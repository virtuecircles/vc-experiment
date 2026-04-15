import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Check, X, GraduationCap, History, CheckCircle, XCircle, MinusCircle, BarChart3, Users, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";

interface AssignedEvent {
  id: string;
  event_id: string;
  status: string;
  events: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    location: string | null;
    venue_name: string | null;
    venue_city: string | null;
    meetup_type: string | null;
    is_completed: boolean | null;
    status: string | null;
  };
}

interface AttendancePeer {
  user_id: string;
  name: string;
  attended: boolean | null;
  rsvp_status: string | null;
}

interface MemberHistoryRow {
  attended: boolean | null;
  rsvp_status: string | null;
  event_id: string;
  event_title: string;
  event_date: string;
  meetup_type: string | null;
  venue_name: string | null;
  venue_city: string | null;
  guide_name: string | null;
  circle_attendance_rate: number;
  peers: AttendancePeer[];
}

interface GuideEvent {
  event_id: string;
  events: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    venue_name: string | null;
    venue_city: string | null;
    meetup_type: string | null;
    is_completed: boolean | null;
    status: string | null;
    circle_id: string | null;
  };
}

interface AttendanceMember {
  id: string; // meetup_attendance id or rsvp id
  user_id: string;
  name: string;
  attended: boolean | null;
  rsvp_status: string | null;
}

interface DashboardEventsProps {
  userId: string;
}

// ─── Guide Events View ────────────────────────────────────────────────────────

interface AssignedCircle {
  id: string;
  name: string;
  primary_virtue: string | null;
  members: { user_id: string; name: string }[];
}

const GuideEventsView = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [guideEvents, setGuideEvents] = useState<GuideEvent[]>([]);
  const [assignedCircles, setAssignedCircles] = useState<AssignedCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [expandedCircle, setExpandedCircle] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceMember[]>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    try {
      // 1. Get assigned circles
      const { data: circleAssignments } = await supabase
        .from("guide_circle_assignments")
        .select("circle_id, circles(id, name, primary_virtue)")
        .eq("guide_id", userId)
        .eq("is_active", true);

      const circleIds = (circleAssignments || []).map((a: any) => a.circle_id);

      // 2. Get circle members for each circle
      const circlesWithMembers: AssignedCircle[] = [];
      if (circleIds.length > 0) {
        const { data: memberRows } = await supabase
          .from("circle_members")
          .select("circle_id, user_id")
          .in("circle_id", circleIds)
          .eq("status", "active");

        const memberUserIds = [...new Set((memberRows || []).map((m: any) => m.user_id))];
        let profileMap: Record<string, string> = {};
        if (memberUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, email")
            .in("id", memberUserIds);
          (profiles || []).forEach((p: any) => {
            profileMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || p.id;
          });
        }

        for (const a of circleAssignments || []) {
          const circle = (a as any).circles;
          if (!circle) continue;
          const circleMembers = (memberRows || [])
            .filter((m: any) => m.circle_id === a.circle_id)
            .map((m: any) => ({ user_id: m.user_id, name: profileMap[m.user_id] || "Member" }));
          circlesWithMembers.push({
            id: circle.id,
            name: circle.name,
            primary_virtue: circle.primary_virtue,
            members: circleMembers,
          });
        }
      }
      setAssignedCircles(circlesWithMembers);

      // 3. Get events linked to assigned circles
      let eventsFromCircles: GuideEvent[] = [];
      if (circleIds.length > 0) {
        const { data: circleEvents } = await supabase
          .from("events")
          .select("id, title, description, event_date, venue_name, venue_city, meetup_type, is_completed, status, circle_id")
          .in("circle_id", circleIds);
        eventsFromCircles = (circleEvents || []).map((ev: any) => ({ event_id: ev.id, events: ev }));
      }

      // 4. Also fetch events directly assigned via guide_events table
      const { data: directAssignments } = await supabase
        .from("guide_events")
        .select("event_id, events(id, title, description, event_date, venue_name, venue_city, meetup_type, is_completed, status, circle_id)")
        .eq("user_id", userId);
      const directEvents = ((directAssignments as unknown as GuideEvent[]) || []).filter(g => !!g.events);

      // Merge & deduplicate
      const allMap = new Map<string, GuideEvent>();
      [...eventsFromCircles, ...directEvents].forEach(g => {
        if (g.events) allMap.set(g.events.id, g);
      });
      const merged = Array.from(allMap.values());
      merged.sort((a, b) => new Date(b.events.event_date).getTime() - new Date(a.events.event_date).getTime());
      setGuideEvents(merged);
    } catch (e) {
      console.error("Error fetching guide data:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (eventId: string, circleId: string | null) => {
    if (attendanceMap[eventId]) return;
    try {
      const [{ data: rsvps }, { data: attendances }] = await Promise.all([
        supabase.from("event_rsvps").select("id, user_id, status").eq("event_id", eventId),
        supabase.from("meetup_attendance").select("id, user_id, attended, rsvp_status").eq("event_id", eventId),
      ]);

      let circleUserIds: string[] = [];
      if (circleId) {
        const { data: members } = await supabase
          .from("circle_members").select("user_id").eq("circle_id", circleId).eq("status", "active");
        circleUserIds = (members || []).map((m: any) => m.user_id);
      }

      const allUserIds = [...new Set([...(rsvps || []).map((r: any) => r.user_id), ...circleUserIds])];
      const { data: profiles } = await supabase
        .from("profiles").select("id, first_name, last_name, email").in("id", allUserIds);
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || p.id;
      });

      const members: AttendanceMember[] = allUserIds.map(uid => {
        const att = (attendances || []).find((a: any) => a.user_id === uid);
        const rsvp = (rsvps || []).find((r: any) => r.user_id === uid);
        return {
          id: att?.id || rsvp?.id || uid,
          user_id: uid,
          name: profileMap[uid] || "Member",
          attended: att?.attended ?? null,
          rsvp_status: att?.rsvp_status || rsvp?.status || null,
        };
      });
      setAttendanceMap(prev => ({ ...prev, [eventId]: members }));
    } catch (e) {
      console.error("Error loading attendance:", e);
    }
  };

  const toggleExpand = async (event: GuideEvent["events"]) => {
    if (expandedEvent === event.id) { setExpandedEvent(null); return; }
    setExpandedEvent(event.id);
    await loadAttendance(event.id, event.circle_id);
  };

  const markAttendance = async (eventId: string, memberId: string, userId_member: string, attended: boolean) => {
    const key = `${eventId}-${userId_member}`;
    setSavingMap(prev => ({ ...prev, [key]: true }));
    try {
      const { data: existing } = await supabase
        .from("meetup_attendance").select("id").eq("event_id", eventId).eq("user_id", userId_member).maybeSingle();

      if (existing) {
        await supabase.from("meetup_attendance").update({
          attended, rsvp_status: attended ? "attended" : "no_show",
          checked_in_at: attended ? new Date().toISOString() : null, checked_in_by: userId,
        }).eq("id", existing.id);
      } else {
        await supabase.from("meetup_attendance").insert({
          event_id: eventId, user_id: userId_member, attended,
          rsvp_status: attended ? "attended" : "no_show",
          checked_in_at: attended ? new Date().toISOString() : null,
          checked_in_by: userId, guide_id: userId,
        });
      }

      setAttendanceMap(prev => ({
        ...prev,
        [eventId]: (prev[eventId] || []).map(m =>
          m.user_id === userId_member ? { ...m, attended, rsvp_status: attended ? "attended" : "no_show" } : m
        ),
      }));
      toast({ title: attended ? "✓ Marked Attended" : "Marked No-Show", description: "Attendance updated." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update attendance.", variant: "destructive" });
    } finally {
      setSavingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const upcoming = guideEvents.filter(g => !g.events.is_completed && new Date(g.events.event_date) >= new Date());
  const past = guideEvents.filter(g => g.events.is_completed || new Date(g.events.event_date) < new Date());

  const renderEvent = (g: GuideEvent, isPast: boolean) => {
    const ev = g.events;
    const members = attendanceMap[ev.id] || [];
    const isExpanded = expandedEvent === ev.id;
    const attendedCount = members.filter(m => m.attended).length;

    return (
      <GlowCard key={ev.id} className={`p-5 ${isPast ? "opacity-80" : "border-primary/30"}`}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <h4 className="font-display font-bold">{ev.title}</h4>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(ev.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              {(ev.venue_name || ev.venue_city) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {ev.venue_name}{ev.venue_city ? ` · ${ev.venue_city}` : ""}
                </span>
              )}
              {ev.meetup_type && <Badge variant="outline" className="text-xs capitalize">{ev.meetup_type}</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPast && members.length > 0 && (
              <span className="text-xs text-muted-foreground">{attendedCount}/{members.length} attended</span>
            )}
            <Button variant="outline" size="sm" onClick={() => toggleExpand(ev)} className="text-xs">
              <Users className="h-3.5 w-3.5 mr-1" />
              {isExpanded ? "Hide" : "Attendance"}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 border-t border-border/40 pt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-wide">Mark Attendance</p>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found for this meetup.</p>
            ) : (
              members.map(member => {
                const key = `${ev.id}-${member.user_id}`;
                const saving = savingMap[key];
                return (
                  <div key={member.user_id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">{member.name}</span>
                    <div className="flex items-center gap-2">
                      {member.attended === true && (
                        <span className="text-xs text-green-500 flex items-center gap-1 mr-2">
                          <CheckCircle className="h-3.5 w-3.5" /> Attended
                        </span>
                      )}
                      {member.attended === false && member.rsvp_status === "no_show" && (
                        <span className="text-xs text-amber-500 flex items-center gap-1 mr-2">
                          <XCircle className="h-3.5 w-3.5" /> No-Show
                        </span>
                      )}
                      <Button size="sm" variant={member.attended ? "outline" : "neon"}
                        className="h-7 text-xs px-2" disabled={saving}
                        onClick={() => markAttendance(ev.id, member.id, member.user_id, true)}>
                        <UserCheck className="h-3.5 w-3.5 mr-1" /> Attended
                      </Button>
                      <Button size="sm"
                        variant={member.rsvp_status === "no_show" && member.attended === false ? "destructive" : "outline"}
                        className="h-7 text-xs px-2" disabled={saving}
                        onClick={() => markAttendance(ev.id, member.id, member.user_id, false)}>
                        <UserX className="h-3.5 w-3.5 mr-1" /> No-Show
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </GlowCard>
    );
  };

  return (
    <div className="space-y-8">

      {/* Assigned Circles Section - always shown */}
      {assignedCircles.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Your Assigned Circles
          </h3>
          <div className="space-y-3">
            {assignedCircles.map(circle => (
              <GlowCard key={circle.id} className="p-5 border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-display font-bold">{circle.name}</h4>
                    {circle.primary_virtue && (
                      <Badge variant="outline" className="text-xs mt-1 capitalize">{circle.primary_virtue}</Badge>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">{circle.members.length} member{circle.members.length !== 1 ? "s" : ""}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs"
                    onClick={() => setExpandedCircle(expandedCircle === circle.id ? null : circle.id)}>
                    <Users className="h-3.5 w-3.5 mr-1" />
                    {expandedCircle === circle.id ? "Hide" : "Members"}
                  </Button>
                </div>
                {expandedCircle === circle.id && (
                  <div className="mt-4 border-t border-border/40 pt-4 space-y-2">
                    {circle.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members in this circle yet.</p>
                    ) : (
                      circle.members.map(m => (
                        <div key={m.user_id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
                          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{m.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </GlowCard>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Meetups */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming Meetups
          </h3>
          <div className="space-y-4">{upcoming.map(g => renderEvent(g, false))}</div>
        </div>
      )}

      {/* Past Meetups */}
      {past.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2 text-muted-foreground">
            <History className="h-5 w-5" />
            Past Meetups
          </h3>
          <div className="space-y-3">{past.map(g => renderEvent(g, true))}</div>
        </div>
      )}

      {/* No events yet but has circles */}
      {guideEvents.length === 0 && assignedCircles.length > 0 && (
        <GlowCard className="p-8 text-center border-dashed">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No Meetups Scheduled Yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your circle is set up. Meetups will appear here once an admin schedules them.
          </p>
        </GlowCard>
      )}

      {/* No circles at all */}
      {assignedCircles.length === 0 && guideEvents.length === 0 && (
        <GlowCard className="p-10 text-center">
          <div className="text-5xl mb-4">🏛️</div>
          <h3 className="text-xl font-display font-bold mb-2">No Assignments Yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            You haven't been assigned to any circles or meetups yet. An admin will assign you when circles are ready.
          </p>
        </GlowCard>
      )}
    </div>
  );
};

// ─── Member Events View ───────────────────────────────────────────────────────
const MemberEventsView = ({ userId }: DashboardEventsProps) => {
  const { toast } = useToast();
  const [assignedEvents, setAssignedEvents] = useState<AssignedEvent[]>([]);
  const [history, setHistory] = useState<MemberHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const doFetch = async () => {
      // fetchAssignedEvents inline
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) { setLoading(false); return; }
        const { data, error } = await supabase
          .from("event_rsvps")
          .select(`id, event_id, status, events(id, title, description, event_date, location, venue_name, venue_city, meetup_type, is_completed, status)`)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error) setAssignedEvents(((data as unknown as AssignedEvent[]) || []).filter(a => !!a.events));
      } catch (e) { console.error(e); } finally { setLoading(false); }

      // fetchMemberHistory inline — pulls from BOTH circle membership AND direct RSVPs
      setHistoryLoading(true);
      try {
        // Source 1: events via circle membership — include joined_at for date filtering
        const { data: memberData } = await supabase
          .from("circle_members")
          .select("circle_id, joined_at")
          .eq("user_id", userId)
          .eq("status", "active");
        const circleIds = (memberData || []).map((m: any) => m.circle_id);
        // Map circle_id -> joined_at so we can filter history by join date
        const circleJoinedAt: Record<string, string> = {};
        (memberData || []).forEach((m: any) => {
          if (m.joined_at) circleJoinedAt[m.circle_id] = m.joined_at;
        });

        // Source 2: any direct RSVP event IDs (for non-circle direct assignments)
        const { data: rsvpData } = await supabase
          .from("event_rsvps")
          .select("event_id, status")
          .eq("user_id", userId);
        const rsvpEventIds = (rsvpData || []).map((r: any) => r.event_id);

        if (circleIds.length === 0 && rsvpEventIds.length === 0) {
          setHistoryLoading(false);
          return;
        }

        // Fetch completed events from circle membership AND direct RSVPs combined
        const eventIdSet = new Set(rsvpEventIds);
        let allEvents: any[] = [];

        // Primary: completed circle events (join-date filter applied below)
        if (circleIds.length > 0) {
          const { data: circleEvents } = await supabase
            .from("events")
            .select(`id, title, event_date, meetup_type, venue_name, venue_city, lead_guide_id, circle_id, is_completed, status`)
            .or("is_completed.eq.true,status.eq.completed")
            .in("circle_id", circleIds)
            .order("event_date", { ascending: false });
          (circleEvents || []).forEach((e: any) => {
            allEvents.push(e);
            eventIdSet.delete(e.id); // avoid duplicates
          });
        }

        // Secondary: any direct RSVP completed events not already in the list
        const extraIds = [...eventIdSet];
        if (extraIds.length > 0) {
          const { data: rsvpEvents } = await supabase
            .from("events")
            .select(`id, title, event_date, meetup_type, venue_name, venue_city, lead_guide_id, circle_id, is_completed, status`)
            .or("is_completed.eq.true,status.eq.completed")
            .in("id", extraIds)
            .order("event_date", { ascending: false });
          allEvents = allEvents.concat(rsvpEvents || []);
        }

        const events = allEvents;
        if (!events || events.length === 0) { setHistoryLoading(false); return; }

        // Filter out events that occurred before the member joined the circle
        // This ensures new members don't see past circle history
        const filteredEvents = (events as any[]).filter((e: any) => {
          if (!e.circle_id) return true; // non-circle events (direct RSVP) always show
          const joinedAt = circleJoinedAt[e.circle_id];
          if (!joinedAt) return true; // no join date recorded — allow
          return new Date(e.event_date) >= new Date(joinedAt);
        });

        // Fetch all event IDs we need attendance for
        const completedEventIds = filteredEvents.map((e: any) => e.id);
        if (completedEventIds.length === 0) { setHistoryLoading(false); return; }

        // Fetch ALL attendance records for these events via the guide's perspective
        // Members can only see their own rows via RLS, so we fetch just their own record
        const { data: myAttendances } = await supabase
          .from("meetup_attendance")
          .select("event_id, user_id, attended, rsvp_status, guide_id, checked_in_by")
          .in("event_id", completedEventIds)
          .eq("user_id", userId);

        // Also fetch all circle members' attendance for peer display
        // Use circle_id from events to get circle member user_ids, then their attendance
        const allCircleIds = [...new Set(filteredEvents.map((e: any) => e.circle_id).filter(Boolean))];
        let circleAttendanceByEvent: Record<string, { user_id: string; attended: boolean | null; rsvp_status: string | null }[]> = {};
        if (allCircleIds.length > 0) {
          const { data: circleMembers } = await supabase
            .from("circle_members")
            .select("circle_id, user_id")
            .in("circle_id", allCircleIds)
            .eq("status", "active");

          // Get attendance for circle member user_ids across these events
          const circleMemberIds = [...new Set((circleMembers || []).map((m: any) => m.user_id))];
          if (circleMemberIds.length > 0) {
            const { data: allAtt } = await supabase
              .from("meetup_attendance")
              .select("event_id, user_id, attended, rsvp_status")
              .in("event_id", completedEventIds)
              .in("user_id", circleMemberIds);

            // Group by event
            (allAtt || []).forEach((a: any) => {
              if (!circleAttendanceByEvent[a.event_id]) circleAttendanceByEvent[a.event_id] = [];
              circleAttendanceByEvent[a.event_id].push({ user_id: a.user_id, attended: a.attended, rsvp_status: a.rsvp_status });
            });

            // Resolve names
            const { data: peerProfiles } = await supabase
              .from("profiles")
              .select("id, first_name, last_name")
              .in("id", circleMemberIds);
            const peerNameMap: Record<string, string> = {};
            (peerProfiles || []).forEach((p: any) => {
              peerNameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id;
            });
            // Store peerNameMap in closure
            Object.keys(circleAttendanceByEvent).forEach(evId => {
              circleAttendanceByEvent[evId] = circleAttendanceByEvent[evId].map(a => ({
                ...a,
                _name: peerNameMap[a.user_id] || "Member",
              } as any));
            });
          }
        }

        const guideIds = [...new Set(filteredEvents.map((e: any) => e.lead_guide_id).filter(Boolean))];
        let guideMap: Record<string, string> = {};
        if (guideIds.length > 0) {
          const { data: guideProfiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", guideIds);
          (guideProfiles || []).forEach((p: any) => {
            guideMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id;
          });
        }

        // Build rsvp status map for fallback
        const rsvpStatusMap: Record<string, string> = {};
        (rsvpData || []).forEach((r: any) => { rsvpStatusMap[r.event_id] = r.status; });

        // Build my attendance map
        const myAttMap: Record<string, { attended: boolean | null; rsvp_status: string | null }> = {};
        (myAttendances || []).forEach((a: any) => { myAttMap[a.event_id] = { attended: a.attended, rsvp_status: a.rsvp_status }; });

        setHistory(filteredEvents.map((e: any) => {
          const myRecord = myAttMap[e.event_id] || myAttMap[e.id];
          const myAttended = myRecord?.attended ?? (rsvpStatusMap[e.id] === "attended" ? true : null);
          const myStatus = myRecord?.rsvp_status ?? rsvpStatusMap[e.id] ?? null;

          const peerRows = circleAttendanceByEvent[e.id] || [];
          const peers: AttendancePeer[] = peerRows.map((a: any) => ({
            user_id: a.user_id,
            name: (a as any)._name || "Member",
            attended: a.attended,
            rsvp_status: a.rsvp_status,
          }));
          const total = peers.length;
          const attended = peers.filter(p => p.attended).length;

          return {
            event_id: e.id,
            event_title: e.title,
            event_date: e.event_date,
            meetup_type: e.meetup_type,
            venue_name: e.venue_name,
            venue_city: e.venue_city,
            guide_name: e.lead_guide_id ? (guideMap[e.lead_guide_id] || null) : null,
            attended: myAttended,
            rsvp_status: myStatus,
            circle_attendance_rate: total > 0 ? Math.round((attended / total) * 100) : 0,
            peers,
          };
        }));
      } catch (e) { console.error("Error fetching member history:", e); } finally { setHistoryLoading(false); }
    };
    doFetch();
  }, [userId]);

  const fetchAssignedEvents = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const { data, error } = await supabase
        .from("event_rsvps")
        .select(`
          id,
          event_id,
          status,
          events (
            id,
            title,
            description,
            event_date,
            location,
            venue_name,
            venue_city,
            meetup_type,
            is_completed,
            status
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Only show RSVPs for events that are NOT completed
      const valid = ((data as unknown as AssignedEvent[]) || []).filter(
        (a) => !!a.events && !a.events.is_completed && a.events.status !== "completed"
      );
      setAssignedEvents(valid);
    } catch (error) {
      console.error("Error fetching assigned events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: memberData } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (!memberData || memberData.length === 0) return;
      const circleIds = memberData.map((m) => m.circle_id);

      const { data: events } = await supabase
        .from("events")
        .select(`
          id,
          title,
          event_date,
          meetup_type,
          venue_name,
          venue_city,
          lead_guide_id,
          circle_id,
          meetup_attendance(id, user_id, attended, rsvp_status)
        `)
        .eq("is_completed", true)
        .in("circle_id", circleIds)
        .order("event_date", { ascending: false });

      if (!events || events.length === 0) return;

      const guideIds = [...new Set(events.map((e: any) => e.lead_guide_id).filter(Boolean))];
      const allAttUserIds = [...new Set((events as any[]).flatMap((e: any) => (e.meetup_attendance || []).map((a: any) => a.user_id)))];
      let profileMap: Record<string, string> = {};
      let guideMap: Record<string, string> = {};
      if (allAttUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", allAttUserIds);
        (profiles || []).forEach((p) => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id;
          profileMap[p.id] = name;
          if ((guideIds as string[]).includes(p.id)) guideMap[p.id] = name;
        });
      }

      const rows: MemberHistoryRow[] = events.map((e: any) => {
        const att: any[] = e.meetup_attendance || [];
        const myRecord = att.find((a: any) => a.user_id === userId);
        const total = att.length;
        const attended = att.filter((a: any) => a.attended).length;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
        const peers: AttendancePeer[] = att.map((a: any) => ({
          user_id: a.user_id,
          name: profileMap[a.user_id] || "Member",
          attended: a.attended,
          rsvp_status: a.rsvp_status,
        }));
        return {
          event_id: e.id,
          event_title: e.title,
          event_date: e.event_date,
          meetup_type: e.meetup_type,
          venue_name: e.venue_name,
          venue_city: e.venue_city,
          guide_name: e.lead_guide_id ? (guideMap[e.lead_guide_id] || null) : null,
          attended: myRecord?.attended ?? null,
          rsvp_status: myRecord?.rsvp_status ?? null,
          circle_attendance_rate: rate,
          peers,
        };
      });

      setHistory(rows);
    } catch (e) {
      console.error("Error fetching member history:", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRSVP = async (rsvpId: string, status: "confirmed" | "declined") => {
    try {
      const { error } = await supabase
        .from("event_rsvps")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", rsvpId);

      if (error) throw error;

      toast({
        title: status === "confirmed" ? "✓ RSVP Confirmed" : "RSVP Declined",
        description: status === "confirmed" ? "You've confirmed your attendance!" : "You've declined this meetup.",
      });

      fetchAssignedEvents();
    } catch (error) {
      console.error("Error updating RSVP:", error);
      toast({ title: "Error", description: "Failed to update RSVP.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-green-500/20 text-green-500">Confirmed</Badge>;
      case "declined": return <Badge variant="outline">Declined</Badge>;
      case "attended": return <Badge className="bg-blue-500/20 text-blue-500">Attended</Badge>;
      default: return <Badge className="bg-amber-500/20 text-amber-500">Pending Response</Badge>;
    }
  };

  const myAttendanceBadge = (row: MemberHistoryRow) => {
    if (row.rsvp_status === "declined") return <span className="flex items-center gap-1 text-muted-foreground"><MinusCircle className="h-3 w-3" />Declined</span>;
    if (row.attended) return <span className="flex items-center gap-1 text-green-400"><CheckCircle className="h-3 w-3" />Attended</span>;
    if (row.rsvp_status === "no_show") return <span className="flex items-center gap-1 text-amber-400"><XCircle className="h-3 w-3" />Missed</span>;
    return <span className="text-muted-foreground">—</span>;
  };

  const totalMeetups = history.length;
  const iAttended = history.filter((h) => h.attended).length;
  const iMissed = history.filter((h) => !h.attended && h.rsvp_status === "no_show").length;
  const myRate = totalMeetups > 0 ? Math.round((iAttended / totalMeetups) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Only show upcoming non-completed events where the guide hasn't marked attendance yet
  const historyEventIds = new Set(history.map(h => h.event_id));
  const upcoming = assignedEvents.filter((a) =>
    a.events &&
    !a.events.is_completed &&
    !historyEventIds.has(a.events.id) &&
    !["attended", "no_show"].includes(a.status) &&
    new Date(a.events.event_date) >= new Date()
  );
  // Past-date RSVPs that haven't been marked complete yet — transitional state
  const upcomingOrPastRsvps = assignedEvents.filter((a) =>
    a.events &&
    !a.events.is_completed &&
    !historyEventIds.has(a.events.id) &&
    !["attended", "no_show"].includes(a.status) &&
    new Date(a.events.event_date) < new Date()
  );

  if (upcoming.length === 0 && upcomingOrPastRsvps.length === 0 && history.length === 0) {
    return (
      <GlowCard className="p-10 text-center">
        <div className="text-5xl mb-4">🏛️</div>
        <h3 className="text-xl font-display font-bold mb-2">Your Circle is being formed</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mb-4">
          Our team is carefully matching you with members who share your virtue profile. New circles form on the 1st and 15th of each month. You'll be notified as soon as your circle and meetup are ready.
        </p>
        <p className="text-sm text-muted-foreground">
          Questions? Reach us at{" "}
          <a href="mailto:hello@virtue-circles.com" className="text-primary hover:underline">hello@virtue-circles.com</a>
        </p>
      </GlowCard>
    );
  }

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Your Assigned Meetups
          </h3>
          <div className="space-y-4">
            {upcoming.map((item) => (
              <GlowCard key={item.id} className="p-6 border-primary/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-display font-bold">{item.events.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(item.events.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                      {(item.events.venue_name || item.events.location) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {item.events.venue_name || item.events.location}
                          {item.events.venue_city && ` · ${item.events.venue_city}`}
                        </span>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                {item.events.description && (
                  <p className="text-sm text-muted-foreground mb-4">{item.events.description}</p>
                )}

                {item.status === "pending" && (
                  <div className="flex gap-2">
                    <Button variant="neon" size="sm" onClick={() => handleRSVP(item.id, "confirmed")}>
                      <Check className="h-4 w-4 mr-2" />Confirm Attendance
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRSVP(item.id, "declined")}>
                      <X className="h-4 w-4 mr-2" />Decline
                    </Button>
                  </div>
                )}
              </GlowCard>
            ))}
          </div>
        </div>
      )}

      {upcomingOrPastRsvps.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2 text-muted-foreground">
            <Check className="h-5 w-5" />
            Past Meetups
          </h3>
          <div className="space-y-3">
            {upcomingOrPastRsvps.map((item) => (
              <GlowCard key={item.id} className="p-5 opacity-70">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-display font-bold">{item.events.title}</h4>
                    <p className="text-sm text-muted-foreground">{new Date(item.events.event_date).toLocaleDateString()}</p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Circle Meetup History
        </h3>

        {history.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <GlowCard className="p-3">
              <p className="text-2xl font-bold">{totalMeetups}</p>
              <p className="text-xs text-muted-foreground">Total Meetups</p>
            </GlowCard>
            <GlowCard className="p-3">
              <p className="text-2xl font-bold text-green-400">{iAttended}</p>
              <p className="text-xs text-muted-foreground">I Attended</p>
            </GlowCard>
            <GlowCard className="p-3">
              <p className="text-2xl font-bold text-amber-400">{iMissed}</p>
              <p className="text-xs text-muted-foreground">I Missed</p>
            </GlowCard>
            <GlowCard className="p-3">
              <p className="text-2xl font-bold text-primary flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />{myRate}%
              </p>
              <p className="text-xs text-muted-foreground">My Attendance Rate</p>
            </GlowCard>
          </div>
        )}

        {historyLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : history.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <div className="text-4xl mb-3">📅</div>
            <p className="font-semibold">No meetup history yet</p>
            <p className="text-sm text-muted-foreground mt-1">Your circle's completed meetups will appear here.</p>
          </GlowCard>
        ) : (
          <div className="space-y-3">
            {history.map((row) => (
              <GlowCard key={row.event_id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{row.event_title}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(row.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {row.guide_name && (
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />{row.guide_name}
                        </span>
                      )}
                      {(row.venue_name || row.venue_city) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {row.venue_name}{row.venue_city ? ` · ${row.venue_city}` : ""}
                        </span>
                      )}
                    </div>

                    {/* Circle attendance roster */}
                    {row.peers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Circle Attendance</p>
                        <div className="flex flex-wrap gap-2">
                          {row.peers.map((peer) => {
                            const isMe = peer.user_id === userId;
                            const attended = peer.attended === true;
                            const noShow = peer.rsvp_status === "no_show" && peer.attended === false;
                            return (
                              <span
                                key={peer.user_id}
                                className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                                  attended
                                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                                    : noShow
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                    : "bg-muted/30 border-border/40 text-muted-foreground"
                                } ${isMe ? "ring-1 ring-primary" : ""}`}
                              >
                                {attended ? <CheckCircle className="h-3 w-3" /> : noShow ? <XCircle className="h-3 w-3" /> : <MinusCircle className="h-3 w-3" />}
                                {isMe ? "You" : peer.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm shrink-0">
                    {row.meetup_type && (
                      <Badge variant="outline" className="text-xs capitalize">{row.meetup_type}</Badge>
                    )}
                    <span className="text-xs">{myAttendanceBadge(row)}</span>
                    {row.peers.length > 0 && (
                      <span className="text-xs text-muted-foreground">Circle: {row.circle_attendance_rate}%</span>
                    )}
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Router: Guide vs Member ──────────────────────────────────────────────────
export const DashboardEvents = ({ userId }: DashboardEventsProps) => {
  const { isVCGuide, loading: rolesLoading } = useUserRoles();

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isVCGuide) {
    return <GuideEventsView userId={userId} />;
  }

  return <MemberEventsView userId={userId} />;
};
