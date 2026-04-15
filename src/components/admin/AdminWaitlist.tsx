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
  Clock,
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
} from "lucide-react";

interface City {
  id: string;
  name: string;
  state: string;
  is_active: boolean;
}

interface WaitlistMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  city_id: string | null;
  created_at: string;
  cityInfo?: City;
}

export const AdminWaitlist = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRoles();
  const [members, setMembers] = useState<WaitlistMember[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<WaitlistMember | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const membersPerPage = 10;

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    try {
      // Fetch all cities first
      const { data: citiesData, error: citiesError } = await supabase
        .from("cities")
        .select("*")
        .order("state", { ascending: true })
        .order("name", { ascending: true });

      if (citiesError) throw citiesError;
      setCities(citiesData || []);

      // Get inactive city IDs
      const inactiveCityIds = (citiesData || [])
        .filter((c) => !c.is_active)
        .map((c) => c.id);

      if (inactiveCityIds.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch profiles that have selected an inactive city
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, phone, address, city, state, zip_code, city_id, created_at")
        .in("city_id", inactiveCityIds)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Map city info to members
      const membersWithCity: WaitlistMember[] = (profilesData || []).map((p) => ({
        ...p,
        cityInfo: citiesData?.find((c) => c.id === p.city_id),
      }));

      setMembers(membersWithCity);
    } catch (error) {
      console.error("Error fetching waitlist:", error);
      toast({
        title: "Error",
        description: "Failed to load waitlist members.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (member: WaitlistMember) => {
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

  // Get unique inactive cities for filter
  const inactiveCities = cities.filter((c) => !c.is_active);

  // Filter members
  const filteredMembers = members.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      member.first_name?.toLowerCase().includes(searchLower) ||
      member.last_name?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower) ||
      member.phone?.toLowerCase().includes(searchLower) ||
      member.cityInfo?.name.toLowerCase().includes(searchLower);

    const matchesCity = cityFilter === "all" || member.city_id === cityFilter;

    return matchesSearch && matchesCity;
  });

  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * membersPerPage,
    currentPage * membersPerPage
  );

  // Group by city for stats
  const membersByCity = inactiveCities.map((city) => ({
    city,
    count: members.filter((m) => m.city_id === city.id).length,
  })).filter((item) => item.count > 0);

  const handleExport = () => {
    const csvData = [
      ["Name", "Email", "Phone", "City", "State", "Address", "Zip Code", "Signed Up"],
      ...filteredMembers.map((m) => [
        getDisplayName(m),
        m.email || "",
        m.phone || "",
        m.cityInfo?.name || m.city || "",
        m.cityInfo?.state || m.state || "",
        m.address || "",
        m.zip_code || "",
        formatDate(m.created_at),
      ]),
    ];

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split("T")[0]}.csv`;
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
          Only Super Admins can view the waitlist.
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
          <h2 className="font-display font-semibold text-lg">Waitlist Members</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Users who signed up from inactive cities. Contact them when their city launches.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredMembers.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats by City */}
      {membersByCity.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlowCard className="p-4">
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-sm text-muted-foreground">Total Waitlist Members</p>
          </GlowCard>
          {membersByCity.slice(0, 3).map(({ city, count }) => (
            <GlowCard key={city.id} className="p-4">
              <p className="text-2xl font-bold text-amber-500">{count}</p>
              <p className="text-sm text-muted-foreground truncate">{city.name}, {city.state}</p>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Search & Filters */}
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
            value={cityFilter}
            onValueChange={(value) => {
              setCityFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by city" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {inactiveCities.map((city) => (
                <SelectItem key={city.id} value={city.id}>
                  {city.name}, {city.state}
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
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No Waitlist Members</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm || cityFilter !== "all"
                ? "Try adjusting your filters"
                : "Users from inactive cities will appear here"}
            </p>
          </GlowCard>
        ) : (
          paginatedMembers.map((member) => (
            <GlowCard key={member.id} className="p-4 hover:border-amber-500/30 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-500/10 rounded-full">
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{getDisplayName(member)}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {member.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </span>
                      )}
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </span>
                      )}
                    </div>
                    {member.cityInfo && (
                      <div className="flex items-center gap-1 mt-1 text-sm">
                        <MapPin className="h-3 w-3 text-amber-500" />
                        <span className="text-amber-500 font-medium">
                          {member.cityInfo.name}, {member.cityInfo.state}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                    <Clock className="h-3 w-3 mr-1" />
                    Waiting
                  </Badge>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-amber-500" />
              Waitlist Member Details
            </DialogTitle>
            <DialogDescription>
              Contact information for {selectedMember ? getDisplayName(selectedMember) : "this member"}
            </DialogDescription>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{getDisplayName(selectedMember)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Signed Up</p>
                  <p className="font-medium">{formatDate(selectedMember.created_at)}</p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedMember.email && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a href={`mailto:${selectedMember.email}`} className="font-medium text-primary hover:underline">
                        {selectedMember.email}
                      </a>
                    </div>
                  </div>
                )}

                {selectedMember.phone && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <a href={`tel:${selectedMember.phone}`} className="font-medium text-primary hover:underline">
                        {selectedMember.phone}
                      </a>
                    </div>
                  </div>
                )}

                {selectedMember.cityInfo && (
                  <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <MapPin className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Waiting for City</p>
                      <p className="font-medium text-amber-500">
                        {selectedMember.cityInfo.name}, {selectedMember.cityInfo.state}
                      </p>
                    </div>
                  </div>
                )}

                {selectedMember.address && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">
                        {selectedMember.address}
                        {selectedMember.city && `, ${selectedMember.city}`}
                        {selectedMember.state && `, ${selectedMember.state}`}
                        {selectedMember.zip_code && ` ${selectedMember.zip_code}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
