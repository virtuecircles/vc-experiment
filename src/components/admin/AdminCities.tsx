import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  Trash2,
  Calendar,
} from "lucide-react";

interface City {
  id: string;
  name: string;
  state: string;
  is_active: boolean;
  launched_at: string | null;
  created_at: string;
}

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

export const AdminCities = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRoles();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCity, setNewCity] = useState({ name: "", state: "" });

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .order("state", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error("Error fetching cities:", error);
      toast({
        title: "Error",
        description: "Failed to load cities.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCity = async () => {
    if (!newCity.name || !newCity.state) {
      toast({
        title: "Error",
        description: "Please enter city name and state.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("cities").insert({
        name: newCity.name,
        state: newCity.state,
        is_active: false,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "City Already Exists",
            description: `${newCity.name}, ${newCity.state} is already in the list.`,
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "✓ City Added",
        description: `${newCity.name}, ${newCity.state} has been added.`,
      });

      setShowAddDialog(false);
      setNewCity({ name: "", state: "" });
      fetchCities();
    } catch (error) {
      console.error("Error adding city:", error);
      toast({
        title: "Error",
        description: "Failed to add city.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (city: City) => {
    try {
      const newActiveState = !city.is_active;
      const { error } = await supabase
        .from("cities")
        .update({
          is_active: newActiveState,
          launched_at: newActiveState ? new Date().toISOString() : null,
        })
        .eq("id", city.id);

      if (error) throw error;

      // When activating a city, notify all waitlisted members in that city
      if (newActiveState) {
        const { data: waitlistMembers } = await supabase
          .from("profiles")
          .select("email, first_name")
          .eq("city_id", city.id)
          .not("email", "is", null);

        if (waitlistMembers && waitlistMembers.length > 0) {
          const recipients = waitlistMembers
            .filter((m) => m.email)
            .map((m) => ({ email: m.email!, name: m.first_name || undefined }));

          if (recipients.length > 0) {
            await supabase.functions.invoke("send-notification-email", {
              body: {
                recipients,
                subject: `🎉 Virtue Circles is now live in ${city.name}, ${city.state}!`,
                title: `Your city is now active!`,
                body: `Great news! Virtue Circles has officially launched in ${city.name}, ${city.state}.\n\nYou can now log in to your account, explore membership plans, and start your journey toward meaningful connections and character growth.\n\nWelcome to the community!`,
                type: "auto",
                cta_url: "https://virtue-circles.com/plans",
                cta_label: "Explore Plans",
                email_type: "city_launch",
              },
            });

            toast({
              title: "✓ City Activated",
              description: `${city.name}, ${city.state} is now active. Notified ${recipients.length} waitlisted member${recipients.length !== 1 ? "s" : ""}.`,
            });
          } else {
            toast({
              title: "✓ City Activated",
              description: `${city.name}, ${city.state} is now active.`,
            });
          }
        } else {
          toast({
            title: "✓ City Activated",
            description: `${city.name}, ${city.state} is now active.`,
          });
        }
      } else {
        toast({
          title: "City Deactivated",
          description: `${city.name}, ${city.state} is now inactive.`,
        });
      }

      fetchCities();
    } catch (error) {
      console.error("Error toggling city:", error);
      toast({
        title: "Error",
        description: "Failed to update city status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCity = async () => {
    if (!selectedCity) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("cities")
        .delete()
        .eq("id", selectedCity.id);

      if (error) throw error;

      toast({
        title: "✓ City Deleted",
        description: `${selectedCity.name}, ${selectedCity.state} has been removed.`,
      });

      setShowDeleteDialog(false);
      setSelectedCity(null);
      fetchCities();
    } catch (error) {
      console.error("Error deleting city:", error);
      toast({
        title: "Error",
        description: "Failed to delete city. It may be in use.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredCities = cities.filter((city) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      city.name.toLowerCase().includes(searchLower) ||
      city.state.toLowerCase().includes(searchLower)
    );
  });

  const activeCities = cities.filter((c) => c.is_active).length;

  if (!isSuperAdmin) {
    return (
      <GlowCard className="p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm text-muted-foreground mt-1">
          Only Super Admins can manage cities.
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
          <h2 className="font-display font-semibold text-lg">City Management</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Manage cities where Virtue Circles is active. Users in inactive cities cannot complete the quiz.</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add City
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <GlowCard className="p-4">
          <p className="text-2xl font-bold">{cities.length}</p>
          <p className="text-sm text-muted-foreground">Total Cities</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-green-500">{activeCities}</p>
          <p className="text-sm text-muted-foreground">Active Cities</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-2xl font-bold text-muted-foreground">{cities.length - activeCities}</p>
          <p className="text-sm text-muted-foreground">Pending Launch</p>
        </GlowCard>
      </div>

      {/* Search */}
      <GlowCard className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </GlowCard>

      {/* Cities List */}
      <div className="space-y-2">
        {filteredCities.length === 0 ? (
          <GlowCard className="p-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium">No cities found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add cities where Virtue Circles will be active.
            </p>
          </GlowCard>
        ) : (
          filteredCities.map((city) => (
            <GlowCard key={city.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${city.is_active ? "bg-green-500/10" : "bg-muted"}`}>
                    <MapPin className={`h-5 w-5 ${city.is_active ? "text-green-500" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-semibold">{city.name}, {city.state}</p>
                    {city.is_active && city.launched_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Launched: {formatDate(city.launched_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={city.is_active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}>
                    {city.is_active ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  <Switch
                    checked={city.is_active}
                    onCheckedChange={() => handleToggleActive(city)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCity(city);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </GlowCard>
          ))
        )}
      </div>

      {/* Add City Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Add New City
            </DialogTitle>
            <DialogDescription>
              Add a city where Virtue Circles will be available.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>City Name</Label>
              <Input
                value={newCity.name}
                onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
                placeholder="e.g., Nashville"
                className="mt-1"
              />
            </div>

            <div>
              <Label>State</Label>
              <Select
                value={newCity.state}
                onValueChange={(value) => setNewCity({ ...newCity, state: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCity} disabled={saving}>
              {saving ? "Adding..." : "Add City"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete City
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedCity?.name}, {selectedCity?.state}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCity(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCity}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? "Deleting..." : "Delete City"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
