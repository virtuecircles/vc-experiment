import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Search,
  CalendarIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface PiiLogEntry {
  id: string;
  accessed_by: string;
  accessed_by_role: string | null;
  member_id: string | null;
  fields_accessed: string[] | null;
  access_type: string;
  ip_address: string | null;
  accessed_at: string;
  // Joined display names
  accessor_name?: string;
  member_name?: string;
}

type SortField = "accessed_at" | "accessor_name" | "member_name" | "access_type" | "accessed_by_role";
type SortDir = "asc" | "desc";

const ACCESS_TYPE_COLORS: Record<string, string> = {
  profile_view: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pii_view:     "bg-amber-500/20 text-amber-400 border-amber-500/30",
  system_test:  "bg-muted text-muted-foreground border-border",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  vc_manager:  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin:       "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function AdminPiiLog() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<PiiLogEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchAdmin, setSearchAdmin] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Sorting
  const [sortField, setSortField] = useState<SortField>("accessed_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("pii_access_log")
        .select("*")
        .order("accessed_at", { ascending: false })
        .limit(500);

      if (dateFrom) query = query.gte("accessed_at", startOfDay(dateFrom).toISOString());
      if (dateTo)   query = query.lte("accessed_at", endOfDay(dateTo).toISOString());

      const { data, error } = await query;
      if (error) throw error;

      // Collect unique user IDs (accessors + members)
      const allIds = new Set<string>();
      (data || []).forEach((row) => {
        allIds.add(row.accessed_by);
        if (row.member_id) allIds.add(row.member_id);
      });

      // Fetch display names in one query
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", Array.from(allIds));

      const nameMap: Record<string, string> = {};
      (profileData || []).forEach((p) => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || p.id;
        nameMap[p.id] = name;
      });
      setProfiles(nameMap);

      const enriched: PiiLogEntry[] = (data || []).map((row) => ({
        ...row,
        accessor_name: nameMap[row.accessed_by] ?? row.accessed_by,
        member_name: row.member_id ? (nameMap[row.member_id] ?? row.member_id) : "—",
      }));

      setLogs(enriched);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load access log", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Client-side filter + sort
  const filtered = logs
    .filter((row) => {
      if (searchAdmin) {
        const q = searchAdmin.toLowerCase();
        if (
          !row.accessor_name?.toLowerCase().includes(q) &&
          !row.accessed_by.toLowerCase().includes(q)
        ) return false;
      }
      if (filterRole !== "all" && row.accessed_by_role !== filterRole) return false;
      if (filterType !== "all" && row.access_type !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      let av: string = "";
      let bv: string = "";
      if (sortField === "accessed_at") { av = a.accessed_at; bv = b.accessed_at; }
      else if (sortField === "accessor_name") { av = a.accessor_name ?? ""; bv = b.accessor_name ?? ""; }
      else if (sortField === "member_name") { av = a.member_name ?? ""; bv = b.member_name ?? ""; }
      else if (sortField === "access_type") { av = a.access_type; bv = b.access_type; }
      else if (sortField === "accessed_by_role") { av = a.accessed_by_role ?? ""; bv = b.accessed_by_role ?? ""; }
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />;
  };

  const clearFilters = () => {
    setSearchAdmin("");
    setFilterRole("all");
    setFilterType("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = searchAdmin || filterRole !== "all" || filterType !== "all" || dateFrom || dateTo;

  const uniqueTypes = Array.from(new Set(logs.map((l) => l.access_type)));

  return (
    <div className="space-y-4 relative z-0 isolate min-w-0 w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">PII Access Log</h2>
          <Badge variant="outline" className="text-xs">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Admin name search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by admin name…"
            value={searchAdmin}
            onChange={(e) => setSearchAdmin(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Role filter */}
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="vc_manager">VC Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        {/* Access type filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {uniqueTypes.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date From */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm font-normal gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-sm font-normal gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading access log…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Eye className="h-8 w-8 opacity-30" />
          <p className="text-sm">
            {hasActiveFilters ? "No entries match your filters." : "No PII access events recorded yet."}
          </p>
          <p className="text-xs opacity-70">
            Entries appear when an admin views a member profile.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort("accessed_at")}
                  >
                    <div className="flex items-center gap-1">
                      Timestamp <SortIcon field="accessed_at" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("accessor_name")}
                  >
                    <div className="flex items-center gap-1">
                      Admin <SortIcon field="accessor_name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("accessed_by_role")}
                  >
                    <div className="flex items-center gap-1">
                      Role <SortIcon field="accessed_by_role" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("member_name")}
                  >
                    <div className="flex items-center gap-1">
                      Member Accessed <SortIcon field="member_name" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("access_type")}
                  >
                    <div className="flex items-center gap-1">
                      Type <SortIcon field="access_type" />
                    </div>
                  </TableHead>
                  <TableHead>Fields Viewed</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id} className="text-sm">
                    <TableCell className="whitespace-nowrap text-muted-foreground font-mono text-xs">
                      {format(new Date(row.accessed_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {row.accessor_name}
                    </TableCell>
                    <TableCell>
                      {row.accessed_by_role ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            ROLE_COLORS[row.accessed_by_role] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {row.accessed_by_role.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.member_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs capitalize",
                          ACCESS_TYPE_COLORS[row.access_type] ?? "bg-muted text-muted-foreground"
                        )}
                      >
                        {row.access_type.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.fields_accessed && row.fields_accessed.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {row.fields_accessed.map((f) => (
                            <Badge key={f} variant="secondary" className="text-xs font-mono">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {row.ip_address ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {filtered.length} of {logs.length} total entries (latest 500 loaded)
        </p>
      )}
    </div>
  );
}
