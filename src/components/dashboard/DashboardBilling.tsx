import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { CreditCard, Sparkles, Calendar, ArrowUpRight, Loader2, FileText, ExternalLink, MapPin, TrendingUp } from "lucide-react";
import { useSubscription, isMonthlyPlan } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DashboardBillingProps {
  profile: {
    current_plan: string | null;
    plan_started_at: string | null;
    created_at?: string | null;
    city_id?: string | null;
  } | null;
}

interface InvoiceItem {
  id: string;
  created: number;
  description: string;
  amount_paid: number;
  amount_due: number;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: number;
  period_end: number;
}

const planDetails: Record<string, { name: string; price: string; features: string[] }> = {
  pathfinder: {
    name: "Pathfinder",
    price: "Free",
    features: [
      "Virtue assessment quiz",
      "Basic virtue profile",
      "Community meetup access",
    ],
  },
  virtue_circles: {
    name: "Virtue Circles",
    price: "$100/month",
    features: [
      "Everything in Pathfinder",
      "Circle matching",
      "Circle messaging",
      "Priority meetup access",
      "Virtue-based networking",
    ],
  },
  soulmatch_ai: {
    name: "SoulMatch AI",
    price: "Coming Soon",
    features: [
      "Everything in Virtue Circles",
      "AI-powered compatibility matching",
      "1-on-1 introductions",
      "Advanced virtue analytics",
      "Personalized growth recommendations",
    ],
  },
};

const formatDate = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const DashboardBilling = ({ profile }: DashboardBillingProps) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const { openCustomerPortal, upgradeToAnnual, subscribed, subscriptionTier, subscriptionStatus, trialEnd, founding100, foundingDiscountUntil } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradedToAnnual, setUpgradedToAnnual] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [cityActive, setCityActive] = useState<boolean>(true);

  // Check if the user's city is active
  useEffect(() => {
    if (!profile?.city_id) { setCityActive(true); return; }
    supabase
      .from("cities")
      .select("is_active")
      .eq("id", profile.city_id)
      .single()
      .then(({ data }) => setCityActive(data?.is_active ?? true));
  }, [profile?.city_id]);

  // Derive the current plan from LIVE Stripe data, not stale profile DB data
  // founding_100, virtue_circles, and virtue_circles_annual all map to "virtue_circles" display plan
  const currentPlan = subscribed
    ? "virtue_circles"
    : (profile?.current_plan || "pathfinder");

  const planInfo = planDetails[currentPlan] || planDetails.pathfinder;

  const isWithinDiscountPeriod = foundingDiscountUntil
    ? new Date() < new Date(foundingDiscountUntil)
    : false;

  // Derive a display status badge
  const getStatusBadge = () => {
    if (subscriptionStatus === "trialing") return { label: "🎁 Trial", className: "bg-accent/20 text-accent" };
    if (subscriptionStatus === "active") return { label: "Active", className: "bg-green-500/20 text-green-500" };
    if (subscriptionStatus === "past_due") return { label: "⚠️ Past Due", className: "bg-destructive/20 text-destructive" };
    if (subscriptionStatus === "canceled" || subscriptionStatus === "cancelled") return { label: "Cancelled", className: "bg-muted text-muted-foreground" };
    if (!subscribed) return { label: "Free", className: "bg-muted text-muted-foreground" };
    return { label: "Active", className: "bg-green-500/20 text-green-500" };
  };

  const statusBadge = getStatusBadge();

  // Fetch billing history on mount
  useEffect(() => {
    const fetchBillingHistory = async () => {
      if (!session?.access_token) return;
      setBillingLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-billing-history", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) throw error;
        setInvoices(data?.invoices || []);
      } catch (err) {
        console.error("Failed to fetch billing history:", err);
      } finally {
        setBillingLoading(false);
      }
    };
    fetchBillingHistory();
  }, [session?.access_token]);

  const handleOpenPortal = async () => {
    try {
      setPortalLoading(true);
      await openCustomerPortal();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to open billing portal.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgradeToAnnual = async () => {
    try {
      setUpgradeLoading(true);
      await upgradeToAnnual();
      setUpgradedToAnnual(true);
      toast({
        title: "🎉 Annual Plan Scheduled!",
        description: "Your plan will switch to annual billing ($900/year) at the end of your current billing cycle or trial period. No charge until then.",
      });
    } catch (err) {
      toast({
        title: "Upgrade Failed",
        description: err instanceof Error ? err.message : "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const canUpgradeToAnnual = subscribed && isMonthlyPlan(subscriptionTier);

  return (
    <div className="space-y-6">
      {/* Founding Member Discount Status — hidden for annual plan subscribers */}
      {founding100 && subscriptionTier !== "virtue_circles_annual" && (
        <GlowCard className="p-5 border-accent/25 bg-accent/5">
          <p className="text-accent text-sm font-semibold mb-1">
            🏛️ Founding Member — Active
          </p>

          {subscriptionStatus === "trialing" && trialEnd && (
            <p className="text-sm text-muted-foreground">
              Your free month is active. First charge of $50 on{" "}
              <strong className="text-foreground">
                {new Date(trialEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </strong>.
            </p>
          )}

          {subscriptionStatus === "active" && isWithinDiscountPeriod && (
            <p className="text-sm text-muted-foreground">
              50% founding discount active until{" "}
              <strong className="text-foreground">
                {new Date(foundingDiscountUntil!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </strong>. Then $100/month.
            </p>
          )}

          {subscriptionStatus === "active" && !isWithinDiscountPeriod && (
            <p className="text-sm text-muted-foreground">
              Founding member discount period complete. Current plan: $100/month.
            </p>
          )}
        </GlowCard>
      )}

      {/* Current Plan */}
      <GlowCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <h3 className="text-2xl font-display font-bold gradient-text">
                {planInfo.name}
              </h3>
            </div>
          </div>
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">{subscriptionTier === "virtue_circles_annual" ? "Annual Price" : "Monthly Price"}</p>
            <p className="text-xl font-display font-bold">
              {subscriptionTier === "virtue_circles_annual"
                ? "$900/year"
                : subscribed && founding100 && subscriptionStatus === "trialing"
                ? "Free (trial)"
                : subscribed && founding100 && isWithinDiscountPeriod
                ? "$50/mo (founder)"
                : planInfo.price}
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="text-xl font-display font-bold">
              {(profile?.plan_started_at || profile?.created_at)
                ? new Date((profile.plan_started_at || profile.created_at)!).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  })
                : "N/A"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-2">Plan Features</p>
          <ul className="space-y-2">
            {planInfo.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </GlowCard>

      {/* Billing History */}
      <GlowCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-muted-foreground" />
          <h3 className="text-xl font-display font-bold">Billing History</h3>
        </div>

        {billingLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No billing history yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">{formatDate(inv.created)}</TableCell>
                    <TableCell className="text-sm">{inv.description}</TableCell>
                    <TableCell className="text-sm font-medium">
                      ${(inv.amount_paid / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          inv.status === "paid"
                            ? "bg-green-500/20 text-green-500"
                            : inv.status === "open"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-destructive/20 text-destructive"
                        }
                      >
                        {inv.status === "paid" ? "✓ Paid" : inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {inv.invoice_pdf && (
                          <a
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlowCard>

      {/* City Inactive / Waitlist Notice */}
      {!subscribed && !cityActive && (
        <GlowCard className="p-5 border-destructive/25 bg-destructive/5">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-destructive text-sm">Your City Is Not Yet Active</p>
              <p className="text-sm text-muted-foreground">
                You're on the waitlist for your city. Paid plans will become available once your city launches — we'll notify you when it's ready!
              </p>
            </div>
          </div>
        </GlowCard>
      )}

      {/* Upgrade Options */}
      {currentPlan !== "soulmatch_ai" && !subscribed && cityActive && (
        <GlowCard className="p-6 border-primary/30">
          <div className="flex items-center gap-3 mb-4">
            <ArrowUpRight className="h-6 w-6 text-primary" />
            <h3 className="text-xl font-display font-bold">Upgrade Your Plan</h3>
          </div>
          
          <p className="text-muted-foreground mb-4">
            Unlock more features and deeper connections with an upgraded membership.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {currentPlan === "pathfinder" && (
              <>
                <GlowCard className="p-4">
                  <h4 className="font-display font-bold mb-2">Virtue Circles</h4>
                  <p className="text-2xl font-bold text-primary mb-2">$100<span className="text-sm text-muted-foreground">/mo</span></p>
                  <p className="text-sm text-muted-foreground mb-4">Small group matching & messaging</p>
                  <Button variant="neon" className="w-full" onClick={() => navigate("/plans")}>
                    Start Membership
                  </Button>
                </GlowCard>
                <GlowCard className="p-4">
                  <h4 className="font-display font-bold mb-2">SoulMatch AI</h4>
                  <p className="text-sm text-muted-foreground mb-4">AI-powered 1-on-1 matching</p>
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </GlowCard>
              </>
            )}
          </div>
        </GlowCard>
      )}

      {/* Upgrade to Annual */}
      {canUpgradeToAnnual && (
        <GlowCard className="p-6 border-primary/40 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold">Save with Annual Billing</h3>
              <p className="text-sm text-muted-foreground">Switch to annual and save 25% vs monthly</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 mb-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Current (Monthly)</p>
              <p className="text-lg font-bold">$100<span className="text-sm text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground">$1,200/year</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
              <p className="text-xs text-primary mb-1 font-semibold">Annual Plan</p>
              <p className="text-lg font-bold text-primary">$900<span className="text-sm text-muted-foreground">/year</span></p>
              <p className="text-xs text-accent font-medium">Save $300/year (25% off)</p>
            </div>
          </div>

          {upgradedToAnnual ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary/20 border border-secondary/40">
              <span className="text-secondary text-lg">✓</span>
              <div>
                <p className="text-sm font-semibold text-secondary">Annual plan scheduled</p>
                <p className="text-xs text-muted-foreground">You'll be billed $900/year on your next renewal. No charges until then.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Your plan will switch to annual at the end of your current billing cycle or trial period. No charges until then — you'll be billed $900/year going forward.
              </p>
              <Button variant="neon" onClick={handleUpgradeToAnnual} disabled={upgradeLoading}>
                {upgradeLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Upgrading…</>
                ) : (
                  <><TrendingUp className="h-4 w-4 mr-2" />Switch to Annual — Save $300</>
                )}
              </Button>
            </>
          )}
        </GlowCard>
      )}

      {/* Billing Management */}
      {subscribed && (
        <GlowCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
            <h3 className="text-xl font-display font-bold">Manage Subscription</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Update your payment method, change plans, or cancel your subscription.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Manage Subscription
            </Button>
          </div>
        </GlowCard>
      )}
    </div>
  );
};
