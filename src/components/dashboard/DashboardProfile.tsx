import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Edit, Save, X, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const COMMUNICATION_OPTIONS = ["Text", "Email", "Phone", "Video Call", "In Person"];
const AVAILABILITY_OPTIONS = ["Weekday Mornings", "Weekday Afternoons", "Weekday Evenings", "Weekend Mornings", "Weekend Afternoons", "Weekend Evenings"];
const RELATIONSHIP_STATUS_OPTIONS = ["Single", "In a Relationship", "Married", "It's Complicated", "Prefer Not to Say"];

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender_identity: string | null;
  orientation: string | null;
  occupation: string | null;
  annual_income: string | null;
  communication_preference: "email" | "sms" | "both" | null;
  availability: Record<string, string[]> | null;
  id_verified?: boolean | null;
  id_verified_at?: string | null;
}

interface DashboardProfileProps {
  profile: ProfileData | null;
  userId: string;
  onProfileUpdate: (profile: ProfileData) => void;
  quizCommunicationOptions?: string[] | null;
  quizAvailabilityOptions?: string[] | null;
  quizRelationshipStatus?: string | null;
  quizDisability?: string | null;
}


export const DashboardProfile = ({ profile, userId, onProfileUpdate, quizCommunicationOptions, quizAvailabilityOptions, quizRelationshipStatus, quizDisability }: DashboardProfileProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [idVerified, setIdVerified] = useState<boolean>(false);
  const [idVerifiedAt, setIdVerifiedAt] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    phone: profile?.phone || "",
    city: profile?.city || "",
    state: profile?.state || "",
    zip_code: profile?.zip_code || "",
    address: profile?.address || "",
    date_of_birth: profile?.date_of_birth || "",
    gender_identity: profile?.gender_identity || "",
    orientation: profile?.orientation || "",
    occupation: profile?.occupation || "",
    annual_income: profile?.annual_income || "",
    communication_preference: profile?.communication_preference || "email",
  });
  // Multi-select state for communication options and availability
  const [selectedCommunication, setSelectedCommunication] = useState<string[]>(quizCommunicationOptions || []);
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>(
    (profile?.availability as Record<string, string[]> | null)?.meetup_times || quizAvailabilityOptions || []
  );
  const [relationshipStatus, setRelationshipStatus] = useState<string>(quizRelationshipStatus || "");
  const [disability, setDisability] = useState<string>(quizDisability || "");

  // Sync editForm when profile prop updates from parent
  useEffect(() => {
    if (profile && !isEditing) {
      setEditForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        city: profile.city || "",
        state: profile.state || "",
        zip_code: profile.zip_code || "",
        address: profile.address || "",
        date_of_birth: profile.date_of_birth || "",
        gender_identity: profile.gender_identity || "",
        orientation: profile.orientation || "",
        occupation: profile.occupation || "",
        annual_income: profile.annual_income || "",
        communication_preference: profile.communication_preference || "email",
      });
      setSelectedCommunication(quizCommunicationOptions || []);
      // Prefer profile.availability.meetup_times (admin-set), fall back to quiz open-ended responses
      const profileTimes = (profile.availability as Record<string, string[]> | null)?.meetup_times;
      setSelectedAvailability(profileTimes?.length ? profileTimes : quizAvailabilityOptions || []);
      setRelationshipStatus(quizRelationshipStatus || "");
      setDisability(quizDisability || "");
    }
  }, [profile, quizAvailabilityOptions, quizCommunicationOptions, quizRelationshipStatus, quizDisability]);

  useEffect(() => {
    fetchIdVerificationStatus();
  }, [userId]);

  const fetchIdVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id_verified, id_verified_at")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setIdVerified(data?.id_verified || false);
      setIdVerifiedAt(data?.id_verified_at || null);
    } catch (error) {
      console.error("Error fetching ID verification status:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Derive communication_preference enum from multi-select choices
      const hasEmail = selectedCommunication.includes("Email");
      const hasSms = selectedCommunication.includes("Text");
      const commPref: "email" | "sms" | "both" = (hasEmail && hasSms) ? "both" : hasSms ? "sms" : "email";

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name || null,
          last_name: editForm.last_name || null,
          phone: editForm.phone || null,
          city: editForm.city || null,
          state: editForm.state || null,
          zip_code: editForm.zip_code || null,
          address: editForm.address || null,
          date_of_birth: editForm.date_of_birth || null,
          gender_identity: editForm.gender_identity || null,
          orientation: editForm.orientation || null,
          occupation: editForm.occupation || null,
          annual_income: editForm.annual_income || null,
          communication_preference: commPref,
          availability: selectedAvailability.length > 0 ? { meetup_times: selectedAvailability } : null,
        })
        .eq("id", userId);

      if (error) throw error;

      // Sync profile edits back into quiz_progress so admin Quiz Demographics stays in sync
      const { data: existingProgress } = await supabase
        .from("quiz_progress")
        .select("open_ended_responses, demographics")
        .eq("id", userId)
        .single();

      const existingResponses = (existingProgress?.open_ended_responses as Record<string, unknown>) || {};
      const existingDemographics = (existingProgress?.demographics as Record<string, unknown>) || {};

      // Map profile fields → quiz demographics keys (camelCase as stored by the quiz)
      // The quiz stores gender as "sex" — sync both sex and genderIdentity for full compatibility
      const demographicsPatch: Record<string, unknown> = {
        ...existingDemographics,
        firstName:      editForm.first_name   || existingDemographics.firstName,
        lastName:       editForm.last_name    || existingDemographics.lastName,
        phone:          editForm.phone        || existingDemographics.phone,
        city:           editForm.city         || existingDemographics.city,
        state:          editForm.state        || existingDemographics.state,
        zipCode:        editForm.zip_code     || existingDemographics.zipCode,
        address:        editForm.address      || existingDemographics.address,
        dateOfBirth:    editForm.date_of_birth   || existingDemographics.dateOfBirth,
        // Quiz uses "sex" field; profile table uses "gender_identity" — keep both in sync
        sex:            editForm.gender_identity || existingDemographics.sex,
        genderIdentity: editForm.gender_identity || existingDemographics.genderIdentity,
        orientation:    editForm.orientation  || existingDemographics.orientation,
        occupation:     editForm.occupation   || existingDemographics.occupation,
        annualIncome:   editForm.annual_income || existingDemographics.annualIncome,
      };

      await supabase
        .from("quiz_progress")
        .update({
          demographics: demographicsPatch as Record<string, string>,
          open_ended_responses: {
            ...existingResponses,
            communication: selectedCommunication,
            availability: selectedAvailability,
            relationship_status: relationshipStatus || null,
            disability: disability || null,
          },
        })
        .eq("id", userId);

      onProfileUpdate({
        ...profile,
        ...editForm,
        communication_preference: commPref,
        availability: selectedAvailability.length > 0 ? { meetup_times: selectedAvailability } : null,
        email: profile?.email || null,
      } as ProfileData);
      
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* ID Verification Status */}
      <GlowCard className={`p-6 ${idVerified ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {idVerified ? (
              <ShieldCheck className="h-8 w-8 text-green-500" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            )}
            <div>
              <h3 className="text-lg font-display font-bold flex items-center gap-2">
                ID Verification
                <Badge className={idVerified ? "bg-green-500/20 text-green-600" : "bg-amber-500/20 text-amber-600"}>
                  {idVerified ? "Verified" : "Not Verified"}
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                {idVerified 
                  ? `Your identity was verified on ${idVerifiedAt ? new Date(idVerifiedAt).toLocaleDateString() : "N/A"}`
                  : "Your identity has not been verified yet. This is required to join events."}
              </p>
            </div>
          </div>
          {!idVerified && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                Submit your ID to an admin for verification
              </p>
            </div>
          )}
        </div>
      </GlowCard>

      <GlowCard className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-display font-bold">Personal Information</h2>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button variant="neon" size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} placeholder="First name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} placeholder="Last name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input id="date_of_birth" type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender_identity">Gender Identity</Label>
              <Select value={editForm.gender_identity} onValueChange={(v) => setEditForm({ ...editForm, gender_identity: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender identity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Non-binary">Non-binary</SelectItem>
                  <SelectItem value="Transgender Male">Transgender Male</SelectItem>
                  <SelectItem value="Transgender Female">Transgender Female</SelectItem>
                  <SelectItem value="Genderqueer">Genderqueer</SelectItem>
                  <SelectItem value="Prefer Not to Say">Prefer Not to Say</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orientation">Orientation</Label>
              <Select value={editForm.orientation} onValueChange={(v) => setEditForm({ ...editForm, orientation: v })}>
                <SelectTrigger><SelectValue placeholder="Select orientation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Straight / Heterosexual">Straight / Heterosexual</SelectItem>
                  <SelectItem value="Gay">Gay</SelectItem>
                  <SelectItem value="Lesbian">Lesbian</SelectItem>
                  <SelectItem value="Bisexual">Bisexual</SelectItem>
                  <SelectItem value="Pansexual">Pansexual</SelectItem>
                  <SelectItem value="Asexual">Asexual</SelectItem>
                  <SelectItem value="Prefer Not to Say">Prefer Not to Say</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} placeholder="Occupation" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_income">Annual Income</Label>
              <Select value={editForm.annual_income} onValueChange={(v) => setEditForm({ ...editForm, annual_income: v })}>
                <SelectTrigger><SelectValue placeholder="Select income range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Under $25,000">Under $25,000</SelectItem>
                  <SelectItem value="$25,000–$50,000">$25,000–$50,000</SelectItem>
                  <SelectItem value="$50,000–$75,000">$50,000–$75,000</SelectItem>
                  <SelectItem value="$75,000–$100,000">$75,000–$100,000</SelectItem>
                  <SelectItem value="$100,000–$150,000">$100,000–$150,000</SelectItem>
                  <SelectItem value="$150,000–$200,000">$150,000–$200,000</SelectItem>
                  <SelectItem value="Over $200,000">Over $200,000</SelectItem>
                  <SelectItem value="Prefer Not to Say">Prefer Not to Say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="City" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} placeholder="State" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip_code">Zip Code</Label>
              <Input id="zip_code" value={editForm.zip_code} onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })} placeholder="Zip code" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Preferred Communication</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {COMMUNICATION_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedCommunication.includes(opt)}
                      onCheckedChange={(checked) => {
                        setSelectedCommunication(checked
                          ? [...selectedCommunication, opt]
                          : selectedCommunication.filter((c) => c !== opt)
                        );
                      }}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Best Times Available for Meetups or Calls</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedAvailability.includes(opt)}
                      onCheckedChange={(checked) => {
                        setSelectedAvailability(checked
                          ? [...selectedAvailability, opt]
                          : selectedAvailability.filter((a) => a !== opt)
                        );
                      }}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship_status">Relationship Status</Label>
              <Select value={relationshipStatus} onValueChange={setRelationshipStatus}>
                <SelectTrigger><SelectValue placeholder="Select relationship status" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disability">Physical Disability Requirements</Label>
              <Input
                id="disability"
                value={disability}
                onChange={(e) => setDisability(e.target.value)}
                placeholder="Any physical disability requirements (optional)"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">First Name</p>
              <p className="font-medium">{profile?.first_name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Name</p>
              <p className="font-medium">{profile?.last_name || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone Number</p>
              <p className="font-medium">{profile?.phone || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {profile?.date_of_birth
                  ? (() => {
                      // Parse YYYY-MM-DD as local date to avoid UTC shift
                      const [y, m, d] = profile.date_of_birth.split("-");
                      return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString();
                    })()
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender Identity</p>
              <p className="font-medium">{profile?.gender_identity || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orientation</p>
              <p className="font-medium">{profile?.orientation || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Occupation</p>
              <p className="font-medium">{profile?.occupation || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Annual Income</p>
              <p className="font-medium">{profile?.annual_income || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{profile?.address || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p className="font-medium">{profile?.city || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">State</p>
              <p className="font-medium">{profile?.state || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zip Code</p>
              <p className="font-medium">{profile?.zip_code || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Communication Preference</p>
              {selectedCommunication.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedCommunication.map((opt) => (
                    <span key={opt} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">{opt}</span>
                  ))}
                </div>
              ) : (
                <p className="font-medium">Not set</p>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Best Times Available for Meetups or Calls</p>
              {selectedAvailability.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedAvailability.map((t: string) => (
                    <span key={t} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">{t}</span>
                  ))}
                </div>
              ) : (
                <p className="font-medium">Not set</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Relationship Status</p>
              <p className="font-medium">{relationshipStatus || "Not set"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Physical Disability Requirements</p>
              <p className="font-medium">{disability || "Not set"}</p>
            </div>
          </div>
        )}
      </GlowCard>
    </div>
  );
};
