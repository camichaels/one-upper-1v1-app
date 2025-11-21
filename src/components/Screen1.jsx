import { useState, useEffect } from 'react';
import { generateCode, isValidCodeFormat, formatCodeInput } from '../utils/codeGenerator';
import { supabase } from '../lib/supabase';
import { getRandomPrompt, selectJudges } from '../utils/prompts';
import { normalizePhone, validatePhone } from '../utils/phoneUtils';
import Header from './Header';

// Avatar options
const AVATARS = ['😎', '🤓', '😈', '🤡', '🎃', '🦄', '🐉', '🤖'];

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
    bio: ''
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
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
const [showCancelModal, setShowCancelModal] = useState(false);

  // Determine which state to show on mount
  useEffect(() => {
    async function determineState() {
      try {
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

        if (profileError || !profileData) {
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

if (rivalryError || !rivalryData || rivalryData.length === 0) {
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
        setCurrentState('A');
        setLoading(false);
      }
    }

    determineState();
  }, []);

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
              // Show toast notification
              alert(`🎉 ${opponent.name} joined your Rivalry!`);
              
              // Update state
              setRivalry(newRivalry);
              
              // Immediately transition to State C
  setCurrentState('C');
            }
          });
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
}, [currentState, profile]);

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
          bio: formData.bio.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      // Save to localStorage
      localStorage.setItem('activeProfileId', newProfile.id);
      saveProfileToHistory(newProfile);
      
      // Update state
      setProfile(newProfile);
      setCurrentState('B');
      setShowForm(false);
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
        saveProfileToHistory(profile);
        window.location.reload();
      } else {
        // Show list of profiles
        setForgotCodeProfiles(profiles);
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
    localStorage.setItem('activeProfileId', profile.id);
    saveProfileToHistory(profile);
    window.location.reload();
  };

  // STATE B: Join Rivalry
  const handleJoinRivalry = async () => {
    setJoinError('');
    setIsJoining(true);

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

      // Find friend by code
const { data: friend, error: friendError } = await supabase
  .from('profiles')
  .select('id')
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

      // Create rivalry (always put lower ID as profile_a for consistency)
      const [profileAId, profileBId] = [profile.id, friend.id].sort();

      const { data: newRivalry, error: rivalryError } = await supabase
        .from('rivalries')
        .insert({
          profile_a_id: profileAId,
          profile_b_id: profileBId,
          mic_holder_id: profile.id, // Creator holds mic initially
          first_show_started: false
        })
        .select()
        .single();

      if (rivalryError) throw rivalryError;

      // Update state
      setRivalry(newRivalry);
      setCurrentState('C');
      setFriendCode('');
      setIsJoining(false);
    } catch (err) {
      console.error('Error joining rivalry:', err);
      setJoinError(err.message || 'Failed to start Rivalry');
      setIsJoining(false);
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

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Share via SMS (opens native SMS)
  const handleShareSMS = () => {
    const message = `Hey! I'm playing One-Upper - it's a game where we try to one-up each other with funny stories.\n\nJoin me: https://oneupper.app/join/${profile.code}\nOr enter my code: ${profile.code}\n\nLet's see who's the better storyteller! 🎤`;
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
              <div className="mt-8 pt-8 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-3 text-center">
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

              {formError && (
                <div className="text-red-400 text-sm">{formError}</div>
              )}

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto space-y-6">
          {/* Celebration Header */}
          <div className="text-center space-y-3 py-4">
            <div className="flex justify-center gap-3 text-3xl">
              🎉 🎤 🎉
            </div>
            <h2 className="text-2xl font-bold text-slate-100">
              Welcome, {profile.name}!
            </h2>
            <p className="text-slate-300 text-lg">
              Ready to start a rivalry for the ages?
            </p>
          </div>

          {/* Profile Info + Menu */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{profile.avatar}</span>
              <div>
                <div className="text-lg font-bold text-slate-100">
                  {profile.name}
                </div>
                <div className="text-sm text-orange-500 font-medium">
                  Code: {profile.code}
                </div>
              </div>
            </div>
            <div className="relative">
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
                      Switch Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onNavigate && onNavigate('screen2', { editProfileId: profile.id });
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* PRIMARY ACTION: Challenge a Friend */}
          <div className="bg-slate-800/50 rounded-xl p-6 space-y-4 border border-slate-700">
            <h3 className="text-xl font-bold text-orange-500 text-center">
              Challenge a Friend
            </h3>
            
            <div className="space-y-3">
              <p className="text-slate-300 text-center">
                Your code:
              </p>
              
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="text-3xl font-bold text-slate-100 tracking-wider text-center mb-3">
                  {profile.code}
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

              <p className="text-slate-400 text-center text-sm">
                Share your code. When they join, let's go! 🎤
              </p>
            </div>
          </div>

          {/* SECONDARY ACTION: Got an Invite? */}
          <div className="text-center">
            <button
              onClick={() => setShowJoinModal(true)}
              className="text-slate-300 hover:text-orange-500 transition-colors text-lg font-medium underline decoration-slate-600 hover:decoration-orange-500"
            >
              Got an invite? Enter their code →
            </button>
          </div>

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
                  onChange={(e) => setFriendCode(e.target.value)}
                  placeholder="HAPPY-TIGER-1234"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-lg uppercase"
                  autoFocus
                />

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
    );
  }

 // STATE C: Rivalry Started
if (currentState === 'C') {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />  {/* ← ADD THIS LINE */}
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="text-lg font-semibold text-slate-200">
                {profile.avatar} {profile.name}
              </div>
              <div className="text-sm text-orange-500">Code: {profile.code}</div>
            </div>
            
            <div className="relative">
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
                      Switch Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onNavigate && onNavigate('screen2', { editProfileId: profile.id });
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => {
                        console.log('Cancel Rivalry clicked');
                        setShowMenu(false);
                        setShowCancelModal(true);
                        console.log('showCancelModal set to true');
                      }}
                      className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-600 transition-colors"
                    >
                      Cancel Rivalry
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-orange-500 mb-4">
              🎉 Rivalry Started!
            </div>

            <p className="text-slate-300 text-lg mb-12">
              You're now facing your opponent
            </p>

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
              Cancel Rivalry <span className="text-orange-500">with</span> opponent?
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
    </>
  );
}

return null;
}