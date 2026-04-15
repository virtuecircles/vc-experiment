import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Heart,
  Search,
  MapPin,
  Mail,
  Phone,
  User,
  Calendar,
  HelpCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface SoulmateWaitlistMember {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  age_range: string | null;
  gender: string | null;
  looking_for: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
];

const AGE_RANGE_OPTIONS = [
  { value: "all", label: "All Ages" },
  { value: "18-25", label: "18-25" },
  { value: "26-35", label: "26-35" },
  { value: "36-45", label: "36-45" },
  { value: "46-55", label: "46-55" },
  { value: "55+", label: "55+" },
];

export const AdminSoulmatchWaitlist = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRoles();
  const [members, setMembers] = useState<SoulmateWaitlistMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<SoulmateWaitlistMember | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [updating, setUpdating] = useState(false);
  const membersPerPage = 10;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchWaitlist();
    }
  }, [isSuperAdmin]);

  const fetchWaitlist = async () => {
    try {
      const { data, error } = await supabase
        .from("soulmate_waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching soulmate waitlist:", error);
      toast({
        title: "Error",
        description: "Failed to load soulmate waitlist.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("soulmate_waitlist")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "✓ Status Updated",
        description: `Member status changed to ${newStatus}.`,
      });

      fetchWaitlist();
      if (selectedMember?.id === memberId) {
        setSelectedMember({ ...selectedMember, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update member status.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getDisplayName = (member: SoulmateWaitlistMember) => {
    if (member.first_name || member.last_name) {
      return `${member.first_name || ""} ${member.last_name || ""}`.trim();
    }
    if (member.email) {
      return member.email.split("@")[0];
    }
    return "Unknown User";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "contacted":
        return (
          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
            <Phone className="h-3 w-3 mr-1" />
            Contacted
          </Badge>
        );
      case "converted":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Converted
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  // Get unique cities for filter
  const uniqueCities = [...new Set(members.filter(m => m.city).map(m => m.city as string))].sort();

  // Filter members
  const filteredMembers = members.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      member.first_name?.toLowerCase().includes(searchLower) ||
      member.last_name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.city?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesAge = ageFilter === "all" || member.age_range === ageFilter;
    const matchesCity = cityFilter === "all" || member.city === cityFilter;

    return matchesSearch && matchesStatus && matchesAge && matchesCity;
  });

  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * membersPerPage,
    currentPage * membersPerPage
  );

  // Stats
  const pendingCount = members.filter(m => m.status === "pending").length;
  const contactedCount = members.filter(m => m.status === "contacted").length;
  const convertedCount = members.filter(m => m.status === "converted").length;

  const handleExport = () => {
    const csvData = [
      ["Name", "Email", "Phone", "City", "State", "Age Range", "Gender", "Looking For", "Status", "Notes", "Signed Up"],
      ...filteredMembers.map((m) => [
        getDisplayName(m),
        m.email || "",
        m.phone || "",
        m.city || "",
        m.state || "",
        m.age_range || "",
        m.gender || "",
        m.looking_for || "",
        m.status || "",
        m.notes || "",
        formatDate(m.created_at),
      ]),
    ];

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soulmate-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "✓ Export Complete",
      description: `Exported ${filteredMembers.length} waitlist members.`,
    });
  };

  if (!isSuperAdmin) {
    return (
      <GlowCard className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">
          Only Super Admins can view the SoulMatch waitlist.
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-semibold text-lg">SoulMatch Waitlist</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Users who have expressed interest in the SoulMatch feature. Contact them when ready to launch.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredMembers.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlowCard className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-sm text-muted-foreground">Total Interested</p>
            </div>
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <Heart className="h-5 w-5 text-pink-500" />
            </div>
          </div>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-blue-500">{contactedCount}</p>
          <p className="text-sm text-muted-foreground">Contacted</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">{convertedCount}</p>
          <p className="text-sm text-muted-foreground">Converted</p>
        </GlowCard>
      </div>

      {/* Filters */}
      <GlowCard className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or city..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ageFilter}
            onValueChange={(value) => {
              setAgeFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[130px]">
              <SelectValue placeholder="Age" />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={cityFilter}
            onValueChange={(value) => {
              setCityFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {uniqueCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Showing {filteredMembers.length} of {members.length} waitlist members
        </p>
      </GlowCard>

      {/* Members List */}
      <div className="space-y-2">
        {paginatedMembers.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No Waitlist Members</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || statusFilter !== "all" || ageFilter !== "all" || cityFilter !== "all"
                ? "Try adjusting your filters"
                : "Users interested in SoulMatch will appear here"}
            </p>
          </GlowCard>
        ) : (
          paginatedMembers.map((member) => (
            <GlowCard key={member.id} className="p-4 hover:border-pink-500/30 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-pink-500/10 rounded-full">
                    <Heart className="h-6 w-6 text-pink-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{getDisplayName(member)}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </span>
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {member.city && (
                        <span className="flex items-center gap-1 text-sm text-pink-500">
                          <MapPin className="h-3 w-3" />
                          {member.city}{member.state ? `, ${member.state}` : ""}
                        </span>
                      )}
                      {member.age_range && (
                        <Badge variant="outline" className="text-xs">
                          {member.age_range}
                        </Badge>
                      )}
                      {member.gender && (
                        <Badge variant="outline" className="text-xs">
                          {member.gender}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(member.status)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(member.created_at)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowDetailsDialog(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </GlowCard>
          ))
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

      {/* Member Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              {selectedMember ? getDisplayName(selectedMember) : "Member Details"}
            </DialogTitle>
            <DialogDescription>
              SoulMatch waitlist member details and contact information.
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4 mt-2">
              {/* Status Management */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Status</p>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedMember.status)}
                  <Select
                    value={selectedMember.status}
                    onValueChange={(value) => updateMemberStatus(selectedMember.id, value)}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Info */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Contact Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">First Name</p>
                    <p className="font-medium text-sm">{selectedMember.first_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Name</p>
                    <p className="font-medium text-sm">{selectedMember.last_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{selectedMember.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium text-sm">{selectedMember.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">City</p>
                    <p className="font-medium text-sm">{selectedMember.city || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">State</p>
                    <p className="font-medium text-sm">{selectedMember.state || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Preferences</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Age Range</p>
                    <p className="font-medium text-sm">{selectedMember.age_range || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="font-medium text-sm">{selectedMember.gender || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Looking For</p>
                    <p className="font-medium text-sm">{selectedMember.looking_for || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedMember.notes && (
                <div className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm">{selectedMember.notes}</p>
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Joined: {formatDate(selectedMember.created_at)}</span>
                {selectedMember.user_id && (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    Registered User
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
