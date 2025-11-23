# Ripley Emcee Interstitials - FINAL IMPLEMENTATION PLAN

## Executive Summary

Adding Ripley (producer character) interstitials that appear before every show with contextual commentary. Uses pre-written lines from database, selected based on rivalry state.

**Key Decision:** Ripley appears in Screen4 before loading shows, NOT in Screen1 during rivalry creation. This ensures both players see it and simplifies state management.

---

## The Clean Flow

### Rivalry Creation (Screen1):
1. User creates rivalry via /join link or manual code entry
2. **Silently generate `intro_emcee_text`** via Edge Function (no UI shown)
3. Store in `rivalries.intro_emcee_text` column
4. Navigate to "Start First Show" button screen
5. **No interstitial displayed yet**

### Show 1 Creation (Screen4):
1. User clicks "Start First Show" button
2. Screen4 creates Show 1 record
3. **Check if `rivalry.intro_emcee_text` exists**
4. If yes: Use it for Show 1's `emcee_text` field
5. If no: Call Edge Function to generate text
6. **Show Ripley interstitial** with the text
7. Auto-advance to Show 1 after 5 seconds

### Shows 2+ (Screen4):
1. User completes show, clicks "Next Show"
2. Screen4 calls Edge Function to generate new `emcee_text`
3. Creates Show record with `emcee_text` field
4. **Show Ripley interstitial** with the text
5. Auto-advance to next show after 4 seconds

### Milestone Shows 5, 10, 20 (Screen4):
1. Edge Function detects milestone show number
2. Uses `milestone` trigger_type (not `show_transition`)
3. Returns special milestone text
4. **Show Ripley interstitial** with milestone text
5. Auto-advance after 4 seconds

---

## Database Schema

### Already Complete ✅
- `emcee_lines` table with 100 pre-written lines
- `shows.emcee_text` column exists

### Need to Add:
```sql
ALTER TABLE rivalries ADD COLUMN IF NOT EXISTS intro_emcee_text TEXT;
```

This stores the ONE-TIME rivalry intro text that both players will see.

---

## Files Status

### ✅ Already Deployed:
1. **Edge Function** (`select-emcee-line/index.ts`) - No changes needed!
2. **InterstitialScreen.jsx** - Component is ready
3. **100 emcee lines** - Already in database
4. **ripley.svg** - Already in assets folder

### 🔧 Need to Update:
1. **Screen1.jsx** - Add silent intro text generation
2. **Screen4.jsx** - Add interstitial display logic

---

## Screen1.jsx Changes

**Goal:** Generate rivalry intro text during rivalry creation, but don't show interstitial.

### Change Location:
There are TWO places where rivalries get created in Screen1:
1. `startRivalryWithPendingInvite` function (~line 489) - for /join link flow
2. `handleJoinRivalry` function (~line 640) - for manual code entry

**Both need the same addition.**

### Code to Add (after rivalry insert):

```javascript
// After this code:
const { data: newRivalry, error: rivalryError } = await supabase
  .from('rivalries')
  .insert({
    profile_a_id: profileAId,
    profile_b_id: profileBId,
    mic_holder_id: userProfile.id,
    first_show_started: false
  })
  .select()
  .single();

if (rivalryError) throw rivalryError;

// ADD THIS:
// Generate rivalry intro text (silently, no UI shown)
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
        rivalryId: newRivalry.id,
        showNumber: 0, // Special: indicates rivalry intro
        triggerType: 'rivalry_intro'
      })
    }
  );
  
  if (emceeResponse.ok) {
    const emceeData = await emceeResponse.json();
    
    // Store intro text in rivalry record
    await supabase
      .from('rivalries')
      .update({ intro_emcee_text: emceeData.emcee_text })
      .eq('id', newRivalry.id);
  }
} catch (emceeError) {
  console.error('Error generating rivalry intro:', emceeError);
  // Continue without intro if it fails - not critical
}

// Then continue with existing code (navigate to State C, etc.)
```

**Key Points:**
- This runs silently (no state changes, no UI)
- Both players get same text (stored in database)
- If it fails, no big deal - we continue without it
- No interstitial is shown at this point

---

## Screen4.jsx Changes

**Goal:** Show Ripley interstitial before loading every show (1, 2, 3+, milestones).

### Add These Imports:
```javascript
import { useState, useEffect, useRef } from 'react';
import InterstitialScreen from './InterstitialScreen';
```

### Add These State Variables:
```javascript
const [showInterstitial, setShowInterstitial] = useState(false);
const [interstitialText, setInterstitialText] = useState('');
```

### Update `createNextShow` Function:

**Find:** The `createNextShow` function (around line 514)

**Modify:** Add emcee text generation logic

```javascript
async function createNextShow() {
  try {
    setAutoAdvance(true);
    const nextShowNumber = currentShow.show_number + 1;

    // Check if show already exists (race condition protection)
    const { data: existingShow } = await supabase
      .from('shows')
      .select('*')
      .eq('rivalry_id', rivalryId)
      .eq('show_number', nextShowNumber)
      .single();

    if (existingShow) {
      setCurrentShow(existingShow);
      return;
    }

    // Get emcee text
    let emceeText = null;
    
    // SPECIAL CASE: Show 1 uses rivalry intro if available
    if (nextShowNumber === 1 && rivalry?.intro_emcee_text) {
      emceeText = rivalry.intro_emcee_text;
    } else {
      // For all other shows, call Edge Function
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
              // No triggerType - Edge Function auto-determines milestone vs show_transition
            })
          }
        );
        
        if (emceeResponse.ok) {
          const emceeData = await emceeResponse.json();
          emceeText = emceeData.emcee_text;
        }
      } catch (emceeError) {
        console.error('Error fetching emcee line:', emceeError);
      }
    }

    // Get random prompt and judges
    const prompt = await getRandomPrompt();
    const judgeObjects = await selectJudges();
    const judgeKeys = judgeObjects.map(j => j.key);

    // Create show with emcee_text
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
      // Handle duplicate insert
      if (error.code === '23505') {
        const { data: fetchedShow } = await supabase
          .from('shows')
          .select('*')
          .eq('rivalry_id', rivalryId)
          .eq('show_number', nextShowNumber)
          .single();
        
        if (fetchedShow) {
          setCurrentShow(fetchedShow);
        }
      } else {
        console.error('Error creating next show:', error);
      }
    } else {
      setCurrentShow(newShow);
    }
  } catch (err) {
    console.error('Error in createNextShow:', err);
  }
}
```

### Update "Next Show" Button Handlers:

**Find:** The "NEXT SHOW →" button (around line 1204)

**Replace onClick:**
```javascript
onClick={async () => {
  await createNextShow();
  
  // Show interstitial if emcee text exists
  if (currentShow?.emcee_text) {
    setInterstitialText(currentShow.emcee_text);
    setShowInterstitial(true);
  }
}}
```

**Find:** The countdown button (around line 1180)

**Replace onClick:**
```javascript
onClick={async () => {
  setAutoAdvance(false);
  setCountdown(null);
  await createNextShow();
  
  if (currentShow?.emcee_text) {
    setInterstitialText(currentShow.emcee_text);
    setShowInterstitial(true);
  }
}}
```

### Add Interstitial Render at Top of Return:

**At the very beginning of Screen4's return statement:**
```javascript
export default function Screen4({ onNavigate, activeProfileId, rivalryId }) {
  // ... all state and functions ...

  // Show interstitial if active
  if (showInterstitial) {
    return (
      <InterstitialScreen
        emceeText={interstitialText}
        onComplete={() => setShowInterstitial(false)}
        duration={nextShowNumber === 1 ? 5000 : 4000} // 5s for Show 1, 4s for others
      />
    );
  }

  // ... rest of existing return code ...
```

**Note:** You can use a longer duration for Show 1 if desired, or keep all at 4000ms.

---

## Edge Function

**Status:** ✅ No changes needed!

The current Edge Function at `supabase/functions/select-emcee-line/index.ts` is already perfect:
- Accepts `triggerType` override for rivalry_intro
- Auto-detects milestone shows (5, 10, 20)
- Uses `show_transition` for regular shows
- Fills placeholders correctly

**Already deployed and working.**

---

## Testing Checklist

### Test 1: Rivalry Creation
1. ✅ Create new rivalry (either via /join link or manual code)
2. ✅ Check database - `rivalries.intro_emcee_text` should be populated
3. ✅ Both players see "Start First Show" button (no interstitial yet)

### Test 2: Show 1 with Ripley Intro
1. ✅ Either player clicks "Start First Show"
2. ✅ Ripley interstitial appears with rivalry intro text
3. ✅ Text shows both player names
4. ✅ Auto-advances after 5 seconds (or click Skip)
5. ✅ **Both players** see the same interstitial
6. ✅ Show 1 loads normally

### Test 3: Show 2 (Regular Transition)
1. ✅ Complete Show 1
2. ✅ Click "Next Show"
3. ✅ Ripley interstitial appears with show_transition text
4. ✅ Text reflects current score (1-1 or 1-0, etc.)
5. ✅ Auto-advances after 4 seconds
6. ✅ Show 2 loads normally

### Test 4: Show 5 (Milestone)
1. ✅ Complete Show 4
2. ✅ Click "Next Show"
3. ✅ Ripley interstitial appears with MILESTONE text
4. ✅ Text has special "Show 5" messaging
5. ✅ Only one interstitial (no double-up)
6. ✅ Show 5 loads normally

### Test 5: Different Rivalry States
1. ✅ Tied game (3-3) → "Deadlocked" style text
2. ✅ Close game (4-3) → "Neck and neck" style text
3. ✅ Blowout (6-2) → "Dominating" style text
4. ✅ Streak (3+ wins) → "On fire" style text

### Test 6: Both Players See Same Text
1. ✅ Player A creates rivalry → intro text generated
2. ✅ Player B loads rivalry → sees same intro text
3. ✅ On Show 2+, both see identical interstitial text
4. ✅ Text is stored in database, not generated per-player

---

## Why This Approach is Better

### Previous Attempts Had:
❌ Ripley shown during rivalry creation (timing issues)  
❌ Only one player saw it  
❌ Complex state management bugs  
❌ Stuck screens with `isAutoAccepting`  
❌ Interstitial flashing by too quickly

### New Clean Approach Has:
✅ Ripley shown when creating/loading shows (consistent timing)  
✅ Both players see it (server-side text, real-time sync)  
✅ Simple state management (Screen4 only)  
✅ No stuck screens (no special rivalry flow)  
✅ Proper duration control (5s for intro, 4s for others)  
✅ Works for ALL shows (1, 2, 3+, milestones)

---

## File Checklist

### Need from Outputs Folder:
- [ ] InterstitialScreen.jsx (already created) ✅
- [ ] select-emcee-line/index.ts (already deployed) ✅

### Need to Create:
- [ ] Updated Screen1.jsx (original + silent intro generation)
- [ ] Updated Screen4.jsx (with interstitial logic)

### Already Have:
- [ ] ripley.svg in assets folder ✅
- [ ] 100 emcee lines in database ✅
- [ ] `shows.emcee_text` column ✅

### Need to Add:
- [ ] `rivalries.intro_emcee_text` column (SQL command above)

---

## Environment Variables

Required in Vercel:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Should already be set if app is working.

---

## Cost Impact

**Per Show:**
- Edge Function call: ~$0.00001
- Database queries: Free (within limits)

**Total cost per 100 shows:** ~$0.001

Essentially free!

---

## Deployment Order

1. ✅ **Database:** Add `intro_emcee_text` column to rivalries
2. ✅ **Edge Function:** Already deployed
3. ✅ **InterstitialScreen.jsx:** Already in components folder
4. 🔧 **Screen1.jsx:** Add silent intro generation
5. 🔧 **Screen4.jsx:** Add interstitial display
6. 🚀 **Deploy:** `git push origin main`
7. ✅ **Test:** Create rivalry and play through Show 1-5

---

## Success Criteria

After deployment, the game should:
- ✅ Generate rivalry intro text silently during rivalry creation
- ✅ Show Ripley interstitial before Show 1 (with intro text)
- ✅ Show Ripley interstitial before Shows 2+ (with transition text)
- ✅ Show Ripley interstitial before Shows 5, 10, 20 (with milestone text)
- ✅ Both players see identical text for each show
- ✅ Auto-advance after duration (5s for Show 1, 4s for others)
- ✅ Skip button works
- ✅ Text matches rivalry state (tied, close, blowout, streak)
- ✅ No stuck screens or timing issues

---

## Next Steps for Implementation

In the next prompt:
1. Create updated Screen1.jsx (with silent intro generation)
2. Create updated Screen4.jsx (with interstitial logic)
3. Test and debug if needed

Ready to build! 🎬🚀
