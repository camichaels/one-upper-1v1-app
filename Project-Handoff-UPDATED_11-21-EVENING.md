# One-Upper: Complete Project Handoff Document
**Last Updated:** November 21, 2024 (Evening Session)  
**Status:** Live in Production at https://oneupper.app

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Environment](#tech-stack--environment)
3. [Current Feature Set](#current-feature-set)
4. [Evening Session Updates (November 21, 2024)](#evening-session-updates-november-21-2024)
5. [SMS Notification System (Awaiting Twilio)](#sms-notification-system-awaiting-twilio)
6. [Legal & Compliance](#legal--compliance)
7. [Next Priorities (RANKED)](#next-priorities-ranked)
8. [File Structure Reference](#file-structure-reference)
9. [Key Technical Details](#key-technical-details)
10. [Development Workflow](#development-workflow)

---

## Project Overview

One-Upper is a **1v1 async competitive mobile game** where players submit escalating responses to prompts and receive scores from AI judge personalities. The game transforms the socially problematic behavior of "one-upping" into structured competitive entertainment.

### Core Innovation
- No accounts required (awaiting Twilio for proper auth)
- Real-time multiplayer synchronization
- AI judging with 25 distinct personality biases
- Mobile-first dark gradient design
- Deep link sharing via SMS/text
- Custom golden microphone SVG icon throughout

### Target User
Friends who want competitive social entertainment without the friction of account creation. Emphasizes "challenge a friend" simplicity while maintaining engaging gameplay.

### Tagline
**"Part brain boost, all buddy boast."**

---

## Tech Stack & Environment

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS (utility-first, mobile-first)
- **Routing:** React Router v6
- **State Management:** React hooks (useState, useEffect)
- **Special Libraries:** 
  - `canvas-confetti` for celebration effects
  - Custom SVG assets (`microphone.svg` for golden mic icon)

### Backend
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Supabase real-time subscriptions
- **Edge Functions:** Supabase Edge Functions (Deno runtime)
- **Authentication:** Currently localStorage + codes (planning Twilio + Supabase Auth OTP)

### Deployment & DNS
- **Hosting:** Vercel (auto-deploys from GitHub main branch)
- **Domain:** oneupper.app (managed via DirectNIC → Cloudflare)
- **DNS:** Cloudflare
- **Email Routing:** Cloudflare Email Routing (free)
  - `hello@oneupper.app` → forwards to personal email
  - `support@oneupper.app` → forwards to personal email
- **SSL:** Automatic via Vercel + Cloudflare

### AI & APIs
- **Judging Model:** Claude Sonnet 4 via Anthropic API
- **Cost:** ~$0.01-0.02 per judgment
- **Implementation:** Called from Supabase Edge Function `judge-show`

---

## Current Feature Set

### ✅ Profile System (Complete - Needs Security Upgrade)
- **Code Format:** ADJECTIVE-NOUN-#### (e.g., HAPPY-TIGER-1234)
- **Storage:** localStorage for device persistence
- **Recovery:** Phone number lookup (US format only)
- **Avatars:** 8 emoji options
- **Fields:** Name, Avatar, Phone, Bio (optional), SMS Consent
- **Management:** Create, edit, delete, switch between profiles
- **Security Issue:** Anyone with phone number can retrieve codes (needs SMS OTP auth)

### ✅ Rivalry System (Complete)
- **Format:** 1v1 only
- **Creation:** Challenge a friend OR join via code
- **Deep Links:** `/join/CODE` auto-starts rivalry
- **Mic Holder:** Winner holds mic, loser gets it for next show
- **Status Tracking:** Active rivalries prevent new rivalries
- **Cancellation:** Either player can cancel, opponent gets notified
- **History:** Full show history (unlimited scrolling)

### ✅ Gameplay Loop (Complete)
- **Show Structure:** Prompt → Both submit → AI judges → Verdict
- **Judging:** 3 random judges from 25 personality pool
- **Scoring:** Points per judge (0-10), winner determined by total
- **Comments:** Judge commentary + optional judge chat (banter)
- **Confetti:** Celebration on win
- **Auto-advance:** 30-second countdown with embedded timer
- **Verdict Display:** Segmented toggle between Judge Scores / Judge Chat

### ✅ UI/UX Polish (Complete)
- **Golden Mic Icon:** Custom SVG throughout (landing, scoreboard, verdicts, history)
- **Judge Content Toggle:** Segmented control for Scores vs Chat (defaults to scores)
- **Countdown UX:** "Next Show in 28s • Start Now" embedded in button
- **Button States:** Two buttons during countdown, single button after "Stay Here"
- **Past Shows:** Unlimited scroll (removed 10-show limit)
- **Responsive Design:** Mobile-first, works on all screen sizes
- **Dark Theme:** Slate gradient background, orange accents

### ✅ Judges Gallery (NEW - Nov 21 Evening)
- **Route:** `/judges`
- **Grid:** 2 columns mobile, 3 tablet, 4 desktop
- **Random Order:** Shuffles on each page load
- **Modal:** Click any judge for full details (reuses Screen4 modal)
- **Link:** Text link on landing page after sample judges

### ✅ Legal & Compliance (Complete)
- **Privacy Policy:** `/privacy`
- **Terms of Service:** `/terms`
- **Copyright:** Footer with "© 2025 One-Upper™"
- **Email Contacts:** hello@oneupper.app, support@oneupper.app
- **Content Rights:** Users grant license for promotional use

---

## Evening Session Updates (November 21, 2024)

### 1. Golden Microphone Icon (SVG)
**Status:** ✅ Complete

**What Changed:**
- Created custom golden microphone SVG asset
- Replaced all 🎤 emoji instances with SVG throughout app
- Consistent sizing based on context:
  - Small inline (20px): Next to names/scores
  - Medium (24px): History lists
  - Large (28px): Winner declarations
  - Hero (96px): Landing page

**Files Modified:**
- `src/assets/microphone.svg` (NEW)
- `src/components/LandingPage.jsx` - Golden Mic section
- `src/components/Screen4.jsx` - Scoreboard, verdicts, history
- `src/components/Screen6.jsx` - Winner declaration, answer cards

**Benefits:**
- Crisp at all sizes (SVG scales perfectly)
- Orange gradient built-in (no CSS filter hacks)
- Brand consistency
- Professional look

---

### 2. Countdown & Button Improvements
**Status:** ✅ Complete

**What Changed:**
- Extended auto-advance from 10s → 30s
- Embedded countdown in button text: "Next Show in 28s • Start Now"
- Two buttons during countdown: "Start Now" + "Stay Here"
- Single button after canceling: "Next Show →"

**Files Modified:**
- `src/components/Screen4.jsx` - Countdown logic and button rendering

**UX Improvements:**
- Less rushed (30s vs 10s)
- Clear action available (Start Now)
- One less UI element (countdown in button, not separate)
- Cleaner state management

---

### 3. Judge Content Toggle (Scores vs Chat)
**Status:** ✅ Complete

**What Changed:**
- Removed separate "Hide/Show Judge Banter" button
- Created segmented toggle: `[Judge Scores] [Judge Chat]`
- Defaults to Judge Scores view
- Only shows toggle if judge chat exists
- Renamed "Banter" → "Chat" throughout

**Files Modified:**
- `src/components/Screen4.jsx` - Added `judgeView` state, segmented toggle
- `src/components/Screen6.jsx` - Same changes for past show detail view

**UX Improvements:**
- Less button clutter
- Modern segmented control pattern
- Natural pairing (both judge content)
- Cleaner visual hierarchy

---

### 4. Unlimited Past Shows
**Status:** ✅ Complete

**What Changed:**
- Removed `.limit(10)` from `loadPreviousShows()` query
- Now loads all shows in rivalry
- Sorted by show_number descending (newest first)

**Files Modified:**
- `src/components/Screen4.jsx` - `loadPreviousShows()` function

**Benefits:**
- Full history available
- No pagination needed (yet)
- Action buttons stay above history (good UX)
- Can add infinite scroll later if needed

---

### 5. Meet the Judges Page
**Status:** ✅ Complete

**What Added:**
- New page at `/judges`
- Randomized grid of all 25 judges
- Click any judge → same modal as in-game
- Simple navigation (logo, back button, title)
- Text link on landing page: "Meet all 25 judges →"

**Files Added:**
- `src/components/JudgesPage.jsx` (NEW)

**Files Modified:**
- `src/App.jsx` - Added `/judges` route
- `src/components/LandingPage.jsx` - Added text link after judge cards

**Features:**
- Responsive grid (2/3/4 columns)
- Random shuffle each visit (keeps it fresh)
- Reuses existing judge modal component
- Mobile-friendly
- Matches dark theme

---

### 6. Button Text Updates
**Status:** ✅ Complete

**What Changed:**
- Screen6: "Back to Game" → "Back to Current Show"

**Files Modified:**
- `src/components/Screen6.jsx`

---

## SMS Notification System (Awaiting Twilio)

### Current Status
- ✅ Code complete (Edge Function + UI)
- ✅ SMS consent system implemented
- ⏳ Waiting for Twilio A2P 10DLC approval (submitted Nov 21)
- Kill switch: `SMS_ENABLED = false` (ready to flip when approved)

### Notification Types
1. `your_turn` - Opponent submitted
2. `verdict_ready` - Judging complete
3. `nudge` - Manual reminder
4. `rivalry_cancelled` - Opponent ended rivalry

### Edge Function
**File:** `supabase/functions/send-sms/index.ts`
- Checks SMS consent before sending
- Test mode (logs only when no Twilio credentials)
- Production mode (sends via Twilio when credentials set)
- 4 message variations per type
- Dynamic placeholders

---

## Legal & Compliance

### Privacy Policy (`/privacy`)
- Complete disclosure of data collection
- SMS opt-in/opt-out process
- AI processing disclosure
- Content usage rights
- Contact: support@oneupper.app

### Terms of Service (`/terms`)
- User obligations
- Content license grant
- Age restrictions (13+)
- AI judging disclosure
- Cancellation policy

### Email Routing
- hello@oneupper.app (general)
- support@oneupper.app (privacy/legal)
- Cloudflare Email Routing (free)

---

## Next Priorities (RANKED)

### 🔥 HIGH PRIORITY (Do When Twilio Ready)

**1. Authentication with Supabase Auth OTP + Twilio**
- **Why:** Current phone number system is insecure (anyone can retrieve codes)
- **What:** SMS-based magic code authentication
- **How:** `supabase.auth.signInWithOtp()` via Twilio
- **Flow:**
  1. User enters phone number
  2. Receives 6-digit code via SMS
  3. Enters code → authenticated
  4. Can now manage all their profiles (tied to verified phone)
- **Benefits:** 
  - Actually secure
  - Supports multiple profiles per phone number
  - Cross-device access
  - Industry standard UX
- **Status:** Design complete, waiting for Twilio approval

**2. Enable SMS Notifications**
- **Why:** Core feature to drive engagement
- **What:** "Your turn", "Verdict ready", etc.
- **How:** Flip `SMS_ENABLED = true` when Twilio approved
- **Testing:** Test mode is already working (logs only)

---

### 🎯 MEDIUM-HIGH PRIORITY (Make Game Feel Alive)

**3. Richer Judge Verdicts**
- **Why:** Core "feel alive" improvement, minimal code change
- **What:** Judges reference rivalry dynamics, not just individual answers
- **How:** Improve prompts to Claude API for judge comments
- **Examples:**
  - "Ooh, this is close!"
  - "Sam, you got destroyed here"
  - "Craig's making a comeback!"
- **Impact:** High personality boost, low effort

**4. Waiting Screen Flavor Text**
- **Why:** Makes dead time fun
- **What:** Random judge one-liners while waiting for opponent
- **How:** Pre-written flavor text (50-100 lines), randomly displayed
- **Examples:**
  - "This one's gonna be spicy..."
  - "I've seen some WILD answers to this prompt"
- **Cost:** Write once, no AI calls
- **Impact:** Medium personality boost, low effort

**5. AI Host at Milestones**
- **Why:** Creates narrative arc over time
- **What:** 2-3 sentence commentary at Shows 1, 5, 10, 20, season end
- **How:** AI call with rivalry context (scores, momentum, etc.)
- **Examples:**
  - "Folks, we've got ourselves a RIVALRY. Sam's up 6-4 but Craig's heating up..."
- **Cost:** ~5-6 AI calls per season (~$0.05-0.10)
- **Impact:** High narrative impact, medium effort

---

### 📊 MEDIUM PRIORITY (Product Features)

**6. Multiple Rivalries Per User**
- **Why:** Power users want to play with many friends
- **What:** Dashboard showing all active rivalries
- **How:** One phone → one account → multiple rivalries
- **Requires:** Authentication (see #1) to work properly
- **UI:** Rivalry tiles with: opponent, turn status, show number, W/L
- **Impact:** Unlocks product for power users

**7. Season Structure (10-20 shows)**
- **Why:** Creates natural checkpoints and milestones
- **What:** Shows grouped into seasons with recap moments
- **How:** Track `season_number` in rivalries table
- **Flow:** Show 10/20 → season recap → Season 2 starts
- **Features:**
  - Season recap (shareable)
  - Stats reset or carry over (TBD)
  - "Start Season 2" button
- **Impact:** Retention and shareability

**8. End-of-Show Artifacts (Occasional)**
- **Why:** Shareable moments, viral potential
- **What:** 1-2 line punchy AI-generated artifacts
- **Examples:**
  - Celebrity Match: "Craig's answer most likely said by Ryan Reynolds"
  - Headline: "Nation bans Craig's joke for being too powerful"
  - Fact Check: "Did you know chickens can't blush? Guess Ben's can."
- **Frequency:** Every 3-5 shows or random 20%
- **Cost:** ~$0.01 per artifact
- **Impact:** High shareability, medium cost

---

### 🔧 LOW PRIORITY (Polish & Discovery)

**9. Expand Judge Pool (25 → 50)**
- **Why:** More variety, matches original vision
- **What:** Create 25 more judge personalities
- **How:** Design judges, add to database
- **Impact:** More discovery, keeps fresh

**10. Profile Customization**
- **Why:** Personalization
- **What:** Pick emoji/color theme for your profile
- **How:** Add color field to profiles, apply to UI
- **Impact:** Low, but nice-to-have

**11. Rivalry Stats Page**
- **Why:** Data nerds love stats
- **What:** W/L record, average scores, favorite judge, etc.
- **How:** Aggregate from shows table
- **Impact:** Low engagement, high effort

---

### ❌ DON'T DO (YET)

**12. 1-Player Mode**
- **Why:** Undermines core value prop (rivalry)
- **When:** Maybe later as separate mode

**13. Interactive Judges (Follow-up Questions)**
- **Why:** Adds friction, slows gameplay
- **When:** Only if users demand it

**14. Leaderboards / Public Answers**
- **Why:** Needs moderation, privacy concerns
- **When:** After scale and moderation strategy

**15. Social Posting Features**
- **Why:** Need artifacts/seasons first
- **When:** After #7 and #8 are complete

---

## File Structure Reference

### Core Game Files
```
src/
├── components/
│   ├── LandingPage.jsx       - Marketing page
│   ├── Screen1.jsx            - Profile mgmt, rivalry creation
│   ├── Screen2.jsx            - Profile edit
│   ├── Screen4.jsx            - Active gameplay
│   ├── Screen6.jsx            - Past show detail
│   ├── JoinRivalry.jsx        - Deep link handler
│   ├── JudgesPage.jsx         - Meet the judges gallery (NEW)
│   ├── HowToPlayModal.jsx     - Game instructions
│   ├── PrivacyPage.jsx        - Privacy policy
│   ├── TermsPage.jsx          - Terms of service
│   └── Header.jsx             - Reusable header component
├── lib/
│   └── supabase.js            - Supabase client
├── utils/
│   ├── prompts.js             - Prompt selection, judge selection
│   ├── phoneUtils.js          - Phone number formatting
│   └── codeGenerator.js       - Profile code generation
├── assets/
│   └── microphone.svg         - Golden mic icon (NEW)
└── App.jsx                    - Router config
```

### Supabase Edge Functions
```
supabase/functions/
├── judge-show/
│   └── index.ts               - AI judging via Claude API
└── send-sms/
    └── index.ts               - SMS notifications via Twilio
```

---

## Key Technical Details

### Database Schema

**profiles**
```sql
- id (uuid, primary key)
- name (text)
- avatar (text) - emoji character
- phone (text) - 10 digits, US only
- bio (text, nullable)
- code (text, unique) - ADJECTIVE-NOUN-####
- sms_consent (boolean, default false)
- created_at (timestamptz)
```

**rivalries**
```sql
- id (uuid, primary key)
- profile_a_id (uuid, foreign key)
- profile_b_id (uuid, foreign key)
- status (text) - 'active', 'cancelled'
- mic_holder_id (uuid, foreign key)
- first_show_started (boolean)
- created_at (timestamptz)
```

**shows**
```sql
- id (uuid, primary key)
- rivalry_id (uuid, foreign key)
- show_number (integer)
- prompt (text)
- judges (text[]) - array of judge keys
- profile_a_id (uuid)
- profile_b_id (uuid)
- profile_a_answer (text)
- profile_b_answer (text)
- judge_data (jsonb) - scores, comments, banter
- winner_id (uuid)
- status (text) - 'waiting', 'judging', 'complete'
- created_at (timestamptz)
```

**judges**
```sql
- id (integer, primary key)
- key (text, unique) - e.g., 'savage'
- name (text) - e.g., 'Savage Sarah'
- emoji (text) - e.g., '😈'
- description (text) - judging style
- examples (text) - sample one-liners
```

---

## Development Workflow

### Local Development
```bash
npm install
npm run dev
# Access at http://localhost:5173
```

### Deploy to Production
```bash
git add .
git commit -m "Description"
git push
# Vercel auto-deploys from main branch
```

### Supabase Edge Functions
```bash
# Deploy function
supabase functions deploy function-name

# View logs
supabase functions logs function-name

# Test locally
supabase functions serve function-name
```

---

## Important Notes for Next Session

### Authentication Strategy (CRITICAL)
**Current Problem:**
- Anyone with your phone number can retrieve your profile codes
- No way to verify phone number ownership
- Insecure for real users

**Recommended Solution:**
- **Supabase Auth OTP via Twilio** (once Twilio approved)
- User enters phone → gets 6-digit code → enters code → authenticated
- All profiles tied to authenticated phone number
- Cross-device access works properly
- Industry standard UX

**Implementation Plan:**
1. Wait for Twilio A2P approval
2. Set up Supabase Auth with Twilio SMS provider
3. Create login flow with OTP input
4. Migrate existing profiles (link by phone number)
5. Add "claim profile" flow for first-time auth

### Files Modified This Session
- `src/assets/microphone.svg` (NEW)
- `src/components/LandingPage.jsx`
- `src/components/Screen4.jsx`
- `src/components/Screen6.jsx`
- `src/components/JudgesPage.jsx` (NEW)
- `src/App.jsx`

### Testing Checklist for Next Session
- [ ] Golden mic displays on all screens
- [ ] 30-second countdown works
- [ ] "Start Now" and "Stay Here" buttons work
- [ ] Judge Scores/Chat toggle works
- [ ] Unlimited past shows scroll
- [ ] Judges page loads and randomizes
- [ ] Judge modals work from judges page
- [ ] Mobile responsive on all new features

---

## Contact & Resources

**Live Site:** https://oneupper.app  
**Domain:** DirectNIC → Cloudflare DNS  
**Hosting:** Vercel  
**Database:** Supabase  
**Email:** Cloudflare Email Routing  
**SMS:** Twilio (pending A2P approval)  
**AI Model:** Claude Sonnet 4 (Anthropic API)

**Contacts:**
- General: hello@oneupper.app
- Privacy/Legal: support@oneupper.app

---

## Session Summary (November 21 Evening)

### Completed ✅
1. Golden microphone SVG icon throughout app
2. 30-second countdown with embedded timer in button
3. Judge Scores/Chat segmented toggle (renamed from Banter)
4. Unlimited past shows (removed 10-limit)
5. Meet the Judges page at `/judges`
6. Button text improvements ("Back to Current Show")
7. Comprehensive priority planning for next features

### Key Decisions Made
- Authentication should use Supabase Auth OTP + Twilio (when ready)
- Focus on "making it feel alive" before adding big features
- Prioritize judge verdict improvements (highest ROI)
- Don't add leaderboards/social yet (needs moderation)
- Season structure is valuable for retention

### Next Steps
1. Wait for Twilio A2P approval
2. Implement authentication (Supabase Auth OTP)
3. Enable SMS notifications
4. Start "feel alive" improvements (richer verdicts, flavor text, AI host)

---

**End of Handoff Document**  
**Version:** 4.0  
**Date:** November 21, 2024 (Evening)
