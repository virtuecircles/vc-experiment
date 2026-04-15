import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product IDs for subscription tiers (Live mode)
const PRODUCT_IDS: Record<string, string> = {
  virtue_circles: "prod_U4yCJ7gd8R8cWQ",
  virtue_circles_annual: "prod_U4yCBQdCrIUJG7",
  founding_100: "prod_U4yC1KchOkOUN5",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use service role for both auth validation and DB queries
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    // Normalize email to lowercase — Stripe customer lookup is case-sensitive
    const normalizedEmail = user.email.toLowerCase().trim();
    let customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
    // Fallback: try original email if normalized yields no results
    if (customers.data.length === 0 && normalizedEmail !== user.email) {
      customers = await stripe.customers.list({ email: user.email, limit: 1 });
    }

    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for both active and trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    // Find active or trialing subscription
    const activeSub = subscriptions.data.find(s => s.status === "active" || s.status === "trialing");
    const hasActiveSub = !!activeSub;
    let productId = null;
    let subscriptionTier = null;
    let subscriptionEnd = null;
    let subscriptionStatus = null;
    let trialEnd = null;

    if (hasActiveSub && activeSub) {
      if (activeSub.current_period_end) {
        subscriptionEnd = new Date(activeSub.current_period_end * 1000).toISOString();
      }
      productId = activeSub.items.data[0]?.price?.product as string ?? null;
      subscriptionStatus = activeSub.status;

      if (activeSub.trial_end && typeof activeSub.trial_end === 'number') {
        trialEnd = new Date(activeSub.trial_end * 1000).toISOString();
      }

      // Determine tier name
      if (productId === PRODUCT_IDS.founding_100) {
        subscriptionTier = "founding_100";
      } else if (productId === PRODUCT_IDS.virtue_circles_annual) {
        subscriptionTier = "virtue_circles_annual";
      } else if (productId === PRODUCT_IDS.virtue_circles) {
        subscriptionTier = "virtue_circles";
      }

      logStep("Subscription found", { subscriptionId: activeSub.id, tier: subscriptionTier, status: subscriptionStatus, endDate: subscriptionEnd });
    } else {
      logStep("No active/trialing subscription found");
    }

    // Fetch founding member info from profiles using service role
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("founding_100, founding_discount_until, current_plan, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    // Fix 3: Self-heal — sync live Stripe data back to profiles DB so admin list stays accurate
    if (profileData) {
      const dbPlan = profileData.current_plan;
      const dbStatus = profileData.subscription_status;
      const livePlan = hasActiveSub
        ? (subscriptionTier === "virtue_circles_annual" ? "virtue_circles" : subscriptionTier === "founding_100" ? "virtue_circles" : "virtue_circles")
        : "pathfinder";
      const liveStatus = hasActiveSub
        ? (subscriptionTier === "virtue_circles_annual" ? "active_annual" : subscriptionStatus)
        : "none";

      const planMismatch = hasActiveSub && dbPlan === "pathfinder";
      const statusMismatch = hasActiveSub && dbStatus !== liveStatus;

      if (planMismatch || statusMismatch) {
        logStep("DB record stale — auto-syncing", { dbPlan, livePlan, dbStatus, liveStatus });
        await supabaseAdmin
          .from("profiles")
          .update({
            current_plan: livePlan as any,
            subscription_status: liveStatus,
            ...(hasActiveSub && activeSub ? { stripe_subscription_id: activeSub.id } : {}),
          })
          .eq("id", user.id);
        logStep("DB auto-sync complete");
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      subscription_status: subscriptionStatus,
      trial_end: trialEnd,
      founding_100: profileData?.founding_100 ?? false,
      founding_discount_until: profileData?.founding_discount_until ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
