import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, CheckCircle, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CircleMember {
  id: string;
  user_id: string;
  profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface Circle {
  id: string;
  name: string;
  description: string | null;
  primary_virtue: string | null;
  status: string | null;
  max_members: number | null;
  created_at: string | null;
}

interface CircleMembership {
  circle_id: string;
  status: string | null;
  joined_at: string | null;
  left_at: string | null;
  circles: Circle;
}

interface DashboardCirclesProps {
  userId: string;
}

export const DashboardCircles = ({ userId }: DashboardCirclesProps) => {
  const [memberships, setMemberships] = useState<CircleMembership[]>([]);
  const [circleMembersMap, setCircleMembersMap] = useState<Record<string, CircleMember[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCircles();
  }, [userId]);

  const fetchCircles = async () => {
    try {
      // Fetch user's circle memberships
      const { data, error } = await supabase
        .from("circle_members")
        .select(`
          circle_id,
          status,
          joined_at,
          left_at,
          circles (
            id,
            name,
            description,
            primary_virtue,
            status,
            max_members,
            created_at
          )
        `)
        .eq("user_id", userId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      
      const membershipData = (data as unknown as CircleMembership[]) || [];
      setMemberships(membershipData);

      // Fetch members for each circle
      const circleIds = membershipData.map(m => m.circle_id);
      if (circleIds.length > 0) {
        const membersMap: Record<string, CircleMember[]> = {};
        
        for (const circleId of circleIds) {
          // First fetch circle members
          const { data: membersData, error: membersError } = await supabase
            .from("circle_members")
            .select("id, user_id")
            .eq("circle_id", circleId)
            .eq("status", "active");

          if (!membersError && membersData && membersData.length > 0) {
            // Use the safe_member_profiles view — never query the full profiles table
            // for circle mates, to prevent PII exposure (email, phone, address, DOB etc.)
            const userIds = membersData.map(m => m.user_id);
            const { data: profilesData } = await supabase
              .from("safe_member_profiles" as "profiles")
              .select("id, first_name, last_name")
              .in("id", userIds);

            // Map profiles to members
            const profilesById = new Map(
              (profilesData || []).map(p => [p.id, p])
            );

            membersMap[circleId] = membersData.map((m) => ({
              id: m.id,
              user_id: m.user_id,
              profile: profilesById.get(m.user_id) || null
            }));
          }
        }
        
        setCircleMembersMap(membersMap);
      }
    } catch (error) {
      console.error("Error fetching circles:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (member: CircleMember, isCurrentUser: boolean) => {
    if (isCurrentUser) return "You";
    if (member.profile?.first_name || member.profile?.last_name) {
      return `${member.profile.first_name || ""} ${member.profile.last_name || ""}`.trim();
    }
    return "Member";
  };

  const activeCircles = memberships.filter(m => m.status === "active" && !m.left_at);
  const pastCircles = memberships.filter(m => m.status !== "active" || m.left_at);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500">Active</Badge>;
      case "forming":
        return <Badge className="bg-amber-500/20 text-amber-500">Forming</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/20 text-blue-500">Completed</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Circles */}
      <div>
      <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Your Circles
        </h3>
        
        {activeCircles.length > 0 ? (
          <div className="space-y-4">
            {activeCircles.map((membership) => {
              const members = circleMembersMap[membership.circle_id] || [];
              
              return (
                <GlowCard key={membership.circle_id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-display font-bold">{membership.circles.name}</h4>
                      {membership.circles.primary_virtue && (
                        <p className="text-sm text-primary">{membership.circles.primary_virtue} Circle</p>
                      )}
                    </div>
                    {getStatusBadge(membership.circles.status)}
                  </div>
                  
                  {membership.circles.description && (
                    <p className="text-muted-foreground text-sm mb-4">
                      {membership.circles.description}
                    </p>
                  )}

                  {/* Group Members */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Circle Members ({members.length})
                    </p>
                    {members.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {members.map((member) => {
                          const isCurrentUser = member.user_id === userId;
                          return (
                            <div 
                              key={member.id} 
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                                isCurrentUser 
                                  ? "bg-primary/20 text-primary border border-primary/30" 
                                  : "bg-background border"
                              }`}
                            >
                              <User className="h-3 w-3" />
                              <span className={isCurrentUser ? "font-medium" : ""}>
                                {getMemberName(member, isCurrentUser)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No other members yet</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {membership.joined_at 
                        ? new Date(membership.joined_at).toLocaleDateString() 
                        : "Unknown"}
                    </div>
                    {membership.circles.max_members && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Max {membership.circles.max_members} members
                      </div>
                    )}
                  </div>
                </GlowCard>
              );
            })}
          </div>
        ) : (
          <GlowCard className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-display font-bold mb-2">No Active Circles</h4>
            <p className="text-muted-foreground">
              You haven't been assigned to a circle yet. Complete your virtue quiz and 
              you'll be matched with compatible members.
            </p>
          </GlowCard>
        )}
      </div>

      {/* Past Circles */}
      {pastCircles.length > 0 && (
        <div>
          <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-muted-foreground" />
            Past Circles
          </h3>
          
          <div className="space-y-4">
            {pastCircles.map((membership) => (
              <GlowCard key={membership.circle_id} className="p-6 opacity-70">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-display font-bold">{membership.circles.name}</h4>
                    {membership.circles.primary_virtue && (
                      <p className="text-sm text-muted-foreground">{membership.circles.primary_virtue} Circle</p>
                    )}
                  </div>
                  {getStatusBadge(membership.circles.status)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {membership.joined_at && new Date(membership.joined_at).toLocaleDateString()} 
                    {membership.left_at && ` - ${new Date(membership.left_at).toLocaleDateString()}`}
                  </span>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
