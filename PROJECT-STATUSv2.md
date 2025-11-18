# One-Upper - Session Handoff Document

## Project Overview

**One-Upper** is a 1v1 async competitive game where players submit escalating responses to prompts and receive scores from AI judge personalities. The core innovation transforms the socially problematic behavior of "one-upping" into structured competitive entertainment.

### Tech Stack
- **Frontend:** React + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + real-time subscriptions)
- **Deployment:** Vercel (planned)
- **Domain:** oneupper.app (owned, not yet deployed)

### Current Implementation
- Simplified 1v1 format (moved away from complex 3-8 player version)
- Mobile-first design with dark gradient theme (slate colors, orange accents)
- Real-time multiplayer using Supabase subscriptions
- Profile management with unique codes (ADJECTIVE-NOUN-#### format)
- localStorage for profile persistence + "Resume with Code" for cross-device access

---

## Complete Working Screens

### Screen 1 - Profile Creation & Rivalry Management
**File:** `src/components/Screen1.jsx`

**States:**
- **State A:** Create profile or resume with code
- **State B:** Share code or join rivalry
- **State C:** Rivalry started - either player can start first show

**Key Features:**
- Generate unique codes (e.g., HAPPY-TIGER-1234)
- Real-time subscription for first show creation (auto-navigates to Screen 4)
- No artificial delays when rivalry starts
- Menu: Switch Profile, Edit Profile, Cancel Rivalry

### Screen 2 - Profile Management
**File:** `src/components/Screen2.jsx`

**Features:**
- View all profiles with rivalry status
- Create new profiles
- Edit existing profiles (name, avatar, phone, bio)
- Delete profiles (automatically cleans up rivalries)
- Switch between profiles
- Shows active profile indicator
- Modal confirmation for deletions

### Screen 4 - Main Gameplay Loop
**File:** `src/components/Screen4.jsx`

**Three States:**
- **State A (Your Turn):** Submit answer (30-word limit enforced)
- **State B (Waiting):** Show "waiting for opponent" with nudge option
- **State C (Verdict):** Display winner, both answers, judge scores, banter

**Key Features:**
- Real-time show updates via Supabase subscriptions
- Real-time rivalry deletion detection (auto-navigates to Screen 1)
- Auto-advance countdown (10 seconds) with "STAY HERE" option
- Judge profile modal (clickable judge buttons at top)
- Judge scores show BOTH players' scores (verbose format)
- Judge banter toggle (expandable)
- Previous shows list (last 10)
- Menu: Switch Profile, Edit Profile, Cancel Rivalry
- Better cancel rivalry modal (matches Screen 2 style)

**Judging (Currently Simulated):**
- Random winner selection
- Generates both player scores (winner: 7-9, loser: 4-6)
- Uses actual judge keys from database
- Stores: `profile_a_score`, `profile_b_score`, `comment`
- Judge banter uses judge keys (names looked up on display)

### Screen 6 - Show History Detail
**File:** `src/components/Screen6.jsx`

**Features:**
- Read-only verdict display for past shows
- Shows both answers with winner highlighted
- Judge scores (both players shown)
- Judge banter (expandable)
- Judge profile modal (clickable judges at top)
- Back to Game button

### App.jsx
**File:** `src/App.jsx`

**Routes:**
- screen1 (default)
- screen2 (profile management)
- screen4 (gameplay)
- screen6 (show history detail)

**Navigation params:**
- `editProfileId` - For editing specific profile
- `activeProfileId` - Current playing profile
- `rivalryId` - Active rivalry
- `showId` - For viewing show history

---

## Database Structure

### Profiles Table
```sql
- id (uuid, PK)
- code (text, unique) - Format: ADJECTIVE-NOUN-####
- name (text)
- avatar (text) - Emoji
- phone (text, optional)
- bio (text, optional)
- created_at (timestamp)
```

### Rivalries Table
```sql
- id (uuid, PK)
- profile_a_id (uuid, FK → profiles)
- profile_b_id (uuid, FK → profiles)
- mic_holder_id (uuid, FK → profiles) - Current winner
- first_show_started (boolean)
- status (text) - Default: 'active'
- created_at (timestamp)
```

### Shows Table
```sql
- id (uuid, PK)
- rivalry_id (uuid, FK → rivalries)
- show_number (integer)
- prompt_id (integer, FK → prompts)
- prompt (text) - Denormalized for speed
- judges (text[]) - Array of judge keys: ['glitch', 'diva', 'wildcard']
- profile_a_id (uuid, FK → profiles)
- profile_b_id (uuid, FK → profiles)
- profile_a_answer (text)
- profile_b_answer (text)
- profile_a_submitted_at (timestamp)
- profile_b_submitted_at (timestamp)
- status (text) - 'waiting', 'judging', 'complete'
- winner_id (uuid, FK → profiles)
- judge_data (jsonb) - See structure below
- judged_at (timestamp)
- created_at (timestamp)
```

**judge_data structure:**
```json
{
  "verdict": "Player A won!",
  "scores": {
    "glitch": {
      "profile_a_score": 8,
      "profile_b_score": 6,
      "comment": "Nice one!"
    },
    "diva": {
      "profile_a_score": 7,
      "profile_b_score": 5,
      "comment": "Pretty good"
    },
    "wildcard": {
      "profile_a_score": 8,
      "profile_b_score": 7,
      "comment": "Close call!"
    }
  },
  "banter": [
    {
      "judge": "glitch",  // Judge KEY, not name
      "text": "That was intense!"
    },
    {
      "judge": "diva",
      "text": "I actually liked it!"
    }
  ]
}
```

### Prompts Table (100 prompts)
```sql
- id (integer, PK)
- text (text) - The prompt
- category (text)
- is_active (boolean)
- created_at (timestamp)
```

### Judges Table (50 judges)
```sql
- id (integer, PK)
- key (text) - e.g., 'glitch', 'diva', 'wildcard'
- name (text) - Display name
- emoji (text) - Judge emoji
- description (text) - Personality/bias
- examples (text) - One-liners separated by "|"
- is_active (boolean)
- created_at (timestamp)
```

---

## Design System

### Colors
- **Background:** `bg-gradient-to-br from-slate-900 to-slate-800`
- **Text:** 
  - Primary: `text-slate-100`
  - Secondary: `text-slate-200`, `text-slate-300`
  - Tertiary: `text-slate-400`
- **Orange accent:** `text-orange-500`, `bg-orange-500`
- **Borders:** `border-slate-600`

### Components

**Inputs/Textareas:**
```jsx
className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
```

**Buttons:**
```jsx
// Primary
className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"

// Secondary
className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-600 text-slate-200 transition-colors"
```

**Dropdowns/Modals:**
```jsx
// Menu dropdown
className="absolute right-0 top-8 bg-slate-700 border border-slate-600 rounded-lg shadow-lg py-2 w-48 z-20"

// Modal backdrop
className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"

// Modal content
className="bg-slate-800 border-2 border-slate-600 rounded-lg p-6 max-w-md w-full"
```

**Judge Buttons (at top of screen):**
```jsx
className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-full text-slate-200 hover:bg-slate-600 hover:border-orange-500/50 transition-all text-sm"
```

---

## Key Utilities

### Code Generator
**File:** `src/utils/codeGenerator.js`
- Generates format: `ADJECTIVE-NOUN-####`
- Example: `HAPPY-TIGER-1234`

### Prompts/Judges Utilities
**File:** `src/utils/prompts.js`
- `getRandomPrompt()` - Fetches random active prompt from DB
- `selectJudges()` - Randomly selects 3 active judges from DB

### Supabase Client
**File:** `src/lib/supabase.js`
- Shared Supabase client instance
- Used for all database operations and real-time subscriptions

---

## Critical Implementation Details

### Real-Time Subscriptions

**Screen 1 - First Show Creation:**
```javascript
// Listens for when opponent creates first show
supabase
  .channel('first-show-creation')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'shows',
    filter: `rivalry_id=eq.${rivalry.id}`
  }, (payload) => {
    onNavigate('screen4', { activeProfileId, rivalryId });
  })
```

**Screen 4 - Show Updates:**
```javascript
// Listens for show status changes (opponent submits, judging complete)
supabase
  .channel(`show-${currentShow.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'shows',
    filter: `id=eq.${currentShow.id}`
  }, (payload) => {
    setCurrentShow(payload.new);
  })
```

**Screen 4 - Rivalry Deletion:**
```javascript
// Listens for when opponent cancels rivalry
supabase
  .channel(`rivalry-deletion-${rivalryId}`)
  .on('postgres_changes', {
    event: 'DELETE',
    schema: 'public',
    table: 'rivalries',
    filter: `id=eq.${rivalryId}`
  }, (payload) => {
    alert('Rivalry Ended\n\nYour opponent cancelled...');
    onNavigate('screen1');
  })
```

### 409 Conflict Handling (createNextShow)
**Problem:** Both players advance at same time, both try to create show #2
**Solution:**
1. Check if show already exists
2. If yes, load it
3. If no, try to create
4. If create fails (409), fetch the one other player created

### Judge Profiles Display
- **Top of screen:** Clickable judge buttons (opens modal)
- **Scores section:** Static text with emoji/name (NOT clickable)
- **Modal parsing:** One-liners separated by commas are split into individual lines

---

## What's NOT Built Yet

### 1. AI Judging Backend (NEXT PRIORITY)
**File:** `judge-prompt-template.txt` (template exists)

**Needs:**
- Backend API endpoint (or Edge Function)
- Call Claude API with prompt template
- Parse JSON response
- Update `shows.judge_data` with real scores
- Update `shows.winner_id`
- Update `rivalries.mic_holder_id`

**Template placeholders:**
- `{PROMPT_TEXT}`
- `{PLAYER_A_NAME}`, `{PLAYER_A_ANSWER}`
- `{PLAYER_B_NAME}`, `{PLAYER_B_ANSWER}`
- `{JUDGE_X_NAME}`, `{JUDGE_X_EMOJI}`, `{JUDGE_X_DESCRIPTION}`, `{JUDGE_X_EXAMPLES}`

**Expected JSON response:**
```json
{
  "winner": "Craig",
  "winner_total_score": 23,
  "loser_total_score": 18,
  "scores": [
    {
      "judge": "Glitch",
      "judge_emoji": "🤖",
      "craig_score": 8,
      "alex_score": 6,
      "one_liner": "Craig brought the heat"
    }
  ],
  "banter": "Judge1: comment\nJudge2: response\nJudge3: final"
}
```

### 2. Deployment + Real Links (AFTER AI JUDGING)
**Needs:**
- Deploy to Vercel
- Configure oneupper.app domain (or subdomain)
- Set up deep links: `oneupper.app/join/HAPPY-TIGER-1234`
- Update SMS share function with real URLs
- Test in production

### 3. SMS Notifications (AFTER DEPLOYMENT)
**Needs:**
- Twilio integration
- "Nudge opponent" functionality
- "Rivalry cancelled" alert
- "Verdict ready" notification
- Costs $$ so want game solid first

### 4. Nice-to-Haves (Future)
- Better error handling
- Load more for >10 previous shows
- Onboarding/tutorial
- Analytics/stats
- Share specific shows
- Social media integration

---

## Files to Share in Next Session

### Essential Files (Always Share):
1. **Screen4.jsx** - Main gameplay, has latest judging structure
2. **App.jsx** - Routing logic
3. **judge-prompt-template.txt** - AI judging template

### Contextual Files (Share if relevant to discussion):
4. **Screen1.jsx** - If discussing profile/rivalry creation
5. **Screen2.jsx** - If discussing profile management
6. **Screen6.jsx** - If discussing show history
7. **prompts.js** - If discussing database queries
8. **supabase.js** - If discussing database connection
9. **codeGenerator.js** - If discussing code format

---

## Known Issues / Edge Cases

### Old Show Data
- Shows created before recent updates have old data structure
- Missing `profile_a_score` and `profile_b_score` fields
- Will display blank scores in Screen 6
- **Decision:** Leave as-is, new shows have correct structure

### Judge Display
- Judge one-liners may be long (will see with real AI data)
- May need to adjust design (table format?) after testing real responses
- **Decision:** Wait to see real data before redesigning

### Console Warnings (Expected)
- `POST .../shows 409 (Conflict)` - Normal when both players advance simultaneously
- Error is caught and handled gracefully in `createNextShow()`

---

## Developer Notes (Craig's Preferences)

### Development Approach
- **Targeted edits** preferred over full file rewrites
- **Step-by-step implementation** with specific code placement
- **Test systematically** using multiple browser windows

### Design Philosophy
- **Mobile-first** - System fonts, universal compatibility
- **Minimal motion** - Subtle transitions only
- **Broad appeal** - Both men and women
- **Dark theme** - Consistent slate gradient

### Documentation
- Comprehensive handoff docs critical for chat limits
- Include file lists, continuation prompts
- Keep context for seamless transitions

---

## Testing Checklist

### Profile Management
- ✅ Create profile with unique code
- ✅ Resume with code (cross-device)
- ✅ Edit profile (name, avatar, phone, bio)
- ✅ Delete profile (cleans up rivalries)
- ✅ Switch between profiles

### Rivalry Flow
- ✅ Start rivalry by entering code
- ✅ Both players see "Rivalry Started" instantly
- ✅ Either player can start first show
- ✅ Other player auto-navigates to Screen 4
- ✅ Cancel rivalry from Screen 4 menu (modal confirmation)
- ✅ Other player auto-navigates to Screen 1

### Gameplay
- ✅ Submit answer (30-word limit enforced)
- ✅ Waiting state shows correctly
- ✅ Simulated judging (3-second delay)
- ✅ Verdict shows both answers, winner highlighted
- ✅ Judge scores show both players' scores
- ✅ Judge banter toggles correctly
- ✅ 10-second auto-advance countdown
- ✅ "STAY HERE" cancels countdown
- ✅ Next show loads with new prompt from DB
- ✅ 409 conflict handled (both players see same show)
- ✅ Click judge names at top to see profiles
- ✅ Judge banter resets between shows

### Show History
- ✅ Previous shows list (last 10)
- ✅ Click to view show detail (Screen 6)
- ✅ Screen 6 displays all info correctly
- ✅ Back to Game navigation works

---

## Next Session Prompt

```
Hi! We're building One-Upper, a 1v1 async game. I'm sharing the handoff doc and 
key files. We just completed all screens and are ready to build AI judging next.

Session End State: All screens working with simulated judging. Next: AI judging 
backend using judge-prompt-template.txt with Claude API.

Files shared:
- HANDOFF-SESSION.md (this doc)
- Screen4.jsx (has latest judging structure)
- judge-prompt-template.txt (AI judging template)
- App.jsx (routing)

Ready to build AI judging integration!
```

---

## Quick Reference

**Domain:** oneupper.app (owned, not deployed)  
**Code Format:** ADJECTIVE-NOUN-#### (e.g., HAPPY-TIGER-1234)  
**Judging:** Currently simulated, need real AI integration  
**Deployment:** Vercel (planned)  
**Priority Order:** AI Judging → Deployment → SMS  

**Color Palette:**
- Background: slate-900 → slate-800 gradient
- Text: slate-100/200/300/400
- Accent: orange-500
- Borders: slate-600

**Key Database Tables:** profiles, rivalries, shows, prompts, judges