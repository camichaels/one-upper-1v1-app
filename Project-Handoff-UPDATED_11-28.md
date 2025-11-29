# One-Upper: Complete Project Handoff Document
**Last Updated:** November 28, 2025  
**Status:** Live in Production at https://oneupper.app

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Architecture](#tech-stack--architecture)
3. [Game Concept & Gameplay](#game-concept--gameplay)
4. [Complete Feature Set](#complete-feature-set)
5. [Screen-by-Screen Reference](#screen-by-screen-reference)
6. [Database Schema](#database-schema)
7. [Edge Functions Reference](#edge-functions-reference)
8. [SMS Notification System](#sms-notification-system)
9. [Authentication & Security](#authentication--security)
10. [File Structure Reference](#file-structure-reference)
11. [Known Issues & Technical Debt](#known-issues--technical-debt)
12. [Next Priorities](#next-priorities)
13. [Future Feature Ideas](#future-feature-ideas)
14. [Development Workflow](#development-workflow)

---

## Project Overview

One-Upper is a **1v1 async competitive mobile-first web game** where two players compete by answering creative prompts, with AI judge personalities determining winners. The game transforms the socially problematic behavior of "one-upping" into structured competitive entertainment.

### Core Innovation
- **Minimal friction onboarding** - Players create profiles with unique codes (ADJECTIVE-NOUN-####), no email/password required
- **SMS Magic Link authentication** - Secure profile recovery via phone verification
- **Real-time multiplayer synchronization** via Supabase WebSocket subscriptions
- **AI judging** with 25+ distinct personality biases (Claude Sonnet 4)
- **Mobile-first PWA-ready** dark gradient design
- **Deep link sharing** via SMS/text for frictionless invites
- **Rivalry Stakes** - Optional custom wagers beyond the Golden Mic trophy

### Target User
Friends who want competitive social entertainment without friction. Emphasizes "challenge a friend" simplicity while maintaining engaging gameplay that works whether players are together or apart.

### Taglines
- **Primary:** "Part brain boost, all buddy boast."
- **Secondary:** "Answer the same prompt. AI judges crown a winner. Repeat."

### Live URLs
- **Main Site:** https://oneupper.app
- **Deep Link Format:** https://oneupper.app/join/CODE
- **Profile Link Format:** https://oneupper.app/play?p=PROFILE_UUID

---

## Tech Stack & Architecture

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first styling |
| React Router v6 | Client-side routing |
| canvas-confetti | Victory celebration effects |
| html2canvas | Share card image generation |

### Backend Services
| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL database + real-time subscriptions |
| Supabase Edge Functions | Serverless functions (Deno runtime) |
| Anthropic API | AI judging via Claude Sonnet 4 |
| Twilio | SMS notifications and verification |
| Vercel | Frontend hosting with auto-deploy |
| Cloudflare | DNS + email routing |

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React SPA (Vite + Tailwind)            │   │
│  │  - Screen1 (Profile/Rivalry Management)             │   │
│  │  - Screen2 (Profile Hub)                            │   │
│  │  - Screen4 (Gameplay)                               │   │
│  │  - AuthCallback / VerifyPhone (SMS Auth)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Platform                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL  │  │  Real-time   │  │  Edge Functions  │  │
│  │  Database    │◄─┤  Subscriptions│  │  (Deno)          │  │
│  │              │  │              │  │                  │  │
│  │  - profiles  │  │  WebSocket   │  │  - judge-show    │  │
│  │  - rivalries │  │  channels    │  │  - send-sms      │  │
│  │  - shows     │  │              │  │  - send-auth     │  │
│  │  - judges    │  │              │  │  - receive-sms   │  │
│  │  - prompts   │  │              │  │  - summarize-    │  │
│  │  - auth_tokens│ │              │  │    rivalry       │  │
│  └──────────────┘  └──────────────┘  └────────┬─────────┘  │
└────────────────────────────────────────────────┼────────────┘
                                                 │
                      ┌──────────────────────────┼──────────┐
                      │                          │          │
                      ▼                          ▼          │
              ┌──────────────┐          ┌──────────────┐    │
              │  Anthropic   │          │   Twilio     │    │
              │  Claude API  │          │   SMS API    │    │
              │              │          │              │    │
              │  AI Judging  │          │  Notifications│   │
              │  Summaries   │          │  Verification │   │
              └──────────────┘          └──────────────┘    │
```

### Deployment & Infrastructure
| Component | Provider | Notes |
|-----------|----------|-------|
| Domain | DirectNIC | oneupper.app registration |
| DNS | Cloudflare | Also handles email routing |
| Hosting | Vercel | Auto-deploys from GitHub main branch |
| Database | Supabase | Project ID: pqyiqqgohuxbiuhgpprw |
| SSL | Automatic | Via Vercel + Cloudflare |

### Email Configuration
- `hello@oneupper.app` → Forwards to personal email (via Cloudflare)
- `support@oneupper.app` → Forwards to personal email (via Cloudflare)

### API Keys & Secrets (stored in Supabase Edge Function secrets)
- `ANTHROPIC_API_KEY` - Claude API access
- `TWILIO_ACCOUNT_SID` - Twilio account
- `TWILIO_AUTH_TOKEN` - Twilio auth
- `TWILIO_PHONE_NUMBER` - +12406638746 (E.164 format)

---

## Game Concept & Gameplay

### The Rivalry Structure
- Every rivalry consists of exactly **11 shows** (configurable via `RIVALRY_LENGTH` constant)
- Two players compete head-to-head asynchronously
- Winner of each show claims the **Golden Mic** 🎤
- Player with most wins after 11 shows wins the rivalry and keeps the Golden Mic trophy
- Optional **stakes** can be set by the challenger (lunch, $20, loser mows lawn, etc.)

### Show Flow (Single Round)
```
┌─────────────────────────────────────────────────────────────┐
│  1. PROMPT REVEALED                                         │
│     - Same creative prompt shown to both players            │
│     - 3 judges randomly selected for this show              │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ANSWER SUBMISSION (Async)                               │
│     - Each player writes their answer independently         │
│     - Can take minutes or days                              │
│     - First submitter waits, gets "your turn" SMS to rival  │
│     - Optional: Nudge button sends reminder SMS             │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. AI JUDGING                                              │
│     - Triggered when second player submits                  │
│     - 3 judges each score both answers (0-10)               │
│     - Generates commentary, banter, artifacts               │
│     - First submitter gets "verdict ready" SMS              │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. VERDICT DISPLAY                                         │
│     - Winner announced with confetti celebration            │
│     - Judge scores and commentary shown                     │
│     - Optional judge chat (banter between judges)           │
│     - Artifacts: Celebrity Match, Fake Headline, Fact Check │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. MIC TRANSFER & NEXT SHOW                                │
│     - Winner holds Golden Mic (visual indicator)            │
│     - 30-second auto-advance countdown (can cancel)         │
│     - Repeat until 11 shows complete                        │
└─────────────────────────────────────────────────────────────┘
```

### Judge System
- **25+ unique AI personalities** stored in `judges` table
- Each show randomly selects 3 judges
- Judges have distinct scoring biases and commentary styles
- Judge output includes:
  - Individual scores (0-10 per player)
  - One-liner commentary on the answers
  - Judge chat (banter between the 3 judges)
  - Rivalry commentary (ongoing narrative about the rivalry arc)
  - Artifacts (celebrity match, fake headline, fact check)

**Sample Judges:**
| Key | Name | Personality |
|-----|------|-------------|
| savage | Savage Sarah | Brutally honest, no mercy |
| coach | Coach Kevin | Encouraging but competitive |
| snoot | Snoot Wellington III | Sophisticated, refined taste |
| chaos | Chaos Carl | Loves absurdity and randomness |
| logic | Logic Linda | Analytical, structure-focused |

### Rivalry Summary
Generated by AI (`summarize-rivalry` edge function) after all 11 shows complete:
- Final score and winner declaration
- Stakes reminder (who owes what)
- AI-generated narrative analysis of the rivalry
- Player style profiles
- Memorable moments and highlights
- Full show history access
- ShareCard generation for social sharing

---

## Complete Feature Set

### ✅ Profile System
| Feature | Description |
|---------|-------------|
| Code Format | ADJECTIVE-NOUN-#### (e.g., HAPPY-TIGER-1234) |
| Storage | localStorage for device persistence |
| Recovery | SMS magic link + 6-digit verification code |
| Avatars | 8 emoji options: 😎🤓😈🤡🎃🦄🐉🤖 |
| Fields | Name, Avatar, Phone (US), Bio (optional), SMS Consent |
| Multi-Profile | Multiple profiles per phone number supported |
| Profile Hub | View all profiles, switch between, see history per profile |
| Management | Create, edit, delete profiles |

### ✅ SMS Authentication (NEW)
| Feature | Description |
|---------|-------------|
| Magic Link | Tap link in SMS to instantly verify |
| 6-Digit Code | Manual entry option for desktop users |
| Token Expiry | 15 minutes |
| Session Duration | 30 days (stored in localStorage) |
| Localhost Bypass | Dev mode skips SMS for easier testing |
| Profile Picker | Shows all profiles for phone after verification |

### ✅ Rivalry System
| Feature | Description |
|---------|-------------|
| Format | 1v1 only, exactly 11 shows |
| Creation | Share code, enter friend's code, or deep link |
| Stakes | Optional custom wagers with 🎲 random suggestions |
| Mic Holder | Visual indicator of current leader |
| Status | Active rivalries prevent starting new ones |
| Cancellation | Either player can cancel, history preserved |
| Real-time | Opponent actions update via WebSocket |

### ✅ SMS Notifications
| Type | Trigger | Template Example |
|------|---------|------------------|
| Welcome | Profile created with SMS consent | "Welcome to One-Upper! You'll get updates..." |
| Rivalry Started | Opponent joins your challenge | "{opponent} accepted your challenge! Game on" |
| Your Turn | Opponent submitted answer | "{opponent} just answered '{prompt}' - Your turn!" |
| Verdict Ready | Judging complete | "Results are in! See who won against {opponent}" |
| Nudge | Manual button (with confirmation) | "{opponent} nudged you! Time to answer" |
| Rivalry Cancelled | Opponent cancelled | "{opponent} ended your rivalry" |

### ✅ Gameplay Features
| Feature | Description |
|---------|-------------|
| Prompt Selection | Random from curated database |
| Answer Input | Text area with word count awareness |
| Judging Cost | ~$0.01-0.02 per judgment (Claude Sonnet 4) |
| Verdict Display | Segmented toggle for Scores vs Chat view |
| Judge Cards | Individual scores + commentary per judge |
| Artifacts | Celebrity Match, Fake Headline, Fact Check |
| Confetti | canvas-confetti celebration on wins |
| Auto-advance | 30-second countdown after verdict |
| Ripley | AI emcee provides commentary at key moments |

### ✅ History & Navigation
| Feature | Description |
|---------|-------------|
| Profile Hub | Lists all profiles with W/L records |
| Past Rivalries | Shows opponent, score, date, win/loss indicator |
| Show History | Full history within rivalry, tap for details |
| Back Navigation | Proper scroll restoration throughout |

### ✅ Share Functionality
| Feature | Description |
|---------|-------------|
| ShareCard | Visual card with rivalry results |
| Image Generation | html2canvas creates shareable image |
| Web Share API | Native share sheet on mobile |
| Desktop Fallback | Downloads image + copies text |
| Profile Links | SMS links include ?p=UUID for profile switching |

### ✅ Legal & Compliance
- Privacy Policy with mobile number protection language
- Terms of Service
- SMS consent with explicit opt-in checkbox
- TCPA compliance (frequency disclosure, STOP instructions)
- Twilio A2P 10DLC registration

---

## Screen-by-Screen Reference

### Landing Page (`/`)
Marketing page with game explanation:
- Hero with logo and tagline
- "Play Now" CTA
- How It Works (3 steps)
- The Judges (3 sample judges + link to gallery)
- What You're Playing For (Golden Mic + stakes)
- Why Play (4 benefits)
- Footer with contact, legal links

### Screen1 (`/play`) - Three States

**State A: Create Profile / Login**
- Profile creation form (name, avatar, phone, SMS consent)
- "Already have a profile?" with code entry
- "Forgot your code?" triggers SMS verification flow
- Pending invite banner if arriving from `/join` link

**State B: Challenge a Friend**
- Your profile card with code display
- Stakes input with 🎲 random suggestion button
- Copy Code / Share via SMS buttons
- "Enter Code" to join someone else's rivalry
- Join Modal shows challenger's stakes if set
- Menu: How to Play, Your Profiles, Log Out

**State C: Rivalry Started**
- "🎉 Rivalry Started!" celebration
- Stakes display (if set)
- Ripley's intro commentary
- "Start First Show" button
- Menu includes Cancel Rivalry option

### Screen2 - Profile Hub
- Profile list for verified phone number
- Each profile shows: avatar, name, W/L record
- Tap profile to switch active profile
- Edit/Delete profile options
- View Past Rivalries per profile
- "Challenge a Friend" button when viewing own profile

### Screen4 - Active Gameplay
Multiple states within single component:

**Waiting for You:** Prompt displayed, answer text area, Submit button
**Waiting for Opponent:** Your answer shown, waiting message, Nudge button (with confirmation modal)
**Judging:** "Judges Deliberating" animation
**Verdict:** Winner announcement, judge cards, artifacts, Next Show / See Summary buttons

### Additional Routes
| Route | Component | Purpose |
|-------|-----------|---------|
| `/join/:code` | JoinRivalry | Deep link handler for invites |
| `/auth/:token` | AuthCallback | Magic link verification |
| `/verify` | VerifyPhone | Manual code entry verification |
| `/judges` | JudgesPage | Gallery of all AI judges |
| `/privacy` | PrivacyPage | Privacy policy |
| `/terms` | TermsPage | Terms of service |

---

## Database Schema

### profiles
```sql
id              UUID PRIMARY KEY
code            TEXT UNIQUE        -- ADJECTIVE-NOUN-####
name            TEXT NOT NULL
avatar          TEXT               -- Emoji
phone           TEXT               -- 10-digit US format
bio             TEXT
sms_consent     BOOLEAN DEFAULT false
twilio_blocked  BOOLEAN DEFAULT false  -- Carrier-level opt-out
pending_stakes  TEXT               -- Stakes for next rivalry
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### rivalries
```sql
id                UUID PRIMARY KEY
profile_a_id      UUID REFERENCES profiles
profile_b_id      UUID REFERENCES profiles
mic_holder_id     UUID REFERENCES profiles
status            TEXT DEFAULT 'active'  -- 'active' | 'complete' | 'cancelled'
first_show_started BOOLEAN DEFAULT false
stakes            TEXT               -- What they're playing for
intro_emcee_text  TEXT               -- Ripley's intro
summary_data      JSONB              -- AI-generated summary
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
```

### shows
```sql
id                UUID PRIMARY KEY
rivalry_id        UUID REFERENCES rivalries
show_number       INTEGER
prompt_id         UUID REFERENCES prompts
prompt            TEXT               -- Denormalized for speed
judges            TEXT[]             -- Array of 3 judge keys
profile_a_id      UUID REFERENCES profiles
profile_b_id      UUID REFERENCES profiles
profile_a_answer  TEXT
profile_b_answer  TEXT
first_submitter_id UUID             -- For SMS targeting
winner_id         UUID REFERENCES profiles
status            TEXT DEFAULT 'waiting'  -- 'waiting' | 'judging' | 'complete'
judge_data        JSONB              -- Full judging results
judged_at         TIMESTAMPTZ
last_nudge_at     TIMESTAMPTZ        -- Rate limiting nudges
created_at        TIMESTAMPTZ
```

### judges
```sql
id          UUID PRIMARY KEY
key         TEXT UNIQUE            -- e.g., 'savage', 'coach'
name        TEXT                   -- Display name
emoji       TEXT                   -- Representative emoji
description TEXT                   -- Personality description
examples    TEXT                   -- Example one-liners
created_at  TIMESTAMPTZ
```

### prompts
```sql
id          UUID PRIMARY KEY
text        TEXT UNIQUE            -- The prompt text
category    TEXT                   -- Optional categorization
active      BOOLEAN DEFAULT true
created_at  TIMESTAMPTZ
```

### auth_tokens
```sql
id          UUID PRIMARY KEY
phone       TEXT NOT NULL          -- 10-digit format
token       TEXT UNIQUE            -- 12-char magic link token
code        TEXT NOT NULL          -- 6-digit verification code
created_at  TIMESTAMPTZ
expires_at  TIMESTAMPTZ            -- 15 minutes from creation
used_at     TIMESTAMPTZ            -- NULL until used
```

---

## Edge Functions Reference

### judge-show
**Trigger:** Called when second player submits answer
**Purpose:** AI judging of both answers
**Process:**
1. Fetch show data with player info
2. Fetch 3 judge profiles
3. Fetch recent rivalry history for context
4. Call Claude Sonnet 4 with structured prompt
5. Parse response (scores, banter, artifacts)
6. Update show with results
7. Send verdict_ready SMS to first submitter

### send-sms
**Trigger:** Called from frontend or other edge functions
**Purpose:** Send templated SMS notifications
**Templates:** your_turn, verdict_ready, nudge, rivalry_cancelled, welcome, rivalry_started
**Features:**
- Random template selection per type
- Placeholder replacement ({opponent}, {prompt}, {profile_id})
- SMS consent check
- Twilio blocked check
- Kill switch for global disable

### send-auth
**Trigger:** "Forgot your code?" flow
**Purpose:** Send magic link + verification code
**Process:**
1. Generate 12-char token + 6-digit code
2. Store in auth_tokens table (15 min expiry)
3. Send SMS with both link and code

### receive-sms
**Trigger:** Twilio webhook for incoming SMS
**Purpose:** Handle STOP/START keywords
**STOP keywords:** STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT
**START keywords:** START, UNSTOP, SUBSCRIBE, YES
**Updates:** Sets twilio_blocked and sms_consent on profiles

### summarize-rivalry
**Trigger:** When 11th show completes
**Purpose:** Generate AI narrative summary
**Output:** Stored in rivalry.summary_data JSONB field

### select-emcee-line
**Trigger:** Rivalry creation, show transitions
**Purpose:** Generate Ripley (emcee) commentary

---

## SMS Notification System

### Architecture
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Frontend/Edge   │────▶│   send-sms       │────▶│     Twilio       │
│  Function        │     │   Edge Function  │     │     API          │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  User's Phone    │
                                                  └────────┬─────────┘
                                                           │
                                                           ▼ (if STOP/START)
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Supabase       │◀────│   receive-sms    │◀────│     Twilio       │
│   Database       │     │   Edge Function  │     │     Webhook      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Twilio Configuration
- **Phone Number:** +1 (240) 663-8746
- **A2P 10DLC:** Registered for compliance
- **Webhook URL:** https://pqyiqqgohuxbiuhgpprw.supabase.co/functions/v1/receive-sms

### Consent Model
Two-level opt-out:
1. **App-level (sms_consent):** User preference per profile
2. **Carrier-level (twilio_blocked):** When user texts STOP, Twilio blocks delivery

Re-opt-in flow:
1. User texts START to Twilio number
2. receive-sms sets twilio_blocked = false
3. User must still enable sms_consent in app
4. Welcome SMS sent on re-opt-in

### Message Templates
All templates start with "One-Upper:" for brand identification and include profile-specific links (?p=UUID) for proper profile switching on multi-profile accounts.

---

## Authentication & Security

### Current Auth Flow
```
┌─────────────────────────────────────────────────────────────┐
│  User clicks "Forgot your code?"                            │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Enters phone number                                        │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  send-auth creates:                                         │
│  - 12-char token (for magic link)                           │
│  - 6-digit code (for manual entry)                          │
│  - Stores in auth_tokens (15 min expiry)                    │
│  - Sends SMS with both options                              │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  User verifies via:                                         │
│  A) Tap magic link → /auth/:token → AuthCallback            │
│  B) Go to /verify → Enter phone + code → VerifyPhone        │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  On success:                                                │
│  - Token marked as used                                     │
│  - authSession stored in localStorage (30 days)             │
│  - If 1 profile: auto-login                                 │
│  - If multiple: show profile picker                         │
└─────────────────────────────────────────────────────────────┘
```

### Session Storage
```javascript
// localStorage keys
activeProfileId   // Currently selected profile UUID
authSession       // { phone, verifiedAt, expiresAt }
recentProfiles    // Array of { id, name, code, avatar }
```

### Localhost Development Bypass
When `window.location.hostname === 'localhost'` or `'127.0.0.1'`:
- "Forgot your code?" shows profiles directly without SMS
- Enables rapid testing without burning SMS credits

---

## File Structure Reference

```
src/
├── components/
│   ├── Screen1.jsx          # Profile/rivalry management (1700+ lines)
│   ├── Screen2.jsx          # Profile hub
│   ├── Screen4.jsx          # Active gameplay (1600+ lines)
│   ├── AuthCallback.jsx     # Magic link handler (/auth/:token)
│   ├── VerifyPhone.jsx      # Manual code entry (/verify)
│   ├── LandingPage.jsx      # Marketing page
│   ├── JoinRivalry.jsx      # Deep link handler
│   ├── RivalrySummaryScreen.jsx  # End-of-rivalry summary
│   ├── PastRivalriesList.jsx     # Rivalry history list
│   ├── ShareCard.jsx        # Shareable rivalry card
│   ├── Header.jsx           # Common header
│   ├── HowToPlayModal.jsx   # Instructions modal
│   ├── InterstitialScreen.jsx    # Brain boost messages
│   ├── OfflineBanner.jsx    # Offline detection banner
│   ├── ErrorBoundary.jsx    # React error boundary
│   ├── JudgesPage.jsx       # Judge gallery
│   ├── PrivacyPage.jsx      # Privacy policy
│   └── TermsPage.jsx        # Terms of service
├── hooks/
│   └── useOnlineStatus.js   # Network detection hook
├── utils/
│   ├── codeGenerator.js     # Profile code generation
│   ├── phoneUtils.js        # Phone normalization/validation
│   ├── prompts.js           # Prompt fetching
│   └── shareUtils.js        # Share functionality
├── lib/
│   └── supabase.js          # Supabase client init
├── assets/
│   └── microphone.svg       # Golden Mic icon
├── config.js                # RIVALRY_LENGTH constant
├── App.jsx                  # Router setup
├── main.jsx                 # Entry point
└── index.css                # Global styles

supabase/
└── functions/
    ├── judge-show/index.ts      # AI judging
    ├── send-sms/index.ts        # SMS notifications
    ├── send-auth/index.ts       # SMS verification
    ├── receive-sms/index.ts     # STOP/START handling
    ├── summarize-rivalry/index.ts   # AI summary generation
    └── select-emcee-line/index.ts   # Ripley commentary
```

---

## Known Issues & Technical Debt

### Code Quality
| Issue | Severity | Notes |
|-------|----------|-------|
| Screen1.jsx size | Medium | 1700+ lines, should split into components |
| Screen4.jsx size | Medium | 1600+ lines, should split into components |
| No automated tests | Medium | Manual testing only currently |
| Some emoji rendering | Low | May show as rectangles on older devices |

### UX Improvements Needed
| Issue | Severity | Notes |
|-------|----------|-------|
| PWA refresh | Low | No pull-to-refresh in PWA mode |
| Profile code confusion | Low | "Code" could mean profile code or verification code |

### Database Security
| Issue | Severity | Notes |
|-------|----------|-------|
| RLS policies | Medium | Review row-level security for all tables |
| Phone exposure | Low | Verify phone numbers not exposed via API |

---

## Next Priorities

### 🔴 IMMEDIATE (This Week)

1. **Rematch flow after rivalry ends**
   - One button to start new rivalry with same opponent
   - Critical for retention loop

2. **Pretty up Screen1**
   - "New here?" state needs better onboarding
   - "Challenge a friend" needs more energy/excitement
   - Already on pinned priority list

3. **Rename "code" clarity**
   - Profile code vs verification code confusion
   - Simple text changes throughout

### 🟡 SHORT-TERM (Next 2 Weeks)

4. **Variable rivalry length**
   - Add dropdown: 1, 3, 5, or 11 shows
   - Store in rivalry table
   - Quick games = more completed rivalries

5. **Hot Takes collapse UI**
   - Artifacts (celebrity match, headline, fact check) collapsed
   - Click to cycle through
   - Reduces verdict screen length

6. **Admin dashboard**
   - Profile count, rivalry stats, show counts
   - Useful for tracking traction

7. **PWA install prompt**
   - Explain home screen icon benefits
   - Unlocks push notifications on iOS

### 🟢 MEDIUM-TERM (Month+)

8. **Prompt themes/tones**
   - Silly, deep thoughts, NSFW, topical
   - Optional selector during challenge setup

9. **Rivalry summary redesign**
   - "Tale of the Tape" style with stats
   - More shareable, scannable

10. **Multiple rivalries per profile**
    - UI for rivalry switcher
    - Database already supports this

---

## Future Feature Ideas

### High Impact, High Effort
| Feature | Notes |
|---------|-------|
| Party Mode (3-7 players) | Same prompt, everyone answers, AI ranks all |
| Flash Mob Challenge | 100 players, 24hr window, leaderboard |
| New input modalities | Draw, photo, audio, video answers |

### Medium Impact
| Feature | Notes |
|---------|-------|
| Player auto-customization | AI-generated style taglines ("The Chaos Poet") |
| Push notifications | Cheaper than SMS, requires PWA install |
| Sound effects | Victory fanfare, nudge whoosh |
| Spectator mode | Watch friends' rivalries |

### Future Consideration
| Feature | Notes |
|---------|-------|
| Rounds/Seasons | 3-show mini-seasons with recaps |
| Daily prompt | Keep users engaged between rivalries |
| Leaderboards | Needs moderation strategy first |

---

## Development Workflow

### Local Development
```bash
cd one-upper-1v1-app
npm install
npm run dev
# Access at http://localhost:5173
```

### Deploy Frontend
```bash
git add .
git commit -m "Description of changes"
git push origin main
# Vercel auto-deploys from main branch
```

### Deploy Edge Functions
```bash
# Deploy specific function
supabase functions deploy judge-show
supabase functions deploy send-sms
supabase functions deploy send-auth
supabase functions deploy receive-sms

# View logs
supabase functions logs function-name --tail

# Test locally (requires Docker)
supabase functions serve function-name
```

### Database Changes
```bash
# Run migrations
supabase db push

# Or execute SQL directly in Supabase Dashboard → SQL Editor
```

### Testing Checklist
- [ ] Create new profile
- [ ] Resume with existing code
- [ ] Forgot code → SMS verification (magic link)
- [ ] Forgot code → SMS verification (manual code)
- [ ] Start rivalry with stakes
- [ ] Start rivalry without stakes
- [ ] Join via deep link
- [ ] Join via manual code entry
- [ ] Complete full 11-show rivalry
- [ ] Receive all SMS notification types
- [ ] Nudge with confirmation modal
- [ ] View rivalry summary
- [ ] Share rivalry result
- [ ] View past rivalries
- [ ] Switch between profiles
- [ ] Cancel rivalry mid-game
- [ ] Test STOP/START SMS keywords
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test in PWA mode

---

## Contact & Resources

**Live Site:** https://oneupper.app  
**Domain Registrar:** DirectNIC  
**DNS:** Cloudflare  
**Hosting:** Vercel  
**Database:** Supabase (Project: pqyiqqgohuxbiuhgpprw)  
**SMS:** Twilio (+1 240-663-8746)  
**AI Model:** Claude Sonnet 4 (Anthropic API)

**Contact Emails:**
- General: hello@oneupper.app
- Support: support@oneupper.app

---

**End of Handoff Document**  
**Version:** 6.0  
**Date:** November 28, 2025
