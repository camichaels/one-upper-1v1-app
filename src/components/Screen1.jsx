import { useState, useEffect } from 'react';
import { generateCode, isValidCodeFormat, formatCodeInput } from '../utils/codeGenerator';
import { supabase } from '../lib/supabase';
import { getRandomPrompt, selectJudges } from '../utils/prompts';
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
  
  // Join rivalry state (State B)
  const [friendCode, setFriendCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
      // Validate
      if (!formData.name.trim()) {
        setFormError('Name is required');
        setIsSubmitting(false);
        return;
      }

      // Generate unique code
      const code = generateCode();

      // Create profile
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          code: code,
          name: formData.name.trim(),
          avatar: formData.avatar,
          phone: formData.phone.trim() || null,
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

      // Check if rivalry already exists
      const { data: existingRivalry } = await supabase
        .from('rivalries')
        .select('*')
        .or(`and(profile_a_id.eq.${profile.id},profile_b_id.eq.${friend.id}),and(profile_a_id.eq.${friend.id},profile_b_id.eq.${profile.id})`)
        .eq('status', 'active')
        .maybeSingle();

      if (existingRivalry) {
        setJoinError(`You already have an active Rivalry with this person.`);
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
                  {isResuming ? 'Resuming...' : 'Resume'}
                </button>
              </div>
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
                  Phone <span className="text-slate-500 font-normal">(optional):</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1-415-555-1234"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">For SMS game updates</p>
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

          <h2 className="text-2xl font-bold text-orange-500 mb-8">Start a Rivalry</h2>

          <div className="mb-12">
            <p className="text-slate-300 mb-4">Share your code <span className="text-orange-500">with</span> a friend:</p>
            <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 mb-3">
              <div className="text-2xl font-bold text-center text-slate-100 mb-3">
                {profile.code}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 py-2 px-4 bg-slate-600/50 text-slate-200 text-sm font-medium rounded border border-slate-500 hover:bg-slate-600 transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleShareSMS}
                  className="flex-1 py-2 px-4 bg-slate-600/50 text-slate-200 text-sm font-medium rounded border border-slate-500 hover:bg-slate-600 transition-colors"
                >
                  Share via SMS
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              When they enter your code, your Rivalry will start!
            </p>
          </div>

          <div className="border-t border-slate-700 pt-8">
            <h3 className="text-lg font-bold text-orange-500 mb-4">Or Join a Rivalry</h3>
            <p className="text-slate-300 mb-4">Enter friend's code:</p>
            <div className="space-y-3">
              <input
                type="text"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value)}
                placeholder="HAPPY-TIGER-1234"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:border-orange-500 transition-colors"
              />
              
              {joinError && (
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <span>❌</span>
                  <span>{joinError}</span>
                </div>
              )}

              <button
                onClick={handleJoinRivalry}
                disabled={isJoining || !friendCode.trim()}
                className="w-full py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Starting...' : 'Start Rivalry'}
              </button>
            </div>
          </div>
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