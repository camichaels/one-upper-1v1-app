# One-Upper: Complete Project Handoff Document
**Last Updated:** November 21, 2024  
**Status:** Live in Production at https://oneupper.app

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack & Environment](#tech-stack--environment)
3. [Current Feature Set](#current-feature-set)
4. [Recent Updates & Fixes](#recent-updates--fixes)
5. [Next Priority: SMS Notifications](#next-priority-sms-notifications)
6. [Game Show Vibe Enhancements](#game-show-vibe-enhancements)
7. [File Structure Reference](#file-structure-reference)
8. [Key Technical Details](#key-technical-details)
9. [Testing Procedures](#testing-procedures)

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
- **Domain:** oneupper.app (managed via DirectNIC DNS)
- **SSL:** Automatic via Vercel

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

**Supabase Edge Functions - TO ADD (for SMS):**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+14155551234
```

---

## Current Feature Set

### ✅ Profile System (Complete)
- **Code Format:** ADJECTIVE-NOUN-#### (e.g., HAPPY-TIGER-1234)
- **Storage:** localStorage for device persistence
- **Recovery:** Phone number lookup (US format only)
- **Avatars:** 8 emoji options
- **Fields:** Name (required), Avatar (required), Phone (required), Bio (optional)
- **Management:** Create, edit, delete, switch between profiles
- **History:** Last 10 profiles stored in localStorage

**Phone Number Handling:**
- **Utility:** `src/utils/phoneUtils.js`
- **Functions:** `normalizePhone()`, `validatePhone()`
- **Stored Format:** 10 digits only (e.g., "4155169044")
- **Accepted Input:** Any format with dashes, spaces, parentheses, +1 prefix
- **Validation:** US phone numbers only (10 digits)

**Forgot Code Feature:**
- Link appears below "Get back in!" button in State A
- Modal asks for phone number
- Looks up profiles by normalized phone
- If 1 found: Auto-resumes immediately
- If multiple found: Shows list with avatar, name, code
- If 0 found: Error message
- User clicks profile card to resume

### ✅ Rivalry System (Complete)
- **Format:** 1v1 only (no group support yet)
- **Creation:** Challenge a friend OR join via code
- **Deep Links:** `/join/CODE` auto-starts rivalry
- **Mic Holder:** Person who starts first show holds mic initially
- **Status Tracking:** Active rivalries prevent new rivalries
- **Cancellation:** Either player can cancel, opponent gets notified
- **History:** Saved after cancellation

**Deep Link Flow:**
1. User clicks `oneupper.app/join/CODE`
2. JoinRivalry.jsx validates code and checks rivalry availability
3. Redirects to `/play` with pendingInvite in sessionStorage
4. Screen1 auto-accepts if user has profile (no accept/decline screen)
5. Shows loading: "Starting rivalry with {name}..."
6. Creates rivalry and navigates to first show

**Anti-Patterns Handled:**
- Can't join your own code
- Can't join if you're already in rivalry
- Can't join if friend is already in rivalry
- Can't create multiple rivalries simultaneously
- Race condition protection when both players click simultaneously

### ✅ Gameplay Loop (Complete)
- **Show Structure:** Prompt → Both submit → AI judges → Verdict
- **Mic Holder:** Answers first each round, passes to loser
- **Judging:** 3 random judges from 50+ personality pool
- **Scoring:** Points per judge (0-10), winner determined by total
- **Comments:** Each judge provides personality-driven commentary
- **Stats:** Win/loss tracking, show history

**Game States:**
- **State A (Screen1):** Waiting for answer submission
- **State B (Screen1):** Waiting for opponent's answer
- **State C (Screen1):** Both submitted, judging in progress
- **State D (Screen4 - Verdict):** Results displayed with confetti

**Judging Timeout & Recovery:**
- **0-30 seconds:** Clean "JUDGES DELIBERATING" with animated emojis
- **30-60 seconds:** "🤔 This is taking longer than usual..."
- **60+ seconds:** Recovery options (judging owner only)
  - **Try Again:** Retries judging call, resets timeout
  - **Pick Random Winner:** Randomly selects winner
  - **Skip This Show:** Creates next show, skipped show hidden from history
- **Non-owner:** Sees "⏳ Still waiting... Your opponent can retry if needed."
- **Polling Backup:** Database check every 10 seconds as fallback

**Real-time Synchronization:**
- Supabase subscriptions on `shows` and `rivalries` tables
- Both players see updates within network latency
- Polling backup during judging state
- Handles offline/online transitions gracefully

### ✅ UI/UX Polish (Complete)
- **Confetti:** Celebration on win (canvas-confetti library)
- **Loading States:** All async actions have loading feedback
- **Error Handling:** User-friendly error messages throughout
- **Responsive Design:** Mobile-first, works on all screen sizes
- **Dark Theme:** Slate gradient background, orange accents
- **Animations:** Smooth transitions, fade effects, glowing elements

**Screen Flow:**
1. **Landing Page (/):** Marketing page with judge cards, how it works
2. **Screen1 (/play):** 
   - State A: Create profile or resume with code
   - State B: Challenge friend or join rivalry
   - State C: First show ready to start
3. **Screen2:** Profile management (view all, create, edit, delete, switch)
4. **Screen4:** Main gameplay (submit answers, view verdict, see history)
5. **Screen6:** Show history detail view (read-only past verdicts)

---

## Recent Updates & Fixes

### Auto-Accept Deep Links (November 2024)
**Problem:** When existing user clicked `/join/CODE`, they saw awkward accept/decline screen  
**Solution:** Auto-accept immediately with loading state: "Starting rivalry with {name}..."  
**Files Changed:** Screen1.jsx

### Remove "Skip This Show" from Normal Menu (November 2024)
**Problem:** "Skip This Show" appeared in regular menu, caused desync when clicked  
**Solution:** Only show in timeout recovery UI (60+ seconds during judging)  
**Files Changed:** Screen4.jsx

### Prevent Repeated Join Alerts (November 2024)
**Problem:** "🎉 [Name] joined your Rivalry!" alert showed multiple times  
**Solution:** Added `hasShownJoinAlert` flag and `isAutoAccepting` check  
**Files Changed:** Screen1.jsx  
**Logic:** 
- Person who clicked `/join` link doesn't see alert (they initiated)
- Person who shared code sees alert exactly once
- Flag prevents duplicates from real-time subscription firing multiple times

### UI Text Corrections (November 2024)
**Fixed:** Orange "with" in "Cancel Rivalry with opponent?" modal  
**Files Changed:** Screen1.jsx

---

## Next Priority: SMS Notifications

### Goal
Send SMS notifications at key moments using Twilio with dynamic message templates stored in Supabase.

### Prerequisites
**Need from friend:** Twilio credentials
- `TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx`
- `TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx`
- `TWILIO_PHONE_NUMBER=+14155551234`

These go in **Supabase Dashboard → Edge Functions → Environment Variables** (NOT in code)

---

### Database Schema: SMS Templates Table

Create new table in Supabase:

```sql
CREATE TABLE sms_templates (
  id SERIAL PRIMARY KEY,
  notification_type TEXT NOT NULL,
  variation_number INT NOT NULL,
  template_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_type, variation_number)
);

-- Index for faster lookups
CREATE INDEX idx_sms_templates_type ON sms_templates(notification_type);
```

---

### Notification Types & Template Examples

#### 1. your_turn
**When:** Opponent submits and you haven't yet  
**Who gets it:** Player who hasn't submitted  
**Frequency:** Once per show when opponent completes their answer

```sql
INSERT INTO sms_templates (notification_type, variation_number, template_text) VALUES
('your_turn', 1, '⏰ {opponent} just answered! Your turn in Show #{show_num}: "{prompt}" - https://oneupper.app'),
('your_turn', 2, '👀 {opponent} submitted! Don''t let them wait. Show #{show_num}: "{prompt}" - https://oneupper.app'),
('your_turn', 3, '🎤 {opponent} is done! Your move in "{prompt}" - https://oneupper.app'),
('your_turn', 4, '⚡ {opponent} went big! Can you top it? "{prompt}" - https://oneupper.app'),
('your_turn', 5, '🔥 Your turn! {opponent} submitted for "{prompt}" - https://oneupper.app');
```

**Placeholders:**
- `{opponent}` → Opponent's name
- `{show_num}` → Show number (e.g., "3")
- `{prompt}` → The prompt text (truncated to ~50 chars if needed)

---

#### 2. verdict_ready
**When:** Judging completes  
**Who gets it:** Player who submitted FIRST (they're waiting longest)  
**Frequency:** Once per show when verdict is determined

```sql
INSERT INTO sms_templates (notification_type, variation_number, template_text) VALUES
('verdict_ready', 1, '🎤 Verdict is in for Show #{show_num}! "{prompt}" - See who won: https://oneupper.app'),
('verdict_ready', 2, '⚖️ The judges have spoken on "{prompt}"! See results: https://oneupper.app'),
('verdict_ready', 3, '🎭 Show #{show_num} verdict ready: "{prompt}" - https://oneupper.app'),
('verdict_ready', 4, '✨ Results are in! Who won "{prompt}"? - https://oneupper.app'),
('verdict_ready', 5, '🏆 Judges scored your answers! Check Show #{show_num}: https://oneupper.app');
```

**Placeholders:**
- `{show_num}` → Show number
- `{prompt}` → The prompt text

---

#### 3. nudge
**When:** Player taps "Nudge" button in game (manual trigger)  
**Who gets it:** Opponent who hasn't submitted yet  
**Frequency:** Rate-limited to once per 5 minutes per show

```sql
INSERT INTO sms_templates (notification_type, variation_number, template_text) VALUES
('nudge', 1, '👋 {opponent} is waiting for your answer! Don''t leave them hanging: https://oneupper.app'),
('nudge', 2, '⏰ Don''t leave {opponent} hanging! Your turn: https://oneupper.app'),
('nudge', 3, '🎤 {opponent} wants to see what you''ve got! Answer now: https://oneupper.app'),
('nudge', 4, '⚡ {opponent} nudged you! Time to submit your answer: https://oneupper.app'),
('nudge', 5, '👀 {opponent} is getting impatient! Submit your answer: https://oneupper.app');
```

**Placeholders:**
- `{opponent}` → Name of person who sent nudge

---

#### 4. rivalry_cancelled
**When:** Opponent cancels rivalry  
**Who gets it:** Other player  
**Frequency:** Once when cancellation happens

```sql
INSERT INTO sms_templates (notification_type, variation_number, template_text) VALUES
('rivalry_cancelled', 1, '😢 {opponent} ended your rivalry. Your show history is saved: https://oneupper.app'),
('rivalry_cancelled', 2, '👋 {opponent} cancelled your rivalry. Thanks for playing: https://oneupper.app'),
('rivalry_cancelled', 3, '💔 Rivalry with {opponent} has ended. Your history is saved: https://oneupper.app');
```

**Placeholders:**
- `{opponent}` → Name of person who cancelled

---

### Required Database Changes

#### Add first_submitter_id to shows table
```sql
ALTER TABLE shows ADD COLUMN first_submitter_id UUID REFERENCES profiles(id);
```

**Why:** Track who submitted first so we can send "verdict_ready" to the person who's been waiting longest.

**Implementation:** In Screen4.jsx `handleSubmit()`, when second player submits:
```javascript
if (bothSubmitted) {
  updateData.status = 'judging';
  
  // Determine who submitted first
  const firstSubmitterId = currentShow.answer_a_submitted_at < currentShow.answer_b_submitted_at
    ? currentShow.profile_a_id
    : currentShow.profile_b_id;
  
  updateData.first_submitter_id = firstSubmitterId;
}
```

#### Add nudge rate limiting to shows table
```sql
ALTER TABLE shows ADD COLUMN last_nudge_at TIMESTAMPTZ;
```

**Why:** Prevent spam - only allow nudge once per 5 minutes.

**Implementation:** In Screen4.jsx `sendNudge()`:
```javascript
async function sendNudge() {
  const { data: show } = await supabase
    .from('shows')
    .select('last_nudge_at')
    .eq('id', currentShow.id)
    .single();
  
  if (show.last_nudge_at) {
    const minutesSinceLastNudge = (Date.now() - new Date(show.last_nudge_at)) / 1000 / 60;
    if (minutesSinceLastNudge < 5) {
      alert('You can only nudge once every 5 minutes');
      return;
    }
  }
  
  // Send nudge SMS
  await supabase.functions.invoke('send-sms', {
    body: {
      userId: opponentProfile.id,
      notificationType: 'nudge',
      contextData: { opponent: myProfile.name }
    }
  });
  
  // Update last_nudge_at
  await supabase
    .from('shows')
    .update({ last_nudge_at: new Date().toISOString() })
    .eq('id', currentShow.id);
  
  alert('Nudge sent! ⚡');
}
```

---

### Supabase Edge Function: send-sms

Create new function: `supabase/functions/send-sms/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  notificationType: string;
  contextData: {
    opponent?: string;
    show_num?: string | number;
    prompt?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, notificationType, contextData }: RequestBody = await req.json();

    // 1. Get user's phone number
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('phone')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.phone) {
      throw new Error('User phone number not found');
    }

    // 2. Get random SMS template for this notification type
    const { data: templates, error: templateError } = await supabaseClient
      .from('sms_templates')
      .select('template_text')
      .eq('notification_type', notificationType);

    if (templateError || !templates || templates.length === 0) {
      throw new Error(`No templates found for notification type: ${notificationType}`);
    }

    // Pick random template
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    let message = randomTemplate.template_text;

    // 3. Replace placeholders
    if (contextData.opponent) {
      message = message.replace('{opponent}', contextData.opponent);
    }
    if (contextData.show_num) {
      message = message.replace('{show_num}', String(contextData.show_num));
    }
    if (contextData.prompt) {
      // Truncate prompt if too long (keep SMS under 160 chars ideally)
      const truncatedPrompt = contextData.prompt.length > 50 
        ? contextData.prompt.substring(0, 47) + '...'
        : contextData.prompt;
      message = message.replace('{prompt}', truncatedPrompt);
    }

    // 4. Send SMS via Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured');
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append('To', `+1${profile.phone}`); // Assumes US phone (10 digits stored)
    formData.append('From', twilioPhone);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      throw new Error(`Twilio error: ${errorText}`);
    }

    const result = await twilioResponse.json();

    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

**Deploy command:**
```bash
supabase functions deploy send-sms
```

---

### Code Integration Points

#### A. Screen4.jsx - "Your Turn" Notification

In `handleSubmit()`, after both players submit:

```javascript
if (bothSubmitted) {
  updateData.status = 'judging';
  
  // Determine who submitted first
  const firstSubmitterId = currentShow.answer_a_submitted_at < currentShow.answer_b_submitted_at
    ? currentShow.profile_a_id
    : currentShow.profile_b_id;
  
  updateData.first_submitter_id = firstSubmitterId;
  
  // Send "your_turn" SMS to the first submitter (who's been waiting)
  try {
    await supabase.functions.invoke('send-sms', {
      body: {
        userId: firstSubmitterId,
        notificationType: 'your_turn',
        contextData: {
          opponent: myProfile.name,
          show_num: currentShow.show_number,
          prompt: currentShow.prompt
        }
      }
    });
  } catch (err) {
    console.error('Failed to send your_turn SMS:', err);
    // Don't block gameplay if SMS fails
  }
}
```

#### B. Edge Function judge-show - "Verdict Ready" Notification

In `supabase/functions/judge-show/index.ts`, after updating show with verdict:

```typescript
// After updating show with winner and verdict...

// Send "verdict_ready" SMS to first submitter
if (showData.first_submitter_id) {
  try {
    await supabaseClient.functions.invoke('send-sms', {
      body: {
        userId: showData.first_submitter_id,
        notificationType: 'verdict_ready',
        contextData: {
          show_num: showData.show_number,
          prompt: showData.prompt
        }
      }
    });
  } catch (err) {
    console.error('Failed to send verdict_ready SMS:', err);
  }
}
```

#### C. Screen4.jsx - "Nudge" Button

Update `sendNudge()` function:

```javascript
async function sendNudge() {
  try {
    // Check rate limit
    const { data: show } = await supabase
      .from('shows')
      .select('last_nudge_at')
      .eq('id', currentShow.id)
      .single();
    
    if (show?.last_nudge_at) {
      const minutesSinceLastNudge = (Date.now() - new Date(show.last_nudge_at)) / 1000 / 60;
      if (minutesSinceLastNudge < 5) {
        alert('You can only nudge once every 5 minutes ⏰');
        return;
      }
    }
    
    // Send SMS
    await supabase.functions.invoke('send-sms', {
      body: {
        userId: opponentProfile.id,
        notificationType: 'nudge',
        contextData: {
          opponent: myProfile.name
        }
      }
    });
    
    // Update last nudge timestamp
    await supabase
      .from('shows')
      .update({ last_nudge_at: new Date().toISOString() })
      .eq('id', currentShow.id);
    
    alert('Nudge sent! ⚡');
  } catch (err) {
    console.error('Failed to send nudge:', err);
    alert('Failed to send nudge. Try again?');
  }
}
```

#### D. Screen4.jsx - "Rivalry Cancelled" Notification

In `handleCancelRivalry()`:

```javascript
async function handleCancelRivalry() {
  setShowCancelModal(false);
  
  try {
    // Delete rivalry
    const { error } = await supabase
      .from('rivalries')
      .delete()
      .eq('id', rivalryId);
    
    if (error) throw error;
    
    // Send cancellation SMS to opponent
    try {
      await supabase.functions.invoke('send-sms', {
        body: {
          userId: opponentProfile.id,
          notificationType: 'rivalry_cancelled',
          contextData: {
            opponent: myProfile.name
          }
        }
      });
    } catch (smsErr) {
      console.error('Failed to send cancellation SMS:', smsErr);
      // Don't block cancellation if SMS fails
    }
    
    // Redirect to home
    window.location.href = '/play';
  } catch (err) {
    console.error('Error cancelling rivalry:', err);
    alert('Failed to cancel rivalry. Try again?');
  }
}
```

---

### SMS Opt-Out (Future Feature - Not MVP)

**For now:** Having a phone number = opted in to SMS.

**Future enhancement:**
1. Add `sms_notifications_enabled` boolean to `profiles` table (default true)
2. Add toggle in Screen2 edit profile: "Receive SMS notifications"
3. Check this flag in Edge Function before sending SMS
4. Add unsubscribe link in SMS footer (Twilio requirement for compliance):
   - "Reply STOP to unsubscribe"
   - Handle STOP keyword in webhook

---

### Testing SMS (Without Spending Money)

1. **Twilio Console:** Use test credentials to see message logs
2. **Test Phone Numbers:** Twilio provides test numbers that don't send real SMS
3. **Local Testing:** Use ngrok + webhook to test locally
4. **Staging:** Send to your own phone first

---

## Game Show Vibe Enhancements

These are polish items to make the game feel more dynamic and exciting. Ranked by implementation effort and impact.

### ✅ Already Implemented

#### Confetti on Win
- **Status:** COMPLETE
- **Library:** canvas-confetti
- **Trigger:** When verdict shows and you won
- **Location:** Screen4.jsx verdict state

---

### 🎯 Recommended Next Enhancements

#### 1. Win Streak Celebrations (HIGH IMPACT - 1 hour)

**What:** Show special messages and effects when player has 3+ consecutive wins

**Implementation:**

Add to Screen4.jsx after calculating stats:

```javascript
// Calculate win streak
function getWinStreak(previousShows, myProfileId) {
  let streak = 0;
  // Start from most recent show and count backwards
  for (let i = previousShows.length - 1; i >= 0; i--) {
    if (previousShows[i].winner_id === myProfileId) {
      streak++;
    } else {
      break; // Streak broken
    }
  }
  return streak;
}

const myWinStreak = getWinStreak(previousShows, activeProfileId);
```

Update verdict headline to show streak:

```javascript
{currentShow.winner_id === activeProfileId ? (
  <h2 className="text-3xl font-bold text-orange-500">
    {myWinStreak >= 5 ? '🔥🔥🔥 LEGENDARY! 5 IN A ROW! 🔥🔥🔥' :
     myWinStreak >= 3 ? `🔥 ${myWinStreak} WIN STREAK! 🔥` :
     '🎤 YOU ONE-UPPED ' + opponentProfile.name.toUpperCase() + '!'}
  </h2>
) : (
  <h2 className="text-2xl font-bold text-slate-300">
    {opponentProfile.name.toUpperCase()} ONE-UPPED YOU
  </h2>
)}
```

Enhanced confetti for streaks:

```javascript
useEffect(() => {
  if (currentShow?.status === 'complete' && currentShow.winner_id === activeProfileId) {
    const myWinStreak = getWinStreak(previousShows, activeProfileId);
    
    if (myWinStreak >= 5) {
      // Legendary celebration - multiple bursts
      confetti({ particleCount: 200, spread: 180, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { y: 0.4 } }), 300);
      setTimeout(() => confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } }), 600);
    } else if (myWinStreak >= 3) {
      // Streak celebration - bigger burst
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    } else {
      // Normal win
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }
}, [currentShow?.status, currentShow?.winner_id]);
```

**Stats Display:**

```javascript
<div className="text-sm text-slate-400">
  😊 You: {myWins} wins {myWinStreak >= 3 && `(🔥 ${myWinStreak} streak)`}
</div>
```

---

#### 2. Verdict Reveal Animation (MEDIUM IMPACT - 45 min)

**What:** Suspenseful reveal of verdict instead of instant display

**Flow:**
1. "⏳ JUDGES DELIBERATING..." fades out (0.5s)
2. Brief black screen with "..." (1s pause for suspense)
3. Verdict slides up from bottom with scale animation (0.8s)
4. Confetti bursts at same time as verdict appears

**Implementation:**

Add state for reveal animation:

```javascript
const [showVerdictReveal, setShowVerdictReveal] = useState(false);
```

When verdict arrives:

```javascript
useEffect(() => {
  if (currentShow?.status === 'complete' && !showVerdictReveal) {
    // Start reveal sequence
    setTimeout(() => setShowVerdictReveal(true), 1500);
  }
}, [currentShow?.status]);
```

CSS for reveal:

```css
@keyframes slideUpReveal {
  from {
    transform: translateY(100%) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.verdict-reveal {
  animation: slideUpReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Render logic:

```javascript
{state === 'verdict' && (
  <div className="space-y-6">
    {!showVerdictReveal ? (
      // Suspense screen
      <div className="text-center py-12">
        <div className="text-6xl mb-4 animate-pulse">🎭</div>
        <p className="text-slate-400 text-lg">...</p>
      </div>
    ) : (
      // Actual verdict (with reveal animation)
      <div className="verdict-reveal">
        {/* Existing verdict content */}
      </div>
    )}
  </div>
)}
```

---

#### 3. Mic Holder Visual Treatment (LOW EFFORT - 30 min)

**What:** Make mic holder status prominent and glowing

**Current:** Just text "(🎤 holder)" next to name

**Better:**

```javascript
<div className="relative">
  {isMicHolder ? (
    <div className="flex items-center gap-3">
      <div className="mic-holder-glow">
        <span className="text-4xl">🎤</span>
      </div>
      <div>
        <p className="text-xl font-bold text-slate-100">{myProfile.name}</p>
        <p className="text-sm text-orange-400">Mic Holder</p>
      </div>
    </div>
  ) : (
    <p className="text-lg text-slate-300">{myProfile.name}</p>
  )}
</div>
```

CSS:

```css
@keyframes micGlow {
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(251, 146, 60, 0.8));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(251, 146, 60, 1));
    transform: scale(1.1);
  }
}

.mic-holder-glow {
  animation: micGlow 2s ease-in-out infinite;
}
```

---

#### 4. Judge Speech Bubbles (MEDIUM EFFORT - 1 hour)

**What:** Style judge comments as colorful speech bubbles with personality

**Current:** Plain text list

**Better:**

```javascript
const judgeColors = {
  'savage-sarah': 'bg-red-500',
  'wholesome-coach': 'bg-blue-500',
  'tech-bro': 'bg-purple-500',
  'mysterious-oracle': 'bg-indigo-500',
  'dad-joke-enthusiast': 'bg-green-500',
  // Add more as needed, fallback to orange
};

<div className="space-y-3">
  {judgeComments.map((comment, i) => {
    const bgColor = judgeColors[comment.judgeKey] || 'bg-orange-500';
    const alignment = i % 2 === 0 ? 'justify-start' : 'justify-end';
    
    return (
      <div key={i} className={`flex ${alignment}`}>
        <div className={`max-w-[85%] rounded-2xl p-4 ${bgColor} shadow-lg`}>
          <div className="flex items-start gap-2">
            <span className="text-2xl">{comment.emoji}</span>
            <div>
              <p className="text-xs font-bold text-white/80 mb-1">
                {comment.judgeName}
              </p>
              <p className="text-white text-sm leading-relaxed">
                {comment.text}
              </p>
              <p className="text-white/90 font-bold mt-2">
                Score: {comment.score}/10
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  })}
</div>
```

**Location:** Screen4.jsx verdict state, Screen6.jsx history detail

---

#### 5. Animated Stats Updates (LOW EFFORT - 30 min)

**What:** Make win/loss counters feel dynamic when they change

**Implementation:**

Add CSS:

```css
@keyframes statPulse {
  0%, 100% {
    transform: scale(1);
    color: inherit;
  }
  50% {
    transform: scale(1.3);
    color: #f97316; /* orange */
  }
}

.stat-updated {
  animation: statPulse 0.5s ease-out;
}
```

Add state to track if stat just updated:

```javascript
const [justWon, setJustWon] = useState(false);

useEffect(() => {
  if (currentShow?.status === 'complete' && currentShow.winner_id === activeProfileId) {
    setJustWon(true);
    setTimeout(() => setJustWon(false), 500);
  }
}, [currentShow?.status, currentShow?.winner_id]);
```

Apply class:

```javascript
<div className="text-sm text-slate-400">
  <span className={justWon ? 'stat-updated' : ''}>
    😊 You: {myWins} wins
  </span>
</div>
```

---

#### 6. Answer Submission Feedback (LOW EFFORT - 20 min)

**What:** Visual feedback when submitting answer

**Implementation:**

```javascript
const [justSubmitted, setJustSubmitted] = useState(false);

async function handleSubmit() {
  setJustSubmitted(true);
  
  // Existing submit logic...
  
  setTimeout(() => setJustSubmitted(false), 1000);
}
```

Button styling:

```javascript
<button
  onClick={handleSubmit}
  className={`
    w-full py-4 bg-orange-500 text-white font-bold rounded-lg
    transition-all duration-300
    ${justSubmitted ? 'scale-110 bg-green-500' : 'hover:bg-orange-400'}
  `}
>
  {justSubmitted ? '✓ Submitted!' : 'Submit Answer'}
</button>
```

---

### 🚫 Skip These (Low Value or Too Complex)

- **Sound Effects** - Annoying if not perfect, hard to manage across devices
- **Typing Animation for Prompt** - Slows UX
- **Dynamic Backgrounds** - Too distracting
- **Seasonal Themes** - Way too much work
- **Mic Transfer Animation** - Low value, high complexity

---

## File Structure Reference

```
src/
├── components/
│   ├── Screen1.jsx          (Entry point, profile management, rivalry creation)
│   ├── Screen2.jsx          (Profile list, create, edit, delete, switch)
│   ├── Screen4.jsx          (Main gameplay loop)
│   ├── Screen6.jsx          (Show history detail view)
│   ├── JoinRivalry.jsx      (Deep link handler for /join/:code)
│   └── Header.jsx           (Logo component)
├── utils/
│   ├── phoneUtils.js        (Phone validation & normalization)
│   ├── codeGenerator.js     (Profile code generation & validation)
│   └── prompts.js           (Prompt pool & judge selection)
├── lib/
│   └── supabase.js          (Supabase client initialization)
└── App.jsx                  (React Router setup)

supabase/functions/
├── judge-show/              (AI judging Edge Function)
│   └── index.ts
└── send-sms/                (SMS notification Edge Function - TO BUILD)
    └── index.ts

public/
└── (static assets)
```

---

## Key Technical Details

### Real-time Synchronization

**Supabase Channels:**
- `rivalry-updates` - Listens for rivalry INSERT/DELETE (Screen1)
- `show-updates` - Listens for show INSERT/UPDATE (Screen4)
- `first-show-updates` - Listens for first show creation (Screen1 State C)

**Polling Backup:**
- During judging state, polls database every 10 seconds
- Fallback if real-time connection drops
- Ensures eventual consistency

**Race Condition Handling:**
- Rivalry creation checks both players' availability
- Show creation uses transactions where possible
- Real-time subscriptions filter by relevance before updating UI

### Profile Code System

**Format:** ADJECTIVE-NOUN-####
- **Example:** HAPPY-TIGER-1234
- **Total possible:** 50 adjectives × 50 nouns × 10,000 numbers = 25 million codes
- **Collision handling:** Regenerate if exists
- **Case insensitive:** Stored and compared in uppercase

**Functions in `codeGenerator.js`:**
- `generateCode()` - Creates new unique code
- `isValidCodeFormat(code)` - Validates format
- `formatCodeInput(input)` - Cleans user input (removes spaces, uppercases)

### Judge Selection Logic

**Pool:** 50+ unique judge personalities in `prompts.js`

**Selection per show:**
- Random selection of 3 judges
- No duplicate judges per show
- Each judge has:
  - Name (e.g., "Savage Sarah")
  - Emoji (e.g., "💀")
  - Key (e.g., "savage-sarah")
  - Personality prompt for Claude API

**Judge Personalities Include:**
- Savage Sarah (brutal honesty)
- Wholesome Coach (supportive)
- Tech Bro (jargon-heavy)
- Mysterious Oracle (cryptic)
- Dad Joke Enthusiast (puns)
- Grammar Nazi (punctuation police)
- Conspiracy Theorist (connects everything)
- And 40+ more...

### AI Judging Flow

1. **Trigger:** Second player submits answer
2. **Database Update:** Show status → 'judging'
3. **Edge Function Call:** `judge-show` invoked via Supabase
4. **Claude API:**
   - Model: Claude Sonnet 4
   - System prompt includes judge personalities
   - User prompt includes both answers
   - Returns: Winner, scores, comments per judge, verdict summary
5. **Database Update:** Show status → 'complete', winner determined
6. **Real-time:** Both players see verdict immediately

**Cost:** ~$0.01-0.02 per judgment (varies by response length)

**Error Handling:**
- Timeout after 30 seconds (UI shows warning)
- Timeout after 60 seconds (recovery options appear)
- Retry mechanism (calls API again)
- Random winner fallback (if retry fails)
- Skip show option (emergency escape hatch)

---

## Testing Procedures

### Testing Deep Links

**Test 1: New User Flow**
1. Clear localStorage or use incognito
2. Click `oneupper.app/join/VALID-CODE`
3. Should redirect to `/play`
4. Create profile form appears
5. Create profile
6. Auto-accepts and shows "Starting rivalry with {name}..."
7. Navigates to first show (State C)

**Test 2: Existing User Flow**
1. Already have active profile
2. Click `oneupper.app/join/VALID-CODE`
3. Should redirect to `/play`
4. Shows loading: "Starting rivalry with {name}..."
5. NO accept/decline screen
6. Navigates to first show (State C)

**Test 3: Already in Rivalry**
1. User in active rivalry
2. Click different person's invite link
3. Shows error: "You're already in a rivalry"
4. Button to return to game

**Test 4: Friend Already Busy**
1. User A shares code with User B and User C
2. User B joins → Rivalry created
3. User C tries to join same link
4. Error: "This person is already in a rivalry"

**Test 5: Invalid Code**
1. Click `oneupper.app/join/FAKE-CODE-9999`
2. Redirects to `/play`
3. Error: "Invalid invite code"

### Testing Real-time Synchronization

**Setup:** Two browser windows (or two phones), both logged in as different profiles

**Test 1: Simultaneous Submission**
1. Both players submit answers around same time
2. Both should transition to judging state
3. Both should see verdict simultaneously

**Test 2: Offline/Online**
1. Player A goes offline (turn off WiFi)
2. Player B submits answer
3. Player A comes back online
4. Player A's UI should catch up via polling

**Test 3: Rivalry Cancellation**
1. Player A cancels rivalry
2. Player B should immediately see alert
3. Player B redirected to State B

### Testing Phone Number Recovery

**Test 1: Single Profile**
1. Create profile with phone 415-555-1234
2. Log out
3. Click "Forgot your code?"
4. Enter 4155551234 (any format)
5. Should auto-resume immediately

**Test 2: Multiple Profiles**
1. Create 3 profiles with same phone
2. Log out
3. "Forgot your code?"
4. Enter phone
5. Shows list of all 3 profiles
6. Click one to resume

**Test 3: No Profiles**
1. Enter phone not in system
2. Error: "No profiles found"

### Testing Judging Timeout

**Test 1: Normal Judging** (< 30s)
1. Both submit
2. Shows "JUDGES DELIBERATING" with animated emojis
3. Verdict appears normally

**Test 2: Slow Judging** (30-60s)
1. Both submit
2. After 30s: "🤔 This is taking longer than usual..."
3. Still waiting, no action buttons

**Test 3: Stuck Judging** (60s+)
1. Both submit
2. After 60s: Recovery options appear (judging owner only)
3. Try Again → Retries call
4. Pick Random → Randomly selects winner
5. Skip This Show → Creates next show

**Test 4: Non-Owner Experience**
1. Player B is judging owner (submitted second)
2. Player A sees: "⏳ Still waiting... Your opponent can retry if needed."
3. No action buttons for Player A

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Access at http://localhost:5173
```

### Deploying to Vercel

Changes deploy automatically when pushed to GitHub main branch.

**Manual deploy:**
```bash
vercel --prod
```

### Supabase Edge Functions

**Deploy function:**
```bash
supabase functions deploy function-name
```

**View logs:**
```bash
supabase functions logs function-name
```

**Test locally:**
```bash
supabase functions serve function-name
```

### Database Migrations

**Create migration:**
```bash
supabase migration new migration_name
```

**Apply migrations:**
```bash
supabase db push
```

### Environment Variables

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

**Edge Functions (Supabase Dashboard):**
- ANTHROPIC_API_KEY (already set)
- TWILIO_ACCOUNT_SID (to add)
- TWILIO_AUTH_TOKEN (to add)
- TWILIO_PHONE_NUMBER (to add)

---

## Future Feature Ideas (Not Prioritized)

### Multiplayer Expansion
- **3-4 player shows** - More chaos, more fun
- **Tournament brackets** - Seasonal competitions
- **Team mode** - 2v2 gameplay

### Monetization
- **Premium judges** - Unlock special personalities ($0.99)
- **Custom prompts** - Create your own ($1.99/mo)
- **Ad-free** - Remove occasional ads ($2.99/mo)
- **Rivalry history export** - PDF of all shows ($0.99)

### Engagement Features
- **Voice submissions** - Record audio answers
- **Drawing tools** - Visual responses
- **Photo uploads** - Image-based prompts
- **Leaderboards** - Global rankings
- **Achievements** - Badges for milestones

### Quality of Life
- **Profile photos** - Upload custom avatar
- **Bio/tagline** - Personalize profile
- **Rivalry nicknames** - Custom names for rivalries
- **Dark/light mode toggle** - User preference
- **Notification preferences** - Granular SMS controls

---

## Common Issues & Solutions

### Issue: Shows not syncing between players
**Cause:** Real-time subscription not connected  
**Solution:** Check Supabase real-time is enabled, check browser console for errors

### Issue: Judging stuck indefinitely
**Cause:** Edge function error or API timeout  
**Solution:** Use "Try Again" button, check Supabase function logs

### Issue: Can't join rivalry with valid code
**Cause:** One player already in another rivalry  
**Solution:** Cancel existing rivalry first

### Issue: Phone number not working for recovery
**Cause:** Phone stored in different format  
**Solution:** Use normalizePhone() utility consistently

### Issue: Confetti not appearing
**Cause:** canvas-confetti not installed  
**Solution:** `npm install canvas-confetti`

### Issue: Deep link not working
**Cause:** JoinRivalry component not handling all edge cases  
**Solution:** Check console for errors, verify code exists in database

---

## Starting Points for Next Session

### If you have Twilio credentials:
1. Add Twilio env vars to Supabase
2. Create `sms_templates` table with message variations
3. Add `first_submitter_id` and `last_nudge_at` columns to `shows` table
4. Create `send-sms` Edge Function
5. Integrate SMS calls in Screen4.jsx and judge-show function
6. Test all notification types with your own phone

### If still waiting on Twilio:
1. Implement win streak celebrations (HIGH IMPACT)
2. Add verdict reveal animation
3. Enhance mic holder visual treatment
4. Style judge comments as speech bubbles
5. Add animated stats updates
6. Polish answer submission feedback

### For bug fixes or features:
1. Read this document thoroughly
2. Identify which files need changes
3. Test locally before deploying
4. Test with multiple browser windows (simulate 2 players)
5. Check Supabase real-time subscriptions are working
6. Verify changes don't break existing functionality

---

## Contact & Resources

**Live Site:** https://oneupper.app  
**Domain Registrar:** DirectNIC  
**Hosting:** Vercel (connected to GitHub)  
**Database:** Supabase (project dashboard for logs/tables)  
**AI Model:** Claude Sonnet 4 via Anthropic API

**Key Files to Know:**
- `Screen1.jsx` - Entry point, profile system, rivalry creation
- `Screen4.jsx` - Main gameplay, real-time sync, verdict display
- `judge-show/index.ts` - AI judging logic
- `phoneUtils.js` - Phone number handling
- `prompts.js` - Judge personalities and prompt pool

**Development Tips:**
- Always test with 2 browser windows to simulate multiplayer
- Check Supabase real-time subscriptions are active
- Use browser dev tools Network tab to debug API calls
- Supabase Dashboard → Edge Functions → Logs for debugging
- Keep SMS templates varied and fun (not robotic)

---

**End of Handoff Document**  
**Version:** 2.0  
**Date:** November 21, 2024
