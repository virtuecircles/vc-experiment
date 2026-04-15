import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "vc_manager" | "vc_guide" | "vc_member" | "admin" | "moderator" | "user";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Region {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ManagerRegion {
  id: string;
  user_id: string;
  region_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface GuideEvent {
  id: string;
  user_id: string;
  event_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

interface UseUserRolesReturn {
  // Current user's roles
  roles: AppRole[];
  loading: boolean;
  
  // Role checks
  isSuperAdmin: boolean;
  isVCManager: boolean;
  isVCGuide: boolean;
  isVCMember: boolean;
    isAdmin: boolean; // Legacy compatibility - true if super_admin or admin
    hasAnyAdminAccess: boolean; // True if has any elevated role
  
  // Permission checks
  canManageRoles: boolean;
  canManageRevenue: boolean;
  canExportData: boolean;
  canEditPricing: boolean;
  canIssueRefunds: boolean;
  canManageEvents: boolean;
  canManageGroups: boolean;
  canEnableRetest: boolean;
  canViewAllUsers: boolean;
  canViewRevenue: boolean;
  canSendNotifications: boolean;
  canMessageOutsideGroup: boolean;
  
  // Manager-specific
  managerRegions: Region[];
  
  // Guide-specific
  guideEvents: string[]; // event IDs
  
  // Methods
  refreshRoles: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  canAccessUserData: (targetUserId: string) => Promise<boolean>;
  isGuideForEvent: (eventId: string) => boolean;
}

export const useUserRoles = (): UseUserRolesReturn => {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerRegions, setManagerRegions] = useState<Region[]>([]);
  const [guideEvents, setGuideEvents] = useState<string[]>([]);

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([]);
      setManagerRegions([]);
      setGuideEvents([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch user roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (roleError) throw roleError;
      
      const userRoles = (roleData || []).map(r => r.role as AppRole);
      setRoles(userRoles);

      // If VC Manager, fetch assigned regions
      if (userRoles.includes("vc_manager")) {
        const { data: regionData } = await supabase
          .from("manager_regions")
          .select("region_id")
          .eq("user_id", user.id);
        
        if (regionData && regionData.length > 0) {
          const regionIds = regionData.map(r => r.region_id);
          const { data: regions } = await supabase
            .from("regions")
            .select("*")
            .in("id", regionIds);
          
          setManagerRegions(regions || []);
        }
      }

      // If VC Guide, fetch assigned events (direct + from assigned circles + lead_guide_id)
      if (userRoles.includes("vc_guide")) {
        // 1. Direct guide_events assignments
        const { data: eventData } = await supabase
          .from("guide_events")
          .select("event_id")
          .eq("user_id", user.id);
        
        const directEventIds = (eventData || []).map(e => e.event_id);

        // 2. Events from assigned circles (circle_id match)
        const { data: circleAssignments } = await supabase
          .from("guide_circle_assignments")
          .select("circle_id")
          .eq("guide_id", user.id)
          .eq("is_active", true);

        const circleIds = (circleAssignments || []).map((c: any) => c.circle_id);
        let circleEventIds: string[] = [];
        if (circleIds.length > 0) {
          const { data: circleEvents } = await supabase
            .from("events")
            .select("id")
            .in("circle_id", circleIds);
          circleEventIds = (circleEvents || []).map((e: any) => e.id);
        }

        // 3. Events where this guide is the lead_guide_id
        const { data: leadGuideEvents } = await supabase
          .from("events")
          .select("id")
          .eq("lead_guide_id", user.id);
        const leadGuideEventIds = (leadGuideEvents || []).map((e: any) => e.id);

        const allEventIds = [...new Set([...directEventIds, ...circleEventIds, ...leadGuideEventIds])];
        setGuideEvents(allEventIds);
      }
    } catch (error) {
      console.error("Error fetching user roles:", error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchRoles();
  }, [authLoading, fetchRoles]);

  // Role checks
  const isSuperAdmin = roles.includes("super_admin");
  const isVCManager = roles.includes("vc_manager");
  const isVCGuide = roles.includes("vc_guide");
  const isVCMember = roles.includes("vc_member");
  const isAdmin = isSuperAdmin || roles.includes("admin"); // Legacy compatibility
  const hasAnyAdminAccess = isSuperAdmin || isVCManager || isVCGuide || isAdmin;

  // Permission matrix based on role hierarchy
  const canManageRoles = isSuperAdmin;
  const canManageRevenue = isSuperAdmin; // Only super admin can edit revenue
  const canExportData = isSuperAdmin;
  const canEditPricing = isSuperAdmin;
  const canIssueRefunds = isSuperAdmin;
  const canManageEvents = isSuperAdmin || isVCManager;
  const canManageGroups = isSuperAdmin || isVCManager;
  const canEnableRetest = isSuperAdmin || isVCManager;
  const canViewAllUsers = isSuperAdmin || isVCManager;
  const canViewRevenue = isSuperAdmin || isVCManager; // Managers can view (read-only)
  const canSendNotifications = isSuperAdmin || isVCManager || isVCGuide;
  const canMessageOutsideGroup = isSuperAdmin; // Only super admin can message anyone

  // Helper methods
  const hasRole = useCallback((role: AppRole): boolean => {
    return roles.includes(role);
  }, [roles]);

  const hasAnyRole = useCallback((checkRoles: AppRole[]): boolean => {
    return checkRoles.some(role => roles.includes(role));
  }, [roles]);

  const isGuideForEvent = useCallback((eventId: string): boolean => {
    return guideEvents.includes(eventId);
  }, [guideEvents]);

  const canAccessUserData = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (user.id === targetUserId) return true;

    // VC Manager - check if user is in their region
    if (isVCManager && managerRegions.length > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("region_id")
        .eq("id", targetUserId)
        .single();
      
      if (data?.region_id && managerRegions.some(r => r.id === data.region_id)) {
        return true;
      }
    }

    // VC Guide - check if user is in their assigned events
    if (isVCGuide && guideEvents.length > 0) {
      const { data } = await supabase
        .from("event_rsvps")
        .select("event_id")
        .eq("user_id", targetUserId)
        .in("event_id", guideEvents);
      
      if (data && data.length > 0) {
        return true;
      }
    }

    return false;
  }, [user, isSuperAdmin, isVCManager, isVCGuide, managerRegions, guideEvents]);

  return {
    roles,
    loading: authLoading || loading,
    isSuperAdmin,
    isVCManager,
    isVCGuide,
    isVCMember,
    isAdmin,
    hasAnyAdminAccess,
    canManageRoles,
    canManageRevenue,
    canExportData,
    canEditPricing,
    canIssueRefunds,
    canManageEvents,
    canManageGroups,
    canEnableRetest,
    canViewAllUsers,
    canViewRevenue,
    canSendNotifications,
    canMessageOutsideGroup,
    managerRegions,
    guideEvents,
    refreshRoles: fetchRoles,
    hasRole,
    hasAnyRole,
    canAccessUserData,
    isGuideForEvent,
  };
};

// Export role display helpers
export const getRoleDisplayName = (role: AppRole): string => {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "vc_manager": return "VC Manager";
    case "vc_guide": return "VC Guide";
    case "vc_member": return "VC Member";
    case "admin": return "Admin (Legacy)";
    case "moderator": return "Moderator (Legacy)";
    case "user": return "User";
    default: return role;
  }
};

export const getRoleDescription = (role: AppRole): string => {
  switch (role) {
    case "super_admin": 
      return "Full access to all features including revenue, pricing, refunds, and role management";
    case "vc_manager": 
      return "Regional access: manage events, groups, guides, enable retests. Read-only revenue access";
    case "vc_guide": 
      return "Event-specific access: view assigned events, member profiles (read-only), group messaging";
    case "vc_member": 
      return "Basic member access: view own profile, join circles, RSVP to events, participate in group chat";
    case "admin": 
      return "Legacy admin role - consider migrating to Super Admin";
    case "moderator": 
      return "Legacy moderator role - consider migrating to VC Manager";
    case "user": 
      return "Standard user permissions";
    default: 
      return "Unknown role";
  }
};

export const getRoleColor = (role: AppRole): string => {
  switch (role) {
    case "super_admin": return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    case "vc_manager": return "bg-purple-500/10 text-purple-500 border-purple-500/30";
    case "vc_guide": return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    case "vc_member": return "bg-green-500/10 text-green-500 border-green-500/30";
    case "admin": return "bg-red-500/10 text-red-500 border-red-500/30";
    case "moderator": return "bg-orange-500/10 text-orange-500 border-orange-500/30";
    case "user": return "bg-muted/50";
    default: return "bg-muted/50";
  }
};
