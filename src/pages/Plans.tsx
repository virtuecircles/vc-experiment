import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { trackPlanSelected, trackCheckoutInitiated, metaTrackPlansViewed, metaTrackMembershipSelected, metaTrackPurchase } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlowCard } from "@/components/GlowCard";
import { Check, Sparkles, Loader2, CreditCard, Heart, Tag, X, Copy, FlaskConical, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useGlobalLoading } from "@/hooks/useGlobalLoading";
import { supabase } from "@/integrations/supabase/client";

const Plans = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const [cityActive, setCityActive] = useState<boolean | null>(null);
  const { 
    subscribed, 
    subscriptionTier, 
    loading: subscriptionLoading,
    createCheckout,
    openCustomerPortal,
    checkSubscription
  } = useSubscription();

  const { startLoading, stopLoading } = useGlobalLoading();

  // Check if the user's city is active
  useEffect(() => {
    if (!user) { setCityActive(null); return; }
    const checkCity = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("city_id")
        .eq("id", user.id)
        .single();
      if (!profile?.city_id) { setCityActive(true); return; } // no city set = no restriction
      const { data: city } = await supabase
        .from("cities")
        .select("is_active")
        .eq("id", profile.city_id)
        .single();
      setCityActive(city?.is_active ?? true);
    };
    checkCity();
  }, [user]);

  // Scroll to top on mount + Meta Pixel ViewContent
  useEffect(() => {
    window.scrollTo(0, 0);
    metaTrackPlansViewed();
  }, []);

  // Auto-trigger checkout if user just logged in with a pending plan selection
  useEffect(() => {
    if (!user || subscriptionLoading) return;
    
    const pendingPlan = sessionStorage.getItem("selectedPlan") as "virtue_circles" | "virtue_circles_annual" | "founding_100" | null;
    if (pendingPlan) {
      const pendingPromo = sessionStorage.getItem("selectedPromoCode") || undefined;
      // Clear stored plan before triggering to prevent loops
      sessionStorage.removeItem("selectedPlan");
      sessionStorage.removeItem("selectedPromoCode");
      
      // Set billing period to match saved plan
      if (pendingPlan === "virtue_circles_annual") {
        setBillingPeriod("annual");
      } else if (pendingPlan === "virtue_circles") {
        setBillingPeriod("monthly");
      }
      
      // Auto-trigger checkout
      startLoading();
      createCheckout(pendingPlan, pendingPromo).catch((error) => {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to start checkout",
          variant: "destructive",
        });
      }).finally(() => stopLoading());
    }
  }, [user, subscriptionLoading]);

  // Handle URL params for subscription status
  useEffect(() => {
    const subscriptionStatus = searchParams.get("subscription");
    if (subscriptionStatus === "success") {
      toast({
        title: "🎉 Subscription Activated!",
        description: "Welcome to Virtue Circles! Your membership is now active.",
      });
      checkSubscription();
    } else if (subscriptionStatus === "canceled") {
      toast({
        title: "Subscription Canceled",
        description: "Your subscription checkout was canceled.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, checkSubscription]);

  const handleSubscribe = async (priceType: "virtue_circles" | "virtue_circles_annual" | "founding_100", overridePromoCode?: string) => {
    const effectivePromo = overridePromoCode ?? promoCode;

    trackPlanSelected(priceType, billingPeriod);
    metaTrackMembershipSelected(100, "USD");

    // Block waitlisted users (inactive city) from purchasing
    if (user && cityActive === false) {
      toast({
        title: "City Not Yet Active",
        description: "Your city is not yet active. Plans will become available once your city launches.",
        variant: "destructive",
      });
      return;
    }

    // Block subscribed users from signing up again
    if (subscribed) {
      toast({
        title: "Already Subscribed",
        description: "You already have an active subscription. Please manage it from your dashboard.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      // Store selected plan in sessionStorage so it persists through auth flow
      sessionStorage.setItem("selectedPlan", priceType);
      if (effectivePromo) {
        sessionStorage.setItem("selectedPromoCode", effectivePromo);
      }
      navigate("/auth?redirect=plans&plan=" + priceType);
      return;
    }

    try {
      startLoading();
      trackCheckoutInitiated(priceType);
      metaTrackPurchase(100, "USD");
      await createCheckout(priceType, effectivePromo || undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      stopLoading();
    }
  };

  const handleManageSubscription = async () => {
    try {
      startLoading();
      await openCustomerPortal();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open portal",
        variant: "destructive",
      });
    } finally {
      stopLoading();
    }
  };

  const monthlyPrice = 100;
  const annualPrice = 900; // $900/year = 25% off $1200
  const annualMonthly = Math.round(annualPrice / 12);

  const plans = [
    {
      name: "Pathfinder",
      price: "Free",
      description: "Explore the platform and discover your virtue profile",
      features: [
        "1 complimentary meetup",
        "Virtue quiz access",
        "Internal profile setup",
        "Placement in city waitlist",
        "Attend a free guided meetup",
      ],
      cta: "Get Started",
      variant: "outline" as const,
      priceType: null,
      isPathfinder: true,
    },
    {
      name: "Virtue Circles",
      price: billingPeriod === "monthly" ? `$${monthlyPrice}` : `$${annualMonthly}`,
      period: billingPeriod === "monthly" ? "/month" : "/month, billed annually",
      annualTotal: billingPeriod === "annual" ? `$${annualPrice}/year` : null,
      description: "Join curated circle meetups based on shared virtues",
      features: [
        "Virtue quiz access",
        "2 Virtue-guided meetups per month",
        "Switch circles once per month (Recommended: 6 sessions for stronger friendships) *",
        "Internal profile setup",
        "Chat with circle members (Upcoming Feature)",
        "Eligible for SoulMatch (1:1)",
        "Meetup history access",
        "Customized virtue-based grouping",
        "Priority access to new features",
        "Venue partner discounts on food & beverages *",
        "Referral discount: 10% off your next billing cycle *",
      ],
      cta: subscribed && (subscriptionTier === "virtue_circles" || subscriptionTier === "virtue_circles_annual") ? "Current Plan" : "Start Membership",
      variant: "neon" as const,
      popular: true,
      priceType: billingPeriod === "monthly" ? "virtue_circles" as const : "virtue_circles_annual" as const,
      isCurrentPlan: subscriptionTier === "virtue_circles" || subscriptionTier === "virtue_circles_annual",
    },
    {
      name: "SoulMatch AI",
      price: "Coming Soon",
      description: "1:1 AI-powered matching for deeper connections",
      features: [
        "Everything in Virtue Circles",
        "Advanced 1:1 AI matching",
        "Deeper compatibility analysis",
        "Unlimited matching potential",
        "Private venue recommendations",
        "Dedicated friendship coach",
        "Priority event access",
      ],
      cta: "Join Waitlist",
      variant: "outline" as const,
      comingSoon: true,
      priceType: null,
      isWaitlist: true,
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-medium">
              ✨ Founding Members – 1st Month FREE + 50% Off Next 2 Months
            </span>
          </div>
          <h1 className="text-5xl font-display font-bold mb-4">
            Choose Your <span className="gradient-text">Path</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Start with our free tier and upgrade when you're ready to join your Virtue Circle
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-muted/50 rounded-full p-1.5 border border-border">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === "annual"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual <span className="text-xs font-bold text-accent ml-1">(Save 25%)</span>
            </button>
          </div>
        </div>

        {/* Waitlist / Inactive City Banner */}
        {user && cityActive === false && (
          <GlowCard className="p-4 mb-8 bg-destructive/10 border-destructive/30">
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6 text-destructive flex-shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Your City Is Not Yet Active</p>
                <p className="text-sm text-muted-foreground">
                  You're on the waitlist for your city. Paid plans will become available once your city launches. We'll notify you when it's ready!
                </p>
              </div>
            </div>
          </GlowCard>
        )}

        {/* Subscription Status Banner */}
        {subscribed && (
          <GlowCard className="p-4 mb-8 bg-primary/10 border-primary/30">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Check className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">Active Subscription: {subscriptionTier === "founding_100" ? "Founding Member" : subscriptionTier === "virtue_circles_annual" ? "Virtue Circles (Annual)" : "Virtue Circles"}</p>
                  <p className="text-sm text-muted-foreground">Thank you for being a member!</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleManageSubscription}>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Subscription
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Promo Code Input */}
        <div className="flex justify-center mb-8">
          {showPromo ? (
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border">
              <Tag className="h-4 w-4 text-primary ml-2" />
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                className="w-48 h-8 text-sm font-mono border-0 bg-transparent focus-visible:ring-0"
                maxLength={50}
              />
              {promoCode && (
                <button onClick={() => setPromoCode("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => { setShowPromo(false); setPromoCode(""); }} className="text-xs text-muted-foreground hover:text-foreground px-2">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPromo(true)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Tag className="h-3 w-3" />
              Have a promo code?
            </button>
          )}
        </div>

        {/* Test Card Banner - only in dev/test mode */}
        {import.meta.env.DEV && (
          <div className="mb-8 max-w-2xl mx-auto rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
                Test Mode — Use These Card Numbers
              </span>
            </div>
            {[
              { label: "✅ Success", number: "4242 4242 4242 4242", note: "Always succeeds" },
              { label: "❌ Card Declined", number: "4000 0000 0000 0002", note: "Always declined" },
              { label: "🔐 Requires Auth", number: "4000 0025 0000 3155", note: "3D Secure required" },
              { label: "💸 Insufficient", number: "4000 0000 0000 9995", note: "Insufficient funds" },
            ].map((card) => (
              <div
                key={card.number}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div>
                  <span className="text-sm font-semibold text-foreground/90">{card.label}</span>
                  <span className="block text-xs text-muted-foreground italic">{card.note}</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-black/30 text-yellow-400 px-3 py-1 rounded-md text-sm font-mono tracking-wider">
                    {card.number}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(card.number.replace(/\s/g, ""))}
                    className="flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/30 rounded-md px-2 py-1 text-yellow-400 text-xs hover:bg-yellow-500/25 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground/60 mt-3 italic">
              Use any future expiry (e.g. 12/34), any 3-digit CVC (e.g. 123), and any ZIP (e.g. 78701).
            </p>
          </div>
        )}

        {/* Founding Member Benefit Banner */}
        {promoCode.trim().toUpperCase() === "FOUNDING100" && (
          <div className="max-w-2xl mx-auto mb-8 rounded-xl border border-accent/40 bg-gradient-to-r from-accent/15 to-primary/10 p-5 text-center">
            <p className="text-accent text-sm font-bold mb-1">
              🏛️ Founding Member Benefit Applied
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Month 1: <strong className="text-foreground">FREE</strong> &nbsp;·&nbsp;
              Months 2-3: <strong className="text-foreground">$50/mo</strong> &nbsp;·&nbsp;
              Month 4+: <strong className="text-foreground">$100/mo</strong>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5 italic">
              Your card will not be charged until after your free month.
            </p>
          </div>
        )}

        

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <GlowCard
              key={plan.name}
              className={`p-8 relative ${plan.popular ? "ring-2 ring-primary" : ""} ${plan.isCurrentPlan ? "bg-primary/5" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-lg">
                    {plan.isCurrentPlan ? "YOUR PLAN" : "MOST POPULAR"}
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-display font-bold mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold gradient-text">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>
                {plan.annualTotal && (
                  <div className="text-sm text-accent font-semibold">{plan.annualTotal}</div>
                )}
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <div className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start">
                    <Check className="h-5 w-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">
                      {feature.endsWith(" *") ? (
                        <>
                          {feature.slice(0, -2)}
                          <Link to="/legal/terms" className="text-primary hover:underline ml-1">*</Link>
                        </>
                      ) : (
                        feature
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {plan.priceType ? (
                <Button
                  variant={plan.variant}
                  className="w-full"
                  disabled={plan.isCurrentPlan || subscriptionLoading || (!!user && cityActive === false)}
                  onClick={() => handleSubscribe(plan.priceType!)}
                >
                  {subscriptionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {plan.cta}
                </Button>
              ) : plan.isWaitlist ? (
                <Link to="/soulmatch">
                  <Button
                    variant={plan.variant}
                    className="w-full"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    {plan.cta}
                  </Button>
                </Link>
              ) : (plan as any).isPathfinder ? (
                <Button
                  variant={plan.variant}
                  className="w-full"
                  onClick={() => {
                    if (user) {
                      navigate("/dashboard");
                    } else {
                      navigate("/auth?redirect=dashboard");
                    }
                  }}
                >
                  {plan.cta}
                </Button>
              ) : null}
            </GlowCard>
          ))}
        </div>

        {/* Terms footnote */}
        <p className="text-xs text-muted-foreground text-center mb-16">
          * Items marked with an asterisk are subject to our{" "}
          <Link to="/legal/terms" className="text-primary hover:underline">Terms of Use</Link>.
          No refunds. Monthly subscription. Cancel anytime before the next billing date. Access remains active until billing period ends.
        </p>

        {/* Founding Members Section */}
        <GlowCard className="p-12 text-center bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10">
          <Sparkles className="h-16 w-16 mx-auto mb-6 text-accent animate-float" />
          <h2 className="text-4xl font-display font-bold mb-4">
            <span className="gradient-text">Founding Members Offer</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Be among our founding members and enjoy an exclusive introductory offer on Virtue Circles membership
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            <div className="p-4 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-2">1st Month FREE</div>
              <div className="text-sm text-muted-foreground">No charge for your first month</div>
            </div>
            <div className="p-4 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-secondary mb-2">50% Off</div>
              <div className="text-sm text-muted-foreground">Next 2 months at $50/mo</div>
            </div>
            <div className="p-4 bg-card/50 rounded-lg">
              <div className="text-2xl font-bold text-accent mb-2">$100 Saved</div>
              <div className="text-sm text-muted-foreground">Over your first 3 months</div>
            </div>
          </div>
          {subscribed ? (
            <Button variant="outline" size="lg" className="text-lg px-12" disabled>
              {subscriptionTier === "founding_100" ? "✓ You're a Founding Member!" : "✓ You Already Have an Active Subscription"}
            </Button>
          ) : user && cityActive === false ? (
            <Button variant="outline" size="lg" className="text-lg px-12" disabled>
              🏙️ Available When Your City Launches
            </Button>
          ) : (
            <Button 
              variant="neon" 
              size="lg" 
              className="text-lg px-12"
              onClick={() => {
                setPromoCode("FOUNDING100");
                handleSubscribe("founding_100", "FOUNDING100");
              }}
            >
              {user ? "Claim Founding Offer" : "Sign In to Claim Offer"}
            </Button>
          )}
        </GlowCard>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-display font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <GlowCard className="p-6" hover={false}>
              <h3 className="font-display font-bold mb-2">Can I upgrade or downgrade?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can change your plan at any time. Upgrades take effect immediately, downgrades at the end of your billing cycle.
              </p>
            </GlowCard>
            <GlowCard className="p-6" hover={false}>
              <h3 className="font-display font-bold mb-2">What if there are no events in my city?</h3>
              <p className="text-sm text-muted-foreground">
                Join our city waitlist! When we have enough members in your area, we'll launch events and notify you first.
              </p>
            </GlowCard>
            <GlowCard className="p-6" hover={false}>
              <h3 className="font-display font-bold mb-2">Can I change my group?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. You may switch groups once per month. For best results, we recommend staying for 6 sessions to build meaningful friendships.
              </p>
            </GlowCard>
            <GlowCard className="p-6" hover={false}>
              <h3 className="font-display font-bold mb-2">What is the refund policy?</h3>
              <p className="text-sm text-muted-foreground">
                No refunds. Monthly subscription. Cancel anytime before the next billing date. Access remains active until the billing period ends.
              </p>
            </GlowCard>
            <GlowCard className="p-6" hover={false}>
              <h3 className="font-display font-bold mb-2">How does the annual plan work?</h3>
              <p className="text-sm text-muted-foreground">
                The annual plan gives you 25% off the total yearly cost. You pay $900/year instead of $1,200/year, saving $300.
              </p>
            </GlowCard>
            <GlowCard className="p-6" hover={false}>
              <h3 className="font-display font-bold mb-2">Is SoulMatch AI really coming?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! We're perfecting the 1:1 matching algorithm. Join the waitlist to get early access when we launch.
              </p>
            </GlowCard>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Plans;
