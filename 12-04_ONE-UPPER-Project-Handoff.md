# One-Upper: Complete Project Handoff Document

## Table of Contents
1. [Game Overview](#game-overview)
2. [Core Mechanics](#core-mechanics)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [React Components](#react-components)
6. [Supabase Edge Functions](#supabase-edge-functions)
7. [Features Implemented](#features-implemented)
8. [Design Principles](#design-principles)
9. [Priority Roadmap](#priority-roadmap)
10. [Future Features](#future-features)
11. [Technical Debt](#technical-debt)
12. [Key Learnings](#key-learnings)

---

## Game Overview

**One-Upper** is a competitive 1v1 mobile web game where friends challenge each other to answer creative prompts, judged by AI personalities. The game transforms the socially problematic behavior of "one-upping" into structured competitive entertainment.

**Live at:** oneupper.app

**Core Concept:** Two players compete across 5 rounds, each answering the same ridiculous prompt. Three AI judges with distinct personalities score and critique both answers, declaring a winner each round. First to 3 round wins claims the "Golden Mic" trophy.

**Target Platform:** Mobile web (iOS Safari, Android Chrome) - works on desktop but optimized for phones

**Monetization:** Not yet implemented - currently free to play

**Key Principle:** The game rewards being *outlandish* rather than truthful. Players should "crank up" their real-life experiences rather than share them plainly. Bold, memorable answers beat safe responses.

---

## Core Mechanics

### Rivalry Structure
- **5 rounds per rivalry** (first to 3 wins)
- **3 judges per rivalry** (same judges for all 5 rounds, selected at rivalry creation)
- **Stakes system** - Optional custom wagers (e.g., "loser buys burritos")
- **Golden Mic** - Trophy awarded to rivalry winner
- **Mic Holder** - Tracks who submitted first (used for tiebreakers)
- **Prompt Categories** - Player can select category or leave as "Surprise Me" (random)

### Tiebreaker System
- When judges score a tie, **first to submit wins**
- Encourages quick, confident answers
- Creates strategic tension: speed vs. polish

### Invite Code System
- **4-character codes** (e.g., "H4MF") - easy to share verbally or via text
- **24-hour expiry** - codes expire if not used
- **One-time use** - code becomes invalid after acceptance
- **Mutual consent** - rivalry only created when second player accepts

### Gameplay Flow

```
1. ONBOARDING (first-time players only)
   ├── Screen 1: Ripley welcome + game intro
   ├── Screen 2: Practice prompt (write an answer)
   └── Screen 3: See mock judging results + feedback

2. CREATE/JOIN RIVALRY
   ├── Pick category (or Surprise Me)
   ├── Set stakes (optional)
   ├── Generate invite code
   └── Share code with rival
   
3. RIVALRY INTRO FLOW (4 screens, once per player per rivalry)
   ├── Screen 1: Meet Ripley (host introduction)
   ├── Screen 2: See matchup (players, stakes, category)
   ├── Screen 3: Learn the game (Out-think. Out-weird. Out-do.)
   └── Screen 4: Meet your 3 judges (tappable for details)

4. ROUND LOOP (repeats up to 5 times)
   ├── ANSWER PHASE
   │   ├── See prompt + judges + score
   │   ├── Write answer (30 word limit)
   │   └── Submit
   ├── WAITING PHASE
   │   ├── See "You submitted ✓"
   │   ├── Wait for opponent
   │   └── Nudge button available (SMS or manual share)
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

5. RIVALRY COMPLETE
   ├── AI-generated narrative summary
   ├── Final scores + styles analysis
   ├── Share summary option
   ├── Rematch option
   └── New Rivalry option
```

### Profile System
- **No traditional auth** - Uses memorable Profile IDs (e.g., "BLUE-TIGER-42")
- **Cross-device access** via profile code
- **Multiple profiles** per device supported
- **Avatar + Name** customization
- **Optional phone number** for SMS notifications
- **SMS consent tracking** - separate opt-in for game messaging

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

### AI Costs
- Judge judging: ~$0.01-0.02 per judgment (Claude Sonnet 4)
- Rivalry summary: ~$0.01-0.02 per summary
- Onboarding practice judging: Same as regular judging

---

## Database Schema

### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  profile_code TEXT UNIQUE NOT NULL,  -- e.g., "BLUE-TIGER-42"
  phone TEXT,  -- 10 digits, no formatting
  sms_consent BOOLEAN DEFAULT false,  -- Explicit SMS opt-in
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rivalry_invites
```sql
CREATE TABLE rivalry_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,  -- 4-char code, e.g., "H4MF"
  creator_profile_id UUID REFERENCES profiles(id),
  accepted_by_profile_id UUID REFERENCES profiles(id),  -- NULL until accepted
  stakes TEXT,
  prompt_category TEXT DEFAULT 'mixed',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### rivalries
```sql
CREATE TABLE rivalries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_a_id UUID REFERENCES profiles(id),
  profile_b_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active',  -- active, complete, summarizing, cancelled
  mic_holder_id UUID REFERENCES profiles(id),
  stakes TEXT,
  judges JSONB,  -- Array of judge objects with full details
  prompt_category TEXT DEFAULT 'mixed',
  profile_a_seen_intro BOOLEAN DEFAULT false,
  profile_b_seen_intro BOOLEAN DEFAULT false,
  first_show_started BOOLEAN DEFAULT false,
  summary JSONB,  -- AI-generated rivalry summary
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
  judges JSONB,  -- Array of judge objects
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
  last_nudge_at TIMESTAMPTZ,  -- Rate limiting for nudges
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_rivalry_show UNIQUE (rivalry_id, show_number)
);
```

### prompts
```sql
CREATE TABLE prompts (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  categories TEXT[],  -- Array of category keys, e.g., ['absurd', 'everyday']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Prompt Categories:**
| Key | Label | Emoji | Description |
|-----|-------|-------|-------------|
| mixed | Surprise Me | 🔀 | Random from all categories (default) |
| pop_culture | Pop Culture | 🌟 | Movies, music, celebrities, trends |
| deep_think | Deep Think | 🤔 | Philosophical, hypothetical, thought experiments |
| edgy | More Edgy | 🌶️ | Slightly risqué, provocative |
| absurd | Totally Absurd | 😂 | Surreal, nonsensical |
| everyday | Everyday | ☕ | Relatable daily life situations |

**Current Distribution (200 prompts):**
- absurd: ~86 prompts
- everyday: ~90 prompts
- edgy: ~70 prompts
- deep_think: ~54 prompts
- pop_culture: ~54 prompts

Each prompt has exactly 2 categories for variety.

### judges (25 AI personalities)
```sql
CREATE TABLE judges (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,  -- e.g., 'savage', 'riley'
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT NOT NULL,  -- Full personality for AI prompt
  teaser TEXT,  -- Short one-liner for intro screen
  examples TEXT,  -- Example quotes
  is_active BOOLEAN DEFAULT true,
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
| mogul | Mogul | 💼 | Startup brain, thinks in scale |
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

---

## React Components

### File Structure
```
src/
├── components/
│   ├── AboutModal.jsx             # About the game modal
│   ├── AllRoundsModal.jsx         # View all rounds in a rivalry
│   ├── App.jsx                    # Main router/navigation
│   ├── AuthCallback.jsx           # OAuth callback handler
│   ├── ErrorBoundary.jsx          # React error boundary wrapper
│   ├── GameplayScreen.jsx         # Main game: answering, waiting, judging (~1700 lines)
│   ├── Header.jsx                 # App header with logo
│   ├── HowToPlayModal.jsx         # How to play instructions modal
│   ├── InterstitialScreen.jsx     # Between-round Ripley commentary
│   ├── JoinRivalry.jsx            # /join/:code route handler
│   ├── JudgesPage.jsx             # Browse all judges
│   ├── LandingPage.jsx            # Marketing landing page
│   ├── OfflineBanner.jsx          # Offline status indicator
│   ├── OnboardingFlow.jsx         # First-time player tutorial (3 screens)
│   ├── PastRivalriesList.jsx      # View rivalry history
│   ├── PrivacyPage.jsx            # Privacy policy page
│   ├── ProfileHub.jsx             # Profile management
│   ├── RematchModal.jsx           # Rematch creation modal
│   ├── RivalryIntroFlow.jsx       # Pre-game intro (4 screens)
│   ├── RivalrySummaryScreen.jsx   # End of rivalry: summary, rematch (~850 lines)
│   ├── Screen1.jsx                # Home: profiles, create/join rivalry (~1600 lines)
│   ├── Screen2.jsx                # Legacy/unused screen
│   ├── Screen4.jsx                # Legacy wrapper for GameplayScreen
│   ├── Screen6.jsx                # Legacy wrapper for summary
│   ├── Screen6Summary.jsx         # Legacy summary component
│   ├── ShareCard.jsx              # Shareable rivalry summary card
│   ├── TermsPage.jsx              # Terms of service page
│   ├── VerdictFlow.jsx            # 4-step verdict reveal (~800 lines)
│   └── VerifyPhone.jsx            # Phone verification flow
├── services/
│   ├── codeGenerator.js           # Profile code generation (ADJECTIVE-ANIMAL-##)
│   ├── phoneUtils.js              # Phone number formatting/validation
│   ├── prompts.js                 # Prompt fetching with category filtering
│   └── shareUtils.js              # Share functionality (clipboard, native share)
├── lib/
│   └── supabase.js                # Supabase client initialization
├── assets/
│   └── microphone.svg             # Golden Mic trophy
└── config.js                      # Game constants (RIVALRY_LENGTH = 5)
```

### Component Responsibilities

**App.jsx**
- Route handling (/, /play, /join/:code, /verify, /privacy, /terms, /judges)
- Screen navigation state machine
- Profile loading/management
- Error boundary integration

**Screen1.jsx** (~1600 lines - needs refactoring)
- State A: No profile - create profile flow
- State B: Has profile, no rivalry - challenge friend / join rivalry
- Profile switching
- Invite code generation
- Category and stakes selection
- Real-time subscription for rivalry creation alerts

**GameplayScreen.jsx** (~1700 lines)
- Loads rivalry and current show
- Answer input with 30-word limit
- Waiting state with nudge button
- Judging trigger and timeout handling
- Navigates to VerdictFlow when complete
- Real-time subscription for opponent submission

**VerdictFlow.jsx** (~800 lines)
- 4-step animated reveal:
  1. Answers side-by-side
  2. Judge banter
  3. Winner reveal (with confetti)
  4. Score breakdown
- Navigation to next round or summary

**RivalrySummaryScreen.jsx** (~850 lines)
- AI-generated narrative summary display
- Final scores and player styles
- Round-by-round history (expandable)
- Rematch button → RematchModal
- Share summary button
- New Rivalry button

**RivalryIntroFlow.jsx**
- 4-screen intro shown once per player per rivalry
- Ripley introduction with randomized text
- Matchup display (players, stakes, category)
- Game explanation
- Judge introduction (tappable for details)

**OnboardingFlow.jsx**
- 3-screen tutorial for first-time players
- Ripley welcome with game concept
- Practice prompt with answer submission
- Mock AI judging with constructive feedback
- Sets onboarding_completed flag

**RematchModal.jsx**
- Category picker
- Stakes input
- Sends SMS if opponent has consent
- Shows code + copy/share if no SMS consent

**InterstitialScreen.jsx**
- Between-round Ripley commentary
- Score display
- Streak indicators
- Transition animations

**PastRivalriesList.jsx**
- View completed rivalries
- Tap to view full summary
- Shows opponent, result, date

**ProfileHub.jsx**
- Edit profile name/avatar
- View profile code
- Manage phone/SMS settings
- Delete profile option

**JoinRivalry.jsx**
- Handles /join/:code deep links
- Validates invite code
- Stores pending invite data in sessionStorage
- Redirects to main app for acceptance

**LandingPage.jsx**
- Marketing page for new visitors
- Game explanation
- Call to action to play

**Utility Components:**
- **AboutModal.jsx** - Game info and credits
- **AllRoundsModal.jsx** - Detailed round history
- **HowToPlayModal.jsx** - Rules explanation
- **JudgesPage.jsx** - Browse all 25 judges
- **OfflineBanner.jsx** - Network status indicator
- **ShareCard.jsx** - Canvas-based shareable image
- **ErrorBoundary.jsx** - Graceful error handling
- **PrivacyPage.jsx** / **TermsPage.jsx** - Legal pages

**Legacy Components (may be unused):**
- Screen2.jsx, Screen4.jsx, Screen6.jsx, Screen6Summary.jsx
- Kept for backwards compatibility or reference

### Services

**codeGenerator.js**
- Generates memorable profile codes (e.g., "BLUE-TIGER-42")
- Uses adjective + animal + 2-digit number format
- Ensures uniqueness against existing codes

**phoneUtils.js**
- Phone number formatting (strips to 10 digits)
- Validation (US numbers)
- Display formatting

**prompts.js**
- `getRandomPrompt(usedPromptIds, category)` - Fetches random prompt
- Filters by category using PostgreSQL array contains
- Excludes already-used prompts within rivalry
- Three-tier fallback: filtered+excluded → filtered → any active

**shareUtils.js**
- `shareAsImage()` - Generates shareable image from ShareCard
- Clipboard fallback for browsers without native share
- Handles various share targets

### Key Patterns

**Real-time Subscriptions:**
- Used throughout for multiplayer sync
- Filter by rivalry_id to reduce noise
- Clean up subscriptions on unmount

**Progressive Timeout:**
- Judging has 15s → 30s → 45s retry system
- Final fallback: random winner or skip round

**State Management:**
- Mostly useState + useEffect
- No global state library (considered overkill for scope)
- sessionStorage for pending invite data

---

## Supabase Edge Functions

### Function List
```
supabase/functions/
├── judge-practice/     # AI judging for onboarding practice round
├── judge-show/         # AI judging for real rivalry rounds
├── receive-sms/        # Twilio webhook for incoming SMS
├── select-emcee-line/  # Get random Ripley commentary
├── send-auth/          # Magic link authentication (future)
├── send-sms/           # Send SMS notifications via Twilio
└── summarize-rivalry/  # Generate AI rivalry summary
```

### judge-show
**Location:** `supabase/functions/judge-show/index.ts`

**Purpose:** Calls Claude Sonnet 4 to judge a completed show

**Flow:**
1. Receives showId
2. Fetches show with both answers and judge details
3. Constructs prompt with judge personalities
4. Calls Anthropic API
5. Parses JSON response (scores, reasoning, banter, winner)
6. Updates show with verdict
7. Sends SMS notification to first submitter (verdict_ready)

**Key Features:**
- Retry logic for API failures
- JSON parsing with fallback
- Mic holder tiebreaker for ties
- Rate limiting awareness

**Cost:** ~$0.01-0.02 per judgment

### judge-practice
**Location:** `supabase/functions/judge-practice/index.ts`

**Purpose:** AI judging for onboarding practice round (single player)

**Flow:**
1. Receives answer text and prompt
2. Constructs prompt for constructive feedback
3. Calls Anthropic API
4. Returns feedback without opponent comparison

**Key Differences from judge-show:**
- No opponent answer to compare
- Feedback focuses on what makes a good One-Upper answer
- More encouraging tone for new players

**Cost:** ~$0.01-0.02 per practice judgment

### summarize-rivalry
**Location:** `supabase/functions/summarize-rivalry/index.ts`

**Purpose:** Generates narrative rivalry summary after completion

**Flow:**
1. Receives rivalryId
2. Fetches all shows with verdicts
3. Constructs prompt for narrative summary
4. Calls Anthropic API
5. Updates rivalry.summary with parsed result

**Output Structure:**
```javascript
{
  ai_generated: true,
  headline: "The Rematch of the Century",
  rivalry_style: "A battle of quick wit versus methodical genius",
  key_moments: [...],
  winner: { id, name, avatar, wins },
  loser: { id, name, avatar, wins },
  winner_style: { short: "The Improviser", detail: "..." },
  loser_style: { short: "The Strategist", detail: "..." },
  final_word: "Until next time..."
}
```

**Cost:** ~$0.01-0.02 per summary

### send-sms
**Location:** `supabase/functions/send-sms/index.ts`

**Purpose:** Sends SMS notifications via Twilio

**Notification Types:**
| Type | When Sent |
|------|-----------|
| your_turn | Opponent submitted, your turn now |
| verdict_ready | Judging complete, see results |
| nudge | Manual nudge from waiting player |
| rivalry_cancelled | Other player cancelled rivalry |
| welcome | First SMS consent (compliance message) |
| rivalry_started | Someone accepted your challenge |
| rematch_challenge | Someone wants a rematch |

**Features:**
- SMS consent check (sms_consent field)
- Kill switch (SMS_ENABLED constant)
- Test mode (logs instead of sending if no Twilio credentials)
- Template randomization (multiple variations per type)
- Placeholder replacement ({opponent}, {prompt}, {profile_id}, etc.)

**Compliance:**
- Welcome message includes HELP/STOP instructions
- A2P 10DLC registration pending for US delivery

### receive-sms
**Location:** `supabase/functions/receive-sms/index.ts`

**Purpose:** Twilio webhook for incoming SMS messages

**Handles:**
- STOP - Unsubscribe user (sets sms_consent = false)
- HELP - Returns help text
- Other messages - Could be used for future features

**Compliance Required:**
- Must respond to STOP within regulations
- Must provide HELP information

### select-emcee-line
**Location:** `supabase/functions/select-emcee-line/index.ts`

**Purpose:** Returns random Ripley commentary for interstitials

**Input:** Context (round number, scores, streak info)

**Output:** Contextual Ripley quip

**Note:** May use pre-written lines or AI generation depending on implementation

### send-auth
**Location:** `supabase/functions/send-auth/index.ts`

**Purpose:** Magic link authentication (future feature)

**Status:** Built but not actively used

**Would enable:**
- Secure profile recovery
- Cross-device profile access via email/phone

---

## Features Implemented

### Core Gameplay ✅
- [x] Profile creation with avatar picker
- [x] Profile code generation and sharing
- [x] Invite code system (4-char, 24hr expiry)
- [x] Rivalry creation with stakes
- [x] Prompt category selection
- [x] 30-word answer limit
- [x] Real-time multiplayer sync
- [x] AI judging with 3 judges
- [x] 4-step verdict reveal with confetti
- [x] Mic holder tiebreaker
- [x] Rivalry completion and summary

### Prompt System ✅
- [x] 200 prompts in database
- [x] 5 categories + mixed option
- [x] Each prompt has 2 categories
- [x] Category filtering during prompt selection
- [x] Duplicate prevention within rivalry

### Onboarding ✅
- [x] 3-screen tutorial flow
- [x] Ripley character introduction
- [x] Practice prompt with AI judging
- [x] Constructive feedback
- [x] Skip for returning players (same phone)

### Notifications ✅
- [x] SMS infrastructure built
- [x] 7 notification types with templates
- [x] SMS consent tracking
- [x] Manual fallback when SMS disabled
- [x] Nudge with copy/share for non-SMS users
- [ ] A2P 10DLC approval (pending)

### Rematch Flow ✅
- [x] Rematch button on rivalry summary
- [x] Category and stakes picker
- [x] Auto SMS if opponent has consent
- [x] Code display with copy/share if no SMS

### Polish ✅
- [x] Confetti on round wins
- [x] Randomized Ripley commentary
- [x] Judge banter animations
- [x] Winner/loser declaration variety
- [x] Milestone streak indicators
- [x] Scrollable modals
- [x] Loading states throughout

---

## Design Principles

### User Experience
1. **Mobile-first** - Every screen designed for phone use
2. **Minimal friction** - No auth, quick profile creation
3. **Progressive disclosure** - Show info as needed, not all at once
4. **Celebrate moments** - Confetti, animations, varied declarations

### Game Design
1. **Outlandish over truthful** - Reward creativity, not honesty
2. **Speed matters** - First to submit wins ties
3. **Judges have personality** - Each feels distinct
4. **Async-friendly** - Play over hours/days, not real-time only

### Technical
1. **Surgical changes** - Small fixes over big rewrites
2. **Backwards compatibility** - Don't break existing rivalries
3. **Graceful degradation** - Fallbacks for SMS, AI, etc.
4. **Real-time when needed** - Subscribe only to what matters

---

## Priority Roadmap

### Immediate Testing Focus
1. Full rivalry flow end-to-end
2. Rematch flow with SMS consent variations
3. Onboarding for new players
4. Category filtering verification
5. Nudge button with SMS consent variations

### Near-term Improvements
1. Screen1 visual polish ("New here?" and "Challenge a friend" states)
2. Better waiting state experience
3. PWA improvements (refresh handling, offline)
4. Profile security (magic link consideration)

### Medium-term
1. Break up large components (Screen1, GameplayScreen)
2. Comprehensive error handling
3. Analytics integration
4. A2P 10DLC approval follow-up

---

## Future Features

### Party Mode
**Concept:** Multiple players compete in real-time, same room or remote.

**Potential Formats:**
- Free-for-all (3-8 players)
- Tournament bracket
- Team battles

**Key Considerations:**
- Needs lobby/waiting room
- Real-time sync critical
- Shorter format (3 rounds)
- Host controls

*Significant feature requiring dedicated planning.*

### Multiple Rivalries
- Play several rivalries simultaneously
- Dashboard to switch between
- Notification routing

### Leaderboards
- Win streaks
- Total wins
- Head-to-head records

### Enhanced Security
- Magic link authentication
- Profile recovery via phone
- Database RLS audit

### Native App
- Capacitor wrap (1-2 days work)
- Push notifications
- App Store presence

---

## Technical Debt

### Large Components
- **Screen1.jsx** (~1600 lines) - needs breakdown
- **GameplayScreen.jsx** (~1700 lines) - manageable but large
- **VerdictFlow.jsx** (~800 lines) - could extract steps

### Console Logs
- Various debug logs throughout
- Clean before major release

### Duplicate Code
- Nudge modal appears twice in GameplayScreen
- Similar patterns in invite/rematch flows

### Known Issues
- Flash on screen transitions (React render timing)
- TypeScript file casing warnings (VS Code cache)

---

## Key Learnings

### Technical
1. **Status constraints matter** - Database CHECK constraints prevent bad states
2. **Race conditions are real** - Use database constraints, not just code checks
3. **Real-time needs filtering** - Subscribe to specific changes, not everything
4. **Edge Functions work well** - Keep API keys secure, handle AI calls server-side
5. **PostgreSQL arrays** - Use `contains()` for array filtering

### Product
1. **Intro should be per-player** - Each player sees it once, tracked separately
2. **SMS consent is critical** - Never assume, always check
3. **Fallbacks for everything** - Manual share when SMS unavailable
4. **Celebration matters** - Confetti, varied text, animations feel good
5. **Categories add variety** - Players like choosing prompt themes

### Process
1. **Test with two browsers** - Simulate real multiplayer
2. **Mobile testing essential** - Phone behavior differs from desktop
3. **Surgical changes** - Small fixes conserve resources and reduce risk
4. **Backwards compatibility** - Old rivalries must keep working

---

## Testing Checklist

### New User Flow
- [ ] Create profile works
- [ ] Onboarding shows for first-time players
- [ ] Onboarding skips for same phone number
- [ ] Avatar and name save correctly
- [ ] Phone number and SMS consent save correctly

### Create Rivalry Flow
- [ ] Category picker works (6 options)
- [ ] Stakes input saves
- [ ] Invite code generates (4 chars)
- [ ] Code expires after 24 hours
- [ ] Copy/share buttons work

### Join Rivalry Flow
- [ ] /join/:code route works
- [ ] Valid code shows accept screen
- [ ] Invalid/expired code shows error
- [ ] Rivalry creates on acceptance
- [ ] Both players notified

### Gameplay
- [ ] Intro flow shows once per player
- [ ] Prompt matches selected category
- [ ] Answer submission works
- [ ] 30 word limit enforced
- [ ] Waiting state shows correctly
- [ ] Nudge works (SMS if consent, manual if not)
- [ ] Judging triggers when both submit
- [ ] Verdict flow all 4 steps work
- [ ] Confetti shows for winner only
- [ ] No duplicate prompts within rivalry

### End of Rivalry
- [ ] Summary generates correctly
- [ ] Share summary works
- [ ] Rematch shows category/stakes picker
- [ ] Rematch sends SMS if consent
- [ ] Rematch shows code if no consent
- [ ] New Rivalry goes to home screen

### Edge Cases
- [ ] Refresh during any phase
- [ ] Browser back button
- [ ] Judging timeout scenarios
- [ ] Both players submit simultaneously
- [ ] Player deletes profile mid-rivalry

---

*Document generated: December 4, 2024*
*For: One-Upper Development Handoff*
