# Ripley Interstitials - Clean Implementation Plan

## Executive Summary

Implement Ripley (the host/producer character) as a narrative voice throughout One-Upper gameplay. Ripley provides:
1. **Welcome commentary** on the "Rivalry Started!" screen (static text, no extra screen)
2. **Transition interstitials** before Show 2 and beyond (animated screen with countdown)
3. **Milestone callouts** for Shows 5, 10, 20 (special interstitial treatment)

**Key Decisions:**
- ❌ NO separate interstitial screen before Show 1
- ✅ ADD Ripley text to existing "Rivalry Started!" screen
- ✅ USE pre-written lines from database (no AI generation for show transitions)
- ✅ ~100 lines already written and stored in emcee_lines table

---

## What We're Building

### 1. Welcome Text on "Rivalry Started!" Screen
**Where:** Screen1.jsx, State C (the screen that says "🎉 Rivalry Started!")
**What:** Display Ripley's welcome commentary between the heading and button
**Data source:** `rivalries.intro_emcee_text` column (generated when rivalry is created via AI)

**Visual design:**
```
🎉 Rivalry Started!

"New rivalry alert. Craig Left vs Craig Right. 
Let's see what these two are made of."
— Host Ripley

[Start First Show]
```

**Styling:**
- Quote in italic, larger text (text-lg)
- Slate-200 color for readability
- Attribution "— Host Ripley" in orange-400
- Center-aligned, good spacing
- Fallback to generic text if intro_emcee_text is null

---

### 2. Interstitial Screen (Show 2+)
**Where:** New component `InterstitialScreen.jsx`
**When:** Appears BEFORE loading Show 2, 3, 4, etc. (never before Show 1)
**Triggers:**
- Manual: Player clicks "Next Show" button after verdict
- Auto-advance: 30-second countdown expires after verdict

**Visual design:**
- Standard slate background (matching all other screens): `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
- Ripley clapboard icon (small, ~20x20) centered
- "Host Ripley Says..." label below icon (text-base, orange-400, bold)
- Ripley's commentary text (text-xl, slate-100, clean - NO BOX around it)
- Two buttons at bottom (matching verdict screen button treatment):
  - Top button: "Continue in 10s • Skip" (orange-500, shows countdown)
  - Bottom button: "STAY HERE" (slate-700/50 with border)
  - After clicking "STAY HERE", only one button remains: "CONTINUE"

**Component props:**
```typescript
interface InterstitialScreenProps {
  emceeText: string;          // The commentary to display
  onComplete: () => void;     // Callback when interstitial finishes
  duration?: number;          // Optional, defaults to 10000ms (10 seconds)
}
```

**Behavior:**
- Auto-advances after 10 seconds (countdown visible)
- Clicking top button: immediately calls onComplete() and advances
- Clicking "STAY HERE": stops countdown, replaces both buttons with single "CONTINUE"
- Clicking "CONTINUE": calls onComplete() and advances
- No scrolling required - all content fits on screen

---

### 3. Edge Function: select-emcee-line
**Purpose:** Select pre-written commentary line from database
**Called:** When player clicks "Next Show" or auto-advance triggers
**Input:**
```json
{
  "rivalryId": "uuid",
  "showNumber": 2
}
```

**Output:**
```json
{
  "emcee_text": "Show 2. Fresh start. Let's see what you've got."
}
```

**Logic:**
1. Fetch rivalry data (to get current score for variable replacement)
2. Determine trigger type and condition:
   ```javascript
   let triggerType = 'show_transition'
   let condition = null
   
   if (showNumber === 5) {
     triggerType = 'milestone'
     condition = 'show_5'
   } else if (showNumber === 10) {
     triggerType = 'milestone'
     condition = 'show_10'
   } else if (showNumber === 20) {
     triggerType = 'milestone'
     condition = 'show_20'
   }
   ```
3. Query emcee_lines table:
   ```javascript
   let query = supabase
     .from('emcee_lines')
     .select('line_text')
     .eq('trigger_type', triggerType)
   
   if (condition) {
     query = query.eq('condition', condition)
   }
   ```
4. Pick random line from results
5. Replace variables in line text:
   - `{player1}` → leading player's name (or "You're" if tied)
   - `{player2}` → trailing player's name
   - `{p1_score}` → leading player's score
   - `{p2_score}` → trailing player's score
   - `{show_number}` → current show number
6. Return processed line

**Example variable replacement:**
- Database line: "Show {show_number}. {player1} leads {p1_score}-{p2_score}. Momentum shifts fast."
- Current state: Craig Left leads 3-1, Show 4
- Output: "Show 4. Craig Left leads 3-1. Momentum shifts fast."

**NO AI GENERATION** - Just database lookups and variable replacement! 🎉

---

## Database Schema

### rivalries table
- `intro_emcee_text` (TEXT, nullable) - Generated once when rivalry is created (uses AI)
- Example: "New rivalry alert. Craig Left vs Craig Right. Let's see what these two are made of."

### shows table
- `emcee_text` (TEXT, nullable) - Populated when show is created (from database, not AI)
- Example: "Show 2. Craig leads 1-0. Momentum shifts fast."

### emcee_lines table (100 pre-written lines)
**Columns:**
- `id` (serial primary key)
- `line_text` (text) - The line with optional variables
- `trigger_type` (text) - One of: 'show_transition', 'milestone'
- `condition` (text, nullable) - For milestones: 'show_5', 'show_10', 'show_20'
- `tags` (text[], nullable) - Future use: 'tied_game', 'blowout', 'close_game'

**Example rows:**

**Regular show transitions:**
```sql
trigger_type: 'show_transition', condition: null
- "Show {show_number}. Fresh start. Let's see what you've got."
- "{player1} leads {p1_score}-{p2_score}. Time to answer back."
- "Here we go again. Show {show_number}."
```

**Milestone shows:**
```sql
trigger_type: 'milestone', condition: 'show_5'
- "Five shows in. {player1} leads {p1_score}-{p2_score}. Starting to see a pattern."
- "Show 5. One of you is figuring this out. The other... not so much."

trigger_type: 'milestone', condition: 'show_10'
- "Ten shows deep. {player1} {p1_score}, {player2} {p2_score}. This rivalry has legs."
- "Double digits. Still going. Respect to both of you for sticking with it."

trigger_type: 'milestone', condition: 'show_20'
- "Twenty shows. TWENTY. {player1} leads {p1_score}-{p2_score}. This is commitment."
- "Show 20. You two really can't let this go, can you? I love it."
```

---

## Implementation Files

### File 1: InterstitialScreen.jsx (NEW)
**Location:** `/src/components/InterstitialScreen.jsx`

```jsx
import { useState, useEffect } from 'react';
import Header from './Header';
import RipleyIcon from '../assets/ripley.svg';

export default function InterstitialScreen({ emceeText, onComplete, duration = 10000 }) {
  const [countdown, setCountdown] = useState(Math.ceil(duration / 1000));
  const [autoAdvance, setAutoAdvance] = useState(true);

  useEffect(() => {
    if (!autoAdvance) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoAdvance, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-6 flex flex-col">
      <Header />
      
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="max-w-md w-full text-center space-y-6">
          
          {/* Ripley Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full"></div>
            <div className="relative">
              <img 
                src={RipleyIcon} 
                alt="Ripley" 
                className="w-20 h-20 mx-auto drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Label */}
          <div className="text-base font-bold text-orange-400 tracking-wider uppercase">
            Host Ripley Says...
          </div>

          {/* Commentary Text - NO BOX */}
          <div className="px-4 py-2">
            <p className="text-xl text-slate-100 leading-relaxed font-medium">
              {emceeText}
            </p>
          </div>

        </div>
      </div>

      {/* Buttons - Bottom */}
      <div className="max-w-md mx-auto w-full space-y-2 pb-4">
        {autoAdvance ? (
          <>
            <button
              onClick={() => {
                setAutoAdvance(false);
                setCountdown(null);
                onComplete();
              }}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
            >
              {countdown !== null ? `Continue in ${countdown}s • Skip` : 'CONTINUE'}
            </button>
            
            <button
              onClick={() => {
                setAutoAdvance(false);
                setCountdown(null);
              }}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 transition-all font-semibold"
            >
              STAY HERE
            </button>
          </>
        ) : (
          <button
            onClick={onComplete}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
          >
            CONTINUE
          </button>
        )}
      </div>
    </div>
  );
}
```

---

### File 2: Screen1.jsx Updates
**Location:** `/src/components/Screen1.jsx`
**What to change:** State C (Rivalry Started screen)

**Find this section (around line 1307-1323):**
```jsx
<div className="text-center">
  <div className="text-3xl font-bold text-orange-500 mb-4">
    🎉 Rivalry Started!
  </div>

  <p className="text-slate-300 text-lg mb-12">
    You're now facing your opponent
  </p>

  <button
    onClick={handleStartFirstShow}
    className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-400 transition-all"
  >
    Start First Show
  </button>
</div>
```

**Replace with:**
```jsx
<div className="text-center space-y-6">
  <div className="text-3xl font-bold text-orange-500">
    🎉 Rivalry Started!
  </div>

  {/* Ripley's Welcome Commentary */}
  {rivalry?.intro_emcee_text && (
    <div className="max-w-md mx-auto px-4 py-6">
      <p className="text-lg text-slate-200 leading-relaxed font-medium italic">
        "{rivalry.intro_emcee_text}"
      </p>
      <p className="text-sm text-orange-400 mt-3 font-semibold">
        — Host Ripley
      </p>
    </div>
  )}

  {!rivalry?.intro_emcee_text && (
    <p className="text-slate-300 text-lg">
      You're now facing your opponent
    </p>
  )}

  <button
    onClick={handleStartFirstShow}
    className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-400 transition-all"
  >
    Start First Show
  </button>
</div>
```

**That's it for Screen1!** No other changes needed.

---

### File 3: Screen4.jsx Updates
**Location:** `/src/components/Screen4.jsx`

**Changes needed:**

#### 3A. Import InterstitialScreen
At the top of the file, add:
```jsx
import InterstitialScreen from './InterstitialScreen';
```

#### 3B. Add state for interstitial
Around line 60-75 (with other useState declarations):
```jsx
const [showInterstitial, setShowInterstitial] = useState(false);
const [interstitialText, setInterstitialText] = useState('');
```

#### 3C. Update createNextShow function
**This is the KEY function.** Find `async function createNextShow()` (around line 440-550).

**NEW flow:**
1. Find next show number
2. Check if show already exists → return it
3. If not exists:
   a. **Call Edge Function to get emcee_text** (only if show_number > 1)
   b. Create show with emcee_text
   c. Return show

**Updated createNextShow function:**
```jsx
async function createNextShow() {
  console.log('🔴 createNextShow: Starting');
  
  // Find next show number
  const { data: allShows } = await supabase
    .from('shows')
    .select('show_number')
    .eq('rivalry_id', rivalryId)
    .order('show_number', { ascending: false })
    .limit(1);
  
  const nextShowNumber = allShows && allShows.length > 0 
    ? allShows[0].show_number + 1 
    : 1;
  
  console.log('🔴 createNextShow: Next show number:', nextShowNumber);
  
  // Check if show already exists
  const { data: existingShow } = await supabase
    .from('shows')
    .select('*')
    .eq('rivalry_id', rivalryId)
    .eq('show_number', nextShowNumber)
    .single();
  
  if (existingShow) {
    console.log('🔴 createNextShow: Show already exists');
    setCurrentShow(existingShow);
    return existingShow;
  }
  
  // Show doesn't exist, create it
  let emceeText = null;
  
  // Only generate emcee text for Show 2+
  if (nextShowNumber > 1) {
    console.log('🔴 createNextShow: Fetching emcee line from database');
    try {
      const emceeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/select-emcee-line`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            rivalryId: rivalryId,
            showNumber: nextShowNumber
          })
        }
      );
      
      if (emceeResponse.ok) {
        const emceeData = await emceeResponse.json();
        emceeText = emceeData.emcee_text;
        console.log('🔴 createNextShow: Got emcee text:', emceeText);
      }
    } catch (emceeError) {
      console.error('🔴 createNextShow: Error fetching emcee text:', emceeError);
    }
  }
  
  // Get random prompt and judges
  const prompt = await getRandomPrompt();
  const judgeObjects = await selectJudges();
  const judgeKeys = judgeObjects.map(j => j.key);
  
  // Create the show
  const { data: newShow, error } = await supabase
    .from('shows')
    .insert({
      rivalry_id: rivalryId,
      show_number: nextShowNumber,
      prompt_id: prompt.id,
      prompt: prompt.text,
      judges: judgeKeys,
      profile_a_id: rivalry.profile_a_id,
      profile_b_id: rivalry.profile_b_id,
      status: 'waiting',
      emcee_text: emceeText
    })
    .select()
    .single();
  
  if (error) {
    console.error('🔴 createNextShow: Error creating show:', error);
    return null;
  }
  
  console.log('🔴 createNextShow: Created show:', newShow);
  setCurrentShow(newShow);
  return newShow;
}
```

#### 3D. Update "Next Show" button handler
Find the button that says "Next Show" (around line 1460-1480, in the verdict section).

**Replace the onClick handler with:**
```jsx
onClick={async () => {
  console.log('🔴 NEXT SHOW BUTTON CLICKED');
  setAutoAdvance(false);
  const nextShow = await createNextShow();
  
  if (nextShow?.emcee_text) {
    console.log('🔴 Showing interstitial:', nextShow.emcee_text);
    setInterstitialText(nextShow.emcee_text);
    setShowInterstitial(true);
  }
}}
```

#### 3E. Update auto-advance countdown
Find the auto-advance useEffect (around line 238-256).

**Replace the countdown logic with:**
```jsx
useEffect(() => {
  if (currentShow?.status === 'complete' && autoAdvance) {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return 30;
        if (prev <= 1) {
          // Auto-advance triggered
          console.log('🔴 AUTO-ADVANCE: Creating next show');
          createNextShow().then((nextShow) => {
            if (nextShow?.emcee_text) {
              console.log('🔴 AUTO-ADVANCE: Showing interstitial');
              setInterstitialText(nextShow.emcee_text);
              setShowInterstitial(true);
            }
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  } else {
    setCountdown(null);
  }
}, [currentShow?.status, autoAdvance]);
```

#### 3F. Render interstitial conditionally
At the TOP of the return statement (before all other content), add:

```jsx
// Show interstitial if active
if (showInterstitial) {
  return (
    <InterstitialScreen
      emceeText={interstitialText}
      onComplete={() => {
        console.log('🔴 INTERSTITIAL COMPLETE');
        setShowInterstitial(false);
      }}
      duration={10000}
    />
  );
}
```

---

### File 4: Edge Function - select-emcee-line
**Location:** `supabase/functions/select-emcee-line/index.ts`

**Full implementation:**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface SelectEmceeRequest {
  rivalryId: string
  showNumber: number
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rivalryId, showNumber } = await req.json() as SelectEmceeRequest

    if (!rivalryId || showNumber === undefined) {
      return new Response(
        JSON.stringify({ error: 'rivalryId and showNumber are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Determine trigger type and condition
    let triggerType = 'show_transition'
    let condition = null
    
    if (showNumber === 5) {
      triggerType = 'milestone'
      condition = 'show_5'
    } else if (showNumber === 10) {
      triggerType = 'milestone'
      condition = 'show_10'
    } else if (showNumber === 20) {
      triggerType = 'milestone'
      condition = 'show_20'
    }

    // Query for matching lines
    let query = supabase
      .from('emcee_lines')
      .select('line_text')
      .eq('trigger_type', triggerType)
    
    if (condition) {
      query = query.eq('condition', condition)
    }

    const { data: lines, error: linesError } = await query

    if (linesError || !lines || lines.length === 0) {
      throw new Error('No emcee lines found')
    }

    // Pick random line
    const randomLine = lines[Math.floor(Math.random() * lines.length)]
    let emceeText = randomLine.line_text

    // Fetch rivalry data for variable replacement
    const { data: rivalry, error: rivalryError } = await supabase
      .from('rivalries')
      .select(`
        *,
        profile_a:profiles!rivalries_profile_a_id_fkey(name),
        profile_b:profiles!rivalries_profile_b_id_fkey(name)
      `)
      .eq('id', rivalryId)
      .single()

    if (rivalryError || !rivalry) {
      throw new Error('Rivalry not found')
    }

    // Calculate current score
    const { data: completedShows } = await supabase
      .from('shows')
      .select('winner_id')
      .eq('rivalry_id', rivalryId)
      .eq('status', 'complete')
      .order('show_number', { ascending: true })

    let profileAWins = 0
    let profileBWins = 0
    if (completedShows) {
      profileAWins = completedShows.filter(s => s.winner_id === rivalry.profile_a_id).length
      profileBWins = completedShows.filter(s => s.winner_id === rivalry.profile_b_id).length
    }

    // Replace variables
    const playerAName = rivalry.profile_a.name
    const playerBName = rivalry.profile_b.name
    
    let leadingPlayer = playerAName
    let trailingPlayer = playerBName
    let leadingScore = profileAWins
    let trailingScore = profileBWins
    
    if (profileBWins > profileAWins) {
      leadingPlayer = playerBName
      trailingPlayer = playerAName
      leadingScore = profileBWins
      trailingScore = profileAWins
    } else if (profileAWins === profileBWins) {
      leadingPlayer = "You're"
      trailingPlayer = ""
    }

    // Replace all variables
    emceeText = emceeText
      .replace(/{player1}/g, leadingPlayer)
      .replace(/{player2}/g, trailingPlayer)
      .replace(/{p1_score}/g, leadingScore.toString())
      .replace(/{p2_score}/g, trailingScore.toString())
      .replace(/{show_number}/g, showNumber.toString())

    return new Response(
      JSON.stringify({ emcee_text: emceeText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## Testing Plan

### Test 1: Create New Rivalry
1. Open two browser windows
2. Create rivalry in Window A
3. **Both windows should navigate to "Rivalry Started!" screen**
4. **Both should see Ripley's welcome quote** (same text)
5. Quote should be in italic with "— Host Ripley" attribution
6. Click "Start First Show"
7. **Should load Show 1 immediately (NO interstitial)**

### Test 2: Show 1 → Show 2 Transition
1. Complete Show 1 (both submit, see verdict)
2. Click "Next Show" button
3. **Ripley interstitial should appear**
4. Should show pre-written line from database (not AI-generated)
5. Countdown from 10 seconds visible in button
6. Can click to skip immediately OR wait 10 seconds
7. After interstitial, Show 2 loads

### Test 3: Auto-Advance
1. Complete any show
2. Don't click "Next Show"
3. Wait for 30-second countdown to expire
4. **Ripley interstitial should appear automatically**
5. Then next show loads

### Test 4: "Stay Here" Button
1. Trigger any interstitial (Show 2+)
2. Click "STAY HERE" button (bottom button)
3. Countdown should stop
4. Both buttons should be replaced with single "CONTINUE" button
5. Click "CONTINUE"
6. Next show should load

### Test 5: Milestone Show
1. Complete shows 1-4
2. Click "Next Show" after Show 4
3. **Ripley interstitial for Show 5 should appear**
4. Should use milestone-specific line (from condition='show_5')
5. Should mention "Show 5" or "Five shows" in text

### Test 6: Variable Replacement
1. Check that lines with variables are properly replaced:
   - `{player1}` → actual leading player name
   - `{p1_score}` → actual leading player score
   - etc.

---

## What NOT to Do

❌ **Don't try to show interstitial before Show 1** - It causes race conditions and timing issues
❌ **Don't generate lines with Claude API** - Use pre-written lines from database only
❌ **Don't put Ripley text in a box** - Clean text only, no borders or backgrounds
❌ **Don't use gradient/gold background** - Match standard slate background
❌ **Don't make countdown too short** - 10 seconds is good for reading
❌ **Don't auto-advance without interstitial** - Always show Ripley for Show 2+
❌ **Don't call Edge Function for Show 1** - Only Show 2+

---

## Files to Create/Edit Summary

**NEW FILES:**
1. `InterstitialScreen.jsx` - Full component provided above
2. `supabase/functions/select-emcee-line/index.ts` - Full Edge Function provided above

**EDIT FILES:**
3. `Screen1.jsx` - Add Ripley quote to State C (~15 lines added)
4. `Screen4.jsx` - Add interstitial state, update createNextShow, update button handlers, add render logic (~50 lines modified/added)

**NO CHANGES NEEDED:**
- Database schema (already has intro_emcee_text, emcee_text columns, emcee_lines table)
- Judging Edge Function (separate issue with scores)
- Any other components

---

## Key Implementation Notes

### Database-Only Lines
- NO AI generation for show transitions (only for rivalry intro_emcee_text)
- ~100 pre-written lines in emcee_lines table
- Edge Function just queries database and replaces variables
- Cost: $0 per show transition (just database queries)
- Fast and predictable

### Variable Replacement
The Edge Function replaces these variables:
- `{player1}` - Leading player name (or "You're" if tied)
- `{player2}` - Trailing player name
- `{p1_score}` - Leading player score
- `{p2_score}` - Trailing player score
- `{show_number}` - Current show number

### Milestone Detection
Shows 5, 10, 20 get special treatment:
- `trigger_type = 'milestone'`
- `condition = 'show_5'` or `'show_10'` or `'show_20'`
- Lines are more celebratory/special

### Timing is Critical
- Edge Function call happens BEFORE creating show
- Show is created WITH emcee_text already populated
- Interstitial displays IMMEDIATELY after createNextShow() returns
- Only then does Screen4 render the new show

---

## Success Criteria

✅ Welcome text appears on "Rivalry Started!" screen for both players
✅ No interstitial before Show 1
✅ Interstitial appears before Show 2, 3, 4, etc.
✅ Manual "Next Show" click triggers interstitial
✅ Auto-advance countdown triggers interstitial
✅ Interstitial has 10-second countdown with skip option
✅ "Stay Here" button stops countdown and allows manual continue
✅ Lines come from database (no AI calls for transitions)
✅ Variables are properly replaced in lines
✅ Milestone shows (5, 10, 20) use special lines
✅ Background matches standard app design
✅ No scrolling required on interstitial screen
✅ Clean, professional visual design

---

## Cost & Performance

**Per Rivalry:**
- Rivalry intro_emcee_text: ~$0.00001 (1 AI call using Claude)
- Show transitions (Shows 2-20): $0 (database lookups only)

**Total cost per 20-show rivalry:** ~$0.00001 (essentially free!)

**Performance:**
- Database queries are fast (<100ms)
- No AI latency for show transitions
- Predictable and consistent

---

## Edge Cases to Handle

1. **Edge Function fails:** If emcee_text is null, show should still be created without interstitial
2. **No lines in database:** Edge Function should handle empty result set gracefully
3. **Player refreshes during interstitial:** Interstitial should not re-appear, just load the show
4. **Both players click "Next Show" simultaneously:** Race condition - one creates show, other loads it
5. **Old rivalries:** Won't have intro_emcee_text, should show fallback text
6. **Variables not replaced:** Should still display line even if variable replacement fails

---

## Current Status

**Database:** Ready (has intro_emcee_text, emcee_text columns, emcee_lines table with ~100 lines)
**Assets:** Ripley clapboard icon already exists
**Edge Function:** Needs to be written/deployed
**Frontend:** Needs implementation in Screen1 and Screen4
**Component:** InterstitialScreen needs to be created

---

## Final Notes

This is a **clean slate implementation**. Start fresh without trying to salvage any previous Ripley-related code. The only thing to keep is:
- Database columns (intro_emcee_text, emcee_text)
- Database table (emcee_lines with ~100 pre-written lines)
- The concept and narrative goals
- The button treatment decisions (matching verdict screen)

Everything else should be rebuilt from this spec to avoid inheriting bugs from previous attempts.

**Key difference from previous attempt:** We're using pre-written database lines with variable replacement, NOT generating lines with AI. This is simpler, faster, and cheaper!

Good luck! 🎬
