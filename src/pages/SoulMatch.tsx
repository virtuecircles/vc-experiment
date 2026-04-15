import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Heart, Brain, Zap, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SoulMatch = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gender, setGender] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Honeypot: if filled, silently reject (bot)
    if (honeypot) {
      toast.success("You're on the waitlist! We'll notify you when SoulMatch AI launches.");
      return;
    }
    if (!firstName || !lastName || !email || !phone || !city || !state || !gender || !ageRange) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("soulmate_waitlist").insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        state,
        gender,
        age_range: ageRange,
        user_id: user?.id || null,
        status: "pending",
        honeypot: "",
      });

      // RLS will reject duplicate emails at DB level — surface friendly message
      if (error) {
        if (error.code === "42501" || error.message?.includes("row-level security")) {
          toast.info("You're already on the waitlist! We'll notify you when SoulMatch AI launches.");
          return;
        }
        throw error;
      }

      if (error) throw error;

      toast.success("You're on the waitlist! We'll notify you when SoulMatch AI launches.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCity("");
      setState("");
      setGender("");
      setAgeRange("");
    } catch (error) {
      console.error("Error joining waitlist:", error);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <Sparkles className="h-20 w-20 text-accent animate-float" />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6">
            <span className="gradient-text">SoulMatch AI</span>
          </h1>
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto mb-4">
            1:1 AI-Powered Matching for Deeper Connections
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Coming Soon - Join the waitlist for early access
          </p>
        </div>

        {/* How It Works */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <GlowCard className="p-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-display font-bold mb-3">Advanced AI Analysis</h3>
            <p className="text-muted-foreground">
              Our AI goes beyond basic matching, analyzing 100+ compatibility factors including
              virtue alignment, communication styles, and life goals.
            </p>
          </GlowCard>

          <GlowCard className="p-8 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-secondary" />
            <h3 className="text-2xl font-display font-bold mb-3">Deeper Compatibility</h3>
            <p className="text-muted-foreground">
              Move beyond group events to one-on-one connections with people who truly understand
              and complement your character.
            </p>
          </GlowCard>

          <GlowCard className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-accent" />
            <h3 className="text-2xl font-display font-bold mb-3">Unlimited Potential</h3>
            <p className="text-muted-foreground">
              No limits on matches. Connect with as many compatible people as you want, each
              carefully selected by our AI.
            </p>
          </GlowCard>
        </div>

        {/* Features Comparison */}
        <GlowCard className="p-8 mb-16">
          <h2 className="text-3xl font-display font-bold text-center mb-8">
            Virtue Circles vs <span className="gradient-text">SoulMatch AI</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-display font-bold mb-4">Virtue Circles (Circle Meetups)</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ Circles of 4-6 people</li>
                <li>✓ Monthly organized meetups</li>
                <li>✓ Great for social comfort</li>
                <li>✓ Lower initial commitment</li>
                <li>✓ Broader social network</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-display font-bold mb-4 gradient-text">
                SoulMatch AI (1:1)
              </h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>✓ One-on-one connections</li>
                <li>✓ Self-scheduled meetups</li>
                <li>✓ Deeper individual bonds</li>
                <li>✓ Higher compatibility matching</li>
                <li>✓ More intimate friendships</li>
              </ul>
            </div>
          </div>
        </GlowCard>

        {/* Waitlist Form */}
        <GlowCard className="p-12 max-w-2xl mx-auto bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-display font-bold mb-4">
              Join the <span className="gradient-text">Waitlist</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Be among the first to experience 1:1 AI matching when we launch
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-2"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-2"
                  maxLength={100}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2"
                maxLength={255}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2"
                maxLength={20}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Austin"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Select value={state} onValueChange={setState} required>
                  <SelectTrigger id="state" className="mt-2">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender *</Label>
                <Select value={gender} onValueChange={setGender} required>
                  <SelectTrigger id="gender" className="mt-2">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-Binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="age">Age Range *</Label>
                <Select value={ageRange} onValueChange={setAgeRange} required>
                  <SelectTrigger id="age" className="mt-2">
                    <SelectValue placeholder="Select age range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18-24">18-24</SelectItem>
                    <SelectItem value="25-34">25-34</SelectItem>
                    <SelectItem value="35-44">35-44</SelectItem>
                    <SelectItem value="45-54">45-54</SelectItem>
                    <SelectItem value="55-64">55-64</SelectItem>
                    <SelectItem value="65+">65+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">* All fields are required</p>

            <Button type="submit" variant="neon" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Join Waitlist
            </Button>
          </form>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-xs text-muted-foreground">On waitlist</div>
            </div>
            <div className="p-4 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-secondary">Q3 2026</div>
              <div className="text-xs text-muted-foreground">Expected launch</div>
            </div>
            <div className="p-4 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-accent">Beta</div>
              <div className="text-xs text-muted-foreground">Access first</div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
};

export default SoulMatch;
