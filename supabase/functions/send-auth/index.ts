// Supabase Edge Function: send-auth
// Sends magic link + 6-digit code for phone verification
// Deploy to: supabase/functions/send-auth/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a random 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a random token for magic link
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone } = await req.json();

    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Normalize phone (remove non-digits, handle +1)
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
      normalizedPhone = normalizedPhone.substring(1);
    }

    if (normalizedPhone.length !== 10) {
      throw new Error('Invalid phone number');
    }

    console.log('📱 Sending auth to:', normalizedPhone);

    // Check if any profiles exist for this phone
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, name')
      .eq('phone', normalizedPhone);

    if (profileError) {
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️ No profiles found for phone:', normalizedPhone);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'no_profiles',
          message: 'No profiles found for this phone number'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token and code
    const token = generateToken();
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store in auth_tokens table
    const { error: insertError } = await supabaseClient
      .from('auth_tokens')
      .insert({
        phone: normalizedPhone,
        token: token,
        code: code,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) {
      console.error('Error storing auth token:', insertError);
      throw insertError;
    }

    // Send SMS via Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhone) {
      console.log('⚠️ Twilio not configured - test mode');
      console.log('  Token:', token);
      console.log('  Code:', code);
      console.log('  Expires:', expiresAt.toISOString());
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          testMode: true,
          message: 'Auth code generated (Twilio not configured)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build SMS message
    const magicLink = `https://oneupper.app/auth/${token}`;
    const message = `One-Upper: Access your profiles: ${magicLink} — or enter code ${code} at oneupper.app/verify`;

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append('To', `+1${normalizedPhone}`);
    formData.append('From', twilioPhone);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      throw new Error(`Twilio error: ${errorText}`);
    }

    const result = await twilioResponse.json();
    console.log('✅ Auth SMS sent:', result.sid);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Verification code sent'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-auth:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});