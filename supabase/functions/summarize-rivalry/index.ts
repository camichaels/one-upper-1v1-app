// Supabase Edge Function: summarize-rivalry
// Deploy this to: supabase/functions/summarize-rivalry/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const RIVALRY_LENGTH = 11; // Must match config.js

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { rivalryId } = await req.json();

    if (!rivalryId) {
      return new Response(
        JSON.stringify({ error: 'rivalryId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch rivalry with profiles
    const { data: rivalry, error: rivalryError } = await supabase
      .from('rivalries')
      .select(`
        *,
        profile_a:profiles!rivalries_profile_a_id_fkey(id, name, avatar),
        profile_b:profiles!rivalries_profile_b_id_fkey(id, name, avatar)
      `)
      .eq('id', rivalryId)
      .single();

    if (rivalryError || !rivalry) {
      return new Response(
        JSON.stringify({ error: 'Rivalry not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If summary already exists, return it (idempotency)
    if (rivalry.summary) {
      const existingSummary = typeof rivalry.summary === 'string' 
        ? JSON.parse(rivalry.summary)
        : rivalry.summary;
      return new Response(
        JSON.stringify(existingSummary),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all shows for this rivalry
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .eq('rivalry_id', rivalryId)
      .eq('status', 'complete')
      .order('show_number', { ascending: true });

    if (showsError || !shows) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch shows' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate final scores
    let playerAWins = 0;
    let playerBWins = 0;
    let playerATotalPoints = 0;
    let playerBTotalPoints = 0;

    shows.forEach(show => {
      if (show.winner_id === rivalry.profile_a.id) {
        playerAWins++;
      } else if (show.winner_id === rivalry.profile_b.id) {
        playerBWins++;
      }

      // Calculate total points from judge_data
      if (show.judge_data && show.judge_data.scores) {
        const playerAScore = show.judge_data.scores
          .filter((s: any) => s.player === 'a')
          .reduce((sum: number, s: any) => sum + s.score, 0);
        const playerBScore = show.judge_data.scores
          .filter((s: any) => s.player === 'b')
          .reduce((sum: number, s: any) => sum + s.score, 0);
        
        playerATotalPoints += playerAScore;
        playerBTotalPoints += playerBScore;
      }
    });

    // Determine winner with tiebreaker logic
    let winnerId = rivalry.profile_a.id;
    let tiebreaker = null;

    if (playerAWins > playerBWins) {
      winnerId = rivalry.profile_a.id;
    } else if (playerBWins > playerAWins) {
      winnerId = rivalry.profile_b.id;
    } else {
      // W/L tied - use total points
      if (playerATotalPoints > playerBTotalPoints) {
        winnerId = rivalry.profile_a.id;
        tiebreaker = `Won ${playerATotalPoints}-${playerBTotalPoints} on total points`;
      } else if (playerBTotalPoints > playerATotalPoints) {
        winnerId = rivalry.profile_b.id;
        tiebreaker = `Won ${playerBTotalPoints}-${playerATotalPoints} on total points`;
      } else {
        // Both W/L and points tied - use show 11 winner (extremely rare)
        const finalShow = shows.find(s => s.show_number === RIVALRY_LENGTH);
        winnerId = finalShow?.winner_id || rivalry.profile_a.id;
        tiebreaker = 'Won on final show tiebreaker';
      }
    }

    // Prepare show summaries for AI (show number, prompt, both answers, scores, winner)
    const showSummaries = shows.map(show => {
      let playerAScore = 0;
      let playerBScore = 0;
      
      // Calculate total scores from judge_data
      if (show.judge_data && show.judge_data.scores) {
        playerAScore = show.judge_data.scores
          .filter((s: any) => s.player === 'a')
          .reduce((sum: number, s: any) => sum + s.score, 0);
        playerBScore = show.judge_data.scores
          .filter((s: any) => s.player === 'b')
          .reduce((sum: number, s: any) => sum + s.score, 0);
      }
      
      const margin = Math.abs(playerAScore - playerBScore);
      const winner = show.winner_id === rivalry.profile_a.id ? 'Player A' : 'Player B';
      
      return {
        show_number: show.show_number,
        prompt: show.prompt,
        player_a_answer: show.profile_a_answer,
        player_a_score: playerAScore,
        player_b_answer: show.profile_b_answer,
        player_b_score: playerBScore,
        winner: winner,
        margin: margin
      };
    });

    // Call Claude API for analysis
    const claudePrompt = `You are analyzing a completed ${RIVALRY_LENGTH}-show creative rivalry between two players. Generate a compelling summary.

PLAYERS:
- Player A: ${rivalry.profile_a.name}
- Player B: ${rivalry.profile_b.name}

FINAL SCORE:
- Player A: ${playerAWins} wins (${playerATotalPoints} total points)
- Player B: ${playerBWins} wins (${playerBTotalPoints} total points)
- Winner: ${winnerId === rivalry.profile_a.id ? 'Player A' : 'Player B'}

SHOWS (${shows.length} total):
${showSummaries.map(s => `
Show ${s.show_number}: "${s.prompt}"
- ${rivalry.profile_a.name}: "${s.player_a_answer}" (${s.player_a_score} points)
- ${rivalry.profile_b.name}: "${s.player_b_answer}" (${s.player_b_score} points)
- Winner: ${s.winner} (+${s.margin} margin)
`).join('\n')}

Generate a JSON response with this structure:
{
  "analysis": "2-3 sentence narrative about the rivalry arc. Use the scores to identify patterns: Were games close or blowouts? Any comeback stories? Momentum shifts? Make it engaging and specific to what happened.",
  "player_profiles": {
    "player_a_style": "One sentence describing Player A's creative style based on their answers (e.g., 'Bold risk-taker', 'Witty wordsmith', 'Absurdist humor')",
    "player_b_style": "One sentence describing Player B's creative style based on their answers"
  },
  "memorable_moments": [
    "Brief description of 1-2 standout shows - focus on close games, big upsets, or particularly clever answers"
  ]
}

Requirements:
- Keep analysis under 100 words
- Be specific - mention actual prompts/answers when relevant
- Note if games were consistently close (margins <5) or if one player dominated
- Use player names (${rivalry.profile_a.name} and ${rivalry.profile_b.name}), not "Player A/B"
- Focus on what made this rivalry unique
- Celebrate creativity, not just winning

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no extra text.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: claudePrompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const aiAnalysis = JSON.parse(claudeData.content[0].text);

    // Build final summary object
    const summary = {
      final_score: {
        player_a_wins: playerAWins,
        player_b_wins: playerBWins,
        player_a_total_points: playerATotalPoints,
        player_b_total_points: playerBTotalPoints,
        tiebreaker: tiebreaker
      },
      winner_id: winnerId,
      analysis: aiAnalysis.analysis,
      player_profiles: aiAnalysis.player_profiles,
      memorable_moments: aiAnalysis.memorable_moments || []
    };

    // Update rivalry with summary and completion status
    const { error: updateError } = await supabase
      .from('rivalries')
      .update({
        status: 'complete',
        ended_at: new Date().toISOString(),
        summary: summary,
        mic_holder_id: winnerId
      })
      .eq('id', rivalryId);

    if (updateError) {
      console.error('Failed to update rivalry:', updateError);
      // Don't fail the request - summary was still generated
    }

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-rivalry:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});