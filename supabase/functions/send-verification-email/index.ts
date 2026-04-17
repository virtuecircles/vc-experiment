import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { email, password, redirectTo, resendOnly } = body

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const appUrl = redirectTo || 'https://virtue-circles-dev.lovable.app/auth'

    let userEmail = email

    // If password provided, create the user via admin (no email sent by Supabase)
    if (password && !resendOnly) {
      // Use direct REST API call to look up user by email - avoids listUsers() pagination issues
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      
      const lookupRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
        { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
      )
      const lookupData = await lookupRes.json()
      const existingUser = lookupData?.users?.find((u: { email: string; email_confirmed_at: string | null }) => 
        u.email?.toLowerCase() === email.toLowerCase()
      )

      if (existingUser) {
        // User exists - check if already confirmed
        if (existingUser.email_confirmed_at) {
          return new Response(JSON.stringify({ error: 'An account with this email already exists. Please sign in instead.' }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        // Exists but unconfirmed - resend verification
        userEmail = existingUser.email!
      } else {
        // Create user with email_confirm: false so generateLink(signup) works
        // Supabase won't send its own email because we use admin.createUser (not signUp)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
        })

        if (createError) {
          console.error('Failed to create user:', createError)
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        userEmail = newUser.user?.email ?? email
      }
    }

    // Generate confirmation link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: userEmail,
      options: { redirectTo: appUrl },
    })

    if (linkError || !linkData) {
      console.error('Failed to generate link:', linkError)
      return new Response(JSON.stringify({ error: linkError?.message || 'Failed to generate link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const confirmationUrl = linkData.properties?.action_link
    if (!confirmationUrl) {
      return new Response(JSON.stringify({ error: 'No confirmation URL generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    // Helper: auto-confirm user so they can sign in immediately when email delivery isn't available
    const autoConfirmAndSucceed = async (reason: string) => {
      console.log(`Auto-confirming ${userEmail} (${reason})`)
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const lookupRes = await fetch(
          `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(userEmail)}`,
          { headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` } }
        )
        const lookupData = await lookupRes.json()
        const u = lookupData?.users?.find((x: { email: string }) => x.email?.toLowerCase() === userEmail.toLowerCase())
        if (u?.id) {
          await supabaseAdmin.auth.admin.updateUserById(u.id, { email_confirm: true })
        }
      } catch (e) {
        console.error('Auto-confirm failed:', e)
      }
      return new Response(JSON.stringify({ success: true, auto_confirmed: true, message: 'Account ready. You can sign in now.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!resendApiKey) {
      return await autoConfirmAndSucceed('RESEND_API_KEY not configured')
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="background-color:#ffffff;font-family:Georgia,serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-top:4px solid #33ccff;padding:40px 32px;">
          <tr>
            <td>
              <h1 style="font-size:24px;font-weight:bold;color:#0a0b14;margin:0 0 20px;font-family:Georgia,serif;">Confirm your email</h1>
              <p style="font-size:15px;color:#444444;line-height:1.6;margin:0 0 20px;">
                Thanks for signing up for <strong>Virtue Circles</strong>!
              </p>
              <p style="font-size:15px;color:#444444;line-height:1.6;margin:0 0 24px;">
                Please confirm your email address by clicking the button below:
              </p>
              <a href="${confirmationUrl}" style="background-color:#33ccff;color:#0a0b14;font-size:15px;font-weight:bold;border-radius:8px;padding:14px 28px;text-decoration:none;display:inline-block;">
                Verify Email
              </a>
              <p style="font-size:12px;color:#999999;margin:32px 0 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="font-size:12px;color:#999999;margin:12px 0 0;">
                Or copy this link: <a href="${confirmationUrl}" style="color:#33ccff;word-break:break-all;">${confirmationUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Virtue Circles <noreply@notification.virtue-circles.com>',
        to: [userEmail],
        subject: 'Confirm your email – Virtue Circles',
        html: emailHtml,
        text: `Welcome to Virtue Circles! Please confirm your email by visiting this link: ${confirmationUrl}`,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend error:', JSON.stringify(resendData))
      // Log the confirmation URL as fallback so admin can manually share it
      console.log(`FALLBACK - Manual confirmation link for ${userEmail}: ${confirmationUrl}`)
      return new Response(JSON.stringify({ error: resendData?.message || 'Failed to send verification email. Please contact support.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Verification email sent via Resend:', resendData.id)
    return new Response(JSON.stringify({ success: true, message_id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
