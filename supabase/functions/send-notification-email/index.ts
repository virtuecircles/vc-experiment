import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Recipient {
  email: string;
  name?: string;
}

interface EmailRequest {
  recipients: Recipient[];
  subject: string;
  title: string;
  body: string;
  type: "manual" | "auto";
  cta_url?: string;
  cta_label?: string;
  email_type?: string;
  sent_by?: string;
}

const buildHtmlEmail = (title: string, body: string, ctaUrl?: string, ctaLabel?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Raleway:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background-color:#0a0b14;font-family:'Raleway',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0b14;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="600" style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;border:1px solid rgba(160,70,207,0.25);box-shadow:0 0 60px rgba(160,70,207,0.12),0 0 120px rgba(228,69,167,0.06);">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d0e1f 0%,#1a0d2e 50%,#0d1a2e 100%);padding:0;text-align:center;border-bottom:1px solid rgba(160,70,207,0.2);">
              <!-- Shimmer top line -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(160,70,207,0.6),rgba(228,69,167,0.6),transparent);"></div>
              <div style="padding:36px 40px 32px;">
                <!-- Logo mark -->
                <div style="display:inline-block;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,rgba(160,70,207,0.3),rgba(228,69,167,0.3));border:1px solid rgba(160,70,207,0.5);margin-bottom:14px;font-size:22px;line-height:52px;text-align:center;">🏛️</div>
                <!-- Brand name -->
                <div style="font-family:'Cinzel',Georgia,serif;font-size:26px;font-weight:700;letter-spacing:4px;text-transform:uppercase;background:linear-gradient(135deg,#c084fc,#e445a7,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#c084fc;margin-bottom:6px;">Virtue Circles</div>
                <!-- Tagline -->
                <div style="font-family:'Raleway',Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:5px;text-transform:uppercase;color:rgba(255,255,255,0.35);">Character &nbsp;·&nbsp; Community &nbsp;·&nbsp; Growth</div>
              </div>
              <!-- Bottom shimmer line -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(160,70,207,0.6),rgba(228,69,167,0.6),transparent);"></div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:linear-gradient(180deg,#0f1020 0%,#0c0d1a 100%);padding:44px 44px 40px;">

              <!-- Greeting label -->
              <div style="font-family:'Cinzel',Georgia,serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:rgba(160,70,207,0.8);margin-bottom:16px;">A message from the team</div>

              <!-- Title -->
              <div style="font-family:'Cinzel',Georgia,serif;font-size:24px;font-weight:600;color:#ffffff;line-height:1.4;margin-bottom:20px;letter-spacing:0.5px;">${title}</div>

              <!-- Accent divider -->
              <div style="width:48px;height:2px;background:linear-gradient(90deg,#A046CF,#E445A7);border-radius:2px;margin-bottom:28px;"></div>

              <!-- Body text -->
              <div style="font-family:'Raleway',Arial,sans-serif;font-size:15px;font-weight:400;color:rgba(255,255,255,0.72);line-height:1.8;margin-bottom:36px;">
                ${body.replace(/\n/g, "<br />")}
              </div>

              ${ctaUrl && ctaLabel ? `
              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:40px;">
                <a href="${ctaUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#A046CF,#E445A7);color:#ffffff;font-family:'Raleway',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-radius:50px;box-shadow:0 4px 24px rgba(160,70,207,0.4);">${ctaLabel}</a>
              </div>` : ""}

              <!-- Virtue accent bar -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);padding:20px 0;margin-bottom:36px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="text-align:center;padding:0 10px;">
                          <div style="font-size:16px;opacity:0.7;">✨</div>
                          <div style="font-family:'Raleway',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Transcendence</div>
                        </td>
                        <td style="text-align:center;padding:0 10px;">
                          <div style="font-size:16px;opacity:0.7;">⚖️</div>
                          <div style="font-family:'Raleway',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Justice</div>
                        </td>
                        <td style="text-align:center;padding:0 10px;">
                          <div style="font-size:16px;opacity:0.7;">❤️</div>
                          <div style="font-family:'Raleway',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Humanity</div>
                        </td>
                        <td style="text-align:center;padding:0 10px;">
                          <div style="font-size:16px;opacity:0.7;">🏛️</div>
                          <div style="font-family:'Raleway',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Temperance</div>
                        </td>
                        <td style="text-align:center;padding:0 10px;">
                          <div style="font-size:16px;opacity:0.7;">🦉</div>
                          <div style="font-family:'Raleway',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Wisdom</div>
                        </td>
                        <td style="text-align:center;padding:0 10px;">
                          <div style="font-size:16px;opacity:0.7;">🔥</div>
                          <div style="font-family:'Raleway',Arial,sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.3);">Courage</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <div style="font-family:'Raleway',Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.5);margin-bottom:4px;">Warmly,</div>
              <div style="font-family:'Cinzel',Georgia,serif;font-size:15px;font-weight:600;color:rgba(255,255,255,0.85);margin-bottom:2px;">The Virtue Circles Team</div>
              <div style="font-size:12px;color:rgba(160,70,207,0.7);letter-spacing:1px;">hello@virtue-circles.com</div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#080910;padding:28px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
              <div style="font-family:'Cinzel',Georgia,serif;font-size:13px;letter-spacing:3px;color:rgba(255,255,255,0.2);text-transform:uppercase;margin-bottom:12px;">Virtue Circles</div>
              <p style="margin:0 0 12px;font-size:11px;color:rgba(255,255,255,0.2);line-height:1.7;font-family:'Raleway',Arial,sans-serif;">
                You're receiving this email because you're a member of Virtue Circles.<br/>
                <a href="https://virtue-circles.com" style="color:rgba(160,70,207,0.6);text-decoration:none;font-size:11px;">virtue-circles.com</a>
              </p>
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(160,70,207,0.3),rgba(228,69,167,0.3),transparent);margin:16px 0;"></div>
              <div style="font-family:'Cinzel',Georgia,serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.12);">Where Character Creates Connection</div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const payload: EmailRequest = await req.json();
    const { recipients, subject, title, body, type, cta_url, cta_label, email_type, sent_by } = payload;

    if (!recipients?.length || !subject || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const fromAddress = type === "auto"
      ? "Virtue Circles <noreply@notification.virtue-circles.com>"
      : "Virtue Circles Team <hello@notification.virtue-circles.com>";

    const htmlContent = buildHtmlEmail(title, body, cta_url, cta_label);

    // Send to each recipient individually for personalisation
    let successCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient.email],
          subject,
          html: htmlContent,
        }),
      });

      if (res.ok) {
        successCount++;
      } else {
        const err = await res.json();
        errors.push(`${recipient.email}: ${err.message || "Failed"}`);
        console.error("Email send failed:", recipient.email, err);
      }
    }

    // Log to email_logs table
    await supabase.from("email_logs").insert({
      sent_by: sent_by || null,
      email_type: email_type || type,
      subject,
      recipient_count: successCount,
      recipient_emails: recipients.map((r) => r.email),
      status: errors.length === 0 ? "sent" : successCount > 0 ? "partial" : "failed",
      error_message: errors.length > 0 ? errors.join("; ") : null,
    });

    return new Response(JSON.stringify({ success: true, sent: successCount, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("send-notification-email error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
