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
      "${profileA.name.toLowerCase()}_score": 0,
      "${profileB.name.toLowerCase()}_score": 0,
      "one_liner": "..."
    },
    {
      "judge": "${judges[1].name}",
      "judge_emoji": "${judges[1].emoji}",
      "${profileA.name.toLowerCase()}_score": 0,
      "${profileB.name.toLowerCase()}_score": 0,
      "one_liner": "..."
    },
    {
      "judge": "${judges[2].name}",
      "judge_emoji": "${judges[2].emoji}",
      "${profileA.name.toLowerCase()}_score": 0,
      "${profileB.name.toLowerCase()}_score": 0,
      "one_liner": "..."
    }
  ],
  "banter": "Judge1: comment\\nJudge2: response\\nJudge3: response\\nJudge1: final word"
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

    // Parse Claude's response
    const judgeResponse = JSON.parse(judgeResponseText)

    // Map response to database format
    const winnerId = judgeResponse.winner === profileA.name ? show.profile_a_id : show.profile_b_id

    // Build scores object using judge KEYS (not names)
    const scores: Record<string, any> = {}
    judgeResponse.scores.forEach((score: any, idx: number) => {
      const judgeKey = judges[idx].key
      scores[judgeKey] = {
        profile_a_score: score[`${profileA.name.toLowerCase()}_score`],
        profile_b_score: score[`${profileB.name.toLowerCase()}_score`],
        comment: score.one_liner
      }
    })

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

    // Update show with judging results
    const { error: updateError } = await supabase
      .from('shows')
      .update({
        status: 'complete',
        winner_id: winnerId,
        judged_at: new Date().toISOString(),
        judge_data: {
          verdict: `${judgeResponse.winner} won!`,
          scores: scores,
          banter: banter
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
                prompt: show.prompt
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
      JSON.stringify({ success: true, winner_id: winnerId }),
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