# SHOWDOWN IMPROVEMENTS - HANDOFF DOCUMENT
## Session: December 19, 2025

---

## PROJECT CONTEXT

**One-Upper** is a competitive game with two modes:
- **Rivalry**: Async 1v1 over 5 rounds (already polished)
- **Showdown**: Sync 3-5 players in same room, 5 rounds, real-time on individual devices

This session focused on bringing Showdown up to the same polish level as Rivalry - adding animations, game show energy, and theatrical reveals.

**Craig's Development Preferences:**
- Copy-paste complete file artifacts (not partial snippets)
- Surgical changes over major rewrites when possible
- Test across multiple browser windows to simulate players
- Cost-conscious regarding AI calls
- Prioritize user experience and "game show energy"
- Snark over knee-slapper humor, playful not mean

---

## COMPLETED WORK THIS SESSION

### 1. ShowdownIntro.jsx (COMPLETE)
**Location:** `src/components/showdown/ShowdownIntro.jsx`

**Changes made:**
- Added staged animations for welcome screen (~3.8s total)
  - Ripley bubble fades in → Welcome line → Ripley intro → Instructions → Vibe box → Button
- Added staged animations for judges screen (~3.2s total)
  - "Today's judges:" fades in → Each judge card slides in from left (staggered) → Ripley comment → Button
- Fixed emoji encoding issues
- Removed "Ripley" label on judges screen (just mic + text)
- Added guard to prevent flash when transitioning between screens (judgesStage < 0 renders empty container)
- Judges are clickable to see details (modal)

**Animation timing:**
- Welcome: 100ms → 800ms → 1600ms → 2400ms → 3200ms → 3800ms
- Judges: 100ms → 700ms → 1300ms → 1900ms → 2600ms → 3200ms

---

### 2. ShowdownGuessing.jsx (COMPLETE)
**Location:** `src/components/showdown/ShowdownGuessing.jsx`

**Changes made:**
- Complete UI redesign from dropdowns to tappable card-based interface
- Timer moved to top (above prompt)
- Removed "Round X of 5" indicator
- "Who said it?" section:
  - Tap answer card → it highlights orange with "Pick below ↓"
  - Player chips (avatar + name) appear below → tap to assign
  - Assigned answers show player chip with × to remove
  - Auto-slot: when only 1 player and 1 answer remain, auto-assigns
  - Your answer shows "✓ You" (green, no interaction needed)
- "Predict the judges' favorite" section:
  - Full answer cards (not truncated)
  - Tap to select → orange glow + slight scale up
  - Others stay muted
- Independent shuffling: "Who said it?" and "Predict" sections have different random orders
- Staggered reveal animation on load
- "Unmatched:" label for remaining players

---

### 3. ShowdownReveal.jsx - Authors Phase (COMPLETE)
**Location:** `src/components/showdown/ShowdownReveal.jsx`

**Changes to "authors" phase (Did you guess right?):**
- Removed old "Written by:" / "Predicted by:" format
- New animated reveal:
  - Cards appear one at a time (~2s per answer)
  - Answer text shows first, then author revealed 800ms later
  - Card background turns green (guessed right OR your own) or red (guessed wrong)
  - Personalized per player - everyone sees same reveals but different colors
- Added "Did you guess right?" header (left-justified, semibold)
- Best guesser reveal:
  - Appears after all cards
  - Shows "[Name] guessed best!" with "+1 bonus point"
  - Added "Fastest with the most correct" tiebreaker note
  - Confetti fires on best guesser's screen only (using canvas-confetti)
  - No target icon (saves vertical space)
- Button only appears after animation completes

---

### 4. judge-showdown-round/index.ts (COMPLETE - NEEDS DEPLOY)
**Location:** `supabase/functions/judge-showdown-round/index.ts`

**Major changes to AI prompt:**

**Per-Judge Rankings (NEW):**
```json
"judgeRankings": {
  "rockstar": ["B", "D", "A", "E", "C"],
  "savage": ["D", "B", "A", "C", "E"],
  "snoot": ["A", "B", "D", "E", "C"]
}
```
- Each judge ranks ALL answers independently
- Final placement = sum of points across judges (5,4,3,2,1 per judge)
- Enables "Savage loved you, Snoot buried you" drama

**Tighter Banter:**
- Exactly 4 messages (was 4-5)
- 12 words max each (was 1-2 sentences)
- "Read-aloud-able" as key directive
- Players in same room will read these aloud

**New Extras:**
- `winnerReactions`: Each judge's 8-word take on their #1 pick
- `lastPlaceRoast`: Gentle 10-word dig at worst answer
- `mvpMoment`: 10 words on what made winner special

**Full verdict object now includes:**
```javascript
{
  rankings,              // Final placements with totalPoints and judgeBreakdown
  judgeRankings,         // Per-judge rankings for display
  banterMessages,        // 4 punchy comments
  winnerReactions,       // Each judge's take on their #1
  lastPlaceRoast,        // Gentle roast
  mvpMoment,             // What made winner special
  bonusWinner,           // Random category winner (+1 point)
  judgeWhisperers        // Players who predicted winner (+1 point)
}
```

**Deploy command:** `supabase functions deploy judge-showdown-round`

---

## WORK REMAINING

### 1. ShowdownReveal.jsx - Banter Phase (NEEDS UPDATE)
Current state: Shows all banter at once, Ripley intro present, no animations

**Needed changes:**
- Remove Ripley intro ("Judges, what are you thinking?")
- Show layout:
  - [Prompt at top]
  - [All answers - compact list for context]
  - [4 banter messages - animated in one at a time]
  - [Button]
- Animate banter messages in (staggered, ~400ms apart)
- Keep it quick - this is rapid-fire commentary

### 2. ShowdownReveal.jsx - Rankings Phase (NEEDS UPDATE)
Current state: Shows consensus ranking, basic layout

**Needed changes:**
- Show per-judge rankings (who ranked who where)
- More theatrical reveal of winner
- Consider showing:
  - `winnerReactions` - each judge's take
  - `mvpMoment` - what made winner special
  - `lastPlaceRoast` - optional, maybe random
- Cherry-pick which extras to show each round (keep fresh)
- Consider confetti for round winner

### 3. ShowdownFinale.jsx (NOT STARTED)
End of 5-round showdown - crown the champion

**Needs:**
- Review current implementation
- Add theatrical reveal of final standings
- Champion celebration (confetti, fanfare)
- Per-judge breakdown of total points?
- Show highlights/memorable moments?

---

## KEY DESIGN PRINCIPLES ESTABLISHED

### Animation Philosophy for Showdown:
- Everyone in same room on individual devices
- Animations must be **synchronized** - same timing for all players
- Can't have one person ahead of reveals
- Keep animations quick but dramatic
- Personalization is in the COLORS (green/red), not timing

### Banter Philosophy:
- Punchy, read-aloud-able (12 words max)
- Players will literally read these to each other
- Make them laugh, gasp, or groan
- "Game show host energy, not essay writing"
- 4 messages gives each judge at least one line, one can respond

### Reveal Philosophy:
- Sequential reveals create anticipation
- Simple visual feedback: green = right, red = wrong
- Your result is highlighted so you immediately know
- Confetti for winners/best guesser (on their screen only)
- Don't need complex "predicted by" lists - colors tell the story

### Cost Consciousness:
- Current: ~$0.01-0.02 per round
- New prompt: ~$0.015-0.025 per round (~25% increase)
- Can scale back by removing extras one by one
- Already have scaling levers identified

---

## FILES UPDATED THIS SESSION

| File | Status | Notes |
|------|--------|-------|
| ShowdownIntro.jsx | ✅ Complete | Staged animations for welcome + judges screens |
| ShowdownGuessing.jsx | ✅ Complete | Card-based UI, auto-slot, animations |
| ShowdownReveal.jsx | 🟡 Partial | Authors phase done, banter + rankings need work |
| index.ts (edge function) | ✅ Complete | Needs deploy to Supabase |
| ShowdownFinale.jsx | ❌ Not started | Champion reveal |

---

## HOW TO CONTINUE

1. **Deploy the edge function first:**
   ```bash
   supabase functions deploy judge-showdown-round
   ```

2. **Test a round** to see new verdict data structure

3. **Update ShowdownReveal.jsx** for banter phase:
   - Ask for the current file
   - Show prompt + answers + animated banter
   - Remove Ripley intro

4. **Update ShowdownReveal.jsx** for rankings phase:
   - Show per-judge rankings
   - Add winner reactions / mvp moment
   - More theatrical reveal

5. **Review ShowdownFinale.jsx** for champion reveal

---

## EXAMPLE OF NEW VERDICT DATA

After deploying new index.ts, verdict will look like:

```json
{
  "rankings": [
    {
      "playerId": "uuid",
      "answerId": "uuid",
      "placement": 1,
      "totalPoints": 14,
      "judgeBreakdown": { "rockstar": 1, "savage": 1, "snoot": 2 },
      "answer": "The answer text",
      "playerName": "Craig"
    }
  ],
  "judgeRankings": {
    "rockstar": [
      { "playerId": "uuid", "playerName": "Craig", "placement": 1 },
      { "playerId": "uuid", "playerName": "Sarah", "placement": 2 }
    ]
  },
  "banterMessages": [
    { "judgeKey": "rockstar", "judgeName": "Rockstar", "emoji": "🎸", "comment": "Craig went absolutely unhinged and I respect it." }
  ],
  "winnerReactions": {
    "rockstar": "That answer had main character energy.",
    "savage": "Pure chaos. My favorite kind.",
    "snoot": "Finally, someone with actual wit."
  },
  "lastPlaceRoast": "Sarah's answer was so safe it wore a helmet.",
  "mvpMoment": "Committed to the bit harder than anyone.",
  "bonusWinner": {
    "playerId": "uuid",
    "category": "Strongest 'hold my beer' energy",
    "reason": "Pure chaos energy",
    "playerName": "Craig"
  },
  "judgeWhisperers": ["uuid1", "uuid2"]
}
```

---

## QUESTIONS TO RESOLVE

1. **Banter phase** - Do we show the answers again for context, or assume players remember?
2. **Rankings reveal** - How theatrical? One at a time from last to first? Or all at once?
3. **Per-judge breakdown** - Show on rankings screen or just use for final tally?
4. **Extras rotation** - Show all extras or randomly pick 1-2 per round?
5. **ShowdownFinale** - What makes champion reveal special vs round winner reveal?
