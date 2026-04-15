import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-REVENUE-STATS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Authenticate user and check admin role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user has admin role
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => 
      r.role === "super_admin" || r.role === "vc_manager" || r.role === "admin"
    );

    if (!isAdmin) {
      throw new Error("Access denied: Admin role required");
    }
    logStep("Admin access verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthTimestamp = Math.floor(startOfMonth.getTime() / 1000);

    // Fetch active subscriptions (without deep expansion)
    logStep("Fetching active subscriptions");
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
    });
    logStep("Subscriptions fetched", { count: subscriptions.data.length });

    // Cache products to avoid repeated API calls
    const productCache: Record<string, Stripe.Product> = {};

    // Calculate MRR from active subscriptions
    let mrr = 0;
    const revenueByProduct: Record<string, { name: string; amount: number; count: number }> = {};

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        
        // Get product info (fetch if not cached)
        let productName = "Unknown Product";
        const productId = typeof price.product === "string" ? price.product : price.product?.id;
        
        if (productId) {
          if (!productCache[productId]) {
            try {
              productCache[productId] = await stripe.products.retrieve(productId);
            } catch (e) {
              logStep("Failed to fetch product", { productId });
            }
          }
          productName = productCache[productId]?.name || "Unknown Product";
        }
        
        // Calculate monthly amount
        let monthlyAmount = 0;
        if (price.recurring) {
          const unitAmount = price.unit_amount || 0;
          switch (price.recurring.interval) {
            case "month":
              monthlyAmount = unitAmount * (price.recurring.interval_count || 1);
              break;
            case "year":
              monthlyAmount = unitAmount / 12;
              break;
            case "week":
              monthlyAmount = unitAmount * 4.33;
              break;
            case "day":
              monthlyAmount = unitAmount * 30;
              break;
          }
        }
        
        mrr += monthlyAmount;

        // Track by product
        if (productId) {
          if (!revenueByProduct[productId]) {
            revenueByProduct[productId] = { name: productName, amount: 0, count: 0 };
          }
          revenueByProduct[productId].amount += monthlyAmount;
          revenueByProduct[productId].count += 1;
        }
      }
    }

    // Convert cents to dollars
    mrr = mrr / 100;
    const arr = mrr * 12;
    logStep("MRR calculated", { mrr, arr });

    // Fetch charges for this month (successful payments)
    logStep("Fetching monthly charges");
    const charges = await stripe.charges.list({
      created: { gte: startOfMonthTimestamp },
      limit: 100,
    });

    let monthlyRevenue = 0;
    let refundTotal = 0;
    for (const charge of charges.data) {
      if (charge.status === "succeeded") {
        monthlyRevenue += charge.amount;
        refundTotal += charge.amount_refunded;
      }
    }
    monthlyRevenue = monthlyRevenue / 100;
    refundTotal = refundTotal / 100;
    logStep("Monthly charges calculated", { monthlyRevenue, refundTotal });

    // Get total charges for lifetime revenue approximation
    logStep("Fetching lifetime charges");
    const allCharges = await stripe.charges.list({
      limit: 100,
    });
    
    let totalLifetimeRevenue = 0;
    for (const charge of allCharges.data) {
      if (charge.status === "succeeded") {
        totalLifetimeRevenue += (charge.amount - charge.amount_refunded);
      }
    }
    totalLifetimeRevenue = totalLifetimeRevenue / 100;
    logStep("Lifetime revenue calculated", { totalLifetimeRevenue });

    // Use subscription count as active subscribers
    const activeSubscriptions = subscriptions.data.length;

    // Calculate ARPU (Average Revenue Per User)
    const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

    // Format revenue by plan
    const revenueByPlan = Object.values(revenueByProduct).map(p => ({
      plan: p.name,
      amount: p.amount / 100,
      count: p.count,
    }));

    const stats = {
      totalLifetimeRevenue,
      monthlyRevenue,
      activeSubscriptions,
      mrr,
      arr,
      refundTotal,
      arpu,
      revenueByPlan,
      dataSource: "stripe",
      fetchedAt: new Date().toISOString(),
    };

    logStep("Stats compiled successfully", stats);

    return new Response(JSON.stringify(stats), {
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
