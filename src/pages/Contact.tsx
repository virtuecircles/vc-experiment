import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const sanitize = (input: string, max = 2000): string =>
    input.trim().replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').substring(0, max);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: silently succeed if filled (bot)
    if (honeypot) {
      toast.success("Message sent! We'll get back to you within 24 to 48 hours.");
      return;
    }

    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const sanitized = {
        name: sanitize(formData.name, 100),
        email: formData.email.trim().toLowerCase(),
        subject: sanitize(formData.subject, 200),
        message: sanitize(formData.message, 2000),
        honeypot,
      };
      const { error, data } = await supabase.functions.invoke('send-contact-email', {
        body: sanitized,
      });

      // Handle server-side rate limit
      if (error && (error as { status?: number }).status === 429) {
        toast.error("You've sent too many messages. Please wait an hour before trying again.");
        return;
      }

      if (error) throw error;

      toast.success("Message sent! We'll get back to you within 24 to 48 hours.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error("Failed to send message. Please try emailing us directly at hello@virtue-circles.com");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Have questions? We'd love to hear from you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-4">
          <GlowCard className="p-6 text-center">
            <Mail className="h-10 w-10 mx-auto mb-3 text-primary" />
            <h3 className="font-display font-bold mb-2">Email</h3>
            <p className="text-sm text-muted-foreground">
              <a href="mailto:hello@virtue-circles.com" className="hover:text-primary transition-colors">
                hello@virtue-circles.com
              </a>
            </p>
          </GlowCard>

          <GlowCard className="p-6 text-center">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-accent" />
            <h3 className="font-display font-bold mb-2">Location</h3>
            <p className="text-sm text-muted-foreground">Austin, TX</p>
          </GlowCard>
        </div>

        <p className="text-sm text-muted-foreground text-center mb-8">
          Have a question? We respond within 24 to 48 hours.
        </p>

        <GlowCard className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot field — hidden from real users, catches bots */}
            <div style={{ display: "none" }} aria-hidden="true">
              <label htmlFor="website_url">Website</label>
              <input
                id="website_url"
                name="website_url"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2 w-full"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-2 w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="mt-2 w-full"
              />
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="mt-2 w-full"
              />
            </div>

            <Button type="submit" variant="neon" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </GlowCard>
      </div>
    </div>
  );
};

export default Contact;
