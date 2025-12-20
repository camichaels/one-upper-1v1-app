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

// Bonus categories - Type 1: AI picks the specific reference
const DYNAMIC_BONUS_CATEGORIES = [
  { prompt: "Which answer sounds most like a famous celebrity's tweet? Name the celebrity.", prefix: "Most like", suffix: "'s tweet" },
  { prompt: "Which answer has the strongest famous TV chef energy? Name the chef.", prefix: "Strongest", suffix: "energy" },
  { prompt: "Which answer sounds like a famous comedian's bit? Name the comedian.", prefix: "Most like", suffix: "'s bit" },
  { prompt: "Which answer could be a famous movie character's backstory? Name the character.", prefix: "Best backstory for", suffix: "" },
]

// Bonus categories - Type 2: Fixed category, AI just picks winner
// Mix of best, worst, and orthogonal categories
const FIXED_BONUS_CATEGORIES = [
  // Orthogonal / neutral categories
  "Most quotable at a wedding toast",
  "Best to yell from a moving car",
  "Most likely to become a meme",
  "Best podcast episode title",
  "Best shower thought",
  "Most 'no context needed'",
  "Best bumper sticker",
  "Most likely to be a fortune cookie",
  
  // "Worst" or dubious honor categories
  "Biggest reach",
  "Most likely to get you fired",
  "Hardest to defend at Thanksgiving",
  "Most concerning to a therapist",
  "Best evidence in a custody hearing",
  "Most likely to void a warranty",
  "Best reason to call a lawyer",
  "Most 'sir, this is a Wendy's'",
  "Strongest 'hold my beer' energy",
  "Most 'what could go wrong' vibes",
  "Most likely to get banned from somewhere",
  "Most 'I woke up and chose chaos'",
  
  // Fun/absurd categories  
  "Sounds like a Florida Man story",
  "Best TMZ breaking news",
  "Most clickbait article title",
  "Best plot for a Lifetime movie",
  "Best reality TV confession",
  "Most soap opera cliffhanger",
  "Best true crime documentary title",
  "Most dramatic movie trailer voiceover",
  "Could be an Onion headline",
  "Biggest 'trust me bro' moment",
  "Most 'main character' energy",
  "Most 'said with full confidence'",
]

// Pick a random bonus category
function getRandomBonusCategory(): { prompt: string; isDynamic: boolean; prefix?: string; suffix?: string } {
  const allCategories = [
    ...DYNAMIC_BONUS_CATEGORIES.map(c => ({ ...c, isDynamic: true })),
    ...FIXED_BONUS_CATEGORIES.map(c => ({ prompt: c, isDynamic: false })),
  ]
  const selected = allCategories[Math.floor(Math.random() * allCategories.length)]
  return selected
}

// Replace letter references (A, B, C) with player names in text
function replaceLettersWithNames(text: string, letterToName: Record<string, string>): string {
  let result = text
  
  const letters = Object.keys(letterToName).sort((a, b) => b.length - a.length)
  
  for (const letter of letters) {
    const name = letterToName[letter]
    const pattern = new RegExp(
      `\\b${letter}(?='s|\\s|[.,!?;:]|$)`,
      'g'
    )
    result = result.replace(pattern, name)
  }
  
  return result
}

// Calculate final rankings from per-judge rankings
function calculateFinalRankings(
  judgeRankings: Record<string, string[]>,
  answerMap: Record<string, any>,
  answerCount: number
): { letter: string; totalPoints: number; placement: number; judgeBreakdown: Record<string, number> }[] {
  const points: Record<string, number> = {}
  const judgeBreakdown: Record<string, Record<string, number>> = {}
  
  // Points: 1st gets N points, last gets 1 point (where N = number of answers)
  for (const [judgeKey, rankings] of Object.entries(judgeRankings)) {
    rankings.forEach((letter, idx) => {
      const pts = answerCount - idx // 5 players: 5,4,3,2,1 points
      points[letter] = (points[letter] || 0) + pts
      
      // Track each judge's placement for this answer
      if (!judgeBreakdown[letter]) judgeBreakdown[letter] = {}
      judgeBreakdown[letter][judgeKey] = idx + 1 // 1-indexed placement
    })
  }
  
  // Sort by total points descending
  return Object.entries(points)
    .sort((a, b) => b[1] - a[1])
    .map(([letter, totalPts], idx) => ({
      letter,
      totalPoints: totalPts,
      placement: idx + 1,
      judgeBreakdown: judgeBreakdown[letter] || {}
    }))
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
      letterToName[letter] = answer.player?.guest_name || `Player ${letter}`
    })

    // Get random bonus category for this round
    const bonusCategory = getRandomBonusCategory()

    // Build the prompt
    const answersText = answers.map((answer, idx) => 
      `${answerLabels[idx]}: "${answer.answer_text || '[no answer]'}"`
    ).join('\n')

    const judgesText = sortedJudges.map(judge => 
      `${judge.name} (${judge.emoji}, key: "${judge.key}"): ${judge.description}`
    ).join('\n')

    // Build the ranking arrays for JSON example
    const answerLetters = answerLabels.slice(0, answers.length)
    const rankingExample = `["${answerLetters.join('", "')}"]`

    // Build bonus instruction based on type
    let bonusInstruction: string
    let bonusCategoryExample: string
    
    if (bonusCategory.isDynamic) {
      bonusInstruction = `Pick winner for "${bonusCategory.prompt}" - in the "category" field, combine the prefix "${bonusCategory.prefix}" with the specific name you chose (e.g., "${bonusCategory.prefix} Gordon Ramsay${bonusCategory.suffix ? ' ' + bonusCategory.suffix : ''}"). Do NOT include the original question in category.`
      bonusCategoryExample = `"${bonusCategory.prefix} [specific name]${bonusCategory.suffix ? ' ' + bonusCategory.suffix : ''}"`
    } else {
      bonusInstruction = `Pick winner for "${bonusCategory.prompt}".`
      bonusCategoryExample = `"${bonusCategory.prompt}"`
    }

    const prompt = `You are judges for "One-Upper," a comedy game show. Players one-up each other with outlandish answers.

PROMPT: "${round.prompt_text}"

ANSWERS:
${answersText}

JUDGES:
${judgesText}

Return ONLY valid JSON. No markdown, no backticks, no explanation.

{
  "judgeRankings": {
    "${sortedJudges[0].key}": ${rankingExample},
    "${sortedJudges[1].key}": ${rankingExample},
    "${sortedJudges[2].key}": ${rankingExample}
  },
  "banterMessages": [
    { "judgeKey": "${sortedJudges[0].key}", "comment": "..." },
    { "judgeKey": "${sortedJudges[1].key}", "comment": "..." },
    { "judgeKey": "${sortedJudges[2].key}", "comment": "..." },
    { "judgeKey": "${sortedJudges[0].key}", "comment": "..." }
  ],
  "bonusWinner": {
    "answer": "A",
    "category": ${bonusCategoryExample},
    "reason": "..."
  },
  "winnerReactions": {
    "${sortedJudges[0].key}": "...",
    "${sortedJudges[1].key}": "...",
    "${sortedJudges[2].key}": "..."
  },
  "lastPlaceRoast": "...",
  "mvpMoment": "..."
}

RULES:

1. JUDGE RANKINGS: Each judge ranks ALL ${answers.length} answers independently based on their personality. Rankings CAN disagree - that's the fun.

2. BANTER: Exactly 4 comments players will READ ALOUD. Each comment:
   - MAX 12 words, one sentence
   - Make them laugh, gasp, or groan
   - Reference answers by letter (A, B, C...)
   - Playful roasts welcome, mean burns not
   - DO NOT reveal who wins
   - End with anticipation ("This'll be close...")

3. BONUS: ${bonusInstruction} Reason in 6 words max.

4. WINNER REACTIONS: Each judge's take on their #1 pick. 8 words max each.

5. LAST PLACE ROAST: Start with the answer letter (e.g., "A tried but..."). Gentle, playful dig. 10 words max. Funny, not cruel.

6. MVP MOMENT: Start with the winner's answer letter (e.g., "A crushed it because..."). What made them special. 10 words max.

SCORING VIBE: Outlandish beats safe. Weird beats boring. "That can't be true" is a compliment.`

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
        max_tokens: 1800,
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

    // Calculate final rankings from per-judge rankings
    const finalRankings = calculateFinalRankings(
      judgeResponse.judgeRankings,
      answerMap,
      answers.length
    )

    // Process banter messages - replace letter references with player names
    const judgesByKey = Object.fromEntries(sortedJudges.map(j => [j.key, j]))
    
    const banterMessages = (judgeResponse.banterMessages || []).slice(0, 4).map((msg: any) => {
      const judge = judgesByKey[msg.judgeKey]
      return {
        judgeKey: msg.judgeKey,
        judgeName: judge?.name || msg.judgeName,
        emoji: judge?.emoji || msg.emoji,
        comment: replaceLettersWithNames(msg.comment, letterToName)
      }
    })

    // Process winner reactions - replace letters with names
    const winnerReactions: Record<string, string> = {}
    if (judgeResponse.winnerReactions) {
      for (const [judgeKey, reaction] of Object.entries(judgeResponse.winnerReactions)) {
        winnerReactions[judgeKey] = replaceLettersWithNames(reaction as string, letterToName)
      }
    }

    // Process last place roast
    const lastPlaceRoast = judgeResponse.lastPlaceRoast 
      ? replaceLettersWithNames(judgeResponse.lastPlaceRoast, letterToName)
      : null

    // Process MVP moment
    const mvpMoment = judgeResponse.mvpMoment
      ? replaceLettersWithNames(judgeResponse.mvpMoment, letterToName)
      : null

    // Process bonus winner
    let bonusReasonWithNames = judgeResponse.bonusWinner?.reason || ''
    bonusReasonWithNames = replaceLettersWithNames(bonusReasonWithNames, letterToName)

    // Convert final rankings to player IDs with placements
    const rankings = finalRankings.map((ranking) => {
      const answer = answerMap[ranking.letter]
      return {
        playerId: answer?.player_id,
        answerId: answer?.id,
        placement: ranking.placement,
        totalPoints: ranking.totalPoints,
        judgeBreakdown: ranking.judgeBreakdown,
        answer: answer?.answer_text,
        playerName: answer?.player?.guest_name || `Player ${ranking.letter}`
      }
    }).filter((r: any) => r.playerId)

    // Store per-judge rankings with player names for display
    const judgeRankingsDisplay: Record<string, { playerId: string; playerName: string; placement: number }[]> = {}
    for (const [judgeKey, letterRankings] of Object.entries(judgeResponse.judgeRankings)) {
      judgeRankingsDisplay[judgeKey] = (letterRankings as string[]).map((letter, idx) => {
        const answer = answerMap[letter]
        return {
          playerId: answer?.player_id,
          playerName: answer?.player?.guest_name || `Player ${letter}`,
          placement: idx + 1
        }
      })
    }

    // Convert bonus winner letter to player ID
    const bonusWinnerLetter = judgeResponse.bonusWinner?.answer
    const bonusWinnerAnswer = answerMap[bonusWinnerLetter]
    const bonusWinner = bonusWinnerAnswer ? {
      playerId: bonusWinnerAnswer.player_id,
      answerId: bonusWinnerAnswer.id,
      category: judgeResponse.bonusWinner?.category || bonusCategory.prompt,
      categoryDisplay: judgeResponse.bonusWinner?.category || bonusCategory.prompt,
      reason: bonusReasonWithNames,
      playerName: bonusWinnerAnswer.player?.guest_name || `Player ${bonusWinnerLetter}`
    } : null

    // Build verdict object
    const verdict = {
      rankings,
      judgeRankings: judgeRankingsDisplay,
      banterMessages,
      winnerReactions,
      lastPlaceRoast,
      mvpMoment,
      bonusWinner,
      judgeWhisperers: []
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
        // Include everyone who predicted correctly - even the winner!
        verdict.judgeWhisperers = votes.map(v => v.voter_id)
      }
    }

    // Update round with verdict
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
    // Points based on final placement: 1st=5, 2nd=3, 3rd=2, 4th=1, 5th=0
    const placementPoints = [5, 3, 2, 1, 0]
    
    for (const ranking of rankings) {
      let pointsEarned = placementPoints[ranking.placement - 1] || 0
      
      // Bonus category winner gets +1
      if (bonusWinner && bonusWinner.playerId === ranking.playerId) {
        pointsEarned += 1
      }
      
      // Judge whisperers get +1
      if (verdict.judgeWhisperers.includes(ranking.playerId)) {
        pointsEarned += 1
      }

      const { error: scoreError } = await supabase.rpc('increment_showdown_score', {
        player_id: ranking.playerId,
        points: pointsEarned
      })

      if (scoreError) {
        console.error('Error updating player score:', scoreError)
      }
    }

    // Award Best Guesser +1 point
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