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
  { prompt: "Which answer sounds most like a famous celebrity's tweet? Name the celebrity.", prefix: "Most" },
  { prompt: "Which answer has the strongest famous TV chef energy? Name the chef.", prefix: "Most" },
  { prompt: "Which answer sounds like a famous comedian's bit? Name the comedian.", prefix: "Most" },
  { prompt: "Which answer could be a famous movie character's backstory? Name the character.", prefix: "Best backstory for" },
]

// Bonus categories - Type 2: Fixed category, AI just picks winner
const FIXED_BONUS_CATEGORIES = [
  "Could be an Onion headline",
  "Sounds like a Florida Man story",
  "Best TMZ breaking news",
  "Most clickbait article title",
  "Best podcast episode title",
  "Best topic for a graduate thesis",
  "Most likely to be a TED Talk",
  "Best LinkedIn humblebrag",
  "Most corporate jargon energy",
  "Best plot for a Lifetime movie",
  "Best reality TV confession",
  "Most soap opera cliffhanger",
  "Best true crime documentary title",
  "Most dramatic movie trailer voiceover",
  "Most likely to get you arrested",
  "Strongest 'hold my beer' energy",
  "Most 'what could go wrong' vibes",
  "Best way to get banned from a place",
  "Most likely to void a warranty",
  "Best reason to call a lawyer",
  "Biggest 'trust me bro' moment",
  "Most 'main character' energy",
  "Best shower thought",
  "Most 'said with full confidence'",
  "Best 'no context needed'",
  "Most 'I woke up and chose chaos'",
]

// Pick a random bonus category
function getRandomBonusCategory(): { prompt: string; isDynamic: boolean; prefix?: string } {
  const allCategories = [
    ...DYNAMIC_BONUS_CATEGORIES.map(c => ({ ...c, isDynamic: true })),
    ...FIXED_BONUS_CATEGORIES.map(c => ({ prompt: c, isDynamic: false })),
  ]
  const selected = allCategories[Math.floor(Math.random() * allCategories.length)]
  return selected
}

// Replace letter references (A, B, C) with player names in banter text
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

    // Build bonus instruction based on type
    const bonusInstruction = bonusCategory.isDynamic
      ? `BONUS CATEGORY (AI picks specific reference): ${bonusCategory.prompt}
Return the category as "${bonusCategory.prefix} [Name You Pick]" format.`
      : `BONUS CATEGORY (fixed): "${bonusCategory.prompt}"
Return the category exactly as written.`

    // Build dynamic example for banter based on actual judges
    const banterExample = sortedJudges.slice(0, 3).flatMap((judge, idx) => {
      if (idx === 0) {
        return [
          { judgeKey: judge.key, judgeName: judge.name, emoji: judge.emoji, comment: "First reaction to the answers..." },
          { judgeKey: sortedJudges[1]?.key || judge.key, judgeName: sortedJudges[1]?.name || judge.name, emoji: sortedJudges[1]?.emoji || judge.emoji, comment: "Response or different take..." },
        ]
      }
      return []
    })
    // Add a couple more to show the back-and-forth pattern
    banterExample.push(
      { judgeKey: sortedJudges[0].key, judgeName: sortedJudges[0].name, emoji: sortedJudges[0].emoji, comment: "Another comment..." },
      { judgeKey: sortedJudges[2]?.key || sortedJudges[0].key, judgeName: sortedJudges[2]?.name || sortedJudges[0].name, emoji: sortedJudges[2]?.emoji || sortedJudges[0].emoji, comment: "Final anticipatory comment..." }
    )

    const banterExampleJson = JSON.stringify(banterExample, null, 2)

    const prompt = `You are the judging panel for "One-Upper," a comedy competition where players try to one-up each other with outlandish answers.

PROMPT: "${round.prompt_text}"

ANSWERS:
${answersText}

JUDGES:
${judgesText}

YOUR TASKS:

1. RANK all answers from best to worst (reward boldness, creativity, humor - truth doesn't matter)

2. BANTER: Write 4-5 short back-and-forth comments between the judges discussing the answers. Rules:
   - Judges should react to MULTIPLE answers, not just the winner
   - They can agree, disagree, riff off each other
   - Build tension/suspense but DO NOT reveal who wins
   - Reference answers by their letter (A, B, C)
   - Keep each comment to 1-2 sentences MAX in their character voice
   - End with something anticipatory like "Let's see how it shakes out" or "This is gonna be close"

3. BONUS WINNER: ${bonusInstruction}

SCORING PHILOSOPHY:
- Outlandish beats safe
- Creative exaggeration wins
- Humor and entertainment value matter most
- "That couldn't possibly be true" is a compliment here
- Boring or generic answers should rank last

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.

{
  "rankings": ["${answerLabels.slice(0, answers.length).join('", "')}"],
  "banterMessages": ${banterExampleJson},
  "bonusWinner": {
    "answer": "A",
    "category": "The display category name",
    "reason": "Brief witty reason (1 sentence)"
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
        max_tokens: 1500,
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

    // Process banter messages - replace letter references with player names
    // Use emoji from our judge data, not from AI response (AI might return broken emojis)
    const judgesByKey = Object.fromEntries(sortedJudges.map(j => [j.key, j]))
    
    const banterMessages = (judgeResponse.banterMessages || []).slice(0, 5).map((msg: any) => {
      const judge = judgesByKey[msg.judgeKey]
      return {
        judgeKey: msg.judgeKey,
        judgeName: judge?.name || msg.judgeName,
        emoji: judge?.emoji || msg.emoji,
        comment: replaceLettersWithNames(msg.comment, letterToName)
      }
    })

    // Also create the old banter format for backwards compatibility
    const banterByJudge: Record<string, string> = {}
    for (const msg of banterMessages) {
      if (!banterByJudge[msg.judgeKey]) {
        banterByJudge[msg.judgeKey] = msg.comment
      }
    }

    // Process bonus winner
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
    }).filter((r: any) => r.playerId)

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
      banter: banterByJudge,
      banterMessages,
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
        // If you believed in yourself and were right, you deserve the bonus
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
    const placementPoints = [5, 3, 2, 1, 0]
    
    for (const ranking of rankings) {
      let pointsEarned = placementPoints[ranking.placement - 1] || 0
      
      if (bonusWinner && bonusWinner.playerId === ranking.playerId) {
        pointsEarned += 1
      }
      
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