import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { generateCode, isValidCodeFormat, formatCodeInput } from '../utils/codeGenerator';
import { supabase } from '../lib/supabase';
import { getRandomPrompt, selectJudges } from '../utils/prompts';
import { normalizePhone, validatePhone } from '../utils/phoneUtils';
import Header from './Header';
import HeaderWithBack from './HeaderWithBack';
import HowToPlayModal from './HowToPlayModal';
import AboutModal from './AboutModal';
import OnboardingFlow from './OnboardingFlow';


// Avatar options
const AVATARS = ['😎', '🤓', '😈', '🤡', '🎃', '🦄', '🐉', '🤖'];

// Stakes suggestions for the 🎲 button
const STAKES_SUGGESTIONS = [
  "bragging rights",
  "a coffee",
  "lunch",
  "dinner",
  "a beer",
  "a 6 pack",
  "$5",
  "$10",
  "$20",
  "who posts embarrassing photo",
  "who picks the movie",
  "eternal glory",
  "a slice of pizza",
  "ice cream cone",
  "donuts for the office",
  "winner's favorite takeout",
  "a home-cooked meal",
  "who mows the other's lawn",
  "who cleans the car",
  "who buys the next 5 rounds",
  "who has to change their profile pic",
  "who picks karaoke song",
  "who wears a silly hat",
  "who admits they were wrong",
  "public praise on social media",
  "who picks the restaurant",
  "who picks the playlist",
  "who picks the next binge show",
  "naming rights for something"
];

// Judge quotes - same pool as Showdown
const JUDGE_QUOTES = [
  { text: "Bore me and I'll know.", judge: "Judge Savage", emoji: "🔥" },
  { text: "Safe answers finish last.", judge: "Judge Savage", emoji: "🔥" },
  { text: "Make me feel something. That's all I ask.", judge: "Judge Riley", emoji: "💙" },
  { text: "Heart wins here. Bring yours.", judge: "Judge Riley", emoji: "💙" },
  { text: "Impress me. Intellectually.", judge: "Judge Snoot", emoji: "🎓" },
  { text: "I award points for elegance. Plan accordingly.", judge: "Judge Snoot", emoji: "🎓" },
  { text: "Do you have what it takes? We'll find out.", judge: "Judge Coach", emoji: "💪" },
  { text: "Leave it all on the field.", judge: "Judge Coach", emoji: "💪" },
  { text: "My scoring logic? Wouldn't you like to know.", judge: "Judge Wildcard", emoji: "🎲" },
  { text: "I might love it. I might not. Even I don't know yet.", judge: "Judge Wildcard", emoji: "🎲" },
  { text: "Main character energy only, please.", judge: "Judge Diva", emoji: "🎬" },
  { text: "Give me drama or give me nothing.", judge: "Judge Diva", emoji: "🎬" },
  { text: "HUMOR.EXE loading... prepare for evaluation.", judge: "Judge GLiTCH", emoji: "🤖" },
  { text: "Your response will be processed. Resistance is suboptimal.", judge: "Judge GLiTCH", emoji: "🤖" },
  { text: "Explain 'funny' again? Slowly this time.", judge: "Judge Zorp", emoji: "👽" },
  { text: "Earth humor remains... confusing. But I am ready.", judge: "Judge Zorp", emoji: "👽" },
  { text: "Bars. Flow. Victory. Let's go.", judge: "Judge Hype", emoji: "🎤" },
  { text: "Spit your best. I'll judge the rest.", judge: "Judge Hype", emoji: "🎤" },
  { text: "Back in my day, we were actually funny.", judge: "Judge Gramps", emoji: "👴" },
  { text: "Show me something timeless, kid.", judge: "Judge Gramps", emoji: "👴" },
  { text: "Can this joke scale? Let's find out.", judge: "Judge Mogul", emoji: "💸" },
  { text: "Disrupt my expectations or pivot out.", judge: "Judge Mogul", emoji: "💸" },
  { text: "Your answer is a mirror. What will it reflect?", judge: "Judge Guru", emoji: "🧘" },
  { text: "The real one-upper was inside you all along. Maybe.", judge: "Judge Guru", emoji: "🧘" },
  { text: "Too wholesome and I'll pretend to hate it.", judge: "Judge Edge", emoji: "🔪" },
  { text: "Make it weird. I can take it.", judge: "Judge Edge", emoji: "🔪" },
  { text: "I've studied 10,000 jokes. Surprise me.", judge: "Judge Scholar", emoji: "📚" },
  { text: "Structurally, this should be interesting.", judge: "Judge Scholar", emoji: "📚" },
  { text: "Comedy is dead. Prove me wrong.", judge: "Judge Artiste", emoji: "🎨" },
  { text: "I don't expect you to understand my scoring.", judge: "Judge Artiste", emoji: "🎨" },
  { text: "No pain, no gain. Same goes for jokes.", judge: "Judge Tank", emoji: "🏋️" },
  { text: "Hit me with your PR. Personal Response.", judge: "Judge Tank", emoji: "🏋️" },
  { text: "Clutch or kick. Your call.", judge: "Judge Gamer", emoji: "🎮" },
  { text: "Time to lock in. No throwing.", judge: "Judge Gamer", emoji: "🎮" },
  { text: "I detect notes of... potential.", judge: "Judge Sommelier", emoji: "🍷" },
  { text: "Let's see if this answer has legs.", judge: "Judge Sommelier", emoji: "🍷" },
  { text: "Rules? I don't remember agreeing to rules.", judge: "Judge Chaos", emoji: "🎪" },
  { text: "Scoring is a construct. But I'll do it anyway.", judge: "Judge Chaos", emoji: "🎪" },
  { text: "This better be seasoned properly.", judge: "Judge Chef", emoji: "👨‍🍳" },
  { text: "Raw talent only. No microwaved answers.", judge: "Judge Chef", emoji: "👨‍🍳" },
  { text: "I've become the judge. There is no me anymore.", judge: "Judge Method", emoji: "🎭" },
  { text: "Show me truth. I'll know if you're faking.", judge: "Judge Method", emoji: "🎭" },
  { text: "Make some noise or get off the stage.", judge: "Judge Rockstar", emoji: "🎸" },
  { text: "This ain't soundcheck. Bring the arena energy.", judge: "Judge Rockstar", emoji: "🎸" },
  { text: "Hypothesis: you're funny. Let's test it.", judge: "Judge Scientist", emoji: "🔬" },
  { text: "Your humor will be measured. Precisely.", judge: "Judge Scientist", emoji: "🔬" },
  { text: "Everyone's a winner! But also, someone has to lose.", judge: "Judge Wholesome", emoji: "🌈" },
  { text: "I believe in you! Now don't let me down.", judge: "Judge Wholesome", emoji: "🌈" },
  { text: "I've witnessed a million joke deaths. Don't join them.", judge: "Judge Reaper", emoji: "💀" },
  { text: "Make me laugh, or join my list.", judge: "Judge Reaper", emoji: "💀" },
  { text: "A rivalry isn't personal. Okay, it's a little personal.", judge: "Judge Diva", emoji: "🎬" },
  { text: "Two enter. One leaves slightly smugger.", judge: "Judge Savage", emoji: "🔥" },
  { text: "The best rivalries are built on mutual respect. And trash talk.", judge: "Judge Coach", emoji: "💪" },
];

// Greeting rotations for returning users
const GREETINGS = [
  (name) => `Hey ${name}!`,
  (name) => `Let's go, ${name}!`,
  (name) => `Back for more, ${name}?`,
  (name) => `${name}! Welcome back.`,
  (name) => `${name}'s here!`,
  (name) => `${name} has entered.`,
  (name) => `Oh, it's on, ${name}.`,
  (name) => `${name}! Let's do this.`,
  (name) => `Ready, ${name}?`,
  (name) => `Hey hey, ${name}!`,
  (name) => `${name}'s back!`,
  (name) => `What's up, ${name}?`,
];

// Prompt categories
const PROMPT_CATEGORIES = [
  { key: 'mixed', label: 'Surprise Me', emoji: '🔀' },
  { key: 'pop_culture', label: 'Pop Culture', emoji: '🌟' },
  { key: 'deep_think', label: 'Deep Think', emoji: '🤔' },
  { key: 'edgy', label: 'More Edgy', emoji: '🌶️' },
  { key: 'absurd', label: 'Totally Absurd', emoji: '😂' },
  { key: 'everyday', label: 'Everyday', emoji: '☕' },
];

// Helper: Save profile to localStorage history
function saveProfileToHistory(profile) {
  const recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
  const profileInfo = {
    id: profile.id,
    name: profile.name,
    code: profile.code,
    avatar: profile.avatar
  };
  
  // Remove duplicate if exists, then add to front
  const updated = [profileInfo, ...recentProfiles.filter(p => p.id !== profile.id)];
  localStorage.setItem('recentProfiles', JSON.stringify(updated.slice(0, 10))); // Keep last 10
}

export default function Screen1({ onNavigate }) {
  // Routing state
  const [currentState, setCurrentState] = useState(null); // 'A' | 'B' | 'C' | null
  const [loading, setLoading] = useState(true);
  
  // Profile data
  const [profile, setProfile] = useState(null);
  const [rivalry, setRivalry] = useState(null);
  
  // Form state (State A: Create Profile)
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    avatar: AVATARS[0],
    phone: '',
    bio: '',
    sms_consent: false
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Resume state (State A)
  const [resumeCode, setResumeCode] = useState('');
  const [resumeError, setResumeError] = useState('');
  const [isResuming, setIsResuming] = useState(false);
  
  // Judge quote (State A)
  const [judgeQuote] = useState(() => 
    JUDGE_QUOTES[Math.floor(Math.random() * JUDGE_QUOTES.length)]
  );
  
  // Greeting rotation (State B)
  const [greetingIndex] = useState(() => 
    Math.floor(Math.random() * GREETINGS.length)
  );
  
  // Forgot code state (State A)
  const [showForgotCodeModal, setShowForgotCodeModal] = useState(false);
  const [forgotCodePhone, setForgotCodePhone] = useState('');
  const [forgotCodeProfiles, setForgotCodeProfiles] = useState([]);
  const [forgotCodeError, setForgotCodeError] = useState('');
  const [isForgotCodeLoading, setIsForgotCodeLoading] = useState(false);
  const [forgotCodeSent, setForgotCodeSent] = useState(false); // New: tracks if SMS was sent
  
  // Join rivalry state (State B)
  const [friendCode, setFriendCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const isCreatingRivalryRef = useRef(false); // Track if currently creating rivalry (use ref to avoid closure issues)
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [stakes, setStakes] = useState(''); // What the rivalry is playing for
  const [challengerStakes, setChallengerStakes] = useState(null); // Stakes set by challenger (fetched when joining)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isAutoAccepting, setIsAutoAccepting] = useState(false);
  const [hasShownJoinAlert, setHasShownJoinAlert] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // New state for collapsible Start section
  const [showStartExpanded, setShowStartExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('mixed');

  // Pending invite state (from /join link)
  const [pendingInvite, setPendingInvite] = useState(null); // { code, friendName, friendId }

  // Invite code state (for creating rivalries)
  const [inviteCode, setInviteCode] = useState(null); // The generated 4-char code
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Scroll to top when currentState changes
  useEffect(() => {
    if (currentState) {
      window.scrollTo(0, 0);
    }
  }, [currentState]);

  // Get URL search params for profile switching from SMS links
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine which state to show on mount
  useEffect(() => {
    async function determineState() {
      try {
        // Check for profile ID and show ID in URL params (from SMS notification links)
        const profileIdFromUrl = searchParams.get('p');
        const showIdFromUrl = searchParams.get('show');
        
        if (profileIdFromUrl) {
          // Verify this profile exists before switching to it
          const { data: urlProfile, error: urlProfileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', profileIdFromUrl)
            .single();
          
          if (!urlProfileError && urlProfile) {
            // Valid profile - switch to it
            localStorage.setItem('activeProfileId', profileIdFromUrl);
            // Store show ID for verdict viewing if present
            if (showIdFromUrl) {
              sessionStorage.setItem('pendingVerdictShowId', showIdFromUrl);
            }
            // Clear the URL params to avoid issues on refresh
            searchParams.delete('p');
            searchParams.delete('show');
            setSearchParams(searchParams, { replace: true });
          }
        }

        // Check for pending invite from /join link
        const pendingCode = sessionStorage.getItem('pendingRivalryCode');
        const pendingFriendName = sessionStorage.getItem('pendingRivalryFriendName');
        const pendingFriendId = sessionStorage.getItem('pendingRivalryFriendId');
        const pendingStakes = sessionStorage.getItem('pendingRivalryStakes');
        const pendingCategory = sessionStorage.getItem('pendingRivalryCategory');
        
        if (pendingCode && pendingFriendName && pendingFriendId) {
          setPendingInvite({
            code: pendingCode,
            friendName: pendingFriendName,
            friendId: pendingFriendId,
            stakes: pendingStakes || null,
            category: pendingCategory || 'mixed'
          });
        }

        // For MVP: Check localStorage for active profile
        const activeProfileId = localStorage.getItem('activeProfileId');
        
        if (!activeProfileId) {
          // No profile → State A
          setCurrentState('A');
          setLoading(false);
          return;
        }

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeProfileId)
          .single();

        if (profileError) {
          // Check if it's a network error (offline) vs profile not found
          // PGRST116 = "not found" from .single() - this is NOT a network error
          const isNotFoundError = profileError.code === 'PGRST116';
          const isNetworkError = !navigator.onLine || 
            profileError.message?.toLowerCase().includes('failed to fetch') ||
            profileError.message?.toLowerCase().includes('network') ||
            profileError.code === 'NETWORK_ERROR';
          
          if (isNetworkError && !isNotFoundError) {
            // Offline - stay on loading or show a minimal state
            // Don't remove the profile ID, just wait for reconnect
            console.log('Offline - waiting for connection');
            setLoading(false);
            // Default to State B if we have a profile ID (assume they have a profile)
            setCurrentState('B');
            return;
          }
          
          // Actual error (profile deleted, not found, etc.) → State A
          localStorage.removeItem('activeProfileId');
          setCurrentState('A');
          setLoading(false);
          return;
        }

        if (!profileData) {
          // Profile not found → State A
          localStorage.removeItem('activeProfileId');
          setCurrentState('A');
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Check if this profile needs onboarding (hasn't completed it yet)
        if (!profileData.onboarding_completed && profileData.phone) {
          // Check if any OTHER profile with same phone has completed onboarding
          const { data: completedProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', profileData.phone)
            .eq('onboarding_completed', true)
            .limit(1);
          
          if (!completedProfiles || completedProfiles.length === 0) {
            // No profiles on this phone have completed onboarding - show it
            setShowOnboarding(true);
            setLoading(false);
            return;
          }
        }

      // Check for active rivalry
const { data: rivalryData, error: rivalryError } = await supabase
  .from('rivalries')
  .select('*')
  .or(`profile_a_id.eq.${activeProfileId},profile_b_id.eq.${activeProfileId}`)
  .eq('status', 'active');

if (rivalryError) {
  // Check if it's a network error
  const isNetworkError = !navigator.onLine || 
    rivalryError.message?.toLowerCase().includes('failed to fetch') ||
    rivalryError.message?.toLowerCase().includes('network');
  
  if (isNetworkError) {
    // Offline - show State B (challenge screen) as safe default
    setCurrentState('B');
    setLoading(false);
    return;
  }
  // If it's some other error, continue - rivalryData will be null/empty
}

if (!rivalryData || rivalryData.length === 0) {
  // No active rivalry - check for unseen completed rivalries first
  const isProfileA = true; // We'll check both columns
  
  const { data: unseenRivalry, error: unseenError } = await supabase
    .from('rivalries')
    .select('*, profile_a:profiles!rivalries_profile_a_id_fkey(id, name), profile_b:profiles!rivalries_profile_b_id_fkey(id, name)')
    .eq('status', 'complete')
    .or(`profile_a_id.eq.${activeProfileId},profile_b_id.eq.${activeProfileId}`)
    .or(`and(profile_a_id.eq.${activeProfileId},profile_a_seen_summary.eq.false),and(profile_b_id.eq.${activeProfileId},profile_b_seen_summary.eq.false)`)
    .limit(1)
    .maybeSingle();
  
  if (!unseenError && unseenRivalry) {
    // Route to summary screen for this unseen rivalry
    onNavigate('summary', {
      rivalryId: unseenRivalry.id,
      activeProfileId: activeProfileId,
      context: 'from_unseen'
    });
    return;
  }
  
  // Has profile, no active rivalry, no unseen summaries → State B
  setCurrentState('B');
  setLoading(false);
  
  // Check if there's a pending rivalry code from deep link
  const pendingCode = sessionStorage.getItem('pendingRivalryCode');
  if (pendingCode) {
    setFriendCode(pendingCode);
    sessionStorage.removeItem('pendingRivalryCode');
  }
  
  return;
}

const rivalry = rivalryData[0]; // Get first rivalry from array
setRivalry(rivalry); // ← YES, keep this but use 'rivalry' variable

// Check for pending verdict from SMS link
const pendingVerdictShowId = sessionStorage.getItem('pendingVerdictShowId');
if (pendingVerdictShowId) {
  sessionStorage.removeItem('pendingVerdictShowId');
  // Navigate to gameplay with the specific showId
  // This will show the verdict for that specific round before continuing
  onNavigate('screen4', { 
    activeProfileId: profileData.id,
    rivalryId: rivalry.id,
    showId: pendingVerdictShowId
  });
  return;
}

// Has rivalry - always go to screen4 (intro flow will show if needed)
onNavigate('screen4', { 
  activeProfileId: profileData.id,
  rivalryId: rivalry.id
});
return;
      } catch (err) {
        console.error('Error determining state:', err);
        
        // Check if offline
        if (!navigator.onLine) {
          // Don't log out, just show State B as safe default
          setCurrentState('B');
          setLoading(false);
          return;
        }
        
        setCurrentState('A');
        setLoading(false);
      }
    }

    determineState();
  }, []);

  // Auto-accept pending invite when in State B (run only once)
  useEffect(() => {
    if (currentState === 'B' && pendingInvite && !isAutoAccepting) {
      setIsAutoAccepting(true);
      handleAcceptPendingInvite();
    }
  }, [currentState, pendingInvite, isAutoAccepting]);

// Real-time subscription for rivalry updates (State B and C)
useEffect(() => {
  if (!profile) return;
  if (currentState !== 'B' && currentState !== 'C') return;

  const channel = supabase
    .channel('rivalry-updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rivalries'
      },
      (payload) => {
        // Only relevant in State B
        if (currentState !== 'B') return;
        
        const newRivalry = payload.new;
        
        // Check if this rivalry involves current profile
        const involvesMe = 
          newRivalry.profile_a_id === profile.id || 
          newRivalry.profile_b_id === profile.id;
        
        if (!involvesMe) return;
        
        // Don't show alert if I'm the one creating this rivalry
        if (isCreatingRivalryRef.current) return;
        
        // Don't show alert if I'm auto-accepting (I created this rivalry via /join)
        if (isAutoAccepting) return;
        
        // Don't show alert if we've already shown it for this rivalry
        if (hasShownJoinAlert) return;
        
        // Get opponent ID
        const opponentId = newRivalry.profile_a_id === profile.id 
          ? newRivalry.profile_b_id 
          : newRivalry.profile_a_id;

        // Fetch opponent name
        supabase
          .from('profiles')
          .select('name')
          .eq('id', opponentId)
          .single()
          .then(({ data: opponent }) => {
            if (opponent) {
              // Show toast notification (only once)
              setHasShownJoinAlert(true);
              alert(`🎉 ${opponent.name} joined your Rivalry!`);
              
              // Navigate directly to gameplay - the intro flow will show there
              onNavigate('screen4', {
                activeProfileId: profile.id,
                rivalryId: newRivalry.id
              });
            }
          });
      }
    )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'rivalries'
    },
    (payload) => {
      // Only update rivalry data if we're already in State C
      if (currentState !== 'C') return;
      
      const updatedRivalry = payload.new;
      
      // Check if this is MY rivalry
      const isMyRivalry = updatedRivalry.id === rivalry?.id;
      
      if (!isMyRivalry) return;
      
      // Update rivalry state with new data
      setRivalry(updatedRivalry);
    }
  )
  .on(
  'postgres_changes',
  {
    event: 'DELETE',
    schema: 'public',
    table: 'rivalries'
  },
  (payload) => {
    // Only relevant in State C
    if (currentState !== 'C') return;
    
    const deletedRivalry = payload.old;
    
    // Check if this was MY rivalry
    const wasMyRivalry = deletedRivalry.id === rivalry?.id;
    
    if (!wasMyRivalry) return;
    
    // Use the rivalry state variable (which has full data) instead of payload.old
    const opponentId = rivalry.profile_a_id === profile.id 
      ? rivalry.profile_b_id 
      : rivalry.profile_a_id;

    // Fetch opponent name
    supabase
      .from('profiles')
      .select('name')
      .eq('id', opponentId)
      .single()
      .then(({ data: opponent }) => {
        if (opponent) {
          // Show notification
          alert(`😢 Rivalry Ended\n\n${opponent.name} cancelled your Rivalry.\n\nYour history has been saved.`);
        } else {
          // Fallback if we can't get opponent name
          alert(`😢 Rivalry Ended\n\nYour opponent cancelled your Rivalry.\n\nYour history has been saved.`);
        }
        
        // Reload to go back to State B
        window.location.reload();
      });
  }
)
    .subscribe();

  // Cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}, [currentState, profile, isAutoAccepting, hasShownJoinAlert]);

// Real-time subscription for first show creation (State C)
useEffect(() => {
  if (!rivalry) return;
  if (currentState !== 'C') return;

  const channel = supabase
    .channel('first-show-creation')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shows',
        filter: `rivalry_id=eq.${rivalry.id}`
      },
      (payload) => {
        // First show was created, navigate to Screen 4
        onNavigate('screen4', {
          activeProfileId: profile.id,
          rivalryId: rivalry.id
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [rivalry, currentState, profile]);

  // STATE A: Create Profile
  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      // Validate name
      if (!formData.name.trim()) {
        setFormError('Name is required');
        setIsSubmitting(false);
        return;
      }

      // Validate phone
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        setFormError(phoneValidation.error);
        setIsSubmitting(false);
        return;
      }

      // Normalize phone number
      const normalizedPhone = normalizePhone(formData.phone);

      // Generate unique code
      const code = generateCode();

      // Create profile
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          code: code,
          name: formData.name.trim(),
          avatar: formData.avatar,
          phone: normalizedPhone,
          bio: formData.bio.trim() || null,
          sms_consent: formData.sms_consent
        })
        .select()
        .single();

      if (error) throw error;

      // Save to localStorage
      localStorage.setItem('activeProfileId', newProfile.id);
      saveProfileToHistory(newProfile);
      
      // Update state
      setProfile(newProfile);
      
      // Check if there's a pending invite - if so, skip onboarding and auto-start rivalry
      if (pendingInvite) {
        await startRivalryWithPendingInvite(newProfile);
      } else {
        // Check if this phone number has already completed onboarding
        let shouldShowOnboarding = true;
        
        if (normalizedPhone) {
          const { data: existingProfiles } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('phone', normalizedPhone)
            .eq('onboarding_completed', true)
            .limit(1);
          
          if (existingProfiles && existingProfiles.length > 0) {
            shouldShowOnboarding = false;
          }
        }
        
        if (shouldShowOnboarding) {
          setShowOnboarding(true);
          setShowForm(false);
        } else {
          setCurrentState('B');
          setShowForm(false);
        }
      }
      
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error creating profile:', err);
      setFormError(err.message || 'Failed to create profile');
      setIsSubmitting(false);
    }
  };

  // STATE A: Resume with Code
  const handleResume = async () => {
    setResumeError('');
    setIsResuming(true);

    try {
      const formattedCode = formatCodeInput(resumeCode);

      // Validate format
      if (!isValidCodeFormat(formattedCode)) {
        setResumeError('Hmm, that doesn\'t look right');
        setIsResuming(false);
        return;
      }

      // Find profile by code
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('code', formattedCode)
        .single();

      if (error || !existingProfile) {
        setResumeError('We couldn\'t find that one. Double check?');
        setIsResuming(false);
        return;
      }

      // Save to localStorage
      localStorage.setItem('activeProfileId', existingProfile.id);
      saveProfileToHistory(existingProfile);

      // Reload to determine state
      window.location.reload();
    } catch (err) {
      console.error('Error resuming:', err);
      setResumeError('Something went wrong. Try again?');
      setIsResuming(false);
    }
  };

  // Forgot code handler - sends SMS verification (or bypasses on localhost for dev testing)
  const handleForgotCode = async () => {
    setForgotCodeError('');
    setIsForgotCodeLoading(true);

    try {
      // Normalize phone before lookup
      const normalizedPhone = normalizePhone(forgotCodePhone);
      
      if (!normalizedPhone) {
        setForgotCodeError('Please enter a valid 10-digit US phone number.');
        setIsForgotCodeLoading(false);
        return;
      }

      // DEV MODE: On localhost, skip SMS verification and show profiles directly
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isDev) {
        // Old flow: look up profiles directly
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, code, avatar, phone')
          .eq('phone', normalizedPhone);

        if (error) throw error;

        if (!profiles || profiles.length === 0) {
          setForgotCodeError('No profiles found with that phone number.');
          setIsForgotCodeLoading(false);
          return;
        }

        if (profiles.length === 1) {
          // Auto-resume single profile
          const profile = profiles[0];
          localStorage.setItem('activeProfileId', profile.id);
          saveProfileToHistory(profile);
          window.location.reload();
        } else {
          // Show list of profiles (alphabetized by name)
          const sortedProfiles = [...profiles].sort((a, b) => a.name.localeCompare(b.name));
          setForgotCodeProfiles(sortedProfiles);
          setIsForgotCodeLoading(false);
        }
        return;
      }

      // PRODUCTION: Call send-auth edge function
      const { data, error } = await supabase.functions.invoke('send-auth', {
        body: { phone: normalizedPhone }
      });

      if (error) throw error;

      if (!data.success) {
        if (data.reason === 'no_profiles') {
          setForgotCodeError('No profiles found with that phone number.');
        } else {
          setForgotCodeError(data.message || 'Failed to send verification code.');
        }
        setIsForgotCodeLoading(false);
        return;
      }

      // Success - show "check your texts" message
      setForgotCodeSent(true);
      setIsForgotCodeLoading(false);

    } catch (err) {
      console.error('Error sending auth code:', err);
      setForgotCodeError('Failed to send verification code. Try again.');
      setIsForgotCodeLoading(false);
    }
  };

  // Auto-start rivalry with pending invite (from /join link)
  const startRivalryWithPendingInvite = async (userProfile) => {
    try {
      isCreatingRivalryRef.current = true;
      
      // Use stakes and category from pendingInvite
      const rivalryStakes = pendingInvite.stakes || null;
      const promptCategory = pendingInvite.category || 'mixed';
      
      // Select 3 judges for the entire rivalry
      const judgeObjects = await selectJudges();
      const judgeKeys = judgeObjects.map(j => j.key);
      
      // Create rivalry (always put lower ID as profile_a for consistency)
      const [profileAId, profileBId] = [userProfile.id, pendingInvite.friendId].sort();

      const { data: newRivalry, error: rivalryError } = await supabase
        .from('rivalries')
        .insert({
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          mic_holder_id: userProfile.id, // Joiner holds mic initially
          first_show_started: false,
          stakes: rivalryStakes,
          judges: judgeKeys,
          prompt_category: promptCategory
        })
        .select()
        .single();

      if (rivalryError) throw rivalryError;

      // Mark invite code as used
      await supabase
        .from('rivalry_invites')
        .update({ 
          used_at: new Date().toISOString(),
          accepted_by_profile_id: userProfile.id
        })
        .eq('code', pendingInvite.code);

      // Generate Ripley's intro text
      try {
        const emceeResponse = await supabase.functions.invoke('select-emcee-line', {
          body: {
            rivalryId: newRivalry.id,
            showNumber: 0,
            triggerType: 'rivalry_intro'
          }
        });

        if (emceeResponse.data?.emcee_text) {
          await supabase
            .from('rivalries')
            .update({ intro_emcee_text: emceeResponse.data.emcee_text })
            .eq('id', newRivalry.id);
          
          newRivalry.intro_emcee_text = emceeResponse.data.emcee_text;
        }
      } catch (emceeErr) {
        console.error('Failed to generate intro text:', emceeErr);
      }

      // Clear pending invite from session storage
      sessionStorage.removeItem('pendingRivalryCode');
      sessionStorage.removeItem('pendingRivalryFriendName');
      sessionStorage.removeItem('pendingRivalryFriendId');
      sessionStorage.removeItem('pendingRivalryStakes');
      sessionStorage.removeItem('pendingRivalryCategory');
      setPendingInvite(null);

      // Send rivalry_started SMS to the friend (creator who shared their code)
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            userId: pendingInvite.friendId,
            notificationType: 'rivalry_started',
            contextData: {
              opponent: userProfile.name
            }
          }
        });
      } catch (smsErr) {
        console.error('Failed to send rivalry_started SMS:', smsErr);
      }

      // Navigate directly to gameplay
      isCreatingRivalryRef.current = false;
      onNavigate('screen4', {
        activeProfileId: userProfile.id,
        rivalryId: newRivalry.id
      });
    } catch (err) {
      console.error('Error starting rivalry:', err);
      setFormError('Failed to start rivalry. Please try again.');
      setCurrentState('B');
      setShowForm(false);
      isCreatingRivalryRef.current = false; // Clear the flag on error too
    }
  };

  // Accept pending invite challenge (when user already has profile)
  const handleAcceptPendingInvite = async () => {
    setIsJoining(true);
    await startRivalryWithPendingInvite(profile);
    setIsJoining(false);
  };

  // STATE B: Join Rivalry (using invite code)
  const handleJoinRivalry = async () => {
    setJoinError('');
    setIsJoining(true);
    isCreatingRivalryRef.current = true;

    try {
      const code = friendCode.toUpperCase();

      // Validate format (4 chars)
      if (code.length !== 4) {
        setJoinError('Hmm, that code didn\'t work. Double check it?');
        setIsJoining(false);
        return;
      }

      // Look up invite code
      const { data: invite, error: inviteError } = await supabase
        .from('rivalry_invites')
        .select(`
          *,
          creator:profiles!rivalry_invites_creator_profile_id_fkey(id, name)
        `)
        .eq('code', code)
        .single();

      if (inviteError || !invite) {
        setJoinError('Hmm, that code didn\'t work. Double check it?');
        setIsJoining(false);
        return;
      }

      // Check if expired
      if (new Date(invite.expires_at) < new Date()) {
        setJoinError('This code expired. Time for a fresh one!');
        setIsJoining(false);
        return;
      }

      // Check if already used
      if (invite.used_at) {
        setJoinError('This invite has already been used.');
        setIsJoining(false);
        return;
      }

      // Check if entering own code
      if (invite.creator_profile_id === profile.id) {
        setJoinError('Nice try, but you can\'t challenge yourself!');
        setIsJoining(false);
        return;
      }

      const friendId = invite.creator_profile_id;
      const friendName = invite.creator?.name || 'Friend';

      // Check if EITHER player is already in a rivalry
      const { data: anyExistingRivalries } = await supabase
        .from('rivalries')
        .select('id, profile_a_id, profile_b_id')
        .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id},profile_a_id.eq.${friendId},profile_b_id.eq.${friendId}`)
        .eq('status', 'active');

      if (anyExistingRivalries && anyExistingRivalries.length > 0) {
        const myRivalry = anyExistingRivalries.find(r => 
          r.profile_a_id === profile.id || r.profile_b_id === profile.id
        );
        
        if (myRivalry) {
          setJoinError("You're already in a rivalry. Finish or cancel it first!");
          setIsJoining(false);
          return;
        }
        
        setJoinError(`${friendName} is already in a rivalry. Try again later!`);
        setIsJoining(false);
        return;
      }

      // Get stakes and category from invite
      const rivalryStakes = invite.stakes || null;
      const promptCategory = invite.prompt_category || 'mixed';

      // Select 3 judges for the entire rivalry
      const judgeObjects = await selectJudges();
      const judgeKeys = judgeObjects.map(j => j.key);

      // Create rivalry (always put lower ID as profile_a for consistency)
      const [profileAId, profileBId] = [profile.id, friendId].sort();

      const { data: newRivalry, error: rivalryError } = await supabase
        .from('rivalries')
        .insert({
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          mic_holder_id: profile.id, // Joiner holds mic initially (they go first)
          first_show_started: false,
          stakes: rivalryStakes,
          judges: judgeKeys,
          prompt_category: promptCategory
        })
        .select()
        .single();

      if (rivalryError) throw rivalryError;

      // Mark invite as used
      await supabase
        .from('rivalry_invites')
        .update({ 
          used_at: new Date().toISOString(),
          accepted_by_profile_id: profile.id
        })
        .eq('id', invite.id);

      // Generate Ripley's intro text
      try {
        const emceeResponse = await supabase.functions.invoke('select-emcee-line', {
          body: {
            rivalryId: newRivalry.id,
            showNumber: 0,
            triggerType: 'rivalry_intro'
          }
        });

        if (emceeResponse.data?.emcee_text) {
          await supabase
            .from('rivalries')
            .update({ intro_emcee_text: emceeResponse.data.emcee_text })
            .eq('id', newRivalry.id);
          
          newRivalry.intro_emcee_text = emceeResponse.data.emcee_text;
        }
      } catch (emceeErr) {
        console.error('Failed to generate intro text:', emceeErr);
      }

      // Send rivalry_started SMS to the creator
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            userId: friendId,
            notificationType: 'rivalry_started',
            contextData: {
              opponent: profile.name
            }
          }
        });
      } catch (smsErr) {
        console.error('Failed to send rivalry_started SMS:', smsErr);
      }

      // Navigate to gameplay
      isCreatingRivalryRef.current = false;
      onNavigate('screen4', {
        activeProfileId: profile.id,
        rivalryId: newRivalry.id
      });
    } catch (err) {
      console.error('Error joining rivalry:', err);
      setJoinError(err.message || 'Failed to start rivalry');
      setIsJoining(false);
      isCreatingRivalryRef.current = false;
    }
  };

  // STATE C: Start First Show
  const handleStartFirstShow = async () => {
    try {
      // Mark first show as started
      await supabase
        .from('rivalries')
        .update({ first_show_started: true })
        .eq('id', rivalry.id);

      // Get a random prompt and judges from database
      const prompt = await getRandomPrompt();
      const judgeObjects = await selectJudges();
      const judgeKeys = judgeObjects.map(j => j.key);

      // Create first show
      const { data: showData, error: showError } = await supabase
        .from('shows')
        .insert({
          rivalry_id: rivalry.id,
          show_number: 1,
          prompt_id: prompt.id,
          prompt: prompt.text,
          judges: judgeKeys,
          profile_a_id: rivalry.profile_a_id,
          profile_b_id: rivalry.profile_b_id,
          status: 'waiting'
        })
        .select();

      if (showError) {
        console.error('Error creating first show:', showError);
        return;
      }

      // Navigate to Screen 4
      onNavigate('screen4', {
        activeProfileId: profile.id,
        rivalryId: rivalry.id
      });
    } catch (err) {
      console.error('Error starting first show:', err);
    }
  };

  async function handleCancelRivalry() {
  console.log('Canceling rivalry:', rivalry);
  try {
    // Delete the rivalry row completely
    const { error } = await supabase
      .from('rivalries')
      .delete()
      .eq('id', rivalry.id);

    if (error) throw error;

    setShowCancelModal(false);
    setShowMenu(false);
    
    // Reload to go back to State B
    window.location.reload();
  } catch (err) {
    console.error('Error cancelling rivalry:', err);
  }
}

  // Lookup invite stakes when code is entered in join modal
  const lookupInviteStakes = async (code) => {
    if (!code || code.length !== 4) {
      setChallengerStakes(null);
      return;
    }
    
    try {
      const { data: invite } = await supabase
        .from('rivalry_invites')
        .select(`
          stakes,
          creator_profile_id,
          expires_at,
          used_at,
          creator:profiles!rivalry_invites_creator_profile_id_fkey(name)
        `)
        .eq('code', code.toUpperCase())
        .single();
      
      if (invite && !invite.used_at && new Date(invite.expires_at) > new Date()) {
        setChallengerStakes({
          name: invite.creator?.name || 'Friend',
          stakes: invite.stakes
        });
      } else {
        setChallengerStakes(null);
      }
    } catch (err) {
      setChallengerStakes(null);
    }
  };

  // Get random stakes suggestion
  const getRandomStakes = () => {
    const randomIndex = Math.floor(Math.random() * STAKES_SUGGESTIONS.length);
    setStakes(STAKES_SUGGESTIONS[randomIndex]);
  };

  // Generate a unique 4-character invite code
  const generateInviteCode = async () => {
    setIsGeneratingInvite(true);
    setInviteError('');
    
    try {
      // Generate random 4-char code (uppercase + digits, excluding confusing chars)
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No 0, O, 1, I, L
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Check if code already exists (and is not expired/used)
      const { data: existing } = await supabase
        .from('rivalry_invites')
        .select('id')
        .eq('code', code)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (existing) {
        // Rare collision - try again
        return generateInviteCode();
      }
      
      // Create the invite
      const { data: invite, error } = await supabase
        .from('rivalry_invites')
        .insert({
          code: code,
          creator_profile_id: profile.id,
          stakes: stakes.trim() || null,
          prompt_category: selectedCategory
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setInviteCode(code);
    } catch (err) {
      console.error('Failed to generate invite code:', err);
      setInviteError('Failed to create invite. Try again.');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // Copy invite code to clipboard
  const handleCopyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share invite via SMS (opens native SMS)
  const handleShareInviteSMS = () => {
    const stakesLine = stakes.trim() ? `\nPlaying for: ${stakes.trim()} 🎯\n` : '';
    const message = stakes.trim() 
      ? `Hey! I challenge you to One-Upper - we answer weird prompts and AI judges decide who one-upped the other.\n${stakesLine}\nJoin with code: ${inviteCode}\nOr tap: https://oneupper.app/join/${inviteCode}\n\nLet the rivalry begin! 🎤`
      : `I challenge you to One-Upper! 🎤\n\nJoin with code: ${inviteCode}\nOr tap: https://oneupper.app/join/${inviteCode}\n\nLet's see who's got the better one-liners.`;
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };

  // Reset invite code (to create a new one)
  const resetInviteCode = () => {
    setInviteCode(null);
    setInviteError('');
  };

  // Show onboarding flow if triggered
  if (showOnboarding && profile) {
    return (
      <OnboardingFlow
        profile={profile}
        onComplete={() => {
          setShowOnboarding(false);
          setCurrentState('B');
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // STATE A: Create Profile
  if (currentState === 'A') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        {!showForm ? <HeaderWithBack backTo="/go" /> : <Header />}
        <div className="max-w-md mx-auto">
          
          {/* Show personalized message if coming from /join link */}
          {pendingInvite && (
            <div className="text-center mb-6">
              <p className="text-xl font-bold text-orange-500">
                {pendingInvite.friendName} just challenged you!
              </p>
              {pendingInvite.stakes && (
                <p className="text-slate-300 mt-2">
                  Playing for: <span className="text-orange-400 font-semibold">🎯 {pendingInvite.stakes}</span>
                </p>
              )}
            </div>
          )}

          {!showForm ? (
            <>
              {/* Tagline */}
              <h1 className="text-2xl font-bold text-orange-400 text-center mb-8">
                Ready to out-think a friend?
              </h1>
              
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-4 bg-orange-500 text-white font-semibold rounded-xl shadow-lg hover:bg-orange-400 transition-all text-lg"
              >
                Create Your Profile
              </button>

              {/* Resume Section */}
              <div className="mt-8">
                <p className="text-slate-300 text-center text-sm mb-3">
                  Back for more?
                </p>
                
                {/* Inline input + Go button */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resumeCode}
                    onChange={(e) => setResumeCode(e.target.value.toUpperCase())}
                    placeholder="Your Profile ID"
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg"
                  />
                  <button
                    onClick={handleResume}
                    disabled={!resumeCode.trim() || isResuming}
                    className="px-6 py-3 bg-slate-700 text-slate-200 font-semibold rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResuming ? '...' : 'Go'}
                  </button>
                </div>
                
                {resumeError && (
                  <p className="text-red-400 text-sm mt-2 text-center">{resumeError}</p>
                )}
                
                {/* Forgot Code Link */}
                <button
                  onClick={() => setShowForgotCodeModal(true)}
                  className="w-full mt-3 text-slate-500 text-sm hover:text-slate-400 transition-colors"
                >
                  Forgot your Profile ID?
                </button>
              </div>

              {/* Judge Quote */}
              {judgeQuote && (
                <div className="text-center mt-12">
                  <p className="text-slate-400 italic text-sm">
                    {judgeQuote.text}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {judgeQuote.emoji} {judgeQuote.judge}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Profile Creation Form */
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <h3 className="text-xl font-bold text-orange-500 mb-4 text-center">
                Create Your Profile
              </h3>
              
              {/* Avatar Picker */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Pick your fighter:
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: av })}
                      className={`text-4xl p-4 rounded-lg transition-all bg-slate-700/50 hover:bg-slate-600/50 ${
                        formData.avatar === av
                          ? 'ring-2 ring-orange-500 bg-slate-600/50'
                          : ''
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Name Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  What do they call you?
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              {/* Phone Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Phone:
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="415-555-1234"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">US phone number (10 digits)</p>
              </div>

              {/* Bio Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Brag a little:
                </label>
                <input
                  type="text"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="I once got a standing ovation for parallel parking..."
                  maxLength={100}
                  required
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1 text-right">{formData.bio?.length || 0}/100</p>
              </div>

              {/* SMS Consent */}
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sms_consent}
                    onChange={(e) => setFormData({ ...formData, sms_consent: e.target.checked })}
                    className="mt-1 w-4 h-4 text-orange-500 bg-slate-700 border-slate-500 rounded focus:ring-orange-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-slate-200">
                      Send me text notifications about my games
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Get notified when it's your turn and results are ready (~3-6 msgs per rivalry). Msg & data rates may apply. Reply STOP to opt out anytime.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <a href="/terms" className="text-orange-500 hover:text-orange-400 underline">Terms</a>
                      {' | '}
                      <a href="/privacy" className="text-orange-500 hover:text-orange-400 underline">Privacy</a>
                    </p>
                  </div>
                </label>
              </div>
              
              {formError && (
                <p className="text-red-400 text-sm">{formError}</p>
              )}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Let\'s Go'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full py-3 bg-slate-600/50 text-slate-200 font-medium rounded-lg border border-slate-500 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Forgot Code Modal */}
          {showForgotCodeModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 border border-slate-700 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-orange-500">
                    Find Your Profile
                  </h3>
                  <button
                    onClick={() => {
                      setShowForgotCodeModal(false);
                      setForgotCodePhone('');
                      setForgotCodeProfiles([]);
                      setForgotCodeError('');
                      setForgotCodeSent(false);
                    }}
                    className="text-slate-400 hover:text-slate-200 text-2xl"
                  >
                    ✕
                  </button>
                </div>
                
                {forgotCodeSent ? (
                  /* SMS Sent confirmation */
                  <div className="text-center py-4">
                    <div className="text-4xl mb-3">📱</div>
                    <p className="text-slate-200 mb-2">Check your texts!</p>
                    <p className="text-slate-400 text-sm">
                      We sent a link to sign in to your profile(s).
                    </p>
                  </div>
                ) : forgotCodeProfiles.length > 0 ? (
                  /* Show list of profiles (dev mode) */
                  <div className="space-y-2">
                    <p className="text-slate-300 text-sm">
                      Found {forgotCodeProfiles.length} profile{forgotCodeProfiles.length > 1 ? 's' : ''} with that number:
                    </p>
                    {forgotCodeProfiles.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          localStorage.setItem('activeProfileId', p.id);
                          saveProfileToHistory(p);
                          window.location.reload();
                        }}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-left p-3 rounded-lg transition-colors"
                      >
                        <span className="text-xl mr-2">{p.avatar}</span>
                        <span className="text-slate-100">{p.name}</span>
                        <span className="text-slate-400 text-sm ml-2">{p.code}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Phone input */
                  <>
                    <p className="text-slate-300 text-sm">
                      What phone number is on your profile?
                    </p>
                    
                    <input
                      type="tel"
                      value={forgotCodePhone}
                      onChange={(e) => setForgotCodePhone(e.target.value)}
                      placeholder="415-555-1234"
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                    />
                    
                    {forgotCodeError && (
                      <p className="text-red-400 text-sm">{forgotCodeError}</p>
                    )}
                    
                    <button
                      onClick={handleForgotCode}
                      disabled={!forgotCodePhone.trim() || isForgotCodeLoading}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                      {isForgotCodeLoading ? 'Looking...' : 'Look Me Up'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STATE B: Start/Join Rivalry
  if (currentState === 'B') {
    return (
      <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <HeaderWithBack backTo="/go" />
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Greeting Row - Centered text with menu on right */}
          <div className="relative">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100">
                {GREETINGS[greetingIndex](profile.name)}
              </h2>
            </div>
            <div className="absolute top-0 right-0">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="text-slate-400 hover:text-slate-200 text-2xl"
              >
                ⋮
              </button>
              
              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-8 bg-slate-700 border border-slate-600 rounded-lg shadow-lg py-2 w-48 z-20">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onNavigate && onNavigate('screen2');
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                    >
                      Your Profiles
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowHowToPlay(true);
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                    >
                      How to Play
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        localStorage.removeItem('activeProfileId');
                        window.location.reload();
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Challenge a Friend Section OR Auto-accepting loading */}
          {isAutoAccepting ? (
            /* Show loading while auto-accepting */
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎤</div>
              <p className="text-xl text-slate-300 mb-2">
                Starting rivalry with {pendingInvite?.friendName}...
              </p>
              <p className="text-slate-400">Hold tight!</p>
            </div>
          ) : pendingInvite ? (
            /* Show Accept Challenge flow */
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xl font-bold text-orange-500 mb-1">
                  {pendingInvite.friendName} challenged you!
                </p>
                {pendingInvite.stakes && (
                  <p className="text-slate-300 text-sm mb-2">
                    Playing for: <span className="text-orange-400 font-semibold">🎯 {pendingInvite.stakes}</span>
                  </p>
                )}
              </div>
              <button
                onClick={handleAcceptPendingInvite}
                disabled={isJoining}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-lg shadow-lg hover:bg-orange-400 transition-all disabled:opacity-50"
              >
                {isJoining ? 'Starting Rivalry...' : 'Accept Challenge'}
              </button>
              
              <button
                onClick={() => {
                  sessionStorage.removeItem('pendingRivalryCode');
                  sessionStorage.removeItem('pendingRivalryFriendName');
                  sessionStorage.removeItem('pendingRivalryFriendId');
                  setPendingInvite(null);
                }}
                className="w-full py-3 bg-slate-700/50 text-slate-300 font-medium rounded-lg hover:bg-slate-700 transition-all"
              >
                Decline
              </button>
            </div>
          ) : (
            /* Show normal Challenge/Join options - Collapsible */
            <div className="space-y-4">
              {/* Start a Rivalry - Collapsible */}
              <div className="space-y-4">
                <button
                  onClick={() => setShowStartExpanded(!showStartExpanded)}
                  className="w-full bg-orange-500 hover:bg-orange-400 text-white py-4 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <span>Start a Rivalry</span>
                  {showStartExpanded ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {/* Expanded Start Content */}
                {showStartExpanded && (
                  <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
                    {/* Category Grid */}
                    <div className="space-y-3">
                      <label className="text-sm text-slate-200 font-semibold">Set the vibe:</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PROMPT_CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                              selectedCategory === cat.key
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {cat.emoji} {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stakes input */}
                    <div className="space-y-2">
                      <label className="text-sm text-slate-200 font-semibold">Up the stakes (optional):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={stakes}
                          onChange={(e) => setStakes(e.target.value.slice(0, 50))}
                          placeholder="bragging rights? a burrito?"
                          className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-sm h-12"
                        />
                        <button
                          type="button"
                          onClick={getRandomStakes}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 rounded-lg transition-colors text-lg border border-slate-600 h-12 w-12 flex items-center justify-center"
                          title="Random suggestion"
                        >
                          🎲
                        </button>
                      </div>
                    </div>
                    
                    {/* Invite Code Section */}
                    <div className="space-y-3">
                      {!inviteCode ? (
                        <>
                          <button
                            onClick={generateInviteCode}
                            disabled={isGeneratingInvite}
                            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                          >
                            {isGeneratingInvite ? 'Generating...' : 'Generate Invite Code'}
                          </button>
                          {inviteError && (
                            <p className="text-red-400 text-sm text-center">{inviteError}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <p className="text-sm text-slate-400 mb-2">Send this to your rival:</p>
                            <div className="text-4xl font-mono font-bold text-orange-500 tracking-widest mb-1">
                              {inviteCode}
                            </div>
                            <p className="text-xs text-slate-500">Good for 24 hours</p>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={handleCopyInviteCode}
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 px-4 rounded-lg font-medium transition-colors border border-slate-600"
                            >
                              {copied ? '✓ Copied!' : 'Copy Code'}
                            </button>
                            <button
                              onClick={handleShareInviteSMS}
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 px-4 rounded-lg font-medium transition-colors border border-slate-600"
                            >
                              Share via Text
                            </button>
                          </div>
                          <button
                            onClick={resetInviteCode}
                            className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
                          >
                            Generate new code
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Join a Friend Section - Simple button */}
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-4 px-6 rounded-xl font-medium transition-colors border border-slate-600"
              >
                Got an Invite?
              </button>
            </div>
          )}

          {/* Judge Quote */}
          {judgeQuote && (
            <div className="text-center mt-8">
              <p className="text-slate-400 italic text-sm">
                {judgeQuote.text}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {judgeQuote.emoji} {judgeQuote.judge}
              </p>
            </div>
          )}

          {/* Join Modal */}
          {showJoinModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 border border-slate-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-orange-500">
                    Join a Rivalry
                  </h3>
                  <button
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinError('');
                      setFriendCode('');
                      setChallengerStakes(null);
                    }}
                    className="text-slate-400 hover:text-slate-200 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-slate-300">Enter the code:</p>

                <input
                  type="text"
                  value={friendCode}
                  onChange={(e) => {
                    // Only allow alphanumeric, max 4 chars
                    const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 4);
                    setFriendCode(cleaned);
                    // Look up invite stakes
                    lookupInviteStakes(cleaned);
                  }}
                  placeholder="ABCD"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-2xl uppercase text-center tracking-widest font-mono"
                  maxLength={4}
                  autoFocus
                />

                {/* Show challenger's stakes if they set any */}
                {challengerStakes?.stakes && (
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                    <p className="text-slate-300 text-sm">
                      <span className="font-semibold text-slate-200">{challengerStakes.name}</span> wants to play for:
                    </p>
                    <p className="text-orange-400 font-semibold mt-1">🎯 {challengerStakes.stakes}</p>
                  </div>
                )}

                {joinError && (
                  <p className="text-red-400 text-sm">{joinError}</p>
                )}

                <button
                  onClick={handleJoinRivalry}
                  disabled={friendCode.length !== 4 || isJoining}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
                >
                  {isJoining ? 'Joining...' : 'Let\'s Go'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {/* About Modal */}
      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}
      </>
    );
  }

 // STATE C: Rivalry Started
if (currentState === 'C') {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto relative">
          {/* Menu in top right corner - absolutely positioned */}
          <div className="absolute top-0 right-0">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-slate-400 hover:text-slate-200 text-2xl"
            >
              ⋮
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                
                <div className="absolute right-0 top-8 bg-slate-700 border border-slate-600 rounded-lg shadow-lg py-2 w-48 z-20">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onNavigate && onNavigate('screen2');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    Your Profiles
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowHowToPlay(true);
                    }}
                    className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    How to Play
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      localStorage.removeItem('activeProfileId');
                      window.location.reload();
                    }}
                    className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    Log Out
                  </button>
                  <button
                    onClick={() => {
                      console.log('Cancel Rivalry clicked');
                      setShowMenu(false);
                      setShowCancelModal(true);
                      console.log('showCancelModal set to true');
                    }}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-600 transition-colors border-t border-slate-700"
                  >
                    Cancel Rivalry
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Centered content */}
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500 mb-4">
              🎉 Rivalry Started!
            </div>

            {/* Show stakes if set */}
            {rivalry?.stakes && (
              <div className="mb-6">
                <p className="text-slate-300 text-sm">Playing for:</p>
                <p className="text-orange-400 font-semibold text-lg">🎯 {rivalry.stakes}</p>
              </div>
            )}

            {/* Ripley's Welcome Commentary */}
            <div className="mb-12 px-4">
              <p className="text-lg text-slate-200 italic leading-relaxed mb-2">
                "{rivalry?.intro_emcee_text || "New rivalry. Let's see what you're both made of."}"
              </p>
              <p className="text-sm text-orange-400 font-semibold">
                — Ripley, Your Game Host
              </p>
            </div>

            <button
              onClick={handleStartFirstShow}
              className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-400 transition-all"
            >
              Start First Round
            </button>
          </div>
        </div>
      </div>

      {/* Modal is now INSIDE the return, wrapped in fragment */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Cancel Rivalry with opponent?
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              This will end your ongoing Shows. History will be saved.
            </p>
            <p className="text-slate-400 text-sm mb-6">This cannot be undone.</p>
            <div className="space-y-2">
              <button
                onClick={handleCancelRivalry}
                className="w-full py-3 bg-orange-500 text-white font-medium rounded hover:bg-orange-400"
              >
                Cancel Rivalry
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
              >
                Nevermind
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {/* About Modal */}
      {showAbout && (
        <AboutModal onClose={() => setShowAbout(false)} />
      )}
    </>
  );
}

return null;
}