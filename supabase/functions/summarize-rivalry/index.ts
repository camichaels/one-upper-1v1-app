// Supabase Edge Function: summarize-rivalry
// Deploy this to: supabase/functions/summarize-rivalry/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const RIVALRY_LENGTH = 5; // Must match config.js

// Ripley's personality - reusable across functions
const RIPLEY_PROFILE = `You are Ripley, the emcee of One-Upper. Your voice is:
- Witty and sharp, but never mean
- Sports announcer meets late-night host
- Short punchy sentences, not verbose
- You celebrate boldness and creativity
- You know the judges personally and comment on their quirks
- You want players to come back — encouraging even to losers
- Slightly sardonic, but warm underneath
- You speak directly to players ("you", not "they")

Examples of Ripley's tone:
- "That wasn't a rivalry, that was a clinic."
- "Savage ate that up. You read the room."
- "Close one. Three more points and we're having a different conversation."
- "Bold swings, not all of them landed. But I respect the commitment."
- "The judges wanted weird. You gave them weird. Simple math."`;

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

    // RACE CONDITION PREVENTION: Try to claim this rivalry for summary generation
    const { data: claimResult, error: claimError } = await supabase
      .from('rivalries')
      .update({ status: 'summarizing' })
      .eq('id', rivalryId)
      .eq('status', 'active')
      .select()
      .single();
    
    if (claimError || !claimResult) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: refreshedRivalry } = await supabase
        .from('rivalries')
        .select('summary, status')
        .eq('id', rivalryId)
        .single();
      
      if (refreshedRivalry?.summary) {
        const existingSummary = typeof refreshedRivalry.summary === 'string'
          ? JSON.parse(refreshedRivalry.summary)
          : refreshedRivalry.summary;
        return new Response(
          JSON.stringify(existingSummary),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Summary generation in progress. Please wait and try again.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Fetch judge profiles from database (only the ones used in this rivalry)
    const judgeKeys = rivalry.judges || [];
    let rivalryJudges: Array<{ key: string; name: string; emoji: string; description: string }> = [];
    
    if (judgeKeys.length > 0) {
      const { data: judgesData, error: judgesError } = await supabase
        .from('judges')
        .select('key, name, emoji, description')
        .in('key', judgeKeys);
      
      if (!judgesError && judgesData) {
        rivalryJudges = judgesData;
      }
    }
    
    // Fallback if no judges found
    if (rivalryJudges.length === 0) {
      rivalryJudges = judgeKeys.map((key: string) => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        emoji: '⚖️',
        description: 'A judge'
      }));
    }

    // Calculate scores and stats
    let playerAWins = 0;
    let playerBWins = 0;
    let playerATotalPoints = 0;
    let playerBTotalPoints = 0;

    // Per-judge tracking for "Judge's Favorite" stat
    const judgeScoreDiffs: Record<string, { total: number; count: number; name: string; emoji: string }> = {};

    // Track per-round data for stats
    const roundStats: Array<{
      round: number;
      winnerName: string;
      winnerId: string;
      margin: number;
      playerAScore: number;
      playerBScore: number;
      unanimous: boolean;
    }> = [];

    shows.forEach(show => {
      if (show.winner_id === rivalry.profile_a.id) {
        playerAWins++;
      } else if (show.winner_id === rivalry.profile_b.id) {
        playerBWins++;
      }

      let playerAScore = 0;
      let playerBScore = 0;
      let judgeVotes = { a: 0, b: 0 };

      if (show.judge_data && show.judge_data.scores) {
        const scores = show.judge_data.scores;
        
        for (const judgeName in scores) {
          const judgeScores = scores[judgeName];
          const aScore = judgeScores.profile_a_score || 0;
          const bScore = judgeScores.profile_b_score || 0;
          
          playerAScore += aScore;
          playerBScore += bScore;
          playerATotalPoints += aScore;
          playerBTotalPoints += bScore;

          // Track who each judge voted for
          if (aScore > bScore) judgeVotes.a++;
          else if (bScore > aScore) judgeVotes.b++;

          // Track per-judge score differences (positive = favors A)
          const judgeKey = judgeName.toLowerCase().replace(/\s+/g, '');
          const matchedJudge = rivalryJudges.find((j: any) => 
            j.name.toLowerCase() === judgeName.toLowerCase() || j.key === judgeKey
          );
          
          if (matchedJudge) {
            if (!judgeScoreDiffs[matchedJudge.key]) {
              judgeScoreDiffs[matchedJudge.key] = { 
                total: 0, 
                count: 0, 
                name: matchedJudge.name, 
                emoji: matchedJudge.emoji 
              };
            }
            judgeScoreDiffs[matchedJudge.key].total += (aScore - bScore);
            judgeScoreDiffs[matchedJudge.key].count++;
          }
        }
      }

      const margin = Math.abs(playerAScore - playerBScore);
      const winnerName = show.winner_id === rivalry.profile_a.id 
        ? rivalry.profile_a.name 
        : rivalry.profile_b.name;
      
      // Check if unanimous (all judges agreed)
      const totalJudges = Object.keys(show.judge_data?.scores || {}).length;
      const unanimous = (judgeVotes.a === totalJudges || judgeVotes.b === totalJudges);

      roundStats.push({
        round: show.show_number,
        winnerName,
        winnerId: show.winner_id,
        margin,
        playerAScore,
        playerBScore,
        unanimous
      });
    });

    // Determine winner with tiebreaker logic
    let winnerId = rivalry.profile_a.id;
    let winnerName = rivalry.profile_a.name;
    let loserName = rivalry.profile_b.name;
    let winnerWins = playerAWins;
    let loserWins = playerBWins;
    let winnerTotalPoints = playerATotalPoints;
    let loserTotalPoints = playerBTotalPoints;
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
        // Both tied - use final show winner
        const finalShow = shows.find(s => s.show_number === RIVALRY_LENGTH);
        winnerId = finalShow?.winner_id || rivalry.profile_a.id;
        tiebreaker = 'Won on final round tiebreaker';
      }
    }

    // Set winner/loser names and scores correctly
    if (winnerId === rivalry.profile_b.id) {
      winnerName = rivalry.profile_b.name;
      loserName = rivalry.profile_a.name;
      winnerWins = playerBWins;
      loserWins = playerAWins;
      winnerTotalPoints = playerBTotalPoints;
      loserTotalPoints = playerATotalPoints;
    }

    // Calculate computed stats
    const biggestBlowout = roundStats.reduce((max, r) => r.margin > max.margin ? r : max, roundStats[0]);
    const closestRound = roundStats.reduce((min, r) => r.margin < min.margin ? r : min, roundStats[0]);
    const unanimousRounds = roundStats.filter(r => r.unanimous).length;

    // Judge's favorite - find judge with biggest avg score diff
    let judgesFavorite = null;
    let maxAvgDiff = 0;
    
    for (const judgeKey in judgeScoreDiffs) {
      const judge = judgeScoreDiffs[judgeKey];
      const avgDiff = Math.abs(judge.total / judge.count);
      if (avgDiff > maxAvgDiff) {
        maxAvgDiff = avgDiff;
        const favoredPlayer = judge.total > 0 ? rivalry.profile_a.name : rivalry.profile_b.name;
        judgesFavorite = {
          judge_name: judge.name,
          judge_emoji: judge.emoji,
          favored_player: favoredPlayer,
          avg_margin: Math.round(avgDiff * 10) / 10
        };
      }
    }

    // Prepare show summaries for AI
    const showSummaries = shows.map(show => {
      const rs = roundStats.find(r => r.round === show.show_number)!;
      
      return {
        round: show.show_number,
        prompt: show.prompt,
        player_a_name: rivalry.profile_a.name,
        player_a_answer: show.profile_a_answer,
        player_a_score: rs.playerAScore,
        player_b_name: rivalry.profile_b.name,
        player_b_answer: show.profile_b_answer,
        player_b_score: rs.playerBScore,
        winner: rs.winnerName,
        margin: rs.margin,
        unanimous: rs.unanimous
      };
    });

    // Build judge context string
    const judgeContext = rivalryJudges.map((j: any) => 
      `- ${j.name} ${j.emoji}: ${j.description}`
    ).join('\n');

    // Call Claude API for analysis
    const claudePrompt = `${RIPLEY_PROFILE}

JUDGES FOR THIS RIVALRY:
${judgeContext}

RIVALRY RESULTS:
- Winner: ${winnerName} (${winnerWins} rounds, ${winnerTotalPoints} total points)
- Loser: ${loserName} (${loserWins} rounds, ${loserTotalPoints} total points)
${tiebreaker ? `- Tiebreaker: ${tiebreaker}` : ''}

ROUND BY ROUND:
${showSummaries.map(s => `
Round ${s.round}: "${s.prompt}"
- ${s.player_a_name}: "${s.player_a_answer}" (${s.player_a_score} points)
- ${s.player_b_name}: "${s.player_b_answer}" (${s.player_b_score} points)
- Winner: ${s.winner} (+${s.margin} margin)${s.unanimous ? ' [UNANIMOUS]' : ''}
`).join('\n')}

Generate a JSON response as Ripley analyzing this rivalry:

{
  "headline": "A 5-8 word headline capturing this rivalry's essence. Make it memorable — like a sports headline or movie title. Can reference a standout moment, the winner, or the rivalry's vibe.",
  
  "ripley_analysis": "3-4 sentences in Ripley's voice. Cover: the overall arc, one specific standout moment (reference an actual answer or round), and note any judge dynamics that mattered. Punchy, not verbose.",
  
  "ripley_tip": "1-2 sentences of forward-looking advice for BOTH players based on patterns in THIS rivalry. Address each by name. Be specific — reference actual tendencies you noticed. Encouraging but honest.",
  
  "winner_style": {
    "short": "2-4 words capturing their creative vibe (e.g., 'Clever wordsmith', 'Chaotic genius', 'Relatable storyteller')",
    "detail": "One sentence explaining their approach based on their answers"
  },
  
  "loser_style": {
    "short": "2-4 words capturing their creative vibe",
    "detail": "One sentence explaining their approach based on their answers"
  }
}

Requirements:
- Use player names (${rivalry.profile_a.name} and ${rivalry.profile_b.name}), never "Player A/B" or "Winner/Loser"
- Keep ripley_analysis under 75 words
- Keep ripley_tip under 40 words
- Be specific — mention actual prompts, answers, or rounds when relevant
- Celebrate creativity, even for the loser
- Reference judges by name when relevant

Respond ONLY with valid JSON. No markdown, no code blocks, no extra text.`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: claudePrompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    
    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(claudeData.content[0].text);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', claudeData.content[0].text);
      throw new Error('Failed to parse AI response');
    }

    // Build final summary object
    const summary = {
      final_score: {
        winner_id: winnerId,
        winner_name: winnerName,
        loser_name: loserName,
        winner_wins: winnerWins,
        loser_wins: loserWins,
        winner_total_points: winnerTotalPoints,
        loser_total_points: loserTotalPoints,
        tiebreaker: tiebreaker
      },
      ai_generated: {
        headline: aiAnalysis.headline,
        ripley_analysis: aiAnalysis.ripley_analysis,
        ripley_tip: aiAnalysis.ripley_tip,
        winner_style: aiAnalysis.winner_style,
        loser_style: aiAnalysis.loser_style
      },
      stats: {
        biggest_blowout: {
          round: biggestBlowout.round,
          winner_name: biggestBlowout.winnerName,
          margin: biggestBlowout.margin
        },
        closest_round: {
          round: closestRound.round,
          winner_name: closestRound.winnerName,
          margin: closestRound.margin
        },
        judges_favorite: judgesFavorite,
        unanimous_rounds: unanimousRounds
      }
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