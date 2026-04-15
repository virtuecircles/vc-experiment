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
  founding_100: "price_1T6oFuIc2BoV6S2bwR11EDFa", // Use standard $100/mo price; coupon brings it to $50
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { priceType, promoCode } = await req.json();
    logStep("Received request", { priceType, promoCode });

    const priceId = PRICE_IDS[priceType];
    if (!priceId) throw new Error(`Invalid price type: ${priceType}`);
    logStep("Selected price", { priceId });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Look up promo code if provided
    let stripeCouponId: string | undefined;
    if (promoCode && typeof promoCode === "string" && promoCode.trim()) {
      const code = promoCode.trim().toUpperCase();
      logStep("Looking up promo code", { code });

      const { data: promoData, error: promoError } = await supabaseClient
        .from("promo_codes")
        .select("id, stripe_coupon_id, max_uses, current_uses, valid_until, applicable_prices")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (promoError) {
        logStep("Promo code lookup error", { error: promoError.message });
      } else if (!promoData) {
        logStep("Promo code not found or inactive", { code });
        throw new Error("Invalid or expired promo code");
      } else {
        // Validate expiry
        if (promoData.valid_until && new Date(promoData.valid_until) < new Date()) {
          throw new Error("This promo code has expired");
        }
        // Validate max uses
        if (promoData.max_uses && promoData.current_uses >= promoData.max_uses) {
          throw new Error("This promo code has reached its usage limit");
        }
        // Validate applicable prices
        if (promoData.applicable_prices && promoData.applicable_prices.length > 0) {
          if (!promoData.applicable_prices.includes(priceType)) {
            throw new Error("This promo code is not valid for this plan");
          }
        }

        // Check if user already used this code
        const { data: usageData } = await supabaseClient
          .from("promo_code_usages")
          .select("id")
          .eq("promo_code_id", promoData.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (usageData) {
          throw new Error("You have already used this promo code");
        }

        stripeCouponId = promoData.stripe_coupon_id;
        logStep("Promo code validated", { stripeCouponId });
      }
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    let customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
    if (customers.data.length === 0 && normalizedEmail !== user.email) {
      customers = await stripe.customers.list({ email: user.email, limit: 1 });
    }
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : normalizedEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?subscription=success`,
      cancel_url: `${req.headers.get("origin")}/plans?subscription=canceled`,
    };

    // Apply coupon discount
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
      logStep("Applied coupon to session", { stripeCouponId });

      // For FOUNDING100: add 30-day free trial (1st month free, then coupon covers months 2-3 at 50% off)
      if (promoCode && promoCode.trim().toUpperCase() === "FOUNDING100") {
        sessionParams.subscription_data = { trial_period_days: 30 };
        logStep("Applied 30-day free trial for Founding 100");
      }
    } else {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id });

    // For FOUNDING100: mark user as founding member and set discount end date
    if (promoCode && promoCode.trim().toUpperCase() === "FOUNDING100") {
      const discountUntil = new Date();
      discountUntil.setMonth(discountUntil.getMonth() + 3);

      await supabaseAdmin
        .from("profiles")
        .update({
          founding_100: true,
          founding_discount_until: discountUntil.toISOString().split("T")[0],
        } as any)
        .eq("id", user.id);

      logStep("Set founding member flags", { userId: user.id, discountUntil: discountUntil.toISOString() });
    }

    return new Response(JSON.stringify({ url: session.url }), {
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
