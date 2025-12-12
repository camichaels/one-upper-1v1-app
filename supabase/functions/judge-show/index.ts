// Supabase Edge Function: judge-show
// Deploy this to: supabase/functions/judge-show/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface JudgeShowRequest {
  showId: string
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request - wrap in try-catch for better error handling
    let requestBody
    try {
      requestBody = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { showId } = requestBody as JudgeShowRequest

    if (!showId) {
      return new Response(
        JSON.stringify({ error: 'showId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch show with all necessary data
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select(`
        *,
        rivalry:rivalries!inner(
          profile_a:profiles!rivalries_profile_a_id_fkey(id, name),
          profile_b:profiles!rivalries_profile_b_id_fkey(id, name)
        )
      `)
      .eq('id', showId)
      .single()

    if (showError || !show) {
      return new Response(
        JSON.stringify({ error: 'Show not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // IDEMPOTENCY CHECK: If show is already complete, return existing results
    if (show.status === 'complete' && show.winner_id) {
      console.log(`Show ${showId} already judged - returning existing results`)
      return new Response(
        JSON.stringify({ 
          success: true, 
          winner_id: show.winner_id,
          already_judged: true,
          message: 'Show was already judged'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch judge profiles
    const { data: judges, error: judgesError } = await supabase
      .from('judges')
      .select('*')
      .in('key', show.judges)

    if (judgesError || !judges || judges.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Failed to load judges' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch recent rivalry history (last 5 completed shows) for rivalry commentary
    const { data: recentShows, error: historyError } = await supabase
      .from('shows')
      .select('show_number, prompt, profile_a_answer, profile_b_answer, winner_id, judge_data')
      .eq('rivalry_id', show.rivalry_id)
      .eq('status', 'complete')
      .order('show_number', { ascending: false })
      .limit(5)

    // Build rivalry context string
    let rivalryContext = ''
    if (!historyError && recentShows && recentShows.length > 0) {
      const profileA = show.rivalry.profile_a
      const profileB = show.rivalry.profile_b
      
      // Calculate stats
      const totalShows = show.show_number - 1 // Current show hasn't been judged yet
      const profileAWins = recentShows.filter(s => s.winner_id === profileA.id).length
      const profileBWins = recentShows.filter(s => s.winner_id === profileB.id).length
      
      rivalryContext = `
RIVALRY CONTEXT (for your commentary):
- Total shows completed: ${totalShows}
- Current standings: ${profileA.name} ${profileAWins} wins, ${profileB.name} ${profileBWins} wins
- Recent shows (newest first):
${recentShows.map((s, i) => {
  const winner = s.winner_id === profileA.id ? profileA.name : profileB.name
  const avgScore = s.judge_data?.scores ? 
    Object.values(s.judge_data.scores).reduce((sum: number, data: any) => {
      const total = (data.profile_a_score || 0) + (data.profile_b_score || 0)
      return sum + total
    }, 0) / (Object.keys(s.judge_data.scores).length * 2) : 0
  
  return `  Show ${s.show_number}: "${s.prompt}"
    ${profileA.name}: "${s.profile_a_answer}"
    ${profileB.name}: "${s.profile_b_answer}"
    Winner: ${winner} (avg score: ${avgScore.toFixed(1)}/10)`
}).join('\n')}
`
    }

    // Build prompt from template
    const profileA = show.rivalry.profile_a
    const profileB = show.rivalry.profile_b

    let prompt = `You are the judging panel for "One-Upper," a comedy competition.

RULES:
- Each judge scores independently based on their personality
- Scores are 1-10 (whole numbers only)
- One-liners must be UNDER 12 words and in the judge's voice
- Winner is determined by total score across all judges
- Banter should be 3-4 lines, feel like a real conversation

PROMPT: "${show.prompt}"

PLAYER A: ${profileA.name}
ANSWER: "${show.profile_a_answer}"

PLAYER B: ${profileB.name}
ANSWER: "${show.profile_b_answer}"

JUDGES:
${judges[0].name} (${judges[0].emoji}): ${judges[0].description}
Example one-liners: ${judges[0].examples}

${judges[1].name} (${judges[1].emoji}): ${judges[1].description}
Example one-liners: ${judges[1].examples}

${judges[2].name} (${judges[2].emoji}): ${judges[2].description}
Example one-liners: ${judges[2].examples}

SCORING GUIDELINES:
- 9-10: Exceptional, standout answer
- 7-8: Strong, funny, works well
- 5-6: Decent but not memorable
- 3-4: Weak, missed the mark
- 1-2: Terrible, completely off

IMPORTANT - NO TIES: Each judge MUST give different scores to each player. Do NOT give both players the same score. Even if answers are close in quality, find a reason to prefer one — creativity, timing, risk-taking, anything. A 1-point difference is fine. Ties are unsatisfying for players.

${rivalryContext}

ADDITIONAL TASK - RIVALRY COMMENTARY:
One of you judges will provide 2-3 sentence commentary on the overall rivalry arc. This should:
- Comment on playing styles/strategies you're observing
- Note rivalry dynamics (competitive? one-sided? evolving?)
- Provide character insights about the players
- Focus on what makes this rivalry interesting, NOT just who's ahead
- Stay in YOUR character voice
- Be 2-3 sentences max, punchy and insightful

ADDITIONAL TASK - ARTIFACTS:
Generate 3 fun artifacts about the answers. Pick the funniest player/answer for each:

1. CELEBRITY MATCH (10-15 words): Which celebrity would say this answer? Be specific.
   Format: "[Player]'s answer sounds exactly like something [Celebrity Name] would say"

2. FAKE HEADLINE (15-25 words): Write a funny news headline based on their answer.
   Format: "Breaking: [Absurd headline referencing their actual answer]"
   Make it punchy and absurd, like a real clickbait headline.

3. FACT CHECK (20-30 words): Write a playful fact-check roast about their answer.
   Format: "Fact Check: Did you know [absurd fact]? [Player]'s answer suggests they didn't."
   Setup the "fact" then deliver the roast.

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation before or after.

Format:
{
  "winner": "${profileA.name} or ${profileB.name}",
  "winner_total_score": 0,
  "loser_total_score": 0,
  "scores": [
    {
      "judge": "${judges[0].name}",
      "judge_emoji": "${judges[0].emoji}",
      "player_a_score": 0,
      "player_b_score": 0,
      "one_liner": "..."
    },
    {
      "judge": "${judges[1].name}",
      "judge_emoji": "${judges[1].emoji}",
      "player_a_score": 0,
      "player_b_score": 0,
      "one_liner": "..."
    },
    {
      "judge": "${judges[2].name}",
      "judge_emoji": "${judges[2].emoji}",
      "player_a_score": 0,
      "player_b_score": 0,
      "one_liner": "..."
    }
  ],
  "banter": "Judge1: comment\\nJudge2: response\\nJudge3: response\\nJudge1: final word",
  "rivalry_comment": {
    "judge": "one of the three judge names above",
    "text": "2-3 sentence commentary on the rivalry arc"
  },
  "artifacts": [
    {
      "type": "celebrity_match",
      "player": "${profileA.name} or ${profileB.name}",
      "text": "Their answer sounds exactly like something [Celebrity] would say"
    },
    {
      "type": "fake_headline",
      "player": "${profileA.name} or ${profileB.name}",
      "text": "Breaking: [Funny headline]"
    },
    {
      "type": "fact_check",
      "player": "${profileA.name} or ${profileB.name}",
      "text": "Fact Check: [Playful roast]"
    }
  ]
}`

    // Call Claude API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text()
      console.error('Claude API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to get AI judgment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicData = await anthropicResponse.json()
    let judgeResponseText = anthropicData.content[0].text

    // Strip markdown if present
    judgeResponseText = judgeResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // More robust JSON extraction: find the first { and last }
    const firstBrace = judgeResponseText.indexOf('{')
    const lastBrace = judgeResponseText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      judgeResponseText = judgeResponseText.slice(firstBrace, lastBrace + 1)
    }
    
    // Remove trailing commas (invalid JSON but Claude sometimes adds them)
    judgeResponseText = judgeResponseText.replace(/,(\s*[}\]])/g, '$1')

    // Parse Claude's response
    let judgeResponse
    try {
      judgeResponse = JSON.parse(judgeResponseText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw response:', anthropicData.content[0].text)
      console.error('Cleaned response:', judgeResponseText)
      return new Response(
        JSON.stringify({ error: parseError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build scores object using judge KEYS (not names)
    const scores: Record<string, any> = {}
    let profileATotalScore = 0
    let profileBTotalScore = 0
    
    judgeResponse.scores.forEach((score: any, idx: number) => {
      const judgeKey = judges[idx].key
      
      // Get scores with fallback - check multiple possible key formats
      let playerAScore = score.player_a_score
      let playerBScore = score.player_b_score
      
      // Fallback: try lowercase player name with underscore (legacy format)
      if (playerAScore === undefined) {
        const nameKey = profileA.name.toLowerCase().replace(/\s+/g, '_') + '_score'
        playerAScore = score[nameKey]
      }
      if (playerBScore === undefined) {
        const nameKey = profileB.name.toLowerCase().replace(/\s+/g, '_') + '_score'
        playerBScore = score[nameKey]
      }
      
      // Fallback: try lowercase player name with space (another legacy format)
      if (playerAScore === undefined) {
        const nameKey = profileA.name.toLowerCase() + '_score'
        playerAScore = score[nameKey]
      }
      if (playerBScore === undefined) {
        const nameKey = profileB.name.toLowerCase() + '_score'
        playerBScore = score[nameKey]
      }
      
      // Final fallback: default to 5 if still undefined (neutral score)
      if (playerAScore === undefined || playerAScore === null || isNaN(playerAScore)) {
        console.warn(`Missing player_a_score for judge ${judgeKey}, defaulting to 5`)
        playerAScore = 5
      }
      if (playerBScore === undefined || playerBScore === null || isNaN(playerBScore)) {
        console.warn(`Missing player_b_score for judge ${judgeKey}, defaulting to 5`)
        playerBScore = 5
      }
      
      // Accumulate totals for winner determination
      profileATotalScore += playerAScore
      profileBTotalScore += playerBScore
      
      scores[judgeKey] = {
        profile_a_score: playerAScore,
        profile_b_score: playerBScore,
        comment: score.one_liner || ''
      }
    })

    // Determine winner based on actual calculated scores (not Claude's suggestion)
    // TIEBREAKER: If scores are equal, first submitter wins
    let winnerId: string
    let loserId: string
    let wasTiebreaker = false
    
    if (profileATotalScore > profileBTotalScore) {
      winnerId = show.profile_a_id
      loserId = show.profile_b_id
    } else if (profileBTotalScore > profileATotalScore) {
      winnerId = show.profile_b_id
      loserId = show.profile_a_id
    } else {
      // TIE! First submitter wins
      wasTiebreaker = true
      console.log(`TIE DETECTED: ${profileATotalScore} - ${profileBTotalScore}. Using first_submitter_id as tiebreaker.`)
      
      if (show.first_submitter_id) {
        winnerId = show.first_submitter_id
        loserId = show.first_submitter_id === show.profile_a_id ? show.profile_b_id : show.profile_a_id
        console.log(`Tiebreaker winner: ${winnerId} (first submitter)`)
      } else {
        // Fallback if somehow first_submitter_id is not set: profile_a wins
        console.warn('No first_submitter_id found for tiebreaker, defaulting to profile_a')
        winnerId = show.profile_a_id
        loserId = show.profile_b_id
      }
    }

    // Parse banter into structured format with judge KEYS
    const banterLines = judgeResponse.banter.split('\n').filter((line: string) => line.trim())
    const banter = banterLines.map((line: string) => {
      const [judgeName, text] = line.split(':').map((s: string) => s.trim())
      // Find judge key from name
      const judge = judges.find(j => j.name === judgeName)
      return {
        judge: judge?.key || judgeName.toLowerCase(),
        text: text || ''
      }
    })

    // Process rivalry commentary - convert judge name to key
    let rivalryComment = null
    if (judgeResponse.rivalry_comment) {
      const commentJudge = judges.find(j => j.name === judgeResponse.rivalry_comment.judge)
      rivalryComment = {
        judge: commentJudge?.key || judgeResponse.rivalry_comment.judge.toLowerCase(),
        text: judgeResponse.rivalry_comment.text
      }
    }

    // Process artifacts - convert player names to profile IDs
    const artifacts = judgeResponse.artifacts?.map((artifact: any) => ({
      type: artifact.type,
      player_id: artifact.player === profileA.name ? show.profile_a_id : show.profile_b_id,
      player_name: artifact.player,
      text: artifact.text
    })) || []

    // Get winner name for verdict
    const winnerName = winnerId === show.profile_a_id ? profileA.name : profileB.name

    // Update show with judging results
    const { error: updateError } = await supabase
      .from('shows')
      .update({
        status: 'complete',
        winner_id: winnerId,
        judged_at: new Date().toISOString(),
        judge_data: {
          verdict: `${winnerName} won!`,
          scores: scores,
          banter: banter,
          rivalry_comment: rivalryComment,
          artifacts: artifacts,
          was_tiebreaker: wasTiebreaker,
          profile_a_total: profileATotalScore,
          profile_b_total: profileBTotalScore
        }
      })
      .eq('id', showId)

    if (updateError) {
      console.error('Error updating show:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save judgment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update rivalry mic holder
    await supabase
      .from('rivalries')
      .update({ mic_holder_id: winnerId })
      .eq('id', show.rivalry_id)

    // Send "verdict_ready" SMS to first submitter (they've been waiting longest)
    if (show.first_submitter_id) {
      try {
        // Determine opponent name for the first submitter
        const opponentName = show.first_submitter_id === show.profile_a_id 
          ? profileB.name 
          : profileA.name;
        
        const smsResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/send-sms`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({
              userId: show.first_submitter_id,
              notificationType: 'verdict_ready',
              contextData: {
                show_num: show.show_number,
                prompt: show.prompt,
                opponent: opponentName,
                show_id: show.id
              }
            })
          }
        )
        
        if (!smsResponse.ok) {
          console.error('Failed to send verdict_ready SMS:', await smsResponse.text())
        } else {
          console.log('✅ Verdict ready SMS sent successfully')
        }
      } catch (smsErr) {
        console.error('Error sending verdict_ready SMS:', smsErr)
        // Don't block judgment if SMS fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        winner_id: winnerId,
        was_tiebreaker: wasTiebreaker,
        profile_a_total: profileATotalScore,
        profile_b_total: profileBTotalScore
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in judge-show function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})