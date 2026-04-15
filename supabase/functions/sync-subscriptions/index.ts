import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify caller is a super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    // Check super_admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["super_admin", "admin"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Unauthorized: super_admin required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    logStep("Admin authorized", { userId: userData.user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch all profiles with emails
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, current_plan, subscription_status, stripe_subscription_id")
      .not("email", "is", null);

    if (profilesError) throw profilesError;
    logStep("Fetched profiles", { count: profiles?.length ?? 0 });

    let synced = 0;
    let alreadyCorrect = 0;
    let noStripeCustomer = 0;
    const errors: string[] = [];

    for (const profile of profiles ?? []) {
      if (!profile.email) continue;

      try {
        const normalizedEmail = profile.email.toLowerCase().trim();
        let customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
        if (customers.data.length === 0 && normalizedEmail !== profile.email) {
          customers = await stripe.customers.list({ email: profile.email, limit: 1 });
        }
        if (customers.data.length === 0) {
          noStripeCustomer++;
          continue;
        }

        const customerId = customers.data[0].id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 10,
        });

        const activeSub = subscriptions.data.find(s => s.status === "active" || s.status === "trialing");

        if (activeSub) {
          const liveStatus = activeSub.status;
          const livePlan = "virtue_circles";

          if (profile.current_plan !== livePlan || profile.subscription_status !== liveStatus) {
            await supabaseAdmin
              .from("profiles")
              .update({
                current_plan: livePlan as any,
                subscription_status: liveStatus,
                stripe_subscription_id: activeSub.id,
              })
              .eq("id", profile.id);
            logStep("Synced profile", { email: profile.email, from: profile.current_plan, to: livePlan, status: liveStatus });
            synced++;
          } else {
            alreadyCorrect++;
          }
        } else {
          // No active subscription — ensure DB reflects this
          if (profile.current_plan !== "pathfinder" || (profile.subscription_status !== "none" && profile.subscription_status !== "cancelled")) {
            await supabaseAdmin
              .from("profiles")
              .update({
                current_plan: "pathfinder" as any,
                subscription_status: "none",
              })
              .eq("id", profile.id);
            logStep("Reset stale plan to pathfinder", { email: profile.email });
            synced++;
          } else {
            alreadyCorrect++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logStep("Error syncing profile", { email: profile.email, error: msg });
        errors.push(`${profile.email}: ${msg}`);
      }
    }

    logStep("Sync complete", { synced, alreadyCorrect, noStripeCustomer, errors: errors.length });

    return new Response(JSON.stringify({
      success: true,
      synced,
      already_correct: alreadyCorrect,
      no_stripe_customer: noStripeCustomer,
      errors,
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
