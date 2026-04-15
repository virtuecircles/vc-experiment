import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Heart, Shield, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BecomeGuide = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    why_guide: "",
    experience: "",
    availability: "",
    linkedin_url: "",
    honeypot: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pre-fill from user profile if logged in
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone, city, state")
        .eq("id", user.id)
        .single();
      if (data) {
        setForm((prev) => ({
          ...prev,
          first_name: data.first_name || prev.first_name,
          last_name: data.last_name || prev.last_name,
          email: data.email || user.email || prev.email,
          phone: data.phone || prev.phone,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }));
      }
    };
    fetchProfile();
  }, [user]);

  const sanitizeInput = (val: string | undefined): string =>
    (val || "").replace(/[<>"'&]/g, "").trim();

  const normalizeEmail = (val: string): string =>
    (val || "").toLowerCase().trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // HONEYPOT CHECK — silently fake success for bots
    if (form.honeypot && form.honeypot.trim() !== "") {
      setSubmitted(true);
      return;
    }

    const sanitized = {
      first_name: sanitizeInput(form.first_name).slice(0, 100),
      last_name: sanitizeInput(form.last_name).slice(0, 100),
      email: normalizeEmail(form.email).slice(0, 255),
      phone: form.phone?.replace(/[^0-9+\-\s()]/g, "").slice(0, 20) || null,
      city: sanitizeInput(form.city).slice(0, 100) || null,
      state: sanitizeInput(form.state).slice(0, 50) || null,
      why_guide: sanitizeInput(form.why_guide).slice(0, 2000),
      experience: sanitizeInput(form.experience).slice(0, 2000) || null,
      availability: form.availability || null,
      linkedin_url: sanitizeInput(form.linkedin_url).slice(0, 500) || null,
      honeypot: "",
      submitted_at: new Date().toISOString(),
    };

    if (!sanitized.first_name || !sanitized.last_name) {
      toast({ title: "Missing Fields", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!sanitized.email) {
      toast({ title: "Missing Fields", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized.email)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (!sanitized.why_guide) {
      toast({ title: "Missing Fields", description: "Please tell us why you want to be a VC Guide.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("guide_applications").insert({
        user_id: user?.id || null,
        ...sanitized,
      });

      if (error) {
        if (error.code === "42501" || error.message?.includes("policy") || error.message?.includes("rate")) {
          toast({
            title: "Application Already Received",
            description: "An application from this email was recently submitted. If you haven't heard back within 30 days, you're welcome to apply again.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting guide application:", error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again or email hello@virtue-circles.com",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <GlowCard className="p-12">
            <div className="w-16 h-16 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">
              Application <span className="gradient-text">Received!</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Thank you for applying to become a Virtue Circles Guide. Our team will review your application and reach out within 5–7 business days.
            </p>
            <p className="text-sm text-muted-foreground">
              In the meantime, explore our community and attend an event as a member.
            </p>
          </GlowCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <Users className="h-16 w-16 text-primary mx-auto mb-6 animate-float" />
          <h1 className="text-5xl font-display font-bold mb-4">
            Become a <span className="gradient-text">VC Guide</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Lead curated group experiences and help others build meaningful friendships through shared virtues.
          </p>
        </div>

        {/* What Guides Do */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <GlowCard className="p-6 text-center">
            <Heart className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-display font-bold mb-2">Facilitate Events</h3>
            <p className="text-sm text-muted-foreground">
              Lead 2 guided sessions per month at curated local venues.
            </p>
          </GlowCard>
          <GlowCard className="p-6 text-center">
            <Shield className="h-10 w-10 text-secondary mx-auto mb-3" />
            <h3 className="font-display font-bold mb-2">Create Safe Spaces</h3>
            <p className="text-sm text-muted-foreground">
              Ensure every participant feels welcome, respected, and heard.
            </p>
          </GlowCard>
          <GlowCard className="p-6 text-center">
            <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
            <h3 className="font-display font-bold mb-2">Earn Rewards</h3>
            <p className="text-sm text-muted-foreground">
              Receive compensation, free membership, and exclusive perks.
            </p>
          </GlowCard>
        </div>

        {/* Application Form */}
        <GlowCard className="p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold mb-6">Apply to Be a Guide</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={255}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={20}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="why_guide">Why do you want to be a VC Guide? *</Label>
              <Textarea
                id="why_guide"
                value={form.why_guide}
                onChange={(e) => setForm({ ...form, why_guide: e.target.value })}
                maxLength={2000}
                rows={4}
                placeholder="Tell us about your passion for building community..."
                required
              />
            </div>

            <div>
              <Label htmlFor="experience">Relevant Experience</Label>
              <Textarea
                id="experience"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                maxLength={2000}
                rows={3}
                placeholder="Group facilitation, coaching, community leadership, etc."
              />
            </div>

            <div>
              <Label htmlFor="availability">Availability</Label>
              <Select value={form.availability} onValueChange={(val) => setForm({ ...form, availability: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekday_evenings">Weekday Evenings</SelectItem>
                  <SelectItem value="weekends">Weekends</SelectItem>
                  <SelectItem value="both">Both Weekdays & Weekends</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="linkedin_url">LinkedIn Profile (optional)</Label>
              <Input
                id="linkedin_url"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                maxLength={500}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            {/* HONEYPOT — invisible to humans, bots will fill this in */}
            <input
              name="honeypot"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={form.honeypot}
              onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
            />

            <Button
              type="submit"
              variant="neon"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </GlowCard>
      </div>
    </div>
  );
};

export default BecomeGuide;
