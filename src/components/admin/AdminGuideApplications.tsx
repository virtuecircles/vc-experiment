import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, CheckCircle, XCircle, Clock } from "lucide-react";

interface GuideApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  why_guide: string;
  experience: string | null;
  availability: string | null;
  linkedin_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export const AdminGuideApplications = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<GuideApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<GuideApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("guide_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching guide applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("guide_applications")
        .update({ status, admin_notes: adminNotes || null, reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast({ title: `Application ${status}` });
      setSelectedApp(null);
      fetchApplications();
    } catch (error) {
      toast({ title: "Error updating application", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filtered = applications.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(q) ||
      a.last_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.city || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold">Guide Applications ({applications.length})</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applications..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No applications found</TableCell>
              </TableRow>
            ) : (
              filtered.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">{app.first_name} {app.last_name}</TableCell>
                  <TableCell className="text-sm">{app.email}</TableCell>
                  <TableCell className="text-sm">{app.city}{app.state ? `, ${app.state}` : ""}</TableCell>
                  <TableCell>{statusBadge(app.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedApp(app); setAdminNotes(app.admin_notes || ""); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guide Application – {selectedApp?.first_name} {selectedApp?.last_name}</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Email:</span> {selectedApp.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedApp.phone || "—"}</div>
                <div><span className="text-muted-foreground">Location:</span> {selectedApp.city}{selectedApp.state ? `, ${selectedApp.state}` : ""}</div>
                <div><span className="text-muted-foreground">Availability:</span> {selectedApp.availability || "—"}</div>
                {selectedApp.linkedin_url && (
                  <div className="col-span-2"><span className="text-muted-foreground">LinkedIn:</span> <a href={selectedApp.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{selectedApp.linkedin_url}</a></div>
                )}
              </div>

              <div>
                <p className="text-sm font-bold mb-1">Why they want to be a guide:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedApp.why_guide}</p>
              </div>

              {selectedApp.experience && (
                <div>
                  <p className="text-sm font-bold mb-1">Experience:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedApp.experience}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-bold mb-1">Admin Notes:</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => updateStatus(selectedApp.id, "approved")}
                  disabled={updating}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => updateStatus(selectedApp.id, "rejected")}
                  disabled={updating}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
