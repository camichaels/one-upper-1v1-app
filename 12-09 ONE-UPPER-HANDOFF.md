# One-Upper: Comprehensive Handoff Document

## Executive Summary

One-Upper is a competitive 1v1 async mobile game where players engage in creative duels judged by AI personalities. The core concept transforms the socially problematic behavior of "one-upping" into structured competitive entertainment. Players submit escalating responses to prompts, with AI judges scoring submissions and determining winners.

**Live URL:** https://oneupper.app  
**Tech Stack:** React/Vite frontend, Supabase backend, Vercel deployment, Claude Sonnet 4 API for AI judging  
**Developer:** Craig (non-technical founder, one-person operation)  
**Development Style:** Copy-paste with complete file artifacts, targeted edits via VS Code

---

## Game Modes

### 1. Rivalry Mode
- **Format:** 1v1 async competition between two players
- **Structure:** 5 rounds per rivalry
- **Judges:** 3 AI judges per rivalry (selected at rivalry creation, persist throughout)
- **Winner:** Player who wins the most rounds claims the "Golden Mic" trophy
- **Flow:** Invite code system → Both players answer same prompt → AI judges score 1-10 each → Winner determined → Repeat for 5 rounds → Final summary

### 2. Showdown Mode
- **Format:** 3-5 player live multiplayer
- **Structure:** 5 rounds with rotating bonus categories
- **Judges:** Same AI judge system
- **Flow:** Real-time gameplay with placement-based results

---

## Core Game Flow (Rivalry Mode)

### Phase 1: Entry & Profile Creation
**File:** `Screen1.jsx`

**State A - New User Entry:**
- Tagline: "Ready to out-think a friend?" (orange, centered)
- Primary button: "Create Your Profile"
- Returning users: "Back for more?" with inline input for Profile ID
- Random judge quote displayed at bottom (53 quotes in rotation)
- Friendly error messages: "Hmm, that doesn't look right", "We couldn't find that one. Double check?"

**Profile Creation Form:**
- Avatar selection: "Pick your fighter:"
- Name field: "What do they call you?"
- Bio field: "Brag a little:" (required, 100 char limit with counter)
- Phone field with SMS consent for notifications
- Button: "Let's Go"

**State B - Home Screen (Returning User):**
- Rotating greeting (12 options): "Hey {name}!", "Let's go, {name}!", "Back for more, {name}?", etc.
- "Start a Rivalry" button (expands to show category picker and optional stakes)
- "Got an Invite?" button for joining existing rivalries
- Random judge quote at bottom
- Profile hub accessible via avatar

### Phase 2: Rivalry Setup
**File:** `Screen1.jsx`

**Creating a Rivalry:**
- Category selection: "Set the vibe:" (Pop Culture, Hypotheticals, Hot Takes, etc.)
- Optional stakes: "Up the stakes (optional):" with dice randomizer
- Button: "Generate Invite Code"
- Code display: "Send this to your rival:" with "Good for 24 hours" note
- Share options: Copy link, text message

**Joining a Rivalry:**
- Modal: "Enter the code:"
- Button: "Let's Go"
- Error handling: "Hmm, that code didn't work. Double check it?", "This code expired. Time for a fresh one!", "Nice try, but you can't challenge yourself!"

### Phase 3: Rivalry Intro Flow
**File:** `RivalryIntroFlow.jsx`

**Screen 1 - Ripley Introduction:**
- Rotating title (12 options): "It's on!", "Game on!", "Here we go!", "Let the rivalry begin!", etc.
- Ripley (🎙️) introduces the matchup
- Button: "Meet Your Rival"

**Screen 2 - Matchup Display:**
- VS-style player display with avatars
- Tagline: "5 rounds. 3 judges. 1 Golden Mic."
- Category display: "The vibe:" + selected category
- Button: "How It Works"

**Screen 3 - Game Rules:**
- Two-line objective: "Write the most outlandish answer to ridiculous prompts." + "Three judges decide who did it better."
- Ripley strategy message
- Button: "Meet the Judges"

**Screen 4 - Judge Introduction:**
- Header: "Today's judges:"
- Three judge cards (tappable for details)
- Modal with judge personality, judging style, examples
- Button: "Got It"

### Phase 4: Gameplay
**File:** `GameplayScreen.jsx`

**Answer Submission Screen:**
- Round indicator: "Round X of 5"
- VS display with current score
- Judge pills (tappable for details)
- Prompt display (large, centered)
- Text area with placeholder: "Drop your best answer here..."
- Word counter: "0/30 words" (left) + "Be bold. Be weird. Be unexpected." (right, subtle)
- Button: "Lock It In"

**Waiting State (after submission):**
- Rotating headline: "Locked in!", "Done!", "You're in.", "Nice.", "Submitted!", etc.
- Your submitted answer displayed with green checkmark
- Ripley quip (randomized based on answer)
- Waiting indicator: "⏳ Waiting for {opponent}..."
- Nudge button (secondary gray style): "Nudge {opponent}"

**Nudge Modal:**
- Title: "Nudge {opponent}?"
- Body: "{opponent} got a notification when you submitted. Send another?"
- Buttons: "Send" (orange) / "Never mind" (gray)
- Alternative flow for users without SMS: Copy link / Text options

**Judging State:**
- "Judges deliberating..." (sentence case, not all caps)
- Orbiting judge animation

### Phase 5: Verdict Flow
**File:** `VerdictFlow.jsx`

**Step 1 - The Answers:**
- Round indicator
- Prompt display
- Ripley intro bubble (bg-slate-800/50, consistent styling)
- Both answers displayed (player cards)
- Button: "To the Judges"

**Step 2 - Judge Banter:**
- Ripley intro (12 rotating options): "The judges have thoughts...", "Let's eavesdrop on the judges...", etc.
- Judge conversation bubbles (staggered left/right layout)
- Button: "And the winner is..."

**Step 3 - Winner Announcement:**
- Golden mic icon (if viewer won)
- Winner headline: "{NAME} WINS THE ROUND!" (all caps, orange)
- Score display: "21 - 18"
- AI-generated headline or tiebreaker explanation
- Rivalry standings (no label, just the 1-0 format with names)
- Ripley verdict bubble
- Menu dots aligned with headline
- Button: "The Breakdown"

**Step 4 - The Breakdown:**
- Round and prompt display
- Winner answer box (orange tint, golden mic icon, score)
- Loser answer box (gray, score)
- Judge scores with new format:
  - `👽 Zorp — Craig Left: 6 • Craig Right: 7`
  - Viewer always on left, opponent on right
  - Winner of each judge in orange
  - Comment in italics below
- Artifacts section:
  - "Celebrity Match" (⭐)
  - "In related news…" (📰) - was "Fake Headline"
  - "Actually..." (🤓) - was "Fact Check"
  - Rivalry Recap styled as Ripley bubble (🎙️)
- Cycle through artifacts with arrow
- Button: "Next Up" (or "See Rivalry Summary" on final round)

**Interstitial Screen:**
**File:** `InterstitialScreen.jsx`
- Centered Ripley with mic icon
- Emcee text (AI-generated, includes round/score info)
- Button: "On to Round {X}" (dynamic based on next round)

### Phase 6: Rivalry Summary
**File:** (not detailed in this session)
- Final results and Golden Mic ceremony
- Rematch flow (noted as next priority)

---

## Key Components

### How to Play Modal
**File:** `HowToPlayModal.jsx`

**The Basics:**
- 5 rounds per rivalry
- Both rivals answer the same prompt
- 3 AI judges score you 1-10 each
- Highest score wins the round
- Tied? Fastest answer wins.
- Win the most rounds, win the Golden Mic

**Pro Tips:**
- Be funny. Be weird. Be memorable.
- Learn the judges - play to their quirks
- Review past rounds for intel

**About One-Upper:**
- Description of game concept
- Contact: hello@oneupper.app
- "Made with ❤️ for competitive friends everywhere"
- Button: "Got It" (no exclamation)

### All Rounds Modal
**File:** `AllRoundsModal.jsx`
- Title: "All Rounds"
- List of completed rounds with:
  - Round number
  - Prompt (text-slate-300 for better contrast)
  - Scores: viewer always left, opponent right, winner in orange
- Tappable to view round details

### Ripley Bubble Component
**File:** `VerdictFlow.jsx` (internal component)
- Consistent styling: `bg-slate-800/50 rounded-xl p-4`
- Layout: 🎙️ icon + "Ripley" label (text-orange-400) + message text
- Used throughout for Ripley commentary

---

## AI Judges System

### Judge Personalities
25+ distinct AI personalities stored in database, including:
- **Zorp** (👽) - Alien anthropologist
- **Chaos** (🎪) - Agent of mayhem
- **Wholesome** (🌈) - Positive energy
- **Diva** (🎬) - Drama queen
- **Method** (🎭) - Method actor
- **Wildcard** (🎲) - Unpredictable
- And many more...

### Judging Flow
1. Both players submit answers
2. 3 judges score each answer 1-10
3. Judges provide individual comments
4. AI generates banter/conversation between judges
5. Winner determined by total score (tiebreaker: first to submit)
6. AI generates headline and artifacts

### Artifacts (AI-generated content)
- **Celebrity Match:** Links answer to a celebrity's style
- **Fake Headline (now "In related news…"):** News-style headline based on answers
- **Fact Check (now "Actually..."):** Educational/humorous fact connection
- **Rivalry Recap:** Ripley's analysis of the matchup dynamics

---

## UI/UX Principles Established

### Copy & Tone
- Punchy, confident copy over generic instructions
- Snark over knee-slapper humor
- Conversational error messages
- Rotating content for variety (greetings, titles, quotes)
- "One-Upper energy" - competitive but playful

### Visual Hierarchy
- Orange for primary CTAs and winner highlights
- Slate grays for secondary elements
- White/slate-100 for important text
- Consistent component styling across screens

### Button Labels (Refined)
- "Lock It In" (not "Submit Your Answer")
- "Let's Go" (not "Start" or "Submit")
- "Got It" (not "Got It!" or "Close")
- "Next Up" (not "Continue")
- "To the Judges" (not "Hear from the judges")
- "The Breakdown" (not "Get the breakdown")
- "Never mind" (not "Cancel")

### Score Display Format
- Viewer always on left, opponent on right
- Winner highlighted in orange (text-orange-400 font-semibold)
- Separator: bullet (•) for players, dash (—) for judge-to-scores
- Consistent sizing (text-lg for totals in player boxes)

### Ripley Styling
- Content screens: Ripley in bubble (bg-slate-800/50)
- Interstitials: Centered, dramatic presentation
- Label: "Ripley" in text-orange-400
- Icon: 🎙️ (microphone emoji)

---

## Files Modified in This Session

### Major Changes

1. **GameplayScreen.jsx**
   - Added "Be bold. Be weird. Be unexpected." below answer input
   - Changed "Submit Your Answer" → "Lock It In"
   - Matched word count color to "Be bold" text (text-slate-500)
   - Added rotating waiting headlines
   - Changed nudge button to secondary gray style
   - Updated nudge modal copy
   - Changed "JUDGES DELIBERATING..." → "Judges deliberating..."
   - Added nextRound prop to InterstitialScreen call

2. **VerdictFlow.jsx**
   - Updated RipleyBubble styling (bg-slate-800/50, text-orange-400)
   - Added more ripleyBanterIntros (now 12 options)
   - Changed "Hear from the judges" → "To the Judges"
   - Simplified winner screen (removed round indicator, prompt, "RIVALRY STANDINGS" label)
   - Moved menu to align with winner headline
   - Changed "Get the breakdown" → "The Breakdown"
   - Updated artifact labels: "In related news…", "Actually..."
   - Styled rivalry_recap as Ripley bubble
   - Updated judge score format (viewer first, winner in orange, dash separator)
   - Made player score totals smaller (text-lg)
   - Changed "On to Round X" → "Next Up"

3. **HowToPlayModal.jsx**
   - Refined copy for The Basics and Pro Tips
   - Removed duplicate speed/tiebreaker tip
   - Removed mic emoji from Golden Mic line
   - Changed "Got It!" → "Got It"

4. **InterstitialScreen.jsx**
   - Added nextRound prop
   - Changed button to "On to Round {X}"

5. **AllRoundsModal.jsx**
   - Viewer score always on left
   - Winner highlighted in orange
   - Improved prompt contrast (text-slate-300)

---

## Known Issues & Technical Debt

1. **Large component files:** Screen1.jsx (1500+ lines), GameplayScreen.jsx (1700+ lines) need refactoring into smaller components
2. **Duplicate nudge modals:** Two instances in GameplayScreen.jsx that need consolidation
3. **SMS notifications:** Awaiting Twilio A2P 10DLC approval
4. **PWA support:** Needs refresh handling improvements

---

## Next Priorities (From Memory)

### Immediate
1. **End-of-rivalry experience:** Improve the final summary and implement rematch flow
2. **Screen1 visual energy:** Add animations and better illustrations to "New here?" and "Challenge a friend" states

### Future
- Multiple rivalries per user
- Rival reactions system (emoji-based comments)
- Seasonal structures with milestone analysis
- Comprehensive testing implementation
- Enhanced share functionality
- Graceful offline handling
- Component refactoring

---

## Development Workflow

### Craig's Preferences
- Complete file artifacts for new files
- Targeted str_replace edits for existing files
- Separate VS Code windows per project
- Test with multiple browser windows for multiplayer
- Systematic feature completion before moving on
- Critical feedback over simple agreement

### File Locations
- User uploads: `/mnt/user-data/uploads/`
- Output files: `/mnt/user-data/outputs/`
- Working directory: `/home/claude/`

### Key Technical Notes
- Always maintain backwards compatibility with data structures
- Cost-conscious approach to AI calls (~$0.01-0.02 per judgment)
- Prefer embedded arrays over additional DB queries when appropriate
- Pre-written DB content over real-time AI generation for speed

---

## Summary of This Session

This session focused on comprehensive UI/UX polish across the Rivalry mode gameplay flow. Key themes:

1. **Consistency:** Aligned score displays, Ripley styling, and button labels across all screens
2. **Clarity:** Simplified winner announcement screen, improved visual hierarchy
3. **Energy:** Added rotating content (headlines, greetings, judge quotes), punchier copy
4. **Flow:** Fixed button sequence (Next Up → Interstitial → On to Round X)

All changes maintain the game's core functionality while elevating the player experience with more polished, personality-driven UI.

---

*Document created: Session ending December 2024*
*Last updated files: GameplayScreen.jsx, VerdictFlow.jsx, HowToPlayModal.jsx, InterstitialScreen.jsx, AllRoundsModal.jsx*
