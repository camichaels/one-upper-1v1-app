// Supabase Edge Function: receive-sms
// Handles incoming SMS from Twilio (STOP/START keywords)
// Deploy to: supabase/functions/receive-sms/index.ts
//
// Twilio Setup:
// 1. Go to Twilio Console → Phone Numbers → Your Number
// 2. Under "Messaging", set "A message comes in" webhook to:
//    https://YOUR_PROJECT.supabase.co/functions/v1/receive-sms
// 3. Method: POST

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Twilio sends form-urlencoded data
    const formData = await req.formData();
    const from = formData.get('From') as string; // e.g., "+14155551234"
    const body = (formData.get('Body') as string || '').trim().toUpperCase();

    console.log('📨 Incoming SMS:', { from, body });

    if (!from) {
      console.log('⚠️ No "From" number in request');
      return new Response('Missing From number', { status: 400 });
    }

    // Normalize phone number - remove +1 prefix to match our stored format
    // Our DB stores: "4155551234" (10 digits)
    // Twilio sends: "+14155551234"
    let normalizedPhone = from.replace(/^\+1/, '').replace(/\D/g, '');
    
    // Handle if it's just +1 followed by 10 digits
    if (normalizedPhone.length === 11 && normalizedPhone.startsWith('1')) {
      normalizedPhone = normalizedPhone.substring(1);
    }

    console.log('📱 Normalized phone:', normalizedPhone);

    // Check for STOP keywords
    const stopKeywords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    const startKeywords = ['START', 'UNSTOP', 'SUBSCRIBE', 'YES'];

    if (stopKeywords.includes(body)) {
      // User wants to opt out
      console.log('🛑 STOP received - opting out all profiles for:', normalizedPhone);

      const { data: profiles, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('id, name')
        .eq('phone', normalizedPhone);

      if (fetchError) {
        console.error('Error fetching profiles:', fetchError);
        throw fetchError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No profiles found for phone:', normalizedPhone);
      } else {
        // Update all profiles for this phone
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ 
            sms_consent: false, 
            twilio_blocked: true 
          })
          .eq('phone', normalizedPhone);

        if (updateError) {
          console.error('Error updating profiles:', updateError);
          throw updateError;
        }

        console.log(`✅ Opted out ${profiles.length} profile(s):`, profiles.map(p => p.name).join(', '));
      }

      // Return TwiML response (empty is fine - Twilio handles STOP response automatically)
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/xml' 
          } 
        }
      );

    } else if (startKeywords.includes(body)) {
      // User wants to opt back in at carrier level
      console.log('✅ START received - unblocking all profiles for:', normalizedPhone);

      const { data: profiles, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('id, name')
        .eq('phone', normalizedPhone);

      if (fetchError) {
        console.error('Error fetching profiles:', fetchError);
        throw fetchError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ No profiles found for phone:', normalizedPhone);
      } else {
        // Only set twilio_blocked to false - don't auto-enable sms_consent
        // User must explicitly opt in via the app for consent trail
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ twilio_blocked: false })
          .eq('phone', normalizedPhone);

        if (updateError) {
          console.error('Error updating profiles:', updateError);
          throw updateError;
        }

        console.log(`✅ Unblocked ${profiles.length} profile(s):`, profiles.map(p => p.name).join(', '));
      }

      // Return TwiML response
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/xml' 
          } 
        }
      );

    } else {
      // Some other message - just log it
      console.log('💬 Other message received (ignoring):', body);
      
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/xml' 
          } 
        }
      );
    }

  } catch (error) {
    console.error('❌ Error in receive-sms function:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml' 
        } 
      }
    );
  }
});