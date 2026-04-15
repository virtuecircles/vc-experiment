import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_IDS: Record<string, string> = {
  virtue_circles: "price_1T6oFuIc2BoV6S2bwR11EDFa",
  virtue_circles_annual: "price_1T6oFpIc2BoV6S2bfckpzkqr",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPGRADE-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { targetPriceType } = await req.json();
    if (targetPriceType !== "virtue_circles_annual") {
      throw new Error("Only upgrade to annual plan is supported");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find customer
    const normalizedEmail = user.email.toLowerCase().trim();
    let customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
    if (customers.data.length === 0 && normalizedEmail !== user.email) {
      customers = await stripe.customers.list({ email: user.email, limit: 1 });
    }
    if (customers.data.length === 0) throw new Error("No Stripe customer found");
    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
    const activeSub = subscriptions.data.find(s => s.status === "active" || s.status === "trialing");
    if (!activeSub) throw new Error("No active subscription found");
    logStep("Found active subscription", { subId: activeSub.id, status: activeSub.status });

    const currentPriceId = activeSub.items.data[0]?.price?.id;
    const annualPriceId = PRICE_IDS.virtue_circles_annual;

    if (currentPriceId === annualPriceId) {
      throw new Error("Already on the annual plan");
    }

    // Switch to annual plan immediately with no proration charge.
    // billing_cycle_anchor must be "now" when changing interval (monthly → annual).
    const updatedSub = await stripe.subscriptions.update(activeSub.id, {
      items: [
        {
          id: activeSub.items.data[0].id,
          price: annualPriceId,
        },
      ],
      proration_behavior: "none",
      billing_cycle_anchor: "now",
    });

    logStep("Subscription upgraded", { newSubId: updatedSub.id, status: updatedSub.status });

    return new Response(JSON.stringify({ success: true, subscriptionId: updatedSub.id }), {
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
