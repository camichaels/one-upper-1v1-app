# One-Upper: Complete Project Handoff Document
**Last Updated:** November 21, 2024  
**Status:** Live in Production at https://oneupper.app

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Environment](#tech-stack--environment)
3. [Current Feature Set](#current-feature-set)
4. [Recent Updates (November 21, 2024)](#recent-updates-november-21-2024)
5. [SMS Notification System (In Progress)](#sms-notification-system-in-progress)
6. [Legal & Compliance](#legal--compliance)
7. [Next Priorities](#next-priorities)
8. [File Structure Reference](#file-structure-reference)
9. [Key Technical Details](#key-technical-details)
10. [Testing Procedures](#testing-procedures)

---

## Project Overview

One-Upper is a **1v1 async competitive mobile game** where players submit escalating responses to prompts and receive scores from AI judge personalities. The game transforms the socially problematic behavior of "one-upping" into structured competitive entertainment.

### Core Innovation
- No accounts required - profile codes enable cross-device access
- Real-time multiplayer synchronization
- AI judging with distinct personality biases
- Mobile-first dark gradient design
- Deep link sharing via SMS/text

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
  - Standard fetch API for Anthropic Claude API calls (in artifacts only)

### Backend
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Supabase real-time subscriptions
- **Edge Functions:** Supabase Edge Functions (Deno runtime)
- **Authentication:** None - localStorage + unique codes

### Deployment & DNS
- **Hosting:** Vercel (auto-deploys from GitHub main branch)
- **Domain:** oneupper.app (managed via DirectNIC → Cloudflare)
- **DNS:** Cloudflare (nameservers updated Nov 21, 2024)
- **Email Routing:** Cloudflare Email Routing (free)
  - `hello@oneupper.app` → forwards to personal email
  - `support@oneupper.app` → forwards to personal email
- **SSL:** Automatic via Vercel + Cloudflare

### AI & APIs
- **Judging Model:** Claude Sonnet 4 via Anthropic API
- **Cost:** ~$0.01-0.02 per judgment
- **Implementation:** Called from Supabase Edge Function `judge-show`

### Environment Variables

**Vite (Frontend) - Already Set:**
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Supabase Edge Functions - Already Set:**
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Supabase Edge Functions - Pending Twilio A2P Approval:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+12406638746
```

---

## Current Feature Set

### ✅ Profile System (Complete)
- **Code Format:** ADJECTIVE-NOUN-#### (e.g., HAPPY-TIGER-1234)
- **Storage:** localStorage for device persistence
- **Recovery:** Phone number lookup (US format only)
- **Avatars:** 8 emoji options
- **Fields:** Name (required), Avatar (required), Phone (required), Bio (optional), SMS Consent (optional)
- **Management:** Create, edit, delete, switch between profiles
- **History:** Last 10 profiles stored in localStorage

**Phone Number Handling:**
- **Utility:** `src/utils/phoneUtils.js`
- **Functions:** `normalizePhone()`, `validatePhone()`
- **Stored Format:** 10 digits only (e.g., "4155169044")
- **Accepted Input:** Any format with dashes, spaces, parentheses, +1 prefix
- **Validation:** US phone numbers only (10 digits)

**SMS Consent (NEW - Nov 21, 2024):**
- Checkbox in profile creation and editing
- Database field: `profiles.sms_consent` (boolean, default false)
- Required for TCPA compliance
- User can opt in/out anytime

### ✅ Rivalry System (Complete)
- **Format:** 1v1 only (expandable to more players later)
- **Creation:** Challenge a friend OR join via code
- **Deep Links:** `/join/CODE` auto-starts rivalry
- **Mic Holder:** Person who starts first show holds mic initially
- **Status Tracking:** Active rivalries prevent new rivalries
- **Cancellation:** Either player can cancel, opponent gets notified
- **History:** Saved after cancellation

### ✅ Gameplay Loop (Complete)
- **Show Structure:** Prompt → Both submit → AI judges → Verdict
- **Mic Holder:** Answers first each round, passes to loser
- **Judging:** 3 random judges from 50+ personality pool
- **Scoring:** Points per judge (0-10), winner determined by total
- **Comments:** Each judge provides personality-driven commentary
- **Stats:** Win/loss tracking, show history

### ✅ UI/UX Polish (Complete)
- **Confetti:** Celebration on win (canvas-confetti library)
- **Loading States:** All async actions have loading feedback
- **Error Handling:** User-friendly error messages throughout
- **Responsive Design:** Mobile-first, works on all screen sizes
- **Dark Theme:** Slate gradient background, orange accents
- **Animations:** Smooth transitions, fade effects, glowing elements
- **How to Play Modal:** Accessible from Screen1 and Screen4 menus (NEW - Nov 21, 2024)

### ✅ Legal & Compliance (NEW - Nov 21, 2024)
- **Privacy Policy:** Complete page at `/privacy`
- **Terms of Service:** Complete page at `/terms`
- **Copyright:** Footer with "© 2025 One-Upper™. All rights reserved."
- **Email Contacts:** 
  - `hello@oneupper.app` for general inquiries
  - `support@oneupper.app` for privacy/legal questions
- **Content Rights:** Users grant license for promotional use, leaderboards, marketing

---

## Recent Updates (November 21, 2024)

### 1. How to Play Modal
**Status:** ✅ Complete and deployed

**What:** Informational modal explaining game rules accessible from menu

**Files Modified:**
- `src/components/HowToPlayModal.jsx` (NEW)
- `src/components/Screen1.jsx` - Added menu item and modal
- `src/components/Screen4.jsx` - Added menu item and modal

**Features:**
- Accessible from ⋮ menu in Screen1 (State B & C) and Screen4
- Shows game basics and pro tips
- No emojis (encoding issues resolved)
- "Got It!" button to close

---

### 2. SMS Consent System
**Status:** ✅ Database & UI complete, awaiting Twilio A2P approval

**What:** TCPA-compliant opt-in/out system for SMS notifications

**Database Changes:**
```sql
ALTER TABLE profiles ADD COLUMN sms_consent BOOLEAN DEFAULT FALSE;
```

**Files Modified:**
- `src/components/Screen1.jsx` - Added SMS consent checkbox to profile creation
- `src/components/Screen2.jsx` - Added SMS consent checkbox to profile editing and new profile creation
- `supabase/functions/send-sms/index.ts` - Added consent checking before sending

**Features:**
- Checkbox with clear disclosure language
- Defaults to unchecked (opt-in required)
- User can toggle anytime in profile settings
- Edge function checks `sms_consent` before sending any SMS
- Returns `{ success: false, reason: 'no_consent' }` if user hasn't opted in

**Consent Language:**
```
☑ Send me text notifications about my games

Get notified when it's your turn, results are ready, and more. 
You can change this anytime. Standard message rates may apply.
```

---

### 3. SMS Edge Function
**Status:** ✅ Code complete, awaiting Twilio credentials & A2P approval

**File:** `supabase/functions/send-sms/index.ts`

**Features:**
- ✅ Consent checking (blocks if `sms_consent = false`)
- ✅ Kill switch (`SMS_ENABLED = false` by default)
- ✅ Test mode (logs to console when Twilio credentials not set)
- ✅ Production mode (sends via Twilio when credentials present)
- ✅ Random message templates (4 variations per notification type)
- ✅ Dynamic placeholders: `{opponent}`, `{show_num}`, `{prompt}`
- ✅ Proper emoji encoding (fixed)

**Notification Types:**
1. `your_turn` - Opponent submitted, you haven't
2. `verdict_ready` - Judging complete
3. `nudge` - Manual poke from opponent
4. `rivalry_cancelled` - Opponent ended rivalry

**Current Status:**
- Kill switch: `SMS_ENABLED = false` (change to `true` when ready)
- Test mode: Active (no Twilio credentials)
- Twilio A2P: Pending approval (1-7 business days typical)

---

### 4. Privacy Policy & Terms of Service
**Status:** ✅ Complete and deployed

**Files Added:**
- `src/components/PrivacyPage.jsx` (NEW)
- `src/components/TermsPage.jsx` (NEW)

**Files Modified:**
- `src/components/LandingPage.jsx` - Updated footer with copyright and legal links
- `src/App.jsx` - Added `/privacy` and `/terms` routes

**Features:**
- Full legal compliance for SMS, data collection, AI processing
- Content usage rights for marketing and leaderboards
- Clear opt-in/opt-out language
- Mobile-responsive design matching game aesthetic
- Back to Home links
- Email contacts: `support@oneupper.app`

**Key Legal Points:**
- Users retain ownership of answers
- Grant license for promotional use, leaderboards, marketing
- Can request removal of attributed content
- SMS opt-in required (TCPA compliant)
- AI judging disclosure
- Children under 13 not permitted

---

### 5. Email Routing via Cloudflare
**Status:** ✅ Complete and active

**Setup:**
- Domain moved from DirectNIC nameservers to Cloudflare
- Email Routing enabled (free)
- Two forwards configured:
  - `hello@oneupper.app` → personal email
  - `support@oneupper.app` → personal email

**Benefits:**
- Free unlimited email forwarding
- Better spam filtering
- Easy to manage
- CDN and security benefits for main site

---

### 6. Twilio SMS Configuration
**Status:** ⏳ Waiting for A2P 10DLC approval

**Progress:**
- ✅ Twilio account created
- ✅ Phone number purchased: `+12406638746`
- ✅ Messaging Service created: "Sole Proprietor A2P Messaging Service"
- ✅ Phone number linked to service
- ⏳ A2P 10DLC registration submitted
- ⏳ Waiting for carrier approval (1-7 days typical)

**Sample Messages Submitted to Twilio:**
1. "Your turn! Craig just answered. Don't leave them hanging 🎤"
2. "The judges have spoken! See who won 🏆"
3. "Craig nudged you. Time to get back in the game!"
4. "Craig cancelled your Rivalry. History saved! 📊"

**Next Steps After Approval:**
1. Add Twilio credentials to Supabase Edge Functions
2. Set `SMS_ENABLED = true` in send-sms function
3. Deploy updated function
4. Test with real phone numbers
5. Monitor for issues

---

## SMS Notification System (In Progress)

### Architecture

**Flow:**
1. Game event triggers (e.g., opponent submits answer)
2. Frontend calls `supabase.functions.invoke('send-sms', { ... })`
3. Edge function checks `sms_consent` in database
4. If `true`, sends SMS via Twilio
5. If `false`, logs suppression and returns `{ reason: 'no_consent' }`

**Kill Switch:**
- Global toggle in Edge Function: `SMS_ENABLED`
- Set to `false` for testing/emergency shutoff
- Set to `true` for production

**Test Mode:**
- Activates when Twilio credentials not present
- Logs what would be sent to console
- Returns `{ testMode: true }` with message preview
- Perfect for development

---

### Notification Triggers (To Be Implemented)

**1. your_turn**
- **When:** Opponent submits answer, you haven't yet
- **Who:** Player who hasn't submitted
- **Frequency:** Once per show when opponent completes

**2. verdict_ready**
- **When:** AI judging completes
- **Who:** Both players (or only player who hasn't viewed - TBD)
- **Frequency:** Once per show when verdict ready

**3. nudge**
- **When:** Player manually clicks "Nudge" button
- **Who:** Opponent
- **Frequency:** Rate-limited (e.g., max 1 per hour)
- **Implementation:** TBD (button in Screen4 menu or as standalone feature)

**4. rivalry_cancelled**
- **When:** One player cancels rivalry
- **Who:** The other player
- **Frequency:** Once when cancellation occurs

---

### Backup Plan: Manual SMS via Device

**Concept:** If Twilio fails or user prefers, offer "Nudge via Text" button

**Implementation:**
```javascript
const handleManualNudge = () => {
  const message = encodeURIComponent(
    `Your turn! I just answered in our One-Upper show 🎤 ${window.location.origin}/join/${rivalry.code}`
  );
  window.location.href = `sms:${opponentPhone}?body=${message}`;
};
```

**Benefits:**
- Works immediately (no Twilio needed)
- User controls when to send
- No costs
- Familiar UX
- Can't be abused (manual action required)

**Placement Ideas:**
- "Nudge [Name]" in Screen4 menu
- "Remind Them" button when waiting on opponent
- Always available as backup to auto-SMS

---

## Legal & Compliance

### Email Addresses
- **General Contact:** `hello@oneupper.app`
- **Privacy/Legal:** `support@oneupper.app`
- Both forward via Cloudflare Email Routing (free)

### Privacy Policy
- **Location:** `/privacy` route
- **File:** `src/components/PrivacyPage.jsx`
- **Covers:** Data collection, SMS consent, AI processing, user rights, data sharing

### Terms of Service
- **Location:** `/terms` route
- **File:** `src/components/TermsPage.jsx`
- **Covers:** Game rules, content rights, SMS terms, liability, disputes

### Key Compliance Points
- ✅ TCPA compliance (SMS opt-in required)
- ✅ Twilio requirements (STOP keyword, clear disclosure)
- ✅ Children's privacy (13+ only)
- ✅ Data retention policy
- ✅ Content usage rights (marketing, leaderboards)
- ✅ AI processing disclosure

### Trademark
- **Name:** One-Upper™
- **Logo:** Uploaded to `/public/logo.png`
- **Copyright:** © 2025 One-Upper™. All rights reserved.

---

## Next Priorities

### 1. Complete SMS System (HIGH PRIORITY)
**Waiting on:**
- ⏳ Twilio A2P 10DLC approval (in progress)

**After approval:**
- [ ] Add Twilio credentials to Supabase
- [ ] Deploy updated send-sms function
- [ ] Set `SMS_ENABLED = true`
- [ ] Add SMS trigger calls to gameplay code (Screen4, judge-show)
- [ ] Test all notification types
- [ ] Monitor delivery rates and costs
- [ ] Consider manual nudge buttons as backup

**Decisions to make:**
- When to trigger `verdict_ready` (both players? only unviewed?)
- Nudge button placement and rate limiting
- Manual SMS backup implementation priority

---

### 2. Enhanced Account Security (MEDIUM PRIORITY)

**Current:** Profile codes only (no passwords)

**Issues:**
- Anyone with code can access profile
- No email verification
- Phone recovery is only safeguard

**Options to explore:**

**A. Magic Link Authentication**
- Email-based passwordless login
- More secure than profile codes
- Requires email collection
- Better UX for returning users

**B. Phone Number Verification**
- SMS verification code on signup
- Confirms phone ownership
- Adds friction but increases security

**C. Optional Password**
- Keep codes for easy entry
- Add optional password for added security
- Best of both worlds?

**D. Session Management**
- Currently: localStorage only
- Consider: JWT tokens, refresh tokens
- Better cross-device experience

**Recommendation:** Evaluate Magic Link first (best balance of security + UX)

---

### 3. Database & Server Security Audit (MEDIUM PRIORITY)

**Current security:**
- Supabase handles most security
- Row Level Security (RLS) policies: Unknown/to be verified
- API keys: Anon key is public (expected)
- Service role key: Server-side only (good)

**To audit:**
- [ ] Review Supabase RLS policies on all tables
- [ ] Ensure users can't access others' data
- [ ] Verify Edge Functions use service role key appropriately
- [ ] Check for SQL injection vulnerabilities
- [ ] Validate input on all Edge Functions
- [ ] Review CORS settings
- [ ] Audit environment variable security

**Tables to review:**
- `profiles` - Can users see others' phone numbers?
- `rivalries` - Can users access rivalries they're not in?
- `shows` - Can users see shows from other rivalries?
- `prompts` - Read-only access ok
- `judges` - Read-only access ok

**Recommendations:**
- Enable RLS on all tables
- Write policies: users can only access their own data
- Test with multiple accounts
- Consider security audit service

---

### 4. Gameplay Enhancements (ONGOING)

**Ideas to explore:**

**A. Expanded Multiplayer**
- 3-4 player shows (more chaos, more fun)
- Team mode (2v2)
- Tournament brackets
- Seasonal competitions

**B. Engagement Features**
- Win streaks with celebrations
- Leaderboards (global, friends)
- Achievements/badges
- Rivalry nicknames
- Custom prompts (user-generated)

**C. Monetization**
- Premium judges ($0.99 unlock)
- Custom prompts ($1.99/mo subscription)
- Ad-free experience ($2.99/mo)
- Rivalry history export (PDF, $0.99)
- Sponsored shows (brand partnerships)

**D. Rich Media**
- Voice submissions (record audio answers)
- Drawing tools (visual responses)
- Photo uploads (image-based prompts)
- GIF reactions

**E. Social Features**
- Answer of the week showcases
- Share verdicts to social media
- "Best of" collections
- Judge spotlight features

**F. Quality of Life**
- Profile photos (upload custom avatar)
- Dark/light mode toggle
- Notification preferences (granular SMS controls)
- In-app nudge history ("You nudged them 2h ago")
- Show rematch button

**G. Analytics & Insights**
- Player stats dashboard
- Judge compatibility scores
- Answer style analysis
- Rivalry insights ("You win more when...")

---

### 5. Content Moderation (LOW PRIORITY FOR NOW)

**Current:** No moderation system

**Future needs:**
- Automated content filtering (hate speech, profanity)
- User reporting system
- Admin review panel
- Banned word list
- Appeal process

**When to implement:** After user base grows

---

## File Structure Reference

```
one-upper/
├── public/
│   └── logo.png                              ← One-Upper logo
├── src/
│   ├── components/
│   │   ├── Header.jsx                        ← Shared header component
│   │   ├── HowToPlayModal.jsx                ← NEW: How to Play modal
│   │   ├── JoinRivalry.jsx                   ← Deep link handler
│   │   ├── LandingPage.jsx                   ← UPDATED: Footer with legal links
│   │   ├── PrivacyPage.jsx                   ← NEW: Privacy Policy page
│   │   ├── Screen1.jsx                       ← UPDATED: SMS consent + How to Play
│   │   ├── Screen2.jsx                       ← UPDATED: SMS consent in edit/create
│   │   ├── Screen4.jsx                       ← UPDATED: How to Play menu item
│   │   ├── Screen6.jsx                       ← Show history viewer
│   │   └── TermsPage.jsx                     ← NEW: Terms of Service page
│   ├── lib/
│   │   └── supabase.js                       ← Supabase client
│   ├── utils/
│   │   ├── codeGenerator.js                  ← Profile code generation
│   │   ├── phoneUtils.js                     ← Phone validation/normalization
│   │   └── prompts.js                        ← Judge personalities + prompts
│   ├── App.jsx                               ← UPDATED: Added /privacy, /terms routes
│   └── main.jsx                              ← Vite entry point
├── supabase/
│   └── functions/
│       ├── judge-show/
│       │   └── index.ts                      ← AI judging logic
│       └── send-sms/
│           └── index.ts                      ← UPDATED: SMS with consent checking
└── package.json
```

---

## Key Technical Details

### Database Schema

**profiles**
```sql
- id (uuid, primary key)
- code (text, unique) - ADJECTIVE-NOUN-####
- name (text)
- avatar (text) - emoji
- phone (text) - 10 digits normalized
- bio (text, nullable)
- sms_consent (boolean, default false) ← NEW
- created_at (timestamptz)
```

**rivalries**
```sql
- id (uuid, primary key)
- profile_a_id (uuid, foreign key)
- profile_b_id (uuid, foreign key)
- mic_holder_id (uuid, foreign key)
- first_show_started (boolean)
- created_at (timestamptz)
```

**shows**
```sql
- id (uuid, primary key)
- rivalry_id (uuid, foreign key)
- show_number (integer)
- prompt_id (integer)
- prompt (text)
- judges (text[]) - array of judge keys
- profile_a_id (uuid)
- profile_b_id (uuid)
- player1_answer (text, nullable)
- player2_answer (text, nullable)
- judged_at (timestamptz, nullable)
- verdict (jsonb, nullable)
- status (text) - 'waiting', 'judging', 'complete'
- created_at (timestamptz)
```

**Future schema additions to consider:**
```sql
-- For verdict view tracking
ALTER TABLE shows ADD COLUMN player1_viewed_verdict BOOLEAN DEFAULT FALSE;
ALTER TABLE shows ADD COLUMN player2_viewed_verdict BOOLEAN DEFAULT FALSE;
ALTER TABLE shows ADD COLUMN player1_viewed_at TIMESTAMPTZ;
ALTER TABLE shows ADD COLUMN player2_viewed_at TIMESTAMPTZ;

-- For nudge rate limiting
ALTER TABLE shows ADD COLUMN first_submitter_id UUID;
ALTER TABLE shows ADD COLUMN last_nudge_at TIMESTAMPTZ;
```

---

### Phone Number Format

**Input formats accepted:**
- `415-555-1234`
- `(415) 555-1234`
- `4155551234`
- `+14155551234`
- `1-415-555-1234`

**Stored format:**
- Always 10 digits: `4155551234`
- No country code, dashes, or spaces

**Validation:**
- Must be exactly 10 digits after normalization
- US numbers only

---

### SMS Message Templates

**Stored in:** `supabase/functions/send-sms/index.ts`

**Format:**
- 4 variations per notification type
- Dynamic placeholders: `{opponent}`, `{show_num}`, `{prompt}`
- Prompt truncated to 50 chars if needed
- URL: `https://oneupper.app`

**Example:**
```
⏰ Craig just answered! Your turn in Show #3: "Best pizza topping?" - https://oneupper.app
```

---

## Testing Procedures

### Test SMS Consent System

**Test 1: Create profile with consent**
1. Create new profile
2. Check SMS consent checkbox
3. Submit
4. Verify: Supabase shows `sms_consent = true`

**Test 2: Create profile without consent**
1. Create new profile
2. Leave SMS consent unchecked
3. Submit
4. Verify: Supabase shows `sms_consent = false`

**Test 3: Edit profile to enable SMS**
1. Edit existing profile
2. Check SMS consent checkbox
3. Save
4. Verify: Supabase shows `sms_consent = true`

**Test 4: Edit profile to disable SMS**
1. Edit profile with SMS enabled
2. Uncheck SMS consent checkbox
3. Save
4. Verify: Supabase shows `sms_consent = false`

**Test 5: Edge Function consent checking**
1. Call send-sms function for user with `sms_consent = false`
2. Verify: Returns `{ success: false, reason: 'no_consent' }`
3. Verify: No SMS sent
4. Check logs: See suppression message

---

### Test Privacy & Terms Pages

**Test 1: Landing page footer**
1. Go to `/`
2. Scroll to bottom
3. Verify: Copyright line present
4. Verify: Privacy Policy link present
5. Verify: Terms of Service link present
6. Verify: Email shows `hello@oneupper.app`

**Test 2: Privacy Policy page**
1. Click "Privacy Policy" link
2. Verify: Page loads at `/privacy`
3. Verify: Content displays correctly
4. Verify: "Back to Home" link works
5. Verify: Mobile responsive

**Test 3: Terms of Service page**
1. Click "Terms of Service" link
2. Verify: Page loads at `/terms`
3. Verify: Content displays correctly
4. Verify: "Back to Home" link works
5. Verify: Link to Privacy Policy works
6. Verify: Mobile responsive

---

### Test Email Forwarding

**Test 1: hello@oneupper.app**
1. Send email to `hello@oneupper.app`
2. Check personal email inbox
3. Verify: Email arrives within seconds

**Test 2: support@oneupper.app**
1. Send email to `support@oneupper.app`
2. Check personal email inbox
3. Verify: Email arrives within seconds

---

### Test How to Play Modal

**Test 1: Screen1 - State B**
1. Create profile (State B)
2. Click ⋮ menu
3. Click "How to Play"
4. Verify: Modal appears
5. Click "Got It!"
6. Verify: Modal closes

**Test 2: Screen1 - State C**
1. Create rivalry (State C)
2. Click ⋮ menu
3. Click "How to Play"
4. Verify: Modal appears

**Test 3: Screen4**
1. In active game
2. Click ⋮ menu
3. Click "How to Play"
4. Verify: Modal appears

---

## Development Workflow

### Local Development
```bash
npm install
npm run dev
# Access at http://localhost:5173
```

### Deploy to Vercel
```bash
git add .
git commit -m "Description"
git push
# Vercel auto-deploys
```

### Supabase Edge Functions
```bash
# Deploy function
supabase functions deploy send-sms

# View logs
supabase functions logs send-sms

# Test locally
supabase functions serve send-sms
```

### Database Migrations
```bash
# Create migration
supabase migration new migration_name

# Apply migrations
supabase db push
```

---

## Environment Configuration

### Frontend (.env)
```bash
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Supabase Edge Functions
Set via Supabase Dashboard → Edge Functions → Settings → Secrets:
- `ANTHROPIC_API_KEY` ✅ Set
- `TWILIO_ACCOUNT_SID` ⏳ Pending A2P approval
- `TWILIO_AUTH_TOKEN` ⏳ Pending A2P approval
- `TWILIO_PHONE_NUMBER` ⏳ Pending A2P approval

---

## Contact & Resources

**Live Site:** https://oneupper.app  
**Domain Registrar:** DirectNIC (DNS via Cloudflare)  
**Hosting:** Vercel  
**Database:** Supabase  
**Email:** Cloudflare Email Routing  
**SMS:** Twilio (pending A2P approval)  
**AI Model:** Claude Sonnet 4 via Anthropic API

**Key Contacts:**
- General: `hello@oneupper.app`
- Privacy/Legal: `support@oneupper.app`

---

## Summary of Session (November 21, 2024)

### Completed
1. ✅ How to Play modal added to Screen1 and Screen4
2. ✅ SMS consent system (database + UI + Edge Function)
3. ✅ Privacy Policy and Terms of Service pages
4. ✅ Landing page footer updated with legal links
5. ✅ Email forwarding configured via Cloudflare
6. ✅ Twilio messaging service configured
7. ✅ A2P 10DLC registration submitted
8. ✅ send-sms Edge Function with consent checking

### In Progress
- ⏳ Waiting for Twilio A2P 10DLC approval (1-7 days)

### Next Session Focus
1. **Complete SMS implementation** (after A2P approval)
2. **Explore Magic Link authentication** for better security
3. **Database security audit** (RLS policies)
4. **Gameplay enhancements** (win streaks, leaderboards, etc.)
5. **Manual SMS nudge buttons** as Twilio backup

---

**End of Handoff Document**  
**Version:** 3.0  
**Date:** November 21, 2024
