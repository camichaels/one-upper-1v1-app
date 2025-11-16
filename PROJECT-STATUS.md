# One-Upper Project Status - Complete Handoff

**Last Updated:** November 16, 2025  
**Status:** ✅ Database setup complete, ready to build features  
**Current Phase:** Beginning Screen 1 development

---

## QUICK START (For New Chat)

**I'm building One-Upper, a 1v1 async AI-judged creative duel game.**

**Tech Stack:**
- Frontend: React + Vite + Tailwind CSS
- Database: Supabase (Postgres)
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- Hosting: Vercel
- SMS: Twilio (future)

**Current State:**
- ✅ Database schema created (6 tables)
- ✅ 25 judges loaded
- ✅ 100 prompts loaded
- ✅ Supabase connection working
- ✅ Test page shows data correctly
- ⏳ Ready to build Screen 1

**Project Location:** `~/Code/one-upper-1v1-app`

---

## COMPLETED SETUP

### 1. Database (Supabase)

**Tables Created:**
```sql
profiles       -- User accounts with unique codes
rivalries      -- 1v1 connections between players
shows          -- Individual rounds
judges         -- Pool of 25 AI judge personalities
prompts        -- Library of 100+ creative prompts
invites        -- Pre-rivalry invitation tracking
```

**Data Loaded:**
- ✅ 25 judges (Savage, Riley, Snoot, Coach, Wildcard, Diva, GLiTCH, Zorp, etc.)
- ✅ 100 prompts (20 absurd, 20 clever, 15 personal, 15 creative, 10 roast, 10 topical, 10 wildcard)

**Database Schema File:** See `SCHEMA.sql` (attached below)

### 2. Environment Setup

**`.env.local` (in root, gitignored):**
```bash
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc... (long key)
```

**Dependencies Installed:**
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "@supabase/supabase-js": "^2.x"
  },
  "devDependencies": {
    "tailwindcss": "^3.x",
    "vite": "^5.x"
  }
}
```

### 3. Project Structure
```
one-upper-1v1-app/
├── .env.local              (Supabase credentials)
├── src/
│   ├── App.jsx             (Current: database test page)
│   ├── main.jsx            (Entry point)
│   ├── index.css           (Tailwind imports)
│   ├── components/         (Empty - ready for Screen components)
│   ├── lib/                (Empty - will have helper functions)
│   └── utils/              (Empty - will have utilities)
├── public/
│   └── api/                (Empty - for Vercel functions)
├── package.json
├── tailwind.config.js
└── vite.config.js
```

### 4. Key Files Content

**`src/App.jsx` (Current test page):**
- Imports Supabase client inline (not from separate file due to import issues)
- Fetches 5 prompts and all judges
- Shows 3 random judges to simulate game
- Has "Pick 3 Different Random Judges" button

**`src/index.css`:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`tailwind.config.js`:**
```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

---

## IMPORTANT GOTCHAS & FIXES

### Issue 1: Supabase Import Error
**Problem:** `import { supabase } from './lib/supabase'` caused binding errors  
**Solution:** Create Supabase client inline in each file that needs it:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Future:** Once Screen 1 works, we can debug the shared supabase.js file

### Issue 2: Tailwind v4 Incompatibility
**Solution:** Downgraded to Tailwind v3:
```bash
npm install -D tailwindcss@3 postcss autoprefixer
```

### Issue 3: Environment Variables Not Loading
**Solution:** Must restart dev server after editing `.env.local`:
```bash
# Ctrl+C to stop
npm run dev
```

### Issue 4: Browser Caching Old Code
**Solution:** Hard refresh with `Cmd + Shift + R` or clear cache

---

## DESIGN DECISIONS MADE

### Game Flow
- **Profile creation:** Unique code per profile (e.g., CRAIG-X7K9)
- **Start rivalry:** Share code with friend
- **Shows:** Continuous loop, auto-advance after 5-second countdown
- **Judges:** 3 random from pool of 25 per Show
- **Prompts:** Random from database, avoid last 20 used
- **Golden Mic:** Tracked in `rivalries.mic_holder_id`

### Data Storage
- **Judges:** In database (not JavaScript constants)
- **Prompts:** In database (not JSON file)
- **Judge selection:** Store keys array in `shows.judges` (e.g., `['savage', 'riley', 'wildcard']`)
- **Prompt reference:** Store `prompt_id` + cache `prompt` text in shows table

### Technical Choices
- **No separate lib/supabase.js** (due to import issues - inline for now)
- **Tailwind v3** (not v4 - compatibility)
- **Mobile-first web app** (not native)
- **1 Rivalry per player** (MVP - multiple rivalries is future)

---

## JUDGE PROMPT (Production-Ready)

**Tested with 3 scenarios, all passed. Template ready to use.**

**Template Variables:**
- `{PROMPT_TEXT}` - Show prompt
- `{PLAYER_A_NAME}` / `{PLAYER_A_ANSWER}`
- `{PLAYER_B_NAME}` / `{PLAYER_B_ANSWER}`  
- `{JUDGE_1_NAME}` / `{JUDGE_1_EMOJI}` / `{JUDGE_1_DESCRIPTION}` / `{JUDGE_1_EXAMPLES}`
- (Repeat for JUDGE_2, JUDGE_3)

**Test Results:**
- Test 1: Decisive win (Sam 27, Craig 9) ✅
- Test 2: Close call (Craig 25, Sam 21) ✅
- Test 3: Moderate win with Wildcard (Craig 22, Sam 18) ✅

**Key Findings:**
- "Under 12 words" constraint works perfectly
- Wildcard adds unpredictability without breaking game
- Banter feels natural ("Your grandma is psychologically preparing you for the void")
- JSON always valid

**Cost:** ~$0.006 per Show (0.6 cents)

**Full prompt template:** See `JUDGE_PROMPT_TEMPLATE.txt` (attached below)

---

## SCREEN SPECIFICATIONS (Ready to Build)

### Screen 1: Entry Point (Smart Router)
**States:**
- **State A:** Create Profile (first-time user)
- **State B:** Start/Join Rivalry (has profile, no rivalry)
- **State C:** Rivalry Started (transition, shown once)

**Routing Logic:**
```javascript
if (!profile) → State A
if (profile && !rivalry) → State B
if (profile && rivalry && !first_show_started) → State C
if (profile && rivalry && first_show_started) → Screen 4
```

### Screen 4: Active Show
**States:**
- **State A:** Your turn (submit answer)
- **State B:** Waiting (opponent hasn't answered)
- **State C:** Verdict (both answered, winner declared)

**Features:**
- Auto-advance countdown (5 seconds)
- Previous Shows section (last 10, load more)
- Golden Mic display
- 30-word cap with live counter

### Screen 2: Profile Management
- View all profiles
- Edit/delete profiles
- Switch between profiles
- Card-based layout

### Screen 6: Show History Detail
- View past Show with full judge commentary
- Tap from Previous Shows list

**Full screen specs:** See `SCREEN_SPECIFICATIONS.md` (you already have this)

---

## NEXT STEPS (In Order)

### Step 1: Build Screen 1 State A (Profile Creation)
**Files to create:**
- `src/components/Screen1.jsx`
- `src/utils/codeGenerator.js`

**What it does:**
1. Generate unique code (e.g., CRAIG-X7K9)
2. Create profile in database
3. Show code to user
4. Transition to State B

**Estimated time:** 2-3 hours

### Step 2: Build Screen 1 State B (Start/Join Rivalry)
**What it does:**
1. Show user their code
2. "Share Code" button (copy to clipboard)
3. "Join Friend" input (enter friend's code)
4. Create rivalry in database
5. Transition to State C

**Estimated time:** 2-3 hours

### Step 3: Build Screen 1 State C (Rivalry Started)
**What it does:**
1. Show "Rivalry Started!" message
2. Show both players' names
3. Set `first_show_started = true` in database
4. Auto-redirect to Screen 4

**Estimated time:** 1 hour

### Step 4: Build Screen 4 (Active Show)
**What it does:**
1. Load or create Show
2. Display prompt
3. Submit answer (30-word cap)
4. Wait for opponent
5. Call judge API
6. Show verdict
7. Auto-advance

**Estimated time:** 8-10 hours

---

## USEFUL CODE SNIPPETS

### Generate Unique Profile Code
```javascript
function generateCode() {
  const adjectives = ['HAPPY', 'SILLY', 'WILD', 'MEGA', 'SUPER'];
  const nouns = ['TIGER', 'EAGLE', 'NINJA', 'WIZARD', 'ROBOT'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${adj}-${noun}-${num}`;
}
```

### Create Profile
```javascript
const { data: profile, error } = await supabase
  .from('profiles')
  .insert({
    code: generateCode(),
    name: userName,
    avatar: '😎'
  })
  .select()
  .single();
```

### Start Rivalry
```javascript
// Find friend by code
const { data: friend } = await supabase
  .from('profiles')
  .select('id')
  .eq('code', friendCode)
  .single();

// Create rivalry
const { data: rivalry } = await supabase
  .from('rivalries')
  .insert({
    profile_a_id: myProfileId,
    profile_b_id: friend.id,
    mic_holder_id: myProfileId  // Default to creator
  })
  .select()
  .single();
```

### Get Random Prompt
```javascript
const { data: prompts } = await supabase
  .from('prompts')
  .select('*')
  .eq('is_active', true);

const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
```

### Select 3 Random Judges
```javascript
const { data: allJudges } = await supabase
  .from('judges')
  .select('key')
  .eq('is_active', true);

const shuffled = [...allJudges].sort(() => 0.5 - Math.random());
const selectedKeys = shuffled.slice(0, 3).map(j => j.key);
// Returns: ['savage', 'riley', 'wildcard']
```

---

## COSTS (Monthly Estimates)

**For 100 active users:**

| Service | Usage | Cost |
|---------|-------|------|
| Supabase | Free tier | $0 |
| Vercel | Free tier | $0 |
| Anthropic | 500 Shows × $0.006 | $3 |
| Twilio SMS | 1,000 × $0.008 | $8 |
| **Total** | | **$11** |

**Very affordable for MVP testing.**

---

## FILES TO ATTACH TO NEW CHAT

1. **This document** (`PROJECT_STATUS.md`)
2. **Database schema** (`SCHEMA.sql`) - see below
3. **Screen specifications** (you already have `SCREEN_SPECIFICATIONS.md`)
4. **Exec summary** (you already have this)
5. **Judge prompt template** (`JUDGE_PROMPT_TEMPLATE.txt`) - see below

---

## QUESTIONS FOR NEW CHAT

**When starting new chat, provide:**

1. This PROJECT_STATUS.md document
2. What you're working on: "I'm building Screen 1 State A"
3. Any specific error or question

**Opening message template:**
```
Hi! I'm building One-Upper (1v1 async AI-judged creative duel game).

Setup is complete:
- ✅ Database with 25 judges + 100 prompts
- ✅ React + Tailwind + Supabase working
- ✅ Test page showing data correctly

I'm ready to build Screen 1 (Profile Creation).

[Attach PROJECT_STATUS.md]

Question: [your specific question]
```

---

## CONTACT INFO / CREDENTIALS

**Supabase Project:**
- URL: [in .env.local]
- Dashboard: https://supabase.com/dashboard/project/[project-id]

**GitHub:** (not set up yet)

**Vercel:** (not deployed yet)

---

## CRITICAL REMINDERS

1. **Always restart dev server** after editing `.env.local`
2. **Hard refresh browser** (`Cmd + Shift + R`) if seeing old code
3. **Create Supabase client inline** (don't import from lib/supabase.js for now)
4. **Use Tailwind v3** (not v4)
5. **Judge keys are strings** in shows.judges array
6. **Golden Mic tracked** in rivalries.mic_holder_id

---

**END OF PROJECT STATUS**