import { useState, useEffect } from "react";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Percent, MapPin, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const sanitizeInput = (val: string | undefined, maxLen = 500): string =>
  (val ?? "").replace(/<[^>]*>/g, "").replace(/[^\w\s.,\-'@#&()/!?:]/g, " ").trim().slice(0, maxLen);

const normalizeEmail = (val: string): string => val.trim().toLowerCase().slice(0, 255);

const BecomePartner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    business_type: "",
    city: "",
    state: "",
    address: "",
    partnership_interest: "",
    additional_info: "",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot — silently fake success for bots
    if (honeypot.trim() !== "") {
      setSubmitted(true);
      return;
    }

    // Validate required fields
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.business_name.trim() || !form.contact_name.trim() || !form.email.trim() || !form.partnership_interest.trim()) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (!emailRegex.test(form.email.trim())) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("partner_applications").insert({
        user_id: user?.id || null,
        business_name: sanitizeInput(form.business_name, 200),
        contact_name: sanitizeInput(form.contact_name, 200),
        email: normalizeEmail(form.email),
        phone: form.phone.replace(/[^0-9+\-\s()]/g, "").slice(0, 20) || null,
        website: sanitizeInput(form.website, 500) || null,
        business_type: form.business_type || null,
        city: sanitizeInput(form.city, 100) || null,
        state: sanitizeInput(form.state, 50) || null,
        address: sanitizeInput(form.address, 300) || null,
        partnership_interest: sanitizeInput(form.partnership_interest, 2000),
        additional_info: sanitizeInput(form.additional_info, 2000) || null,
        honeypot: "",
        submitted_at: new Date().toISOString(),
      });

      if (error) {
        // Rate limited — duplicate email within 7 days
        if (error.code === "42501" || error.message?.toLowerCase().includes("rate") || error.message?.toLowerCase().includes("row-level")) {
          toast({
            title: "Application Already Received",
            description: "An application from this email was recently submitted. Our team will be in touch within 24–48 hours.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      setSubmitted(true);
      toast({ title: "🎉 Application Submitted!", description: "Thank you for your interest in partnering with Virtue Circles!" });
    } catch (error) {
      console.error("Error submitting partner application:", error);
      toast({ title: "Error", description: "Failed to submit application. Please try again.", variant: "destructive" });
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
              Partnership Inquiry <span className="gradient-text">Received!</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Thank you for your interest in partnering with Virtue Circles. Our partnerships team will review your inquiry and respond within 5–7 business days.
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
          <Building2 className="h-16 w-16 text-primary mx-auto mb-6 animate-float" />
          <h1 className="text-5xl font-display font-bold mb-4">
            Become a <span className="gradient-text">Partner</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Partner with Virtue Circles to host events, offer exclusive deals, and connect with an engaged community.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <GlowCard className="p-6 text-center">
            <Users className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-display font-bold mb-2">New Customers</h3>
            <p className="text-sm text-muted-foreground">
              Gain exposure to our growing community of engaged, values-driven members.
            </p>
          </GlowCard>
          <GlowCard className="p-6 text-center">
            <MapPin className="h-10 w-10 text-secondary mx-auto mb-3" />
            <h3 className="font-display font-bold mb-2">Host Events</h3>
            <p className="text-sm text-muted-foreground">
              Provide your venue for curated group experiences and 1:1 meetups.
            </p>
          </GlowCard>
          <GlowCard className="p-6 text-center">
            <Percent className="h-10 w-10 text-accent mx-auto mb-3" />
            <h3 className="font-display font-bold mb-2">Co-Marketing</h3>
            <p className="text-sm text-muted-foreground">
              Feature your brand across our platform, events, and member communications.
            </p>
          </GlowCard>
        </div>

        {/* Application Form */}
        <GlowCard className="p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold mb-6">Partnership Inquiry</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  maxLength={200}
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
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  maxLength={500}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="business_type">Business Type</Label>
                <Select value={form.business_type} onValueChange={(val) => setForm({ ...form, business_type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant / Bar</SelectItem>
                    <SelectItem value="cafe">Café / Coffee Shop</SelectItem>
                    <SelectItem value="event_space">Event Space</SelectItem>
                    <SelectItem value="wellness">Wellness / Fitness</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                maxLength={300}
              />
            </div>

            <div>
              <Label htmlFor="partnership_interest">How would you like to partner with us? *</Label>
              <Textarea
                id="partnership_interest"
                value={form.partnership_interest}
                onChange={(e) => setForm({ ...form, partnership_interest: e.target.value })}
                maxLength={2000}
                rows={4}
                placeholder="Hosting events, offering member discounts, co-marketing, etc."
                required
              />
            </div>

            <div>
              <Label htmlFor="additional_info">Additional Information</Label>
              <Textarea
                id="additional_info"
                value={form.additional_info}
                onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
                maxLength={2000}
                rows={3}
                placeholder="Anything else you'd like us to know..."
              />
            </div>

            {/* Honeypot — invisible to humans, bots will fill this in */}
            <input
              name="honeypot"
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
            />

            <Button type="submit" variant="neon" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Partnership Inquiry"}
            </Button>
          </form>
        </GlowCard>
      </div>
    </div>
  );
};

export default BecomePartner;
