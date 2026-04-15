import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-AUTO-EMAILS] ${step}${details ? " - " + JSON.stringify(details) : ""}`);
};

const sendEmail = async (
  supabaseUrl: string,
  anonKey: string,
  payload: {
    recipients: { email: string; name?: string }[];
    subject: string;
    title: string;
    body: string;
    type: "auto";
    cta_url?: string;
    cta_label?: string;
    email_type: string;
  }
) => {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const emailType: string = body.emailType || body.email_type || "daily_check";

    logStep("Running auto-email job", { emailType });

    const results: Record<string, unknown> = {};

    // ─── Event Reminders (24h before) ───────────────────────────
    if (emailType === "daily_check" || emailType === "event_reminders") {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      const tomorrowStart = new Date(tomorrow);
      tomorrowStart.setMinutes(0, 0, 0);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(tomorrowEnd.getHours() + 1);

      const { data: events } = await supabase
        .from("events")
        .select("id, title, event_date, location")
        .eq("status", "upcoming")
        .gte("event_date", tomorrowStart.toISOString())
        .lte("event_date", tomorrowEnd.toISOString());

      if (events && events.length > 0) {
        for (const event of events) {
          const { data: rsvps } = await supabase
            .from("event_rsvps")
            .select("user_id, profiles!inner(email, first_name, last_name)")
            .eq("event_id", event.id)
            .eq("status", "confirmed");

          if (rsvps && rsvps.length > 0) {
            const recipients = rsvps
              .map((r: any) => ({
                email: r.profiles?.email,
                name: `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.trim(),
              }))
              .filter((r: any) => r.email);

            if (recipients.length > 0) {
              const eventDate = new Date(event.event_date).toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
              });
              await sendEmail(supabaseUrl, anonKey, {
                recipients,
                subject: `Reminder: ${event.title} is tomorrow`,
                title: `Your meetup is tomorrow!`,
                body: `Just a friendly reminder that you're confirmed for <strong>${event.title}</strong>.\n\n📅 ${eventDate}${event.location ? `\n📍 ${event.location}` : ""}\n\nWe look forward to seeing you there!`,
                type: "auto",
                email_type: "meetup_reminder",
                cta_url: "https://virtue-circles.com/dashboard",
                cta_label: "View in Dashboard",
              });
              logStep("Meetup reminder sent", { eventId: event.id, recipientCount: recipients.length });
            }
          }
        }
      }
      results.event_reminders = "checked";
    }

    // ─── Welcome email (single user by user_id, or batch last 10 min) ────
    if (emailType === "welcome_emails") {
      const targetUserId: string | null = body.user_id || null;

      let query = supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .not("email", "is", null);

      if (targetUserId) {
        query = query.eq("id", targetUserId);
      } else {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        query = query.gte("created_at", tenMinutesAgo);
      }

      const { data: newProfiles } = await query;

      if (newProfiles && newProfiles.length > 0) {
        const recipients = newProfiles.map((p) => ({
          email: p.email!,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || undefined,
        }));

        await sendEmail(supabaseUrl, anonKey, {
          recipients,
          subject: "Welcome to Virtue Circles 🌿",
          title: "Welcome to Virtue Circles",
          body: `We're so glad you're here.\n\nVirtue Circles is a community for people who want to grow in character, connect with like-minded individuals, and live with greater intention.\n\nYour journey starts by taking the Virtue Assessment — a short quiz to discover your primary virtue and get matched with your Circle.\n\nLet's begin!`,
          type: "auto",
          email_type: "welcome",
          cta_url: "https://virtue-circles.com/quiz",
          cta_label: "Take the Virtue Assessment",
        });
        logStep("Welcome emails sent", { count: recipients.length });
        results.welcome_emails = recipients.length;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
