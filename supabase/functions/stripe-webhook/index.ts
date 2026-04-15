import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // If webhook secret is configured, verify signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    if (webhookSecret && sig) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Webhook signature verification failed", { error: (err as Error).message });
        return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // No webhook secret configured, parse event directly (dev mode)
      event = JSON.parse(body) as Stripe.Event;
      logStep("Processing event without signature verification (dev mode)");
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Helper: find Supabase user by Stripe customer email (case-insensitive)
    const findUserByCustomerId = async (customerId: string) => {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      if (!customer.email) return null;
      const normalizedEmail = customer.email.toLowerCase().trim();

      // Try normalized email first, then original
      let { data: users } = await supabaseClient
        .from("profiles")
        .select("id, email")
        .eq("email", normalizedEmail)
        .limit(1);

      if (!users?.length && normalizedEmail !== customer.email) {
        ({ data: users } = await supabaseClient
          .from("profiles")
          .select("id, email")
          .eq("email", customer.email)
          .limit(1));
      }

      return users?.[0] || null;
    };

    switch (event.type) {
      case "customer.subscription.trial_will_end": {
        // Fires 3 days before trial ends
        const sub = event.data.object as Stripe.Subscription;
        const user = await findUserByCustomerId(sub.customer as string);
        if (user) {
          logStep("Trial ending soon for user", { userId: user.id, trialEnd: sub.trial_end });
          // Create a notification for the user
          await supabaseClient
            .from("notifications")
            .insert({
              user_id: user.id,
              type: "announcement",
              title: "Free Trial Ending Soon",
              message: "Your free month ends in 3 days. Your card will be charged $50 (50% founding member discount).",
            });
          logStep("Trial ending notification created");
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await findUserByCustomerId(sub.customer as string);
        if (user) {
          logStep("Subscription updated", { userId: user.id, status: sub.status });
          // Fix 2: Also update current_plan when subscription is active/trialing
          const isActive = sub.status === "active" || sub.status === "trialing";
          await supabaseClient
            .from("profiles")
            .update({
              subscription_status: sub.status,
              ...(isActive ? { current_plan: "virtue_circles" } : {}),
            } as any)
            .eq("id", user.id);
          logStep("Subscription updated in DB", { status: sub.status, planUpdated: isActive });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const user = await findUserByCustomerId(invoice.customer as string);
          if (user) {
            logStep("Payment succeeded", { userId: user.id, amount: invoice.amount_paid });
            await supabaseClient
              .from("profiles")
              .update({ subscription_status: "active" } as any)
              .eq("id", user.id);

            // Send renewal confirmation email (skip for very first invoice — covered by subscription.created)
            const billingReason = (invoice as any).billing_reason;
            if (billingReason === "subscription_cycle") {
              const amountFormatted = `$${((invoice.amount_paid || 0) / 100).toFixed(2)}`;
              try {
                await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
                  body: JSON.stringify({
                    recipients: [{ email: user.email }],
                    subject: "Your Virtue Circles subscription has been renewed",
                    title: "Subscription Renewed Successfully",
                    body: `Your Virtue Circles membership has been renewed.\n\n💳 Amount charged: ${amountFormatted}\n\nThank you for continuing your journey with us. Your access remains fully active.`,
                    type: "auto",
                    email_type: "renewal_confirmation",
                    cta_url: "https://virtue-circles.com/dashboard",
                    cta_label: "Go to Dashboard",
                  }),
                });
              } catch (emailErr) {
                logStep("Failed to send renewal email", { error: (emailErr as Error).message });
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const user = await findUserByCustomerId(invoice.customer as string);
          if (user) {
            logStep("Payment failed", { userId: user.id });
            await supabaseClient
              .from("profiles")
              .update({ subscription_status: "past_due" } as any)
              .eq("id", user.id);

            // In-app notification
            await supabaseClient.from("notifications").insert({
              user_id: user.id,
              type: "announcement",
              title: "Payment Failed",
              message: "Your subscription payment failed. Please update your payment method to avoid service interruption.",
            });

            // Email alert
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
                body: JSON.stringify({
                  recipients: [{ email: user.email }],
                  subject: "Action Required: Your Virtue Circles payment failed",
                  title: "Payment Failed",
                  body: `We were unable to process your Virtue Circles subscription payment.\n\nPlease update your payment method as soon as possible to avoid any interruption to your membership and access to your Circle.`,
                  type: "auto",
                  email_type: "payment_failed",
                  cta_url: "https://virtue-circles.com/dashboard",
                  cta_label: "Update Payment Method",
                }),
              });
            } catch (emailErr) {
              logStep("Failed to send payment failed email", { error: (emailErr as Error).message });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await findUserByCustomerId(sub.customer as string);
        if (user) {
          logStep("Subscription cancelled", { userId: user.id });
          await supabaseClient
            .from("profiles")
            .update({
              current_plan: "pathfinder",
              subscription_status: "cancelled",
              stripe_subscription_id: null,
            } as any)
            .eq("id", user.id);

          // Notify user
          await supabaseClient
            .from("notifications")
            .insert({
              user_id: user.id,
              type: "announcement",
              title: "Subscription Cancelled",
              message: "Your Virtue Circles subscription has been cancelled. You've been moved to the free Pathfinder plan.",
            });
        }
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const user = await findUserByCustomerId(sub.customer as string);
        if (user) {
          logStep("Subscription created", { userId: user.id, status: sub.status, trialEnd: sub.trial_end });
          await supabaseClient
            .from("profiles")
            .update({
              stripe_subscription_id: sub.id,
              subscription_status: sub.status,
              current_plan: "virtue_circles",
              plan_started_at: new Date().toISOString(),
            } as any)
            .eq("id", user.id);

          // Send welcome / subscription confirmation email
          try {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
              body: JSON.stringify({
                recipients: [{ email: user.email, name: "" }],
                subject: "Welcome to Virtue Circles — Your Subscription is Active 🌿",
                title: "You're officially a Virtue Circles member!",
                body: `Thank you for joining Virtue Circles. Your subscription is now active and you have full access to your dashboard, Circles, and upcoming events.\n\nWe're excited to have you on this journey of character and community.`,
                type: "auto",
                email_type: "subscription_created",
                cta_url: "https://virtue-circles.com/dashboard",
                cta_label: "Go to Dashboard",
              }),
            });
            logStep("Welcome subscription email sent");
          } catch (emailErr) {
            logStep("Failed to send welcome email", { error: (emailErr as Error).message });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
