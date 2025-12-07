// Supabase Edge Function: judge-showdown-round
// Deploy this to: supabase/functions/judge-showdown-round/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface JudgeShowdownRequest {
  roundId: string
}

// Bonus categories by round
const BONUS_CATEGORIES = [
  'Most Creative',
  'Funniest', 
  'Most Outlandish',
  'Best Storytelling',
  'Most Unexpected'
]

// Replace letter references (A, B, C) with player names in banter text
function replaceLettersWithNames(text: string, letterToName: Record<string, string>): string {
  let result = text
  
  // Sort letters by length descending to avoid partial replacements (not needed for single letters, but safe)
  const letters = Object.keys(letterToName).sort((a, b) => b.length - a.length)
  
  for (const letter of letters) {
    const name = letterToName[letter]
    
    // Match the letter when it's:
    // - At word boundary followed by 's (possessive): "A's" -> "Craig's"
    // - At word boundary followed by space, punctuation, or end: "A " -> "Craig "
    // - Standing alone
    // But NOT in the middle of words like "AMAZING" or "BAD"
    
    // Pattern: letter at word boundary, followed by 's, space, punctuation, or end of string
    const pattern = new RegExp(
      `\\b${letter}(?='s|\\s|[.,!?;:]|$)`,
      'g'
    )
    
    result = result.replace(pattern, name)
  }
  
  return result
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
    // Parse request
    let requestBody
    try {
      requestBody = await req.json()
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { roundId } = requestBody as JudgeShowdownRequest

    if (!roundId) {
      return new Response(
        JSON.stringify({ error: 'roundId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch round with showdown info
    const { data: round, error: roundError } = await supabase
      .from('showdown_rounds')
      .select(`
        *,
        showdown:showdowns!inner(
          id,
          judges
        )
      `)
      .eq('id', roundId)
      .single()

    if (roundError || !round) {
      return new Response(
        JSON.stringify({ error: 'Round not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch answers for this round WITH player names
    console.log('Fetching answers for round_id:', roundId)
    const { data: answers, error: answersError } = await supabase
      .from('showdown_answers')
      .select(`
        *,
        player:showdown_players!player_id(
          id,
          guest_name
        )
      `)
      .eq('round_id', roundId)

    console.log('Answers query result:', { answers, answersError, count: answers?.length })

    if (answersError || !answers || answers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No answers found for round', roundId, answersError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Judges are already embedded in showdown object
    console.log('Fetching judges, round.showdown:', round.showdown)
    const judges = round.showdown?.judges || []
    console.log('Judges:', judges?.length)
    
    if (!judges || judges.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Not enough judges configured', judgeCount: judges?.length }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use judges directly (they're already full objects)
    const sortedJudges = judges

    // Create answer mapping (A, B, C, etc.) and letter-to-name mapping
    const answerLabels = 'ABCDEFGHIJ'.split('')
    const answerMap: Record<string, any> = {}
    const letterToName: Record<string, string> = {}
    
    answers.forEach((answer, idx) => {
      const letter = answerLabels[idx]
      answerMap[letter] = answer
      // Build letter -> player name mapping for later replacement
      letterToName[letter] = answer.player?.guest_name || `Player ${letter}`
    })

    // Get bonus category for this round
    const bonusCategory = BONUS_CATEGORIES[(round.round_number - 1) % BONUS_CATEGORIES.length]

    // Build the prompt
    const answersText = answers.map((answer, idx) => 
      `${answerLabels[idx]}: "${answer.answer_text || '[no answer]'}"`
    ).join('\n')

    const judgesText = sortedJudges.map(judge => 
      `${judge.name} (${judge.emoji}): ${judge.description}\nExample one-liners: ${judge.examples || 'None provided'}`
    ).join('\n\n')

    const prompt = `You are the judging panel for "One-Upper," a comedy competition where players try to one-up each other with outlandish answers.

RULES:
- Rank ALL answers from best to worst
- Reward boldness, creativity, humor - truth doesn't matter
- Each judge provides a short comment (1-2 sentences in their voice)
- Pick a bonus category winner

PROMPT: "${round.prompt_text}"

ANSWERS:
${answersText}

JUDGES:
${judgesText}

BONUS CATEGORY: ${bonusCategory}

SCORING PHILOSOPHY:
- Outlandish beats safe
- Creative exaggeration wins
- Humor and entertainment value matter most
- "That couldn't possibly be true" is a compliment here
- Boring or generic answers should rank last

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.

{
  "rankings": ["${answerLabels.slice(0, answers.length).join('", "')}"],
  "comments": {
    "${sortedJudges[0]?.key}": "Short punchy comment in character voice",
    "${sortedJudges[1]?.key}": "Short punchy comment in character voice",
    "${sortedJudges[2]?.key}": "Short punchy comment in character voice"
  },
  "bonusWinner": {
    "answer": "A",
    "reason": "Brief reason for bonus win"
  }
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
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', await anthropicResponse.text())
      return new Response(
        JSON.stringify({ error: 'Failed to get AI judgment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicData = await anthropicResponse.json()
    let judgeResponseText = anthropicData.content[0].text

    // Strip markdown if present
    judgeResponseText = judgeResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Parse Claude's response
    let judgeResponse
    try {
      judgeResponse = JSON.parse(judgeResponseText)
    } catch (parseError) {
      console.error('Failed to parse judge response:', judgeResponseText)
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Replace letter references with player names in banter comments
    const banterWithNames: Record<string, string> = {}
    for (const [judgeKey, comment] of Object.entries(judgeResponse.comments || {})) {
      banterWithNames[judgeKey] = replaceLettersWithNames(comment as string, letterToName)
    }

    // Also replace in bonus winner reason
    let bonusReasonWithNames = judgeResponse.bonusWinner?.reason || ''
    bonusReasonWithNames = replaceLettersWithNames(bonusReasonWithNames, letterToName)

    // Convert letter rankings to player IDs with placements
    const rankings = judgeResponse.rankings.map((letter: string, idx: number) => {
      const answer = answerMap[letter]
      return {
        playerId: answer?.player_id,
        answerId: answer?.id,
        placement: idx + 1,
        answer: answer?.answer_text,
        playerName: answer?.player?.guest_name || `Player ${letter}`
      }
    }).filter((r: any) => r.playerId) // Filter out any invalid mappings

    // Convert bonus winner letter to player ID
    const bonusWinnerLetter = judgeResponse.bonusWinner?.answer
    const bonusWinnerAnswer = answerMap[bonusWinnerLetter]
    const bonusWinner = bonusWinnerAnswer ? {
      playerId: bonusWinnerAnswer.player_id,
      answerId: bonusWinnerAnswer.id,
      category: bonusCategory,
      categoryDisplay: bonusCategory,
      reason: bonusReasonWithNames,
      playerName: bonusWinnerAnswer.player?.guest_name || `Player ${bonusWinnerLetter}`
    } : null

    // Build verdict object
    const verdict = {
      rankings,
      banter: banterWithNames,
      bonusWinner,
      judgeWhisperers: [] // Will be calculated separately based on player votes
    }

    // Calculate Judge Whisperer bonus (players who voted for the winning answer)
    const winningAnswerId = rankings[0]?.answerId
    if (winningAnswerId) {
      const { data: votes } = await supabase
        .from('showdown_votes')
        .select('voter_id')
        .eq('round_id', roundId)
        .eq('voted_answer_id', winningAnswerId)

      if (votes && votes.length > 0) {
        // Exclude the winner themselves from Judge Whisperer
        const winnerId = rankings[0]?.playerId
        verdict.judgeWhisperers = votes
          .map(v => v.voter_id)
          .filter(id => id !== winnerId)
      }
    }

    // Update round with verdict (don't change status - host controls flow)
    const { error: updateError } = await supabase
      .from('showdown_rounds')
      .update({
        verdict
      })
      .eq('id', roundId)

    if (updateError) {
      console.error('Error updating round:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save verdict' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate and update player scores
    const placementPoints = [5, 3, 2, 1, 0] // 1st=5, 2nd=3, 3rd=2, 4th=1, 5th=0
    
    for (const ranking of rankings) {
      let pointsEarned = placementPoints[ranking.placement - 1] || 0
      
      // Add bonus point if they won the bonus category
      if (bonusWinner && bonusWinner.playerId === ranking.playerId) {
        pointsEarned += 1
      }
      
      // Add bonus point if they're a Judge Whisperer
      if (verdict.judgeWhisperers.includes(ranking.playerId)) {
        pointsEarned += 1
      }

      // Update player's total score
      const { error: scoreError } = await supabase.rpc('increment_showdown_score', {
        player_id: ranking.playerId,
        points: pointsEarned
      })

      if (scoreError) {
        console.error('Error updating player score:', scoreError)
        // Continue with other players even if one fails
      }
    }

    // Also award Best Guesser +1 point if there is one
    if (round.best_guesser_id) {
      await supabase.rpc('increment_showdown_score', {
        player_id: round.best_guesser_id,
        points: 1
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        verdict,
        rankings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in judge-showdown-round function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})