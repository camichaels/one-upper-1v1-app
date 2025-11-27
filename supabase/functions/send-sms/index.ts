// Supabase Edge Function: send-sms
// Deploy this to: supabase/functions/send-sms/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🚨 KILL SWITCH: Set to false to disable ALL SMS (will still log to console)
const SMS_ENABLED = true;

// SMS Templates (in code for MVP)
const SMS_TEMPLATES = {
  your_turn: [
    'One-Upper: {opponent} just answered "{prompt}" - Your turn! https://oneupper.app',
    'One-Upper: {opponent} submitted "{prompt}" - Don\'t let them wait! https://oneupper.app',
    'One-Upper: {opponent} answered "{prompt}" - Your move! https://oneupper.app',
    'One-Upper: {opponent} went big on "{prompt}" - Can you top it? https://oneupper.app',
  ],
  verdict_ready: [
    'One-Upper: Results are in! See who won against {opponent}: "{prompt}" - https://oneupper.app',
    'One-Upper: The judges have spoken! You vs {opponent} on "{prompt}" - https://oneupper.app',
    'One-Upper: Verdict\'s in for "{prompt}"! Did you beat {opponent}? https://oneupper.app',
    'One-Upper: Who won "{prompt}"? You or {opponent}? See results: https://oneupper.app',
  ],
  nudge: [
    'One-Upper: {opponent} is waiting! Don\'t leave them hanging: https://oneupper.app',
    'One-Upper: Don\'t leave {opponent} hanging! Your turn: https://oneupper.app',
    'One-Upper: {opponent} wants to see what you\'ve got! Answer now: https://oneupper.app',
    'One-Upper: {opponent} nudged you! Time to answer: https://oneupper.app',
  ],
  rivalry_cancelled: [
    'One-Upper: {opponent} ended your rivalry. Your history is saved: https://oneupper.app',
    'One-Upper: Rivalry with {opponent} has ended. Thanks for playing: https://oneupper.app',
    'One-Upper: {opponent} cancelled your rivalry. History saved: https://oneupper.app',
  ],
  welcome: [
    'Welcome to One-Upper! You\'ll get updates when it\'s your turn and when results are in. Reply HELP for help, STOP to opt out. Msg & data rates may apply. ~3-6 msgs per rivalry.',
  ]
};

interface RequestBody {
  userId: string;
  notificationType: 'your_turn' | 'verdict_ready' | 'nudge' | 'rivalry_cancelled' | 'welcome';
  contextData: {
    opponent?: string;
    show_num?: string | number;
    prompt?: string;
  };
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

    const { userId, notificationType, contextData }: RequestBody = await req.json();

    // Validate input
    if (!userId || !notificationType) {
      throw new Error('userId and notificationType are required');
    }

    // 1. Get user's profile including phone number AND SMS consent
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('phone, name, sms_consent')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    if (!profile.phone) {
      console.log(`⚠️ [NO PHONE] User ${userId} (${profile.name}) has no phone number`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'no_phone',
          message: 'User has no phone number on file'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. ✅ CHECK SMS CONSENT - Critical compliance step
    if (!profile.sms_consent) {
      console.log(`🚫 [NO CONSENT] User ${userId} (${profile.name}) has not consented to SMS`);
      console.log(`   Type: ${notificationType}`);
      console.log(`   Would have sent: ${notificationType}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'no_consent',
          message: 'User has not consented to receive SMS notifications'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get random SMS template for this notification type
    const templates = SMS_TEMPLATES[notificationType];
    if (!templates || templates.length === 0) {
      throw new Error(`No templates found for notification type: ${notificationType}`);
    }

    // Pick random template
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    let message = randomTemplate;

    // 4. Replace placeholders
    if (contextData.opponent) {
      message = message.replace('{opponent}', contextData.opponent);
    }
    if (contextData.show_num) {
      message = message.replace('{show_num}', String(contextData.show_num));
    }
    if (contextData.prompt) {
      // Truncate prompt if too long (keep SMS under 160 chars ideally)
      const truncatedPrompt = contextData.prompt.length > 50 
        ? contextData.prompt.substring(0, 47) + '...'
        : contextData.prompt;
      message = message.replace('{prompt}', truncatedPrompt);
    }

    // 5. Check if SMS is globally disabled (kill switch)
    if (!SMS_ENABLED) {
      console.log('🚨 [SMS DISABLED] Kill switch activated - SMS disabled globally');
      console.log('  Would have sent to:', profile.name, `(+1${profile.phone})`);
      console.log('  Type:', notificationType);
      console.log('  Message:', message);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          disabled: true,
          message: 'SMS globally disabled via kill switch'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Check if we're in TEST MODE (no Twilio credentials)
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    const isTestMode = !twilioAccountSid || !twilioAuthToken || !twilioPhone;

    if (isTestMode) {
      // TEST MODE: Log to console instead of sending
      console.log('📱 [TEST MODE] SMS would be sent:');
      console.log('  To:', profile.name, `(+1${profile.phone})`);
      console.log('  Type:', notificationType);
      console.log('  Message:', message);
      console.log('  Context:', JSON.stringify(contextData, null, 2));
      console.log('  ✅ User has SMS consent');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          testMode: true,
          recipient: profile.name,
          phone: profile.phone,
          message: message,
          notificationType: notificationType,
          hasConsent: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. PRODUCTION MODE: Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append('To', `+1${profile.phone}`); // Assumes US phone (10 digits stored)
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

    console.log('✅ SMS sent successfully:', result.sid);
    console.log('   To:', profile.name, `(+1${profile.phone})`);
    console.log('   Type:', notificationType);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid, 
        testMode: false,
        hasConsent: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});