import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileCheck,
  HelpCircle,
  Search,
  Calendar,
  CheckCircle2,
  Eye,
  Trash2,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type UserWaiver = Tables<"user_waivers"> & {
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

export const AdminWaivers = () => {
  const { toast } = useToast();
  const [waivers, setWaivers] = useState<UserWaiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWaiver, setSelectedWaiver] = useState<UserWaiver | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    fetchWaivers();
  }, []);

  const fetchWaivers = async () => {
    try {
      const { data, error } = await supabase
        .from("user_waivers")
        .select("*")
        .order("signed_at", { ascending: false });

      if (error) throw error;

      // Fetch profile details
      const waiversWithProfiles: UserWaiver[] = [];
      for (const waiver of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", waiver.user_id)
          .single();

        waiversWithProfiles.push({
          ...waiver,
          profile: profile || undefined,
        });
      }

      setWaivers(waiversWithProfiles);
    } catch (error) {
      console.error("Error fetching waivers:", error);
      toast({
        title: "Error",
        description: "Failed to load waivers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWaiver = async (waiverId: string) => {
    if (!confirm("Are you sure you want to delete this waiver? The user will need to sign it again.")) {
      return;
    }

    try {
      const { error } = await supabase.from("user_waivers").delete().eq("id", waiverId);
      if (error) throw error;

      toast({
        title: "✓ Waiver Deleted",
        description: "The waiver has been removed. The user will need to sign it again.",
      });
      fetchWaivers();
    } catch (error) {
      console.error("Error deleting waiver:", error);
      toast({
        title: "Error",
        description: "Failed to delete waiver.",
        variant: "destructive",
      });
    }
  };

  const filteredWaivers = waivers.filter((waiver) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      waiver.profile?.email?.toLowerCase().includes(searchLower) ||
      waiver.profile?.first_name?.toLowerCase().includes(searchLower) ||
      waiver.profile?.last_name?.toLowerCase().includes(searchLower) ||
      waiver.waiver_type.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getUserName = (profile: UserWaiver["profile"]) => {
    if (!profile) return "Unknown User";
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }
    return profile.email?.split("@")[0] || "Unknown User";
  };

  const getWaiverTypeLabel = (type: string) => {
    switch (type) {
      case "liability": return "Liability Waiver";
      case "photo_release": return "Photo Release";
      case "terms": return "Terms & Conditions";
      case "privacy": return "Privacy Policy";
      default: return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  // Get unique users who have signed waivers
  const uniqueUsers = new Set(waivers.map((w) => w.user_id)).size;

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
        <h2 className="font-display font-semibold text-lg">User Waivers</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>View all signed waivers. You can delete a waiver to require the user to sign again.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlowCard className="p-4">
          <p className="text-2xl font-bold">{waivers.length}</p>
          <p className="text-sm text-muted-foreground">Total Waivers Signed</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">{uniqueUsers}</p>
          <p className="text-sm text-muted-foreground">Users with Waivers</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-blue-500">
            {new Set(waivers.map((w) => w.waiver_type)).size}
          </p>
          <p className="text-sm text-muted-foreground">Waiver Types</p>
        </GlowCard>
      </div>

      {/* Search */}
      <GlowCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or waiver type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </GlowCard>

      {/* Waivers List */}
      {filteredWaivers.length === 0 ? (
        <GlowCard className="p-8 text-center">
          <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-medium">No waivers found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm ? "Try a different search term" : "Signed waivers will appear here"}
          </p>
        </GlowCard>
      ) : (
        <div className="space-y-2">
          {filteredWaivers.map((waiver) => (
            <GlowCard key={waiver.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold">{getUserName(waiver.profile)}</p>
                    <Badge className="bg-green-500/20 text-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signed
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <Badge variant="outline">{getWaiverTypeLabel(waiver.waiver_type)}</Badge>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(waiver.signed_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedWaiver(waiver);
                      setShowDetailDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteWaiver(waiver.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Waiver Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Waiver Details
            </DialogTitle>
          </DialogHeader>
          {selectedWaiver && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">User</p>
                <p className="font-medium">{getUserName(selectedWaiver.profile)}</p>
                {selectedWaiver.profile?.email && (
                  <p className="text-sm text-muted-foreground">{selectedWaiver.profile.email}</p>
                )}
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Waiver Type</p>
                <p className="font-medium">{getWaiverTypeLabel(selectedWaiver.waiver_type)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Signed At</p>
                <p className="font-medium">{formatDate(selectedWaiver.signed_at)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">IP Address</p>
                <p className="font-medium font-mono">{selectedWaiver.ip_address || "Not recorded"}</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    handleDeleteWaiver(selectedWaiver.id);
                    setShowDetailDialog(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Waiver
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
