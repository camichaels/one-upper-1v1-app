// Supabase Edge Function: select-emcee-line
// Deploy this to: supabase/functions/select-emcee-line/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
serve(async (req)=>{
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { rivalryId, showNumber, triggerType: overrideTriggerType } = await req.json();
    if (!rivalryId || showNumber === undefined) {
      return new Response(JSON.stringify({
        error: 'rivalryId and showNumber are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Determine trigger type
    let triggerType = 'show_transition';
    if (overrideTriggerType) {
      // Allow manual override (for rivalry_intro at showNumber 0)
      triggerType = overrideTriggerType;
    } else if ([
      5,
      10,
      20
    ].includes(showNumber)) {
      // Milestone shows get special treatment
      triggerType = 'milestone';
    }
    // Otherwise default to 'show_transition'
    // Fetch rivalry data with profiles
    const { data: rivalry, error: rivalryError } = await supabase.from('rivalries').select(`
        *,
        profile_a:profiles!rivalries_profile_a_id_fkey(id, name),
        profile_b:profiles!rivalries_profile_b_id_fkey(id, name)
      `).eq('id', rivalryId).single();
    if (rivalryError || !rivalry) {
      return new Response(JSON.stringify({
        error: 'Rivalry not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Fetch previous shows to calculate rivalry state
    const { data: previousShows } = await supabase.from('shows').select('winner_id, show_number').eq('rivalry_id', rivalryId).eq('status', 'complete').order('show_number', {
      ascending: false
    });
    // Calculate scores
    let profileAScore = 0;
    let profileBScore = 0;
    let lastWinnerId = null;
    let currentStreak = 0;
    if (previousShows && previousShows.length > 0) {
      previousShows.forEach((show)=>{
        if (show.winner_id === rivalry.profile_a.id) {
          profileAScore++;
        } else {
          profileBScore++;
        }
      });
      // Calculate current streak
      lastWinnerId = previousShows[0].winner_id;
      for (const show of previousShows){
        if (show.winner_id === lastWinnerId) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
    // Determine leader and scores
    let player1 = rivalry.profile_a;
    let player2 = rivalry.profile_b;
    let p1Score = profileAScore;
    let p2Score = profileBScore;
    // Make player1 the leader (or profile_a if tied)
    if (profileBScore > profileAScore) {
      player1 = rivalry.profile_b;
      player2 = rivalry.profile_a;
      p1Score = profileBScore;
      p2Score = profileAScore;
    }
    // Determine condition
    let conditions = [
      'any'
    ];
    if (triggerType === 'milestone') {
      conditions.push(`show_${showNumber}`);
    } else if (triggerType === 'show_transition' && showNumber > 1) {
      const scoreDiff = Math.abs(p1Score - p2Score);
      if (scoreDiff === 0) {
        conditions.push('tied_game');
      } else if (scoreDiff === 1) {
        conditions.push('close_game');
      } else if (scoreDiff >= 2 && scoreDiff <= 3) {
        conditions.push('leader_ahead_2plus');
      } else if (scoreDiff >= 4) {
        conditions.push('blowout');
      }
      if (currentStreak >= 3) {
        conditions.push('streak_3plus');
      }
      // Check if losing player just won (comeback brewing)
      if (previousShows && previousShows.length > 0 && previousShows[0].winner_id !== lastWinnerId) {
        conditions.push('comeback_brewing');
      }
    }
    // Fetch matching emcee lines
    const { data: emceeLines, error: linesError } = await supabase.from('emcee_lines').select('*').eq('trigger_type', triggerType).in('condition', conditions);
    if (linesError || !emceeLines || emceeLines.length === 0) {
      // Fallback to generic 'any' condition
      const { data: fallbackLines } = await supabase.from('emcee_lines').select('*').eq('trigger_type', 'show_transition').eq('condition', 'any');
      if (fallbackLines && fallbackLines.length > 0) {
        const selected = weightedRandom(fallbackLines);
        const filledText = fillPlaceholders(selected.text, player1, player2, showNumber, p1Score, p2Score, currentStreak);
        return new Response(JSON.stringify({
          emcee_text: filledText
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Ultimate fallback
      return new Response(JSON.stringify({
        emcee_text: `Show ${showNumber}. Let's see what you've got.`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Weighted random selection
    const selectedLine = weightedRandom(emceeLines);
    // Fill placeholders
    const filledText = fillPlaceholders(selectedLine.text, player1, player2, showNumber, p1Score, p2Score, currentStreak);
    return new Response(JSON.stringify({
      emcee_text: filledText
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in select-emcee-line:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
// Weighted random selection
function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item)=>sum + (item.weight || 5), 0);
  let random = Math.random() * totalWeight;
  for (const item of items){
    random -= item.weight || 5;
    if (random <= 0) {
      return item;
    }
  }
  return items[0];
}
// Fill placeholders in emcee text
function fillPlaceholders(text, player1, player2, showNumber, p1Score, p2Score, streakCount) {
  return text.replace(/{player1}/g, player1.name).replace(/{player2}/g, player2.name).replace(/{show_num}/g, showNumber.toString()).replace(/{p1_score}/g, p1Score.toString()).replace(/{p2_score}/g, p2Score.toString()).replace(/{score}/g, p1Score.toString()) // For tied games
  .replace(/{streak_count}/g, streakCount.toString());
}
