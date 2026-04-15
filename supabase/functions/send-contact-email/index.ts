import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Sanitize user input: strip HTML tags, trim whitespace, enforce max length
function sanitize(input: string, maxLength = 2000): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/<[^>]*>/g, '')                                          // strip HTML tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // strip script blocks
    .replace(/javascript:/gi, '')                                      // strip JS URIs
    .replace(/on\w+\s*=/gi, '')                                        // strip inline event handlers
    .substring(0, maxLength);
}

// Basic email format check
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Honeypot check: reject bots server-side too
    if (body.honeypot) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize all inputs server-side
    const name    = sanitize(body.name    ?? '', 100);
    const email   = (body.email ?? '').trim().toLowerCase().substring(0, 255);
    const subject = sanitize(body.subject ?? '', 200);
    const message = sanitize(body.message ?? '', 2000);

    // Validate required fields
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Server-side rate limiting: max 3 submissions per email per hour
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: rateLimitRows } = await adminClient
      .from('rate_limits')
      .select('id, request_count, window_start')
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .eq('endpoint', `contact:${email}`)
      .gte('window_start', windowStart)
      .limit(1);

    if (rateLimitRows && rateLimitRows.length > 0) {
      const row = rateLimitRows[0];
      if (row.request_count >= 3) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait an hour.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Increment count
      await adminClient
        .from('rate_limits')
        .update({ request_count: row.request_count + 1, last_request_at: new Date().toISOString() })
        .eq('id', row.id);
    } else {
      // Insert new window
      await adminClient.from('rate_limits').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        endpoint: `contact:${email}`,
        request_count: 1,
        window_start: new Date().toISOString(),
        last_request_at: new Date().toISOString(),
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Escape for safe HTML rendering
    const safe = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Virtue Circles Contact <hello@notification.virtue-circles.com>',
        to: ['hello@virtue-circles.com'],
        reply_to: email,
        subject: subject ? `[Contact] ${safe(subject)}` : `[Contact] Message from ${safe(name)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; width: 100px;">Name:</td>
                <td style="padding: 8px;">${safe(name)}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 8px; font-weight: bold;">Email:</td>
                <td style="padding: 8px;"><a href="mailto:${safe(email)}">${safe(email)}</a></td>
              </tr>
              ${subject ? `<tr>
                <td style="padding: 8px; font-weight: bold;">Subject:</td>
                <td style="padding: 8px;">${safe(subject)}</td>
              </tr>` : ''}
              <tr style="background: #f9f9f9;">
                <td style="padding: 8px; font-weight: bold; vertical-align: top;">Message:</td>
                <td style="padding: 8px; white-space: pre-wrap;">${safe(message)}</td>
              </tr>
            </table>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">
              Sent via the Virtue Circles contact form
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Resend error: ${error}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Contact email error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
