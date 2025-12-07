# One-Upper: Complete Project Handoff Document

*Last Updated: December 7, 2024*

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Game Overview](#game-overview)
3. [Design Principles](#design-principles)
4. [Game Modes](#game-modes)
   - [Rivalry Mode](#rivalry-mode)
   - [Showdown Mode](#showdown-mode)
5. [Characters & AI Personalities](#characters--ai-personalities)
6. [Technical Architecture](#technical-architecture)
7. [Database Schema](#database-schema)
8. [Frontend Structure](#frontend-structure)
9. [Edge Functions](#edge-functions)
10. [External Services & Tools](#external-services--tools)
11. [Development Workflow](#development-workflow)
12. [Testing Strategies](#testing-strategies)
13. [Deployment](#deployment)
14. [Known Issues & Technical Debt](#known-issues--technical-debt)
15. [Future Features](#future-features)
16. [Appendix](#appendix)

---

## Executive Summary

**One-Upper** is a competitive comedy game where players answer creative prompts with outlandish, exaggerated responses. AI judges with distinct personalities evaluate answers, rewarding boldness, creativity, and humor over truthfulness. The game transforms the socially problematic behavior of "one-upping" into structured competitive entertainment.

**Core Philosophy:** Be outlandish, not truthful. "Crank up" your real-life experiences rather than share them plainly. The game rewards players who take creative risks and push boundaries.

**Live URL:** https://oneupper.app

**Tech Stack:**
- Frontend: React + Vite + Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- AI: Anthropic Claude (Sonnet 4)
- SMS: Twilio
- Hosting: Vercel
- Domain: DirectNIC + Cloudflare (email forwarding)

---

## Game Overview

### The Hook

Players compete to "one-up" each other by answering ridiculous prompts. Three AI judges with unique personalities score responses, creating unpredictable and entertaining results. The game works both asynchronously (Rivalry mode for 1v1 over days) and synchronously (Showdown mode for 3-5 players in person).

### Core Game Loop

1. **Prompt** - Players see a creative prompt (e.g., "What's the worst thing to say at a wedding?")
2. **Answer** - Players write their most outlandish response
3. **Judge** - AI judges evaluate and rank answers
4. **Reveal** - Results shown with judge commentary and banter
5. **Repeat** - Continue for 5 rounds (configurable in Showdown)

### Scoring Philosophy

- Boldness beats safety
- Creative exaggeration wins
- Humor and entertainment value matter most
- "That couldn't possibly be true" is a compliment
- Boring or generic answers rank last

---

## Design Principles

### User Experience

1. **Mobile-first** - Every screen designed for phone use
2. **Minimal friction** - No auth required, quick profile creation
3. **Progressive disclosure** - Show info as needed, not all at once
4. **Celebrate moments** - Confetti, animations, varied declarations

### Game Design

1. **Outlandish over truthful** - Reward creativity, not honesty
2. **Speed matters** - First to submit wins ties
3. **Judges have personality** - Each feels distinct and memorable
4. **Async-friendly** - Play over hours/days, not real-time only

### Technical

1. **Surgical changes** - Small fixes over big rewrites
2. **Backwards compatibility** - Don't break existing rivalries
3. **Graceful degradation** - Fallbacks for SMS, AI failures, etc.
4. **Real-time when needed** - Subscribe only to what matters

---

## Game Modes

### Rivalry Mode

**Overview:** Asynchronous 1v1 competition played over hours or days. Two players compete across 5 rounds, with the player having the most round wins at the end claiming victory and the "Golden Mic" trophy.

**Key Characteristics:**
- 2 players only
- Async play - respond whenever convenient
- Profile required (with name, avatar)
- SMS notifications for turn alerts
- Progress saved to profile
- 5 rounds total, most wins takes the trophy
- 4-character invite code for sharing

**Flow:**

```
Create Rivalry → Share 4-char Invite Code → Opponent Joins →
Round Loop (5x):
  Prompt Revealed → Both Players Answer → AI Judges → 
  Verdict Revealed → Mic Holder Updated →
Final: Rivalry Summary Generated
```

**Rivalry-Specific Features:**

1. **The Golden Mic** - Trophy that transfers to round winner. Holder has bragging rights until next round.

2. **Rivalry Stakes** - Optional custom wagers beyond the core Golden Mic prize (e.g., "Loser buys dinner").

3. **Rivalry Summary** - AI-generated narrative analysis after rivalry completion, analyzing playing styles, memorable moments, and the overall arc.

4. **SMS Notifications** - Players receive texts when:
   - Opponent answers (your turn)
   - Verdict is ready
   - Rivalry is won/lost
   - Profile recovery (SMS-based login)

5. **Deep Links** - Shareable URLs for rivalry invitations via SMS.

**Database Tables:**
- `rivalries` - Rivalry metadata, scores, mic holder
- `shows` - Individual rounds with prompts, answers, verdicts (note: called "shows" in DB, "rounds" in UI)
- `profiles` - Player profiles with stats

---

### Showdown Mode

**Overview:** Synchronous party game for 3-5 players in the same room. Fast-paced, host-controlled, with additional guessing and voting mechanics.

**Key Characteristics:**
- 3-5 players
- Real-time, everyone together
- Profile NOT required (guest play with name/avatar)
- No SMS notifications
- Ephemeral (not saved to profiles)
- 5 rounds (configurable via TOTAL_ROUNDS constant)
- Host controls all progression
- 4-character join code for sharing
- Category selection for prompts

**Flow:**

```
Entry Point → Create/Join with Code → Lobby →
Intro Sequence (Welcome, Rules, Meet Judges) →
Round Loop (5x):
  Prompt (60s timer) → Waiting for All → 
  Guessing & Voting (45s) → Waiting →
  Reveal: Who Said What → Judge Banter → Rankings →
  Leaderboard (rounds 1-4) OR Champion Screen (round 5) →
Finale: Champion → Highlights (AI Recap) → End
```

**Showdown-Specific Features:**

1. **Entry Brag** - Players write a boastful one-liner when joining (used in recap callbacks)

2. **Guessing Game** - After answers are submitted, players guess who wrote each answer. Points for correct guesses.

3. **Human Voting** - Players vote for which answer should win (separate from AI judging)

4. **Light Board** - Visual display showing who has submitted answers/guesses

5. **Bonus Points:**
   - **Judges Pick for Most X** - Rotating category each round (Most Creative, Funniest, Most Outlandish, etc.)
   - **Best Who Said What** - Player with most correct guesses (fastest wins ties)
   - **Most Like The Judges** - Players who voted for the AI-selected winner

6. **Real-Time Sync** - All players see the same screen, host advances phases

7. **Highlights Recap** - AI-generated summary with:
   - Overall narrative
   - Quote of the Night
   - Superlatives for each player
   - Brag Checks (comparing entry brag to performance)
   - "Robbed" moment (controversial judge calls)
   - Deep/profound observation

**Scoring System (per round):**
- 1st place: 5 pts
- 2nd place: 3 pts
- 3rd place: 2 pts
- 4th place: 1 pt
- 5th place: 0 pts
- Bonus points: +1 each for judge pick, best guesser, voting with judges

**Database Tables:**
- `showdowns` - Showdown metadata, code, judges, current round
- `showdown_players` - Players in showdown (guest or profile-linked)
- `showdown_rounds` - Individual rounds with prompts, verdicts
- `showdown_answers` - Player answers
- `showdown_guesses` - Who guessed what
- `showdown_votes` - Human voting data

---

## Characters & AI Personalities

### Ripley - The Emcee

**Role:** Host/narrator who guides players through the game with commentary and transitions.

**Personality:**
- Warm but sarcastic
- Quick-witted
- Encouraging but not afraid to roast
- Fourth-wall aware

**Usage:**
- Welcome messages
- Round transitions
- Standings commentary
- Winner announcements
- Recap narration

**Voice Examples:**
- "Look at you! The One-Upper champion! Your outlandish tales have conquered all."
- "A tie at the top! When legends clash, sometimes nobody loses."
- "That's a wrap! Time for the final results."

---

### The Judges

25 AI judge personalities with distinct scoring philosophies. Three are randomly selected for each rivalry/showdown.

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

Each judge has a full personality profile in the database including:
- Description (detailed personality)
- Examples (sample one-liners in their voice)
- Scoring tendencies

---

### How AI Judging Works

**For Rivalries (1v1):**
- Each judge scores both players 1-10
- One-liner comment per judge
- Banter dialogue between judges
- Total score determines winner
- Tiebreaker: First submitter wins

**For Showdowns (3-5 players):**
- Judges rank all answers 1st to last (no individual scores shown)
- Comments from each judge
- Bonus category winner selected
- Rankings converted to points

**AI Model:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)
**Cost:** ~$0.01-0.02 per judgment

**Prompt Structure:**
```
You are the judging panel for "One-Upper," a comedy competition.

RULES:
- Rank/score based on creativity, humor, boldness
- Truth doesn't matter - outlandish wins
- Each judge comments in their distinct voice

PROMPT: "{prompt_text}"
ANSWERS: [list of answers]
JUDGES: [judge personalities and examples]

Return JSON with rankings, comments, bonus winner, banter
```

---

## Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    React + Vite + Tailwind                   │
│                      (Vercel Hosting)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL │  │  Real-time  │  │   Edge Functions    │  │
│  │  Database   │  │  Subscript. │  │  (Deno Runtime)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │  Anthropic │   │   Twilio  │   │Cloudflare │
       │  Claude AI │   │    SMS    │   │   Email   │
       └───────────┘   └───────────┘   └───────────┘
```

### Data Flow

**Rivalry Flow:**
```
Player A answers → Supabase DB updated → 
Real-time notifies Player B's browser → 
Player B answers → Both answers submitted →
Edge Function calls Claude → Verdict stored →
SMS sent to Player A → Real-time updates both browsers
```

**Showdown Flow:**
```
Host advances phase → Supabase DB updated →
Real-time pushes to all player browsers →
All browsers render same state → 
Timers run client-side (deadline-based) →
Auto-submit on timer expiry →
Edge Function judges when all submit →
Results flow back through real-time
```

### Real-Time Subscriptions

**Supabase Realtime** enables instant updates across all connected clients.

**Rivalry Subscriptions:**
- `shows` table changes (new answers, verdicts)
- `rivalries` table changes (mic holder, status)

**Showdown Subscriptions:**
- `showdowns` table (status, current_round, intro_step, finale_step)
- `showdown_rounds` table (status, reveal_step, verdict)
- `showdown_players` table (for lobby updates)
- `showdown_answers` table (for light board)

**Implementation Pattern:**
```javascript
const channel = supabase
  .channel('showdown-updates')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'showdowns', filter: `id=eq.${showdownId}` },
    (payload) => handleShowdownUpdate(payload)
  )
  .subscribe();
```

---

## Database Schema

### Core Tables

#### profiles
```sql
- id: UUID (PK)
- name: TEXT
- avatar: TEXT (emoji)
- phone: TEXT (for SMS)
- code: TEXT (unique profile code for sharing)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### prompts
```sql
- id: SERIAL (PK)
- text: TEXT
- category: TEXT
- is_active: BOOLEAN
```

#### judges
```sql
- id: SERIAL (PK)
- key: TEXT (unique identifier like 'savage', 'snoot')
- name: TEXT (display name)
- emoji: TEXT
- teaser: TEXT (short description)
- description: TEXT (full personality description)
- examples: TEXT (example one-liners)
- is_active: BOOLEAN
```

### Rivalry Tables

#### rivalries
```sql
- id: UUID (PK)
- profile_a_id: UUID (FK → profiles)
- profile_b_id: UUID (FK → profiles)
- status: TEXT ('pending', 'active', 'complete')
- mic_holder_id: UUID (current winner)
- profile_a_wins: INT
- profile_b_wins: INT
- stakes: TEXT (optional custom wager)
- created_at: TIMESTAMP
```

#### shows
```sql
- id: UUID (PK)
- rivalry_id: UUID (FK → rivalries)
- show_number: INT
- prompt: TEXT
- profile_a_answer: TEXT
- profile_b_answer: TEXT
- profile_a_submitted_at: TIMESTAMP
- profile_b_submitted_at: TIMESTAMP
- first_submitter_id: UUID
- status: TEXT ('pending', 'answering', 'judging', 'complete')
- winner_id: UUID
- judge_data: JSONB (verdict, scores, banter, artifacts)
- judges: TEXT[] (array of judge keys)
```

### Showdown Tables

#### showdowns
```sql
- id: UUID (PK)
- code: TEXT (4-char join code, unique)
- status: TEXT ('lobby', 'intro', 'active', 'complete', 'cancelled')
- category: TEXT
- judges: JSONB (array of full judge objects)
- current_round: INT
- intro_step: TEXT (for intro sequence sync)
- finale_step: TEXT ('champion', 'highlights')
- host_player_id: UUID (FK → showdown_players)
- recap: JSONB (AI-generated highlights)
- created_at: TIMESTAMP
```

#### showdown_players
```sql
- id: UUID (PK)
- showdown_id: UUID (FK → showdowns)
- profile_id: UUID (FK → profiles, nullable for guests)
- guest_name: TEXT
- guest_avatar: TEXT
- entry_brag: TEXT
- is_host: BOOLEAN
- total_score: INT DEFAULT 0
- joined_at: TIMESTAMP
```

#### showdown_rounds
```sql
- id: UUID (PK)
- showdown_id: UUID (FK → showdowns)
- round_number: INT
- prompt_id: INT (FK → prompts)
- prompt_text: TEXT
- status: TEXT ('pending', 'answering', 'guessing', 'revealing', 'complete')
- reveal_step: TEXT ('authors', 'banter', 'rankings')
- answer_deadline: TIMESTAMP
- guess_deadline: TIMESTAMP
- verdict: JSONB (rankings, banter, bonuses)
- best_guesser_id: UUID
- started_at: TIMESTAMP
```

#### showdown_answers
```sql
- id: UUID (PK)
- round_id: UUID (FK → showdown_rounds)
- player_id: UUID (FK → showdown_players)
- answer_text: TEXT
- submitted_at: TIMESTAMP
- placement: INT
- points_earned: INT
- won_bonus: BOOLEAN
- human_votes_received: INT
```

#### showdown_guesses
```sql
- id: UUID (PK)
- round_id: UUID (FK → showdown_rounds)
- guesser_id: UUID (FK → showdown_players)
- answer_id: UUID (FK → showdown_answers)
- guessed_player_id: UUID (FK → showdown_players)
- is_correct: BOOLEAN
```

#### showdown_votes
```sql
- id: UUID (PK)
- round_id: UUID (FK → showdown_rounds)
- voter_id: UUID (FK → showdown_players)
- voted_answer_id: UUID (FK → showdown_answers)
- submitted_at: TIMESTAMP
```

### Row Level Security (RLS)

Most tables have RLS enabled with policies allowing:
- Authenticated users to read their own data
- Service role (Edge Functions) to read/write all data
- Public read for prompts and judges

**Important:** Real-time subscriptions require `REPLICA IDENTITY FULL` for proper updates:
```sql
ALTER TABLE showdown_rounds REPLICA IDENTITY FULL;
ALTER TABLE showdown_players REPLICA IDENTITY FULL;
```

---

## Frontend Structure

### File Organization

```
src/
├── components/
│   ├── Header.jsx              # Global header with navigation
│   ├── Screen1.jsx             # Home/landing screen (~1500 lines, needs refactor)
│   │
│   ├── rivalry/                # Rivalry mode components
│   │   ├── RivalryGame.jsx     # Main rivalry container
│   │   ├── RivalryShow.jsx     # Individual show/round
│   │   ├── RivalryVerdict.jsx  # Verdict display
│   │   ├── RivalrySummary.jsx  # End-of-rivalry recap
│   │   └── ...
│   │
│   └── showdown/               # Showdown mode components
│       ├── ShowdownEntry.jsx   # Start New / Have Code choice
│       ├── ShowdownCreate.jsx  # Category picker, code generation
│       ├── ShowdownJoin.jsx    # Code entry + player info
│       ├── ShowdownLobby.jsx   # Waiting room, player list
│       ├── ShowdownIntro.jsx   # Welcome, rules, judges reveal
│       ├── ShowdownGame.jsx    # Main container, routes by status
│       ├── ShowdownRound.jsx   # Round container, routes by phase
│       ├── ShowdownPrompt.jsx  # Answer input with timer
│       ├── ShowdownWaiting.jsx # Light board after submit
│       ├── ShowdownGuessing.jsx # Guess authors + vote
│       ├── ShowdownReveal.jsx  # Authors, banter, rankings phases
│       ├── ShowdownLeaderboard.jsx # Standings between rounds
│       ├── ShowdownChampion.jsx # Winner announcement
│       ├── ShowdownHighlights.jsx # AI recap with swipeable cards
│       ├── ShowdownFinale.jsx  # Manages champion → highlights flow
│       └── ShowdownMenu.jsx    # ••• menu (leave, end, how to play)
│
├── services/
│   ├── supabase.js             # Supabase client initialization
│   ├── showdown.js             # Showdown API calls
│   ├── prompts.js              # Prompt and judge fetching
│   └── ...
│
├── lib/
│   └── supabase.js             # Supabase client export
│
├── App.jsx                     # Main app with routing
└── main.jsx                    # Entry point
```

### Key Components Deep Dive

#### ShowdownGame.jsx
**Role:** Main container that routes to appropriate screen based on showdown status.

**Status Routing:**
- `lobby` → ShowdownLobby
- `intro` → ShowdownIntro
- `active` → ShowdownRound
- `complete` → ShowdownFinale
- `cancelled` → Cancelled message

**Responsibilities:**
- Fetches showdown data
- Sets up real-time subscriptions
- Passes current player context to children
- Handles showdown-level updates

#### ShowdownRound.jsx
**Role:** Container for active round, routes by round status.

**Round Status Routing:**
- `pending` → Waiting for host
- `answering` → ShowdownPrompt (if not submitted) / ShowdownWaiting (if submitted)
- `guessing` → ShowdownGuessing (if not submitted) / ShowdownWaiting
- `revealing` / `judging` → ShowdownReveal
- `complete` → ShowdownLeaderboard

**Responsibilities:**
- Fetches current round data
- Manages answer/guess submission
- Triggers AI judging when entering reveal phase
- Handles round-level real-time updates

#### ShowdownReveal.jsx
**Role:** Multi-phase reveal screen (largest component, ~450 lines)

**Reveal Phases:**
1. `authors` - Who Said What results
2. `banter` - Judge commentary
3. `rankings` - Placements and bonuses

**Features:**
- Confetti animation for round winner
- Guess result display (who got what right)
- Judge personality-matched commentary
- Bonus awards (Judge Pick, Best Guesser, Most Like Judges)

#### ShowdownHighlights.jsx
**Role:** End-of-game recap with AI-generated content

**Features:**
- Swipeable card carousel (no dots, arrow navigation)
- Cards: Narrative, Quote of Night, Superlatives, Brag Checks, Robbed Moment, Deep Thought
- Expandable Full Results dropdown
- Action buttons: New Showdown, Share, Done
- Independent control (no longer host-driven)

### Styling Approach

**Tailwind CSS** with custom dark theme:
- Background: `bg-gradient-to-br from-slate-900 to-slate-800`
- Primary accent: `orange-500` / `orange-400`
- Winner highlight: `yellow-400`
- Cards: `bg-slate-800/50` or `bg-slate-800/80`
- Text: `text-slate-100` (primary), `text-slate-400` (secondary)

**Design Principles:**
- Dark mode only
- Mobile-first (max-width containers)
- Generous padding and rounded corners
- Emoji as visual anchors
- Minimal use of borders (prefer background differentiation)

---

## Edge Functions

Supabase Edge Functions run on Deno runtime, deployed globally.

### judge-show (Rivalry)

**Purpose:** Judge a rivalry show (1v1 round)

**Trigger:** Called when both players have submitted answers

**Input:**
```json
{ "showId": "uuid" }
```

**Process:**
1. Fetch show with both answers
2. Fetch judge profiles for this show
3. Fetch rivalry history for context
4. Build Claude prompt with judge personalities
5. Call Anthropic API
6. Parse response (scores, banter, artifacts)
7. Determine winner (handle ties with first-submitter rule)
8. Update show with verdict
9. Update rivalry mic holder
10. Send SMS to first submitter

**Output:** Verdict stored in `shows.judge_data`

### judge-showdown-round

**Purpose:** Judge a showdown round (3-5 players)

**Trigger:** Called when host advances to reveal phase

**Input:**
```json
{ "roundId": "uuid" }
```

**Process:**
1. Fetch round with answers
2. Fetch judges from showdown
3. Build Claude prompt (rank all answers)
4. Call Anthropic API
5. Parse response (rankings, comments, bonus winner)
6. Calculate Judge Whisperer bonus (who voted for winner)
7. Update round with verdict
8. Update player scores

**Output:** Verdict stored in `showdown_rounds.verdict`

### generate-showdown-recap

**Purpose:** Generate AI highlights for end-of-showdown

**Trigger:** Called when showdown enters finale

**Input:**
```json
{ "showdownId": "uuid" }
```

**Process:**
1. Fetch showdown with all players and entry brags
2. Fetch all rounds with answers and verdicts
3. Analyze patterns (wins, streaks, close calls)
4. Build Claude prompt requesting:
   - Narrative summary
   - Quote of the Night
   - Brag Checks for each player
   - Superlatives for each player
   - Robbed Moment (if applicable)
   - Deep Thought observation
5. Call Anthropic API
6. Store recap in showdown

**Output:** Recap stored in `showdowns.recap`

### send-sms

**Purpose:** Send SMS notifications via Twilio

**Trigger:** Called by other Edge Functions or client

**Input:**
```json
{
  "userId": "uuid",
  "notificationType": "your_turn" | "verdict_ready" | "rivalry_complete",
  "contextData": { ... }
}
```

**Process:**
1. Fetch user profile with phone number
2. Check notification preferences
3. Build message from template
4. Call Twilio API
5. Log delivery status

### summarize-rivalry

**Purpose:** Generate end-of-rivalry narrative summary

**Trigger:** When rivalry reaches 6 wins for either player

**Process:** Similar to showdown recap but focused on 1v1 rivalry arc, playing styles, and memorable moments.

---

## External Services & Tools

### Anthropic Claude

**Purpose:** AI judging and content generation

**Model:** `claude-sonnet-4-20250514` (Sonnet 4)

**Usage:**
- Judge scoring and commentary
- Recap generation
- Personality-matched banter

**Cost:** ~$0.01-0.02 per API call

**Integration:** Direct API calls from Edge Functions

**Key Considerations:**
- Prompt engineering critical for consistent JSON output
- Include "Return ONLY valid JSON, no markdown" instruction
- Strip markdown backticks from response
- Handle parse failures gracefully

### Supabase

**Purpose:** Full backend-as-a-service

**Services Used:**
- **PostgreSQL Database** - All game data
- **Real-time Subscriptions** - Live updates across clients
- **Edge Functions** - Serverless backend logic
- **Row Level Security** - Data access control

**Dashboard:** https://supabase.com/dashboard/project/pqyiqqgohuxbiuhgpprw

**Key Features:**
- Automatic API generation from schema
- Built-in auth (not heavily used - profile codes instead)
- Real-time with minimal setup
- Edge Functions with Deno runtime

### Twilio

**Purpose:** SMS notifications

**Status:** Built but awaiting A2P 10DLC approval for full US delivery

**Services:**
- Programmable SMS
- Phone number provisioning
- Delivery webhooks

**Compliance:** A2P 10DLC registration required for application-to-person messaging

### Vercel

**Purpose:** Frontend hosting and deployment

**Features:**
- Git-based deployments
- Preview deployments for PRs
- Edge network CDN
- Custom domain support

**Domain:** oneupper.app

### Cloudflare

**Purpose:** DNS and email forwarding

**Configuration:**
- DNS management for oneupper.app
- Email forwarding (contact@oneupper.app → personal email)

### DirectNIC

**Purpose:** Domain registration

**Domain:** oneupper.app

### Visual Studio Code

**Purpose:** Primary development environment

**Key Extensions:**
- ES7+ React snippets
- Tailwind CSS IntelliSense
- Prettier
- GitLens

**Workspace:** Separate windows for different projects (not VS Code workspaces)

---

## Development Workflow

### Local Development

```bash
# Clone and install
git clone [repo]
cd one-upper
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173

# Environment variables (.env.local)
VITE_SUPABASE_URL=https://pqyiqqgohuxbiuhgpprw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Changes

1. Make changes in Supabase Dashboard SQL Editor
2. Test locally
3. Document in migration files (for reference)

**Note:** No formal migration system - changes made directly in dashboard.

### Edge Function Development

```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref pqyiqqgohuxbiuhgpprw

# Deploy function
supabase functions deploy function-name

# View logs
supabase functions logs function-name
```

**Local Testing:** Functions can be tested locally with:
```bash
supabase functions serve
```

### Code Style

- **Copy-paste development** with Claude - complete file artifacts preferred over diffs
- **Surgical changes** over major rewrites
- **Progressive enhancement** - get basic working, then polish
- **Avoid feature creep** - reject complex multi-option interfaces

---

## Testing Strategies

### Manual Testing

**Showdown Testing (Multiple Players):**
1. Open 3+ browser windows/tabs
2. Use incognito for separate sessions
3. One creates showdown, others join with code
4. Play through all phases

**Rivalry Testing:**
1. Create two test profiles
2. Start rivalry between them
3. Submit answers from both
4. Verify verdict and notifications

### Database Manipulation

**Skip to specific showdown state:**
```sql
-- Jump to round 5 start
UPDATE showdowns SET current_round = 5 WHERE id = 'uuid';
UPDATE showdown_rounds SET status = 'answering' WHERE showdown_id = 'uuid' AND round_number = 5;

-- Reset a round
DELETE FROM showdown_answers WHERE round_id = 'uuid';
DELETE FROM showdown_guesses WHERE round_id = 'uuid';
DELETE FROM showdown_votes WHERE round_id = 'uuid';
UPDATE showdown_rounds SET status = 'answering', verdict = NULL WHERE id = 'uuid';
```

### Edge Function Testing

**Trigger manually via console:**
```javascript
fetch('https://pqyiqqgohuxbiuhgpprw.supabase.co/functions/v1/function-name', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({ param: 'value' })
}).then(r => r.json()).then(console.log);
```

### Common Issues

1. **Real-time not updating** - Check REPLICA IDENTITY FULL on table
2. **Edge Function 404** - Check function is deployed and name matches
3. **AI response parse error** - Check for markdown in response, strip backticks
4. **Timer desync** - Timers are client-side from deadline, not server-pushed

---

## Deployment

### Frontend (Vercel)

**Automatic:** Push to main branch triggers deployment

**Manual:**
```bash
vercel --prod
```

**Environment Variables:** Set in Vercel dashboard

### Edge Functions (Supabase)

```bash
# Deploy single function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy
```

**Secrets:** Set via dashboard or CLI:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-...
```

### Database

Changes made directly in Supabase Dashboard SQL Editor.

**Backup:** Supabase handles automatic backups.

---

## Known Issues & Technical Debt

### Code Quality

1. **Screen1.jsx** - 1500+ lines, needs breaking into smaller components
2. **No TypeScript** - Would benefit from type safety
3. **No automated tests** - All manual testing currently
4. **Inconsistent error handling** - Some try/catch, some .catch(), some silent failures

### Features

1. **Host handover not implemented** - If host leaves, game effectively ends
2. **No offline handling** - App breaks without connection
3. **PWA refresh support missing** - Service worker issues

### UX

1. **No back navigation in Showdown** - By design, but could frustrate users
2. **Profile security** - Profile codes can be guessed; Magic Link auth planned for future

### Performance

1. **No query optimization** - Some N+1 patterns
2. **No caching** - Every load fetches fresh
3. **Large bundle** - Could benefit from code splitting

---

## Future Features

### High Priority (Planned)

1. **AI Recap improvements** - More personalized, funnier content
2. **Judge banter rewrite** - Dialogue format, comment on different answers
3. **Share functionality** - Copy results, generate shareable images
4. **Rematch flow** - Quick start new showdown with same players

### Monetization (Planned)

1. **Premium prompt categories** - Pay to unlock special themed packs
2. **Sponsored prompts** - Brand-integrated prompts for advertising
3. **Display ads** - Non-intrusive ads during gameplay transitions
4. **Subscription tier** - Ad-free experience, exclusive categories

### Medium Priority

1. **Leaderboards** - Global and friend rankings
2. **Multiple rivalries** - Track several concurrent rivalries
3. **Custom prompts** - Host writes their own
4. **Sound effects** - Optional, host device only

### Lower Priority

1. **Spectator mode** - Watch without playing
2. **Team mode** - 2v2 showdowns
3. **Extended games** - 7 or 10 round options
4. **TV casting** - Host screen to TV
5. **Profile badges** - Achievements and stats

### Analytics (Not Yet Implemented)

Track:
- Games created/completed
- Average player count
- Completion rate
- Category popularity
- Drop-off points
- Guest → profile conversion

---

## Appendix

### Environment Variables

**Frontend (.env.local):**
```
VITE_SUPABASE_URL=https://pqyiqqgohuxbiuhgpprw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Edge Functions (Supabase Secrets):**
```
SUPABASE_URL=https://pqyiqqgohuxbiuhgpprw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### Useful SQL Queries

**Find active showdowns:**
```sql
SELECT s.*, COUNT(p.id) as player_count 
FROM showdowns s 
JOIN showdown_players p ON p.showdown_id = s.id 
WHERE s.status != 'complete' 
GROUP BY s.id 
ORDER BY s.created_at DESC;
```

**Check player scores:**
```sql
SELECT sp.guest_name, sp.total_score, sp.is_host
FROM showdown_players sp
WHERE sp.showdown_id = 'uuid'
ORDER BY sp.total_score DESC;
```

**View round verdicts:**
```sql
SELECT round_number, prompt_text, verdict
FROM showdown_rounds
WHERE showdown_id = 'uuid'
ORDER BY round_number;
```

### Constants

**TOTAL_ROUNDS:** 5 (configurable in showdown.js)

**Timer Durations:**
- Answer phase: 60 seconds
- Guessing phase: 45 seconds

**Scoring (per round):**
- 1st: 5 pts
- 2nd: 3 pts
- 3rd: 2 pts
- 4th: 1 pt
- 5th: 0 pts
- Bonuses: +1 each

**Player Limits:**
- Showdown: 3-5 players
- Rivalry: 2 players

### Quick Reference

**Showdown Status Flow:**
```
lobby → intro → active → complete
                  ↓
              cancelled (if ended early)
```

**Round Status Flow:**
```
pending → answering → guessing → revealing → complete
```

**Reveal Phase Flow:**
```
authors → banter → rankings
```

**Finale Phase Flow:**
```
champion → highlights
```

---

*Document created: December 7, 2024*
*For: One-Upper Development Handoff*
*Maintainer: Craig / Claude collaboration*
