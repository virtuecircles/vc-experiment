import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-BILLING-HISTORY] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const authUser = userData.user;
    if (!authUser) throw new Error("User not authenticated");

    // Parse body - userEmail is optional. If provided, admin check is required.
    let targetEmail = authUser.email;
    let body: { userEmail?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine - user is fetching their own history
    }

    if (body.userEmail && body.userEmail !== authUser.email) {
      // Admin is looking up another user's billing - verify admin role
      const { data: roles } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id);

      const isAdmin = roles?.some(r => ["super_admin", "vc_manager", "admin"].includes(r.role));
      if (!isAdmin) throw new Error("Unauthorized: admin access required");
      targetEmail = body.userEmail;
    }

    if (!targetEmail) throw new Error("No email available");

    // Normalize email to lowercase — Stripe customer lookup is case-sensitive
    const normalizedEmail = targetEmail.toLowerCase().trim();

    logStep("Fetching billing history for", { targetEmail: normalizedEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer by normalized email; also try original case as fallback
    let customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
    
    // Fallback: try original email if normalized yields no results
    if (customers.data.length === 0 && normalizedEmail !== targetEmail) {
      customers = await stripe.customers.list({ email: targetEmail, limit: 1 });
    }
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ invoices: [], customerId: null, subscription: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Fetch invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 24,
    });

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      created: invoice.created,
      description: invoice.lines.data[0]?.description || "Subscription",
      amount_paid: invoice.amount_paid,
      amount_due: invoice.amount_due,
      status: invoice.status,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
    }));

    // Also fetch active subscription details
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    const activeSub = subscriptions.data.find(s => s.status === "active" || s.status === "trialing");
    let subscriptionDetails = null;

    if (activeSub) {
      const interval = activeSub.items?.data?.[0]?.price?.recurring?.interval ?? null;
      subscriptionDetails = {
        id: activeSub.id,
        status: activeSub.status,
        current_period_end: activeSub.current_period_end,
        trial_end: activeSub.trial_end,
        cancel_at_period_end: activeSub.cancel_at_period_end,
        billing_interval: interval,
        default_payment_method: null as { brand: string; last4: string } | null,
      };

      // Try to get payment method details
      if (activeSub.default_payment_method && typeof activeSub.default_payment_method === 'string') {
        try {
          const pm = await stripe.paymentMethods.retrieve(activeSub.default_payment_method);
          if (pm.card) {
            subscriptionDetails.default_payment_method = {
              brand: pm.card.brand,
              last4: pm.card.last4,
            };
          }
        } catch (e) {
          logStep("Could not fetch payment method", { error: (e as Error).message });
        }
      }
    }

    logStep("Returning billing data", { invoiceCount: formattedInvoices.length });

    return new Response(JSON.stringify({
      invoices: formattedInvoices,
      customerId,
      subscription: subscriptionDetails,
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
