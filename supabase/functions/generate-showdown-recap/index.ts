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

    // Fetch showdown with players
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

    // IMPORTANT: Check if recap already exists - return it immediately to avoid duplicate AI calls
    if (showdown.recap) {
      console.log('Recap already exists, returning cached version')
      return new Response(
        JSON.stringify({ success: true, recap: showdown.recap, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        answers: answerDetails
      }
    })

    // Build player summaries for AI context
    const playerSummaries = sortedPlayers.map((p: any, index: number) => {
      const player = playerMap[p.id]
      
      // Count round wins
      const roundWins = rounds.filter((r: any) => {
        const rankings = r.verdict?.rankings || []
        return rankings[0]?.playerId === p.id
      }).length

      return {
        name: player.name,
        avatar: player.avatar,
        finalPlace: index + 1,
        totalScore: player.totalScore,
        roundWins
      }
    })

    // Pick a random prompt for the share message
    const randomRound = rounds[Math.floor(Math.random() * rounds.length)]
    const sharePrompt = randomRound?.prompt_text || "Think you can one-up your friends?"

    // Build the AI prompt
    const prompt = `You're Ripley, the witty host recapping a party game called "One-Upper" where players tried to out-do each other with creative, outlandish answers.

THE SHOWDOWN DATA:

PLAYERS (final standings):
${playerSummaries.map((p, i) => `${i + 1}. ${p.name} - ${p.totalScore} pts, ${p.roundWins} round wins`).join('\n')}

ROUND BY ROUND:
${roundSummaries.map(r => `
Round ${r.roundNumber}: "${r.prompt}"
${r.answers.map((a: any) => `  ${a.placement}. ${a.player}: "${a.answer}"`).join('\n')}`).join('\n')}

CHAMPION: ${championName}

---

YOUR TASK - Generate a recap with these sections:

1. NARRATIVE: Tell the story of this showdown in EXACTLY 2 sentences - no more. Be specific - reference actual answers and moments. Edgy sports commentary meets comedy roast. You (Ripley) are speaking. Keep it punchy.

2. THE ONE-UP: Pick THE single funniest/best answer from the entire showdown (any player, any placement - doesn't have to be a winner). This is the moment everyone will remember.
   - round (number)
   - prompt (the question asked)
   - answer (verbatim - the answer given)
   - player (who said it)
   - commentary (1 punchy sentence - why this was THE moment)

3. PLAYER RECAPS: One for EACH player, in final standing order (${sortedPlayers.map(p => playerMap[p.id].name).join(', ')}). Each gets:
   - player (name)
   - title (creative 2-4 word award/title, like "The Chaos Architect" or "The Accidental Genius")
   - roast (1 sentence about HOW THEY PLAYED - specific to their answers/performance tonight)
   - psychTake (1 sentence about WHAT THEIR ANSWERS REVEAL about them as a person - pop psychology, personality read)

   CRITICAL: "roast" and "psychTake" MUST be different:
   - roast = their PERFORMANCE (what they did)
   - psychTake = their PERSONALITY (who they are)
   
   BAD (too similar):
     roast: "Caused maximum chaos"
     psychTake: "Loves chaos"
   
   GOOD (distinct):
     roast: "Won 4 rounds with answers that made judges uncomfortable"
     psychTake: "Has the energy of someone who's been asked to leave a PTA meeting"

4. FINAL THOUGHTS: Exactly 2 sentences. A slightly profound observation about what tonight revealed, then undercut it with humor. You (Ripley) are closing the show.

TONE: Witty, specific, celebratory. You're roasting friends at a party, not being mean. Reference actual answers when possible.

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanation.

{
  "narrative": "string",
  "theOneUp": {
    "round": number,
    "prompt": "string",
    "answer": "string",
    "player": "string",
    "commentary": "string"
  },
  "playerRecaps": [
    {
      "player": "string",
      "title": "string",
      "roast": "string",
      "psychTake": "string"
    }
  ],
  "finalThoughts": "string"
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

    // Add player avatars to recaps (we have this data, no need for AI to generate)
    recap.playerRecaps = recap.playerRecaps.map((pr: any) => {
      const player = sortedPlayers.find(p => playerMap[p.id].name === pr.player)
      return {
        ...pr,
        avatar: player ? playerMap[player.id].avatar : '😎'
      }
    })

    // Add the share prompt
    recap.sharePrompt = sharePrompt

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