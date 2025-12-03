# One-Upper: Complete Project Handoff Document

## Table of Contents
1. [Game Overview](#game-overview)
2. [Core Mechanics](#core-mechanics)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [React Components](#react-components)
6. [Supabase Edge Functions](#supabase-edge-functions)
7. [Features Implemented](#features-implemented)
8. [Recent Session Work](#recent-session-work)
9. [Design Principles](#design-principles)
10. [Priority Roadmap](#priority-roadmap)
11. [Future Features](#future-features)
12. [Technical Debt](#technical-debt)
13. [Key Learnings](#key-learnings)

---

## Game Overview

**One-Upper** is a competitive 1v1 mobile web game where friends challenge each other to answer creative prompts, judged by AI personalities. The game transforms the socially problematic behavior of "one-upping" into structured competitive entertainment.

**Live at:** oneupper.app

**Core Concept:** Two players compete across 5 rounds, each answering the same ridiculous prompt. Three AI judges with distinct personalities score and critique both answers, declaring a winner each round. First to 3 round wins claims the "Golden Mic" trophy.

**Target Platform:** Mobile web (iOS Safari, Android Chrome) - works on desktop but optimized for phones

**Monetization:** Not yet implemented - currently free to play

---

## Core Mechanics

### Rivalry Structure
- **5 rounds per rivalry** (first to 3 wins)
- **3 judges per rivalry** (same judges for all 5 rounds, selected at rivalry creation)
- **Stakes system** - Optional custom wagers (e.g., "loser buys burritos")
- **Golden Mic** - Trophy awarded to rivalry winner
- **Mic Holder** - Tracks who submitted first (used for tiebreakers)

### Tiebreaker System
- When judges score a tie, **first to submit wins**
- Encourages quick, confident answers
- Creates strategic tension: speed vs. polish

### Gameplay Flow

```
1. CREATE/JOIN RIVALRY
   └── One player shares Profile ID, other enters it
   
2. RIVALRY INTRO FLOW (4 screens, once per player)
   ├── Screen 1: Meet Ripley (host introduction)
   ├── Screen 2: See matchup (players, stakes, category)
   ├── Screen 3: Learn the game (Out-think. Out-weird. Out-do.)
   └── Screen 4: Meet your 3 judges (tappable for details)

3. ROUND LOOP (repeats up to 5 times)
   ├── ANSWER PHASE
   │   ├── See prompt + judges + score
   │   ├── Write answer (30 word limit)
   │   └── Submit
   ├── WAITING PHASE
   │   ├── See "You submitted ✓"
   │   ├── Wait for opponent
   │   └── Nudge button available
   ├── JUDGING PHASE
   │   ├── "Judges Deliberating..." animation
   │   └── Timeout handling (retry, random winner, skip)
   ├── VERDICT FLOW (4 steps)
   │   ├── Step 1: Answers Revealed (side-by-side)
   │   ├── Step 2: Judge Banter (judges discuss/roast)
   │   ├── Step 3: Winner Reveal (confetti for winner)
   │   └── Step 4: Score Breakdown (individual scores + reasoning)
   └── INTERSTITIAL (between rounds)
       └── Ripley commentary

4. RIVALRY COMPLETE
   ├── AI-generated narrative summary
   ├── Final scores
   └── Rematch option
```

### Profile System
- **No traditional auth** - Uses memorable Profile IDs (e.g., "BLUE-TIGER-42")
- **Cross-device access** via profile code
- **Multiple profiles** per device supported
- **Avatar + Name** customization
- **Optional phone number** for SMS notifications

---

## Technical Architecture

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL + Real-time + Edge Functions) |
| Deployment | Vercel |
| AI | Claude Sonnet 4 via Anthropic API |
| SMS | Twilio (pending A2P 10DLC approval) |
| Domain | DirectNIC |
| Email | Cloudflare (forwarding) |

### Email Addresses
- hello@oneupper.app
- support@oneupper.app

### Environment
- **Production:** oneupper.app (Vercel)
- **Database:** Supabase hosted PostgreSQL
- **API Keys:** Stored in Supabase Edge Function secrets

---

## Database Schema

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  profile_code TEXT UNIQUE NOT NULL,  -- e.g., "BLUE-TIGER-42"
  phone_number TEXT,
  sms_opt_in BOOLEAN DEFAULT false,
  pending_stakes TEXT,  -- Stakes set before rivalry created
  has_completed_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rivalries
```sql
CREATE TABLE rivalries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_a_id UUID REFERENCES profiles(id),
  profile_b_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active',  -- active, complete, summarizing
  mic_holder_id UUID REFERENCES profiles(id),
  stakes TEXT,  -- Custom wager text
  judges TEXT[],  -- Array of judge keys, e.g., ['savage', 'riley', 'snoot']
  prompt_category TEXT DEFAULT 'random',
  profile_a_seen_intro BOOLEAN DEFAULT false,
  profile_b_seen_intro BOOLEAN DEFAULT false,
  first_show_started BOOLEAN DEFAULT false,
  intro_emcee_text TEXT,  -- Ripley's intro line
  summary TEXT,  -- AI-generated rivalry summary
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### shows (individual rounds)
```sql
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rivalry_id UUID REFERENCES rivalries(id),
  show_number INTEGER NOT NULL,  -- 1-5
  prompt_id INTEGER REFERENCES prompts(id),
  prompt TEXT NOT NULL,
  judges TEXT[],  -- Array of judge keys
  status TEXT NOT NULL,  -- waiting, answering, judging, complete, skipped
  profile_a_id UUID REFERENCES profiles(id),
  profile_b_id UUID REFERENCES profiles(id),
  profile_a_answer TEXT,
  profile_b_answer TEXT,
  profile_a_submitted_at TIMESTAMPTZ,
  profile_b_submitted_at TIMESTAMPTZ,
  winner_id UUID REFERENCES profiles(id),
  verdict JSONB,  -- Full judging results
  emcee_text TEXT,  -- Ripley's between-round commentary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'answering', 'judging', 'complete', 'skipped')),
  CONSTRAINT unique_rivalry_show UNIQUE (rivalry_id, show_number)
);
```

### judges (25 AI personalities)
```sql
CREATE TABLE judges (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,  -- e.g., 'savage', 'riley'
  name TEXT NOT NULL,  -- Display name
  emoji TEXT NOT NULL,  -- 🔥, 💙, etc.
  description TEXT NOT NULL,  -- Full personality description
  teaser TEXT,  -- Short one-liner for intro screen
  examples TEXT,  -- Example quotes
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Complete Judge List (25 judges)
| Key | Name | Emoji | Teaser |
|-----|------|-------|--------|
| savage | Savage | 🔥 | Loves chaos and bold risks |
| riley | Riley | 💙 | Heart, wordplay, good vibes |
| snoot | Snoot | 🎓 | Intellectual snob, loves craft |
| coach | Coach | 📋 | Tough love, rewards effort |
| wildcard | Wildcard | 🃏 | Completely unpredictable |
| diva | Diva | 👑 | Drama queen, loves flair |
| glitch | GLiTCH | 🤖 | AI humor processor, beep boop |
| zorp | Zorp | 👽 | Alien studying human comedy |
| hype | Hype | 🎤 | Battle rap energy, wants bars |
| gramps | Gramps | 👴 | Old-timer, loves timeless craft |
| mogul | Mogul | 💸 | Startup brain, thinks in scale |
| guru | Guru | 🧘 | Mystic seeking deeper meaning |
| edge | Edge | 🖤 | Edgy taste, secretly wholesome |
| scholar | Scholar | 📚 | Comedy PhD, analyzes everything |
| artiste | Artiste | 🎨 | Experimental, you wouldn't get it |
| tank | Tank | 💪 | Gym bro energy for comedy |
| gamer | Gamer | 🎮 | Esports judge, clutch or throw |
| sommelier | Sommelier | 🍷 | Tastes comedy like fine wine |
| chaos | Chaos | 😈 | Wants to watch it all burn |
| chef | Chef | 👨‍🍳 | Gordon Ramsay of comedy |
| method | Method | 🎭 | Method actor, never breaks |
| rockstar | Rockstar | 🎸 | 80s rockstar, wants anthems |
| scientist | Scientist | 🔬 | Quantifies humor scientifically |
| wholesome | Wholesome | 🌈 | Pure positivity, loves everyone |
| reaper | Reaper | 💀 | Appears when jokes die |

### prompts
```sql
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT,  -- For future category feature
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## React Components

### File Structure
```
src/
├── components/
│   ├── App.jsx                    # Main router/navigation
│   ├── Screen1.jsx                # Profile + Rivalry creation (~1800 lines)
│   ├── Screen2.jsx                # Profile management
│   ├── GameplayScreen.jsx         # Core gameplay (~1260 lines)
│   ├── RivalryIntroFlow.jsx       # 4-screen intro (NEW, ~370 lines)
│   ├── VerdictFlow.jsx            # 4-step verdict (~800 lines)
│   ├── RivalrySummaryScreen.jsx   # End of rivalry
│   ├── InterstitialScreen.jsx    # Between-round Ripley
│   ├── Header.jsx                 # ONE-UPPER logo header
│   ├── HowToPlayModal.jsx         # Game instructions
│   └── JoinRivalry.jsx            # Join via link handler
├── lib/
│   └── supabase.js                # Supabase client
└── index.css                      # Tailwind styles
```

### Component Details

#### App.jsx
- Main navigation state machine
- Routes: screen1, screen2, screen4 (gameplay), screen6summary, summary
- Handles deep linking for /join routes

#### Screen1.jsx (~1800 lines - needs refactor)
**States:**
- **State A:** New user - Create profile flow
- **State B:** Existing user - Home screen with "Challenge a friend" or "Join rivalry"
- **State C:** (BYPASSED) Old rivalry started screen

**Key Functions:**
- `startRivalryWithPendingInvite()` - Creates rivalry with judges
- `handleJoinRivalry()` - Joins existing rivalry via code
- `handleStartFirstShow()` - (Legacy, now in GameplayScreen)

#### GameplayScreen.jsx (~1260 lines)
**Responsibilities:**
- Load rivalry and current show
- Show RivalryIntroFlow if player hasn't seen it
- Create first show after intro completes
- Handle answer submission
- Real-time subscription for updates
- Route to VerdictFlow when complete

**Key States:**
- `yourTurn` - Player can write/submit answer
- `waiting` - Waiting for opponent
- `judging` - AI judges deliberating
- `verdict` - Hands off to VerdictFlow

**Key Functions:**
- `loadRivalryAndShow()` - Fetches data, creates first show if needed
- `submitAnswer()` - Saves answer, triggers judging if both submitted
- `createNextShow()` - Creates next round after verdict

#### RivalryIntroFlow.jsx (~370 lines) - NEW
**4 Screens:**
1. **Welcome** - Ripley greeting + self-intro
2. **Matchup** - Players, stakes, category, Ripley comment
3. **Game Rules** - Objective + "Out-think. Out-weird. Out-do."
4. **Meet Judges** - 3 judge cards (tappable), Ripley at bottom

**Features:**
- Randomized Ripley dialogue (multiple variations per screen)
- Contextual matchup comments (first meeting vs rematch detection)
- Judge modal on tap
- Marks intro as seen in database on completion

#### VerdictFlow.jsx (~800 lines)
**4 Steps:**
1. **Answers Revealed** - Side-by-side comparison
2. **Banter** - Judge discussion/roasting
3. **Winner Reveal** - Confetti animation for winner
4. **Breakdown** - Individual judge scores + reasoning

**Features:**
- Step navigation with continue buttons
- Confetti on wins (canvas-confetti library)
- Score persistence across steps

---

## Supabase Edge Functions

### judge-answers
**Trigger:** When both players submit answers
**Process:**
1. Fetches both answers and judge personalities
2. Calls Claude API with structured prompt
3. Each judge scores 1-10 with reasoning
4. Determines winner (or tie → first submitter wins)
5. Saves verdict JSON to shows table

**Cost:** ~$0.01-0.02 per judgment

### select-emcee-line
**Trigger:** Between rounds, rivalry intro
**Process:**
1. Takes rivalry context (scores, momentum, etc.)
2. Generates contextual Ripley commentary
3. Returns emcee_text

### generate-rivalry-summary
**Trigger:** When rivalry completes (first to 3 wins)
**Process:**
1. Fetches all rounds and verdicts
2. Generates narrative summary
3. Saves to rivalry.summary

### send-sms
**Trigger:** Various game events
**Notifications:**
- `rivalry_started` - Your friend joined
- `your_turn` - Opponent submitted, your turn
- `verdict_ready` - Round complete

**Status:** Pending A2P 10DLC approval from Twilio

---

## Features Implemented

### Real-time Multiplayer
- WebSocket-based Supabase subscriptions
- Instant updates when opponent submits
- Race condition protection for show creation
- Polling fallback for reliability

### AI Judging System
- 25 distinct judge personalities
- Genuine scoring differences based on personality
- Structured verdict format:
```json
{
  "judges": [
    {
      "key": "savage",
      "score_a": 7,
      "score_b": 8,
      "reasoning": "..."
    }
  ],
  "winner": "profile_b_id",
  "banter": "Judge discussion text..."
}
```

### Ripley (Host/Narrator)
- Consistent voice throughout experience
- Randomized dialogue variations for freshness
- Contextual comments based on game state
- Styling: No quote marks, orange name label

### Profile System
- Memorable codes (ADJECTIVE-NOUN-NUMBER)
- No passwords required
- Cross-device via code entry
- Multiple profiles per device

### Mobile-First Design
- Touch-optimized tap targets
- Proper visual hierarchy
- Celebration moments (confetti)
- Responsive layouts

---

## Recent Session Work

### Rivalry Intro Flow - COMPLETE ✅
Built 4-screen introduction shown once per player at rivalry start.

**Database changes added:**
```sql
ALTER TABLE rivalries ADD COLUMN judges text[];
ALTER TABLE rivalries ADD COLUMN prompt_category text DEFAULT 'random';
ALTER TABLE rivalries ADD COLUMN profile_a_seen_intro boolean DEFAULT false;
ALTER TABLE rivalries ADD COLUMN profile_b_seen_intro boolean DEFAULT false;
ALTER TABLE judges ADD COLUMN teaser text;
```

**Key decisions:**
- Judges fixed per rivalry (not randomized per round)
- Intro tracked per-player separately
- No menu during intro flow (clean focus)
- Ripley moved to bottom on judges screen

### State C Bypass - COMPLETE ✅
Removed old "Rivalry Started!" screen. All paths now go directly to GameplayScreen which shows intro flow if needed.

### First Show Creation Fix - COMPLETE ✅
- Moved show creation from Screen1 to GameplayScreen
- Fixed status to 'waiting' (not 'answering') 
- Added race condition protection with double-check

### Answer Screen Polish - COMPLETE ✅
Consolidated context into single shaded box:
```
┌─────────────────────────────────┐
│     Round 1 of 5           ⋮   │
│  😎 Craig: 0  vs  😎 Alex: 0   │
│     💀 Reaper  👑 Diva  🎭 Method │
└─────────────────────────────────┘

    Describe the taste of a color
         (hero prompt)

┌─────────────────────────────────┐
│ Drop your best answer here...  │
└─────────────────────────────────┘
                        0/30 words

┌─────────────────────────────────┐
│      Submit Your Answer         │
└─────────────────────────────────┘
```

---

## Design Principles

### Visual Styling
1. **No quote marks** on Ripley/narrator text
2. **Orange buttons** for primary actions throughout
3. **Shaded boxes without outlines** for grouping content
4. **Standardized Ripley styling** - `text-sm` label, regular body text
5. **Consistent text colors** - `text-slate-200` for body, `text-orange-400` for Ripley name

### UI Patterns
1. **Menu (⋮)** appears in gameplay screens, not during intro flow
2. **Judge cards** are clickable but not labeled "tap to learn more"
3. **Mobile-first** - everything optimized for phone screens
4. **Minimal friction** - no accounts, just profile codes
5. **Clear visual hierarchy** - one hero element per screen

### Interaction Patterns
1. **Orange = primary action** (Submit, Continue, Let's Go)
2. **Gray = disabled** or secondary
3. **Tap outside modal = close**
4. **Confetti on wins** (not on every screen - special moments)

---

## Priority Roadmap

### ✅ COMPLETE
1. **Rivalry Intro Flow** - 4-screen introduction
2. **Answer Screen Polish** - Consolidated context box

### Priority 3: Rivalry Summary Improvements

**Current Issues:**
- No Ripley presence (feels disconnected)
- Stats are basic (just win counts)
- Button layout could be cleaner

**Proposed Changes:**

Add Ripley Commentary:
- Ripley delivers the rivalry analysis
- AI-generated analysis presented as Ripley speaking
- Adds personality and continuity

Enhanced Stats - "Tale of the Tape":
- Closest round (smallest margin)
- Biggest blowout (largest margin)
- Average score per round
- Tiebreakers used (count)
- Speed demon: who submitted first more often
- Judge favorites: which judge scored you highest on average

Button Cleanup:
- Share → Could be icon button instead of full-width
- See Past Shows → Already collapsible, good
- Start New Rivalry → Keep prominent
- Add: Rematch button

**Rematch Feature (Complex):**

Who sees rematch option?
- Both players (winner defends, loser wants revenge)

Flow if both click rematch:
- Auto-create new rivalry between same players
- No invite code needed
- Optionally ask for new stakes

Flow if only one clicks:
- Creates "rematch request"
- Other player sees notification next time
- Request expires after X days?

Configuration options:
- Stakes (optional text field)
- Same judges or new judges? (toggle)

Technical considerations:
- New rematch_request table? Or field on rivalry?
- Notification method (SMS if enabled, or in-app)
- Edge case: deleted profiles

### Priority 4: Waiting State

**Current State:**
- Shows "You submitted ✓"
- Shows "Waiting for [opponent]..."
- Nudge button appears after delay

**Potential Improvements:**
- Show your submitted answer (so you remember what you wrote)
- More engaging waiting experience
- Consistent styling with other screens
- Fun waiting message from Ripley?

### Priority 5: Judging State

**Current State:**
- "Judges Deliberating..." with animated judge emojis
- Timeout handling (retry, pick random winner, skip)

**Potential Improvements:**
- Add more anticipation/drama
- Progress indicator?
- Ripley comment while waiting?

### Priority 6: Screen1 Polish

**Create Profile:**
- Currently functional but could use visual refresh
- Avatar picker, name input, phone (optional)

**Create Rivalry / Join:**
- "Challenge a friend" flow
- Join via code flow
- Stakes input
- These are the "front door" - should feel polished and have visual energy

---

## Future Features

### Prompt Categories

**Concept:** Prompts categorized by theme/tone. Challenger picks category or leaves random.

**Potential Categories:**
| Emoji | Name | Description |
|-------|------|-------------|
| 🎵 | Pop Culture | Movies, music, celebrities, trends |
| 🤔 | Deep Think | Philosophical, hypothetical, thought experiments |
| 🌶️ | Edgy | Slightly risqué, controversial, provocative |
| 😂 | Absurd | Completely random, surreal, nonsensical |
| 💼 | Everyday | Relatable situations, daily life |
| 🎲 | Random | Mix from all categories (default) |

**Technical Requirements:**
- Add category column to prompts table
- Categorize existing prompts (manual or AI-assisted)
- prompt_category field already exists on rivalries
- Update prompt selection to filter by category
- UI: category picker on rivalry creation screen

**Questions:**
- How many categories? Too many = decision fatigue
- Should category be per-rivalry or per-round? → Per-rivalry
- Can players see category before accepting challenge?

### Onboarding Flow (New Players)

**Concept:** First-time players get guided introduction before first real rivalry.

**Flow:**
1. Welcome Screen - Ripley introduces One-Upper concept
2. How It Works - Quick explanation (judges, scoring, one-upping)
3. Practice Round - Solo prompt + answer
4. Mock Judging - See how judges would score (just you)
5. Ready! - Proceed to create/join real rivalry

**Technical Requirements:**
- has_completed_onboarding flag on profiles table (exists)
- New OnboardingFlow component (multi-step)
- Mock judging endpoint or client-side simulation
- Skip option for returning players

**Questions:**
- Should practice round use real AI judging? (costs money but authentic)
- Can users skip onboarding entirely?
- Re-trigger onboarding from settings/help?

### Party Mode

**Concept:** Multiple players compete in real-time, same room or remote.

**Potential Formats:**
| Format | Description |
|--------|-------------|
| Free-for-all | 3-8 players, everyone answers, judges rank all |
| Tournament | Bracket style, 1v1 matchups until winner |
| Team Battle | 2 teams, alternating players |
| Hot Seat | One device passed around |

**Key Differences from Rivalries:**
- Single session (not async over days)
- More players (3-8)
- Needs lobby/waiting room
- Real-time synchronization critical
- Shorter format (3 rounds?)

**Technical Considerations:**
- New `parties` table (separate from rivalries)
- Real-time presence for lobby
- Handling disconnects/rejoins
- Scoring across multiple players
- Host controls (start game, kick players)

**Questions:**
- Which format first? (Free-for-all seems simplest)
- Max players?
- How do people join? (Party code? Link?)
- Spectator mode?

*This is a significant feature - needs dedicated planning session.*

### Other Future Ideas

- **SMS Notifications** - Pending Twilio A2P approval
- **Multiple Rivalries** - Play several rivalries simultaneously
- **Rival Reactions** - Emoji comments on verdicts
- **Leaderboards** - Win streaks, total wins
- **Magic Link Auth** - More secure profile access
- **PWA Support** - Install as app, offline handling

---

## Technical Debt

### Console Logs to Remove
- VerdictFlow.jsx - multiple debug logs
- GameplayScreen.jsx - various logs
- Do a `grep -r "console.log" src/` to find all

### Flash Issues (Pinned for Investigation)
- Interstitial → Prompt screen flash
- Judging → Verdict step 1 flash
- Root cause: React render cycles during state transitions
- Potential fix: transition states, loading overlays, or CSS transitions

### Component Size
- **Screen1.jsx** is ~1800 lines - needs breakdown into:
  - ProfileCreation component
  - RivalryCreation component
  - JoinRivalry component
  - StateB home screen component
- **GameplayScreen.jsx** is ~1260 lines
- **VerdictFlow.jsx** is ~800 lines
- Consider breaking after features stabilize

### Dead Code
- State C rendering code in Screen1.jsx (now bypassed)
- handleStartFirstShow in Screen1.jsx (moved to GameplayScreen)

---

## Key Learnings

### Technical
1. **Status constraints matter** - shows table requires specific values ('waiting', not 'answering' for new shows)
2. **Race conditions are real** - both players can try to create first show simultaneously
3. **Real-time subscriptions need filtering** - ignore intro flag changes to prevent unwanted reloads
4. **Supabase Edge Functions** - good for AI calls, keeps API keys secure

### Product
1. **Intro should be per-player** - each player sees it once, tracked separately
2. **Visual hierarchy is crucial** - consolidate context, make the prompt the hero
3. **Randomized content adds freshness** - Ripley variations prevent staleness
4. **Celebration moments matter** - confetti on wins feels great

### Process
1. **Test with two browsers** - simulate real multiplayer
2. **Console logging helps debug** - but clean up before shipping
3. **Surgical changes over rewrites** - conserve development resources
4. **Mobile-first always** - test on phone regularly

---

## Complete Segment List

### Onboarding (Future)
1. First-Time Onboarding - Ripley tutorial + practice round

### Pre-Game
1. Create/Select Profile - Avatar, name, phone
2. Create Rivalry / Join - Challenge friend, set stakes, pick category

### Core Gameplay
1. ✅ Rivalry Intro - Ripley introduces judges, explains game
2. ✅ Pre-Round / Answer Input - See prompt, judges, write answer
3. Waiting - After submit, waiting for opponent
4. Judging - AI deliberating
5. ✅ Verdict Flow - 4-step reveal
6. Interstitial - Ripley between rounds

### Post-Game
1. Rivalry Summary - Results, stats, rematch

### Party Mode (Future)
1. Party Lobby - Create/join party, wait for players
2. Party Gameplay - Multi-player rounds
3. Party Results - Rankings, winner celebration

---

## Testing Checklist

### New Rivalry Flow
- [ ] Create profile works
- [ ] Generate shareable Profile ID
- [ ] Join via code works
- [ ] Stakes save correctly
- [ ] Intro flow shows for both players
- [ ] Intro doesn't re-show on return
- [ ] First show creates successfully
- [ ] Both players see same prompt

### Gameplay
- [ ] Answer submission works
- [ ] 30 word limit enforced
- [ ] Waiting state shows correctly
- [ ] Nudge button works
- [ ] Judging triggers when both submit
- [ ] Verdict flow all 4 steps work
- [ ] Confetti shows for winner only
- [ ] Scores accumulate correctly
- [ ] Interstitial shows between rounds

### End of Rivalry
- [ ] Summary generates
- [ ] Final scores correct
- [ ] Rematch option works (when implemented)

### Edge Cases
- [ ] Refresh during intro flow
- [ ] Refresh during answer phase
- [ ] Browser back button handling
- [ ] Offline handling
- [ ] Judging timeout scenarios

---

*Document generated: December 1, 2024*
*For: One-Upper Development Handoff*
