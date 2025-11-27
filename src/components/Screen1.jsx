import { useState, useEffect, useRef } from 'react';
import { generateCode, isValidCodeFormat, formatCodeInput } from '../utils/codeGenerator';
import { supabase } from '../lib/supabase';
import { getRandomPrompt, selectJudges } from '../utils/prompts';
import { normalizePhone, validatePhone } from '../utils/phoneUtils';
import Header from './Header';
import HowToPlayModal from './HowToPlayModal';


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
  
  // Forgot code state (State A)
  const [showForgotCodeModal, setShowForgotCodeModal] = useState(false);
  const [forgotCodePhone, setForgotCodePhone] = useState('');
  const [forgotCodeProfiles, setForgotCodeProfiles] = useState([]);
  const [forgotCodeError, setForgotCodeError] = useState('');
  const [isForgotCodeLoading, setIsForgotCodeLoading] = useState(false);
  
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

  // Pending invite state (from /join link)
  const [pendingInvite, setPendingInvite] = useState(null); // { code, friendName, friendId }

  // Scroll to top when currentState changes
  useEffect(() => {
    if (currentState) {
      window.scrollTo(0, 0);
    }
  }, [currentState]);

  // Determine which state to show on mount
  useEffect(() => {
    async function determineState() {
      try {
        // Check for pending invite from /join link
        const pendingCode = sessionStorage.getItem('pendingRivalryCode');
        const pendingFriendName = sessionStorage.getItem('pendingRivalryFriendName');
        const pendingFriendId = sessionStorage.getItem('pendingRivalryFriendId');
        const pendingStakes = sessionStorage.getItem('pendingRivalryStakes');
        
        if (pendingCode && pendingFriendName && pendingFriendId) {
          setPendingInvite({
            code: pendingCode,
            friendName: pendingFriendName,
            friendId: pendingFriendId,
            stakes: pendingStakes || null
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
  // Has profile, no rivalry → State B
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

// Has rivalry
if (!rivalry.first_show_started) {
  // First show hasn't started → State C
  setCurrentState('C');
  setLoading(false);
} else {
  // First show started → Redirect to Screen 4
  onNavigate('screen4', { 
    activeProfileId: profileData.id,
    rivalryId: rivalry.id
  });
  return;
}
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
              
              // Wait for intro_emcee_text to be populated before showing State C
              const checkForIntroText = async () => {
                let attempts = 0;
                const maxAttempts = 10; // Try for ~5 seconds
                
                while (attempts < maxAttempts) {
                  const { data: updatedRivalry } = await supabase
                    .from('rivalries')
                    .select('*')
                    .eq('id', newRivalry.id)
                    .single();
                  
                  if (updatedRivalry?.intro_emcee_text) {
                    // Got the text! Update and navigate
                    setRivalry(updatedRivalry);
                    setCurrentState('C');
                    return;
                  }
                  
                  attempts++;
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                // Timeout - just show State C with whatever we have
                setRivalry(newRivalry);
                setCurrentState('C');
              };
              
              checkForIntroText();
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
          alert(`😢 Rivalry Ended\n\n${opponent.name} cancelled your Rivalry.\n\nYour Show history has been saved.`);
        } else {
          // Fallback if we can't get opponent name
          alert(`😢 Rivalry Ended\n\nYour opponent cancelled your Rivalry.\n\nYour Show history has been saved.`);
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
      
      // Check if there's a pending invite - if so, auto-start rivalry
      if (pendingInvite) {
        await startRivalryWithPendingInvite(newProfile);
      } else {
        setCurrentState('B');
        setShowForm(false);
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
        setResumeError('Invalid code format');
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
        setResumeError('Code not found. Check your code and try again.');
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
      setResumeError('Failed to resume. Try again.');
      setIsResuming(false);
    }
  };

  // Forgot code handler
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

      // Look up profiles by normalized phone number
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
        // Save all profiles to history (just one in this case)
        saveProfileToHistory(profile);
        window.location.reload();
      } else {
        // Show list of profiles (alphabetized by name)
        const sortedProfiles = [...profiles].sort((a, b) => a.name.localeCompare(b.name));
        setForgotCodeProfiles(sortedProfiles);
        setIsForgotCodeLoading(false);
      }
    } catch (err) {
      console.error('Error looking up profiles:', err);
      setForgotCodeError('Failed to look up profiles. Try again.');
      setIsForgotCodeLoading(false);
    }
  };

  // Resume profile from forgot code list
  const handleResumeFromList = (profile) => {
    // Save ALL profiles from the list to localStorage history
    forgotCodeProfiles.forEach(p => {
      saveProfileToHistory(p);
    });
    // Set the selected one as active
    localStorage.setItem('activeProfileId', profile.id);
    window.location.reload();
  };

  // Auto-start rivalry with pending invite (from /join link)
  const startRivalryWithPendingInvite = async (userProfile) => {
    try {
      isCreatingRivalryRef.current = true; // Flag that we're creating a rivalry
      
      // Use stakes from pendingInvite (already fetched by JoinRivalry or from manual lookup)
      const rivalryStakes = pendingInvite.stakes || null;
      
      // Create rivalry (always put lower ID as profile_a for consistency)
      const [profileAId, profileBId] = [userProfile.id, pendingInvite.friendId].sort();

      const { data: newRivalry, error: rivalryError } = await supabase
        .from('rivalries')
        .insert({
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          mic_holder_id: userProfile.id, // Joiner holds mic initially
          first_show_started: false,
          stakes: rivalryStakes
        })
        .select()
        .single();

      if (rivalryError) throw rivalryError;

      // Clear friend's pending_stakes after rivalry created
      if (rivalryStakes) {
        await supabase
          .from('profiles')
          .update({ pending_stakes: null })
          .eq('id', pendingInvite.friendId);
      }

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
          // Update rivalry with intro text
          await supabase
            .from('rivalries')
            .update({ intro_emcee_text: emceeResponse.data.emcee_text })
            .eq('id', newRivalry.id);
          
          // Update local rivalry object
          newRivalry.intro_emcee_text = emceeResponse.data.emcee_text;
        }
      } catch (emceeErr) {
        console.error('Failed to generate intro text:', emceeErr);
        // Continue anyway - fallback text will show
      }

      // Clear pending invite from session storage
      sessionStorage.removeItem('pendingRivalryCode');
      sessionStorage.removeItem('pendingRivalryFriendName');
      sessionStorage.removeItem('pendingRivalryFriendId');
      sessionStorage.removeItem('pendingRivalryStakes');
      setPendingInvite(null);

      // Update state to show first show screen
      setRivalry(newRivalry);
      setCurrentState('C');
      setShowForm(false);
      isCreatingRivalryRef.current = false; // Clear the flag
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

  // STATE B: Join Rivalry
  const handleJoinRivalry = async () => {
    setJoinError('');
    setIsJoining(true);
    isCreatingRivalryRef.current = true; // Flag that we're creating a rivalry

    try {
      const formattedCode = formatCodeInput(friendCode);

      // Validate format
      if (!isValidCodeFormat(formattedCode)) {
        setJoinError('Invalid code format');
        setIsJoining(false);
        return;
      }

      // Check if entering own code
      if (formattedCode === profile.code) {
        setJoinError("You can't start a Rivalry with yourself.");
        setIsJoining(false);
        return;
      }

      // Find friend by code (include pending_stakes)
const { data: friend, error: friendError } = await supabase
  .from('profiles')
  .select('id, pending_stakes')
  .eq('code', formattedCode)
  .single();

if (friendError || !friend) {
  setJoinError('Code not found. Check with your friend.');
  setIsJoining(false);
  return;
}

// NEW: Check if EITHER player is already in ANY rivalry
const { data: anyExistingRivalries } = await supabase
  .from('rivalries')
  .select('id')
  .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id},profile_a_id.eq.${friend.id},profile_b_id.eq.${friend.id}`)
  .eq('status', 'active');

if (anyExistingRivalries && anyExistingRivalries.length > 0) {
  // Check if it's YOUR rivalry
  const myRivalry = anyExistingRivalries.find(r => 
    r.profile_a_id === profile.id || r.profile_b_id === profile.id
  );
  
  if (myRivalry) {
    setJoinError("You're already in a rivalry. Finish or cancel it first!");
    setIsJoining(false);
    return;
  }
  
  // It's the friend's rivalry
  setJoinError("This person is already in a rivalry. Try again later!");
  setIsJoining(false);
  return;
}

      // Get stakes from friend's pending_stakes
      const rivalryStakes = friend.pending_stakes || null;

      // Create rivalry (always put lower ID as profile_a for consistency)
      const [profileAId, profileBId] = [profile.id, friend.id].sort();

      const { data: newRivalry, error: rivalryError } = await supabase
        .from('rivalries')
        .insert({
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          mic_holder_id: profile.id, // Creator holds mic initially
          first_show_started: false,
          stakes: rivalryStakes
        })
        .select()
        .single();

      if (rivalryError) throw rivalryError;

      // Clear friend's pending_stakes after rivalry created
      if (rivalryStakes) {
        await supabase
          .from('profiles')
          .update({ pending_stakes: null })
          .eq('id', friend.id);
      }

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
          // Update rivalry with intro text
          await supabase
            .from('rivalries')
            .update({ intro_emcee_text: emceeResponse.data.emcee_text })
            .eq('id', newRivalry.id);
          
          // Update local rivalry object
          newRivalry.intro_emcee_text = emceeResponse.data.emcee_text;
        }
      } catch (emceeErr) {
        console.error('Failed to generate intro text:', emceeErr);
        // Continue anyway - fallback text will show
      }

      // Update state
      setRivalry(newRivalry);
      setCurrentState('C');
      setFriendCode('');
      setChallengerStakes(null); // Clear challenger stakes state
      setIsJoining(false);
      isCreatingRivalryRef.current = false; // Clear the flag
    } catch (err) {
      console.error('Error joining rivalry:', err);
      setJoinError(err.message || 'Failed to start Rivalry');
      setIsJoining(false);
      isCreatingRivalryRef.current = false; // Clear the flag on error too
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

  // Save stakes to profile's pending_stakes (fire and forget)
  const savePendingStakes = () => {
    if (!profile?.id) return;
    supabase
      .from('profiles')
      .update({ pending_stakes: stakes.trim() || null })
      .eq('id', profile.id)
      .then(() => {})
      .catch((err) => console.error('Failed to save pending stakes:', err));
  };

  // Lookup challenger's stakes when code is entered in join modal
  const lookupChallengerStakes = async (code) => {
    if (!code || code.length < 10) {
      setChallengerStakes(null);
      return;
    }
    
    const formattedCode = formatCodeInput(code);
    if (!isValidCodeFormat(formattedCode)) {
      setChallengerStakes(null);
      return;
    }
    
    try {
      const { data: challenger } = await supabase
        .from('profiles')
        .select('name, pending_stakes')
        .eq('code', formattedCode)
        .single();
      
      if (challenger) {
        setChallengerStakes({
          name: challenger.name,
          stakes: challenger.pending_stakes
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

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      savePendingStakes(); // Fire and forget - don't block copy
      await navigator.clipboard.writeText(profile.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share via SMS (opens native SMS)
  const handleShareSMS = () => {
    savePendingStakes(); // Fire and forget
    const stakesLine = stakes.trim() ? `\nPlaying for: ${stakes.trim()} 🎯\n` : '';
    const message = stakes.trim() 
      ? `Hey! I challenge you to One-Upper - we answer weird prompts and AI judges decide who one-upped the other.\n${stakesLine}\nJoin me: https://oneupper.app/join/${profile.code}\n\nLet the rivalry begin! 🎤`
      : `I challenge you to One-Upper! 🎤\n\nJoin: https://oneupper.app/join/${profile.code}\n\nLet's see who's got the better one-liners.`;
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };

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
        <Header />
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
              <p className="text-slate-300 text-center mb-4 text-lg">
                New here? Let's get you started!
              </p>
              
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-400 transition-all"
              >
                Create Profile
              </button>

              {/* Resume Section */}
              <div className="mt-8">
                <p className="text-slate-300 text-center mb-4 text-lg">
                  Already have a profile?
                </p>
                <input
                  type="text"
                  placeholder="Enter your code"
                  value={resumeCode}
                  onChange={(e) => setResumeCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:border-orange-500 transition-colors mb-3"
                />
                
                {resumeError && (
                  <div className="flex items-start gap-2 text-red-400 text-sm mb-3">
                    <span>❌</span>
                    <span>{resumeError}</span>
                  </div>
                )}

                <button
                  onClick={handleResume}
                  disabled={isResuming || !resumeCode.trim()}
                  className="w-full py-3 bg-slate-600/50 text-slate-200 font-medium rounded-lg border border-slate-500 hover:bg-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResuming ? 'Getting you in...' : 'Get back in!'}
                </button>

                {/* Forgot Code Link */}
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowForgotCodeModal(true)}
                    className="text-sm text-slate-400 hover:text-orange-500 underline transition-colors"
                  >
                    Forgot your code?
                  </button>
                </div>
              </div>

              {/* Forgot Code Modal */}
              {showForgotCodeModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 border border-slate-700">
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-bold text-orange-500">
                        Find Your Profile
                      </h3>
                      <button
                        onClick={() => {
                          setShowForgotCodeModal(false);
                          setForgotCodePhone('');
                          setForgotCodeProfiles([]);
                          setForgotCodeError('');
                        }}
                        className="text-slate-400 hover:text-slate-200 text-2xl"
                      >
                        ✕
                      </button>
                    </div>

                    {forgotCodeProfiles.length === 0 ? (
                      <>
                        <p className="text-slate-300">Enter your phone number:</p>

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
                          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-lg transition-colors"
                        >
                          {isForgotCodeLoading ? 'Looking up...' : 'Find My Profile'}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-slate-300">Select your profile:</p>
                        
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {forgotCodeProfiles.map((prof) => (
                            <button
                              key={prof.id}
                              onClick={() => handleResumeFromList(prof)}
                              className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">{prof.avatar}</span>
                                <div className="flex-1">
                                  <div className="text-lg font-bold text-slate-100">
                                    {prof.name}
                                  </div>
                                  <div className="text-sm text-orange-500 font-medium">
                                    Code: {prof.code}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleCreateProfile} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Craig"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Pick an avatar:
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar: emoji })}
                      className={`text-3xl py-3 bg-slate-700/50 rounded-lg border-2 transition-all ${
                        formData.avatar === emoji
                          ? 'border-orange-500 bg-slate-600/60 scale-105'
                          : 'border-transparent hover:border-slate-500'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

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

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Bio <span className="text-slate-500 font-normal">(optional):</span>
                </label>
                <input
                  type="text"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Pun enthusiast"
                  maxLength={50}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">Max 50 characters</p>
              </div>

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
                <div className="text-red-400 text-sm">{formError}</div>
              )}

              <p className="text-xs text-slate-400 text-center mb-3">
                FYI: Anyone with your phone number or profile code can access it for now. (Password protection coming soon)
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create'}
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
        </div>
      </div>
    );
  }

  // STATE B: Start/Join Rivalry
  if (currentState === 'B') {
    return (
      <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto space-y-6">
          {/* Welcome Header with Menu */}
          <div className="relative text-center">
            <div className="space-y-1">
              {pendingInvite ? (
                <>
                  <div className="text-center mb-4">
                    <p className="text-xl font-bold text-orange-500 mb-1">
                      {pendingInvite.friendName} just challenged you!
                    </p>
                    {pendingInvite.stakes && (
                      <p className="text-slate-300 text-sm mb-2">
                        Playing for: <span className="text-orange-400 font-semibold">🎯 {pendingInvite.stakes}</span>
                      </p>
                    )}
                    <p className="text-slate-300 text-sm">
                      Ready to accept, {profile.name}?
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-100">
                    Welcome, {profile.name}!
                  </h2>
                  <p className="text-slate-300">
                    Ready to start a rivalry for the ages?
                  </p>
                </>
              )}
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
                        setShowHowToPlay(true);
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                    >
                      How to Play
                    </button>
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
            /* Show Accept Challenge flow (shouldn't reach here due to auto-accept) */
            <div className="space-y-4">
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
            /* Show normal Challenge/Join options */
            <>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-orange-500 text-center">
                  Challenge a Friend
                </h3>
                
                <p className="text-slate-300 text-center font-medium">
                  Share your code: <span className="text-slate-100 font-bold tracking-wide">{profile.code}</span>
                </p>

                {/* Stakes input */}
                <div className="space-y-1">
                  <label className="text-sm text-slate-400">Up the stakes. Play for (optional):</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={stakes}
                        onChange={(e) => setStakes(e.target.value.slice(0, 50))}
                        placeholder="bragging rights? a burrito? you decide..."
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-3 pr-8 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                      />
                      {stakes && (
                        <button
                          type="button"
                          onClick={() => setStakes('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors text-lg font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={getRandomStakes}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-3 rounded-lg transition-colors text-lg"
                      title="Random suggestion"
                    >
                      🎲
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyCode}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    {copied ? '✓ Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleShareSMS}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Share via SMS
                  </button>
                </div>
              </div>

              {/* Join a Friend Section */}
              <div className="space-y-3 pt-4">
                <h3 className="text-xl font-bold text-orange-500 text-center">
                  Got a Friend Invite?
                </h3>
                
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Enter Code
                </button>
              </div>
            </>
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

                <p className="text-slate-300">Enter friend's code:</p>

                <input
                  type="text"
                  value={friendCode}
                  onChange={(e) => {
                    setFriendCode(e.target.value);
                    lookupChallengerStakes(e.target.value);
                  }}
                  placeholder="HAPPY-TIGER-1234"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg uppercase"
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
                  disabled={!friendCode.trim() || isJoining}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
                >
                  {isJoining ? 'Starting...' : 'Start Rivalry'}
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
                      setShowHowToPlay(true);
                    }}
                    className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                  >
                    How to Play
                  </button>
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
              Start First Show
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
    </>
  );
}

return null;
}