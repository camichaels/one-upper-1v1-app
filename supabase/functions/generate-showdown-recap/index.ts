// Supabase Edge Function: generate-showdown-recap
// Deploy to: supabase/functions/generate-showdown-recap/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { showdownId } = await req.json()

    if (!showdownId) {
      return new Response(
        JSON.stringify({ error: 'showdownId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    console.log('Fetching showdown:', showdownId)

    // Fetch showdown with players (specify FK to avoid ambiguity)
    const { data: showdown, error: showdownError } = await supabase
      .from('showdowns')
      .select(`
        *,
        players:showdown_players!showdown_players_showdown_id_fkey(*)
      `)
      .eq('id', showdownId)
      .single()

    console.log('Showdown result:', { showdown: showdown?.id, error: showdownError, playerCount: showdown?.players?.length })

    if (showdownError || !showdown) {
      return new Response(
        JSON.stringify({ error: 'Showdown not found', details: showdownError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all rounds with answers
    const { data: rounds, error: roundsError } = await supabase
      .from('showdown_rounds')
      .select(`
        *,
        answers:showdown_answers(*)
      `)
      .eq('showdown_id', showdownId)
      .order('round_number', { ascending: true })

    console.log('Rounds result:', { count: rounds?.length, error: roundsError })

    if (roundsError || !rounds) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch rounds' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build player map for easy lookup
    const playerMap: Record<string, any> = {}
    showdown.players.forEach((p: any) => {
      playerMap[p.id] = {
        name: p.guest_name || 'Player',
        avatar: p.guest_avatar || '😎',
        entryBrag: p.entry_brag || '',
        totalScore: p.total_score || 0
      }
    })

    // Sort players by score for standings
    const sortedPlayers = [...showdown.players].sort((a, b) => 
      (b.total_score || 0) - (a.total_score || 0)
    )
    const champion = sortedPlayers[0]
    const championName = playerMap[champion.id].name

    // Build round summaries for AI
    const roundSummaries = rounds.map((round: any) => {
      const answers = round.answers || []
      const verdict = round.verdict || {}
      const rankings = verdict.rankings || []

      // Map answers with player names and placements
      const answerDetails = answers.map((a: any) => {
        const player = playerMap[a.player_id]
        const ranking = rankings.find((r: any) => r.playerId === a.player_id)
        return {
          player: player?.name || 'Unknown',
          answer: a.answer_text || '[no answer]',
          placement: ranking?.placement || 0
        }
      }).sort((a: any, b: any) => a.placement - b.placement)

      return {
        roundNumber: round.round_number,
        prompt: round.prompt_text,
        answers: answerDetails,
        bonusWinner: verdict.bonusWinner ? {
          player: playerMap[verdict.bonusWinner.playerId]?.name,
          category: verdict.bonusWinner.categoryDisplay
        } : null,
        bestGuesser: round.best_guesser_id ? playerMap[round.best_guesser_id]?.name : null
      }
    })

    // Build player summaries
    const playerSummaries = sortedPlayers.map((p: any, index: number) => {
      const player = playerMap[p.id]
      
      // Count round wins
      const roundWins = rounds.filter((r: any) => {
        const rankings = r.verdict?.rankings || []
        return rankings[0]?.playerId === p.id
      }).length

      // Find their best answer (1st place finishes)
      const bestAnswers = rounds.map((r: any) => {
        const rankings = r.verdict?.rankings || []
        const answer = r.answers?.find((a: any) => a.player_id === p.id)
        const placement = rankings.find((rank: any) => rank.playerId === p.id)?.placement
        if (placement === 1 && answer) {
          return { round: r.round_number, prompt: r.prompt_text, answer: answer.answer_text }
        }
        return null
      }).filter(Boolean)

      return {
        name: player.name,
        avatar: player.avatar,
        entryBrag: player.entryBrag,
        finalPlace: index + 1,
        totalScore: player.totalScore,
        roundWins,
        bestAnswers
      }
    })

    // Build the AI prompt
    const prompt = `You're a witty comedy writer recapping a party game called "One-Upper" where players tried to out-do each other with outlandish answers to prompts. Your job is to create highlight cards that will make players laugh, screenshot, and want to play again.

THE SHOWDOWN DATA:

PLAYERS (in final standing order):
${playerSummaries.map((p, i) => `${i + 1}. ${p.name} (${p.avatar}) - ${p.totalScore} pts, ${p.roundWins} round wins
   Entry brag: "${p.entryBrag}"
   ${p.bestAnswers.length > 0 ? `Best moment: Round ${p.bestAnswers[0].round} - "${p.bestAnswers[0].answer}"` : 'No round wins'}`).join('\n')}

ROUND BY ROUND:
${roundSummaries.map(r => `
Round ${r.roundNumber}: "${r.prompt}"
${r.answers.map((a: any) => `  ${a.placement}. ${a.player}: "${a.answer}"`).join('\n')}
  Bonus: ${r.bonusWinner ? `${r.bonusWinner.category} → ${r.bonusWinner.player}` : 'None'}
`).join('\n')}

CHAMPION: ${championName}

YOUR TASK - Generate these highlight cards:

1. NARRATIVE (2-3 sentences): Tell the story of this showdown with dramatic tension. Reference specific moments. Make it feel like sports commentary meets comedy roast.

2. QUOTE OF THE NIGHT: Pick the single funniest/most memorable answer. Include:
   - Which round and prompt
   - The answer (verbatim)
   - Who said it
   - A pithy 1-sentence reaction (channel your inner Ryan Reynolds)

3. BRAG CHECK (one per player): Compare their entry brag to their actual performance. Be playfully brutal. Format:
   - Entry brag they walked in with
   - Reality check roast (1-2 sentences)

4. ROBBED MOMENT (if applicable): Was there a great answer that deserved better? A controversial judge call? If nothing stands out, skip this.

5. SUPERLATIVES (one per player): Give each player a fun title. Format:
   - Emoji + Title (like "🦊 The Assassin")
   - One-liner explanation
   Make these memorable and specific to how they actually played.

6. DEEP THOUGHT: One slightly profound or absurdist observation about what the answers revealed about the players or humanity. Then undercut it with the final score.

TONE: Funny, specific, pop-culture aware, occasionally profound, never mean-spirited. Think Jackbox meets late-night monologue meets therapy session.

CRITICAL: Return ONLY valid JSON. No markdown, no backticks.

{
  "narrative": "string",
  "quoteOfTheNight": {
    "round": 1,
    "prompt": "string",
    "answer": "string",
    "player": "string",
    "playerAvatar": "string",
    "reaction": "string"
  },
  "bragChecks": [
    {
      "player": "string",
      "playerAvatar": "string",
      "entryBrag": "string",
      "realityCheck": "string"
    }
  ],
  "robbedMoment": {
    "player": "string",
    "round": 1,
    "answer": "string",
    "commentary": "string"
  } | null,
  "superlatives": [
    {
      "player": "string",
      "playerAvatar": "string",
      "emoji": "string",
      "title": "string",
      "explanation": "string"
    }
  ],
  "deepThought": "string"
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
        max_tokens: 2048,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    })

    if (!anthropicResponse.ok) {
      console.error('Anthropic API error:', await anthropicResponse.text())
      return new Response(
        JSON.stringify({ error: 'Failed to generate recap' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicData = await anthropicResponse.json()
    let recapText = anthropicData.content[0].text

    // Strip markdown if present
    recapText = recapText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let recap
    try {
      recap = JSON.parse(recapText)
    } catch (parseError) {
      console.error('Failed to parse recap:', recapText)
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store recap in showdown
    const { error: updateError } = await supabase
      .from('showdowns')
      .update({ recap })
      .eq('id', showdownId)

    if (updateError) {
      console.error('Failed to save recap:', updateError)
      // Continue anyway - we can still return the recap
    }

    return new Response(
      JSON.stringify({ success: true, recap }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-showdown-recap:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})