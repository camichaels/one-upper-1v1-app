// Supabase Edge Function: judge-practice
// Deploy to: supabase/functions/judge-practice/index.ts
// Purpose: Judge a practice round with constructive tips for onboarding

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JudgeInput {
  key: string;
  name: string;
  emoji: string;
  description: string;
}

interface RequestBody {
  prompt: string;
  answer: string;
  judges: JudgeInput[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, answer, judges }: RequestBody = await req.json();

    if (!prompt || !answer || !judges || judges.length !== 3) {
      throw new Error('Missing required fields: prompt, answer, and 3 judges');
    }

    const anthropic = new Anthropic();

    const systemPrompt = `You are helping judge a PRACTICE round for One-Upper, a competitive comedy/creativity game. 

The player is new and learning how the game works. Your job is to:
1. Score their answer (1-10 scale)
2. Give encouraging, constructive feedback with a specific tip to improve

Be supportive but honest. This is their first try - help them understand what makes a great answer.

You are roleplaying as 3 different judge personalities. Each judge has their own scoring criteria:

${judges.map((j, i) => `JUDGE ${i + 1}: ${j.name} (${j.emoji})
${j.description}`).join('\n\n')}

SCORING GUIDELINES:
- 9-10: Exceptional, standout answer
- 7-8: Strong, creative, works well  
- 5-6: Decent but room to grow
- 3-4: Missed opportunities
- 1-2: Needs major work

Your feedback should:
- Be in the judge's voice/personality
- Include one SPECIFIC, actionable tip
- Be encouraging (this is practice!)
- Be 1-2 sentences max
- Do NOT include emoji in the tip text

Respond in this exact JSON format:
{
  "ripley_comment": "A short encouraging comment from Ripley the host (1 sentence)",
  "scores": [
    {
      "judge_key": "${judges[0].key}",
      "score": <number 1-10>,
      "tip": "<constructive feedback in judge's voice>"
    },
    {
      "judge_key": "${judges[1].key}",
      "score": <number 1-10>,
      "tip": "<constructive feedback in judge's voice>"
    },
    {
      "judge_key": "${judges[2].key}",
      "score": <number 1-10>,
      "tip": "<constructive feedback in judge's voice>"
    }
  ]
}`;

    const userPrompt = `PRACTICE PROMPT: "${prompt}"

PLAYER'S ANSWER: "${answer}"

Judge this practice answer. Remember to be encouraging - this is their first time! Give scores and specific tips for improvement.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    });

    // Extract text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      throw new Error('Failed to parse judge response');
    }

    // Validate structure
    if (!result.scores || !Array.isArray(result.scores) || result.scores.length !== 3) {
      throw new Error('Invalid response structure');
    }

    console.log('✅ Practice judging complete');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in judge-practice:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});