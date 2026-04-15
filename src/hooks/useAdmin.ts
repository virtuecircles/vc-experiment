import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Legacy hook for backwards compatibility.
 * For new code, prefer useUserRoles() which provides granular permissions.
 */
export const useAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isVCManager, setIsVCManager] = useState(false);
  const [isVCGuide, setIsVCGuide] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsVCManager(false);
      setIsVCGuide(false);
      setLoading(false);
      return;
    }

    const checkRoles = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;
        
        const roles = (data || []).map(r => r.role);
        
        // Super Admin has all permissions
        const hasSuperAdmin = roles.includes("super_admin");
        setIsSuperAdmin(hasSuperAdmin);
        
        // VC Manager
        setIsVCManager(roles.includes("vc_manager"));
        
        // VC Guide
        setIsVCGuide(roles.includes("vc_guide"));
        
        // isAdmin is true for any elevated role (for backwards compatibility)
        setIsAdmin(
          hasSuperAdmin || 
          roles.includes("admin") || 
          roles.includes("vc_manager") ||
          roles.includes("vc_guide")
        );
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsVCManager(false);
        setIsVCGuide(false);
      } finally {
        setLoading(false);
      }
    };

    checkRoles();
  }, [user, authLoading]);

  return { 
    isAdmin, 
    isSuperAdmin,
    isVCManager,
    isVCGuide,
    loading: authLoading || loading 
  };
};
