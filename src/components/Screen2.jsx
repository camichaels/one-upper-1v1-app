import { useState, useEffect } from 'react';
import { generateCode } from '../utils/codeGenerator';
import { supabase } from '../lib/supabase';
import { normalizePhone, validatePhone } from '../utils/phoneUtils';
import Header from './Header';

const AVATARS = ['😎', '🤓', '😈', '🤡', '🎃', '🦄', '🐉', '🤖'];

export default function Screen2({ onNavigate, editProfileId }) {
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPhone, setCurrentPhone] = useState(null); // Track phone number for hub
  
  // Edit state
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete state
  const [deletingProfileId, setDeletingProfileId] = useState(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  // Create new profile state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    avatar: AVATARS[0],
    phone: '',
    bio: '',
    sms_consent: false
  });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  // Auto-open edit mode if editProfileId is provided
  useEffect(() => {
    if (editProfileId && profiles.length > 0) {
      const profileToEdit = profiles.find(p => p.id === editProfileId);
      if (profileToEdit) {
        handleStartEdit(profileToEdit);
      }
    }
  }, [editProfileId, profiles]);

  async function loadProfiles(phoneOverride = null) {
    try {
      const activeId = localStorage.getItem('activeProfileId');
      setActiveProfileId(activeId);

      // First, try to get phone number from override, or from the ACTIVE profile
      let phoneNumber = phoneOverride;

      if (!phoneNumber && activeId) {
        const { data: activeProfile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', activeId)
          .single();
        
        if (activeProfile?.phone) {
          phoneNumber = activeProfile.phone;
        }
      }
      
      // Also check currentPhone state as fallback
      if (!phoneNumber && currentPhone) {
        phoneNumber = currentPhone;
      }
      
      if (phoneNumber) {
        setCurrentPhone(phoneNumber);
      }

      // If we have a phone number, load ALL profiles for that phone
      let profilesData = [];
      if (phoneNumber) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', phoneNumber);
        
        if (!error && data) {
          profilesData = data;
        }
      } else if (activeId) {
        // Fallback: just load the active profile if we couldn't get phone
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeId);
        
        if (!error && data) {
          profilesData = data;
        }
      }

      if (profilesData.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      // Get rivalry data AND win/loss records for each profile
      const profilesWithData = await Promise.all(
        profilesData.map(async (profile) => {
          // Get active rivalry
          const { data: rivalryData } = await supabase
            .from('rivalries')
            .select('*, profile_a:profile_a_id(*), profile_b:profile_b_id(*)')
            .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
            .eq('status', 'active');

          const rivalry = rivalryData && rivalryData.length > 0 ? rivalryData[0] : null;

          // Get completed rivalries for this profile
          const { data: completedRivalries } = await supabase
            .from('rivalries')
            .select('id, profile_a_id, profile_b_id')
            .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
            .eq('status', 'complete');

          // Calculate wins and losses from completed rivalries
          let wins = 0;
          let losses = 0;

          if (completedRivalries && completedRivalries.length > 0) {
            // For each completed rivalry, count show wins to determine rivalry winner
            for (const r of completedRivalries) {
              const { data: shows } = await supabase
                .from('shows')
                .select('winner_id')
                .eq('rivalry_id', r.id)
                .eq('status', 'complete');

              if (shows && shows.length > 0) {
                const myShowWins = shows.filter(s => s.winner_id === profile.id).length;
                const opponentShowWins = shows.length - myShowWins;
                
                if (myShowWins > opponentShowWins) {
                  wins++;
                } else if (opponentShowWins > myShowWins) {
                  losses++;
                }
                // Ties don't count as win or loss
              }
            }
          }

          return {
            ...profile,
            rivalry: rivalry || null,
            opponentName: rivalry
              ? (rivalry.profile_a_id === profile.id ? rivalry.profile_b.name : rivalry.profile_a.name)
              : null,
            wins,
            losses,
            hasCompletedRivalries: completedRivalries && completedRivalries.length > 0
          };
        })
      );

      // Sort: active first, then alphabetically by name
      const sorted = profilesWithData.sort((a, b) => {
        if (a.id === activeId) return -1;
        if (b.id === activeId) return 1;
        return a.name.localeCompare(b.name);
      });

      setProfiles(sorted);
      
      // Sync active profile to recentProfiles if it's missing
      if (activeId && profilesData.length > 0) {
        const activeProfile = profilesData.find(p => p.id === activeId);
        if (activeProfile) {
          let recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
          const alreadyInRecent = recentProfiles.some(p => p.id === activeId);
          
          if (!alreadyInRecent) {
            const profileInfo = {
              id: activeProfile.id,
              name: activeProfile.name,
              code: activeProfile.code,
              avatar: activeProfile.avatar
            };
            recentProfiles = [profileInfo, ...recentProfiles];
            localStorage.setItem('recentProfiles', JSON.stringify(recentProfiles.slice(0, 10)));
          }
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading profiles:', err);
      setLoading(false);
    }
  }

  function handleSwitchProfile(profileId) {
    localStorage.setItem('activeProfileId', profileId);
    window.location.reload();
  }

  function handleStartEdit(profile) {
    setEditingProfileId(profile.id);
    setEditFormData({
      name: profile.name,
      avatar: profile.avatar,
      phone: profile.phone || '',
      bio: profile.bio || '',
      sms_consent: profile.sms_consent || false,
      twilio_blocked: profile.twilio_blocked || false
    });
    setEditError('');
  }

  function handleCancelEdit() {
    setEditingProfileId(null);
    setEditFormData({});
    setEditError('');
  }

  async function handleSaveEdit(profileId) {
    setEditError('');
    setIsSaving(true);

    try {
      if (!editFormData.name.trim()) {
        setEditError('Name is required');
        setIsSaving(false);
        return;
      }

      // Validate phone
      const phoneValidation = validatePhone(editFormData.phone);
      if (!phoneValidation.valid) {
        setEditError(phoneValidation.error);
        setIsSaving(false);
        return;
      }

      // Normalize phone number
      const normalizedPhone = normalizePhone(editFormData.phone);

      // Check if SMS consent is changing from false to true
      const currentProfile = profiles.find(p => p.id === profileId);
      const consentChangedToTrue = editFormData.sms_consent && !currentProfile?.sms_consent;

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editFormData.name.trim(),
          avatar: editFormData.avatar,
          phone: normalizedPhone,
          bio: editFormData.bio.trim() || null,
          sms_consent: editFormData.sms_consent
        })
        .eq('id', profileId);

      if (error) throw error;

      // Send welcome SMS if consent just changed to true
      if (consentChangedToTrue) {
        try {
          await supabase.functions.invoke('send-sms', {
            body: {
              userId: profileId,
              notificationType: 'welcome',
              contextData: {}
            }
          });
        } catch (smsError) {
          console.error('Failed to send welcome SMS:', smsError);
          // Don't fail the save if SMS fails
        }
      }

      await loadProfiles();
      setEditingProfileId(null);
      setIsSaving(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setEditError('Failed to save changes');
      setIsSaving(false);
    }
  }

  async function handleDeleteProfile(profileId) {
    try {
      // Save phone number BEFORE any deletions (for reloading other profiles)
      const savedPhone = currentPhone;
      
      // First, update any rivalries this profile is in to cancelled
      await supabase
        .from('rivalries')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by_id: profileId
        })
        .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`)
        .eq('status', 'active');

      // Then delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;

      // Remove from localStorage
      const recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
      const updated = recentProfiles.filter(p => p.id !== profileId);
      localStorage.setItem('recentProfiles', JSON.stringify(updated));

      // If deleting active profile, clear it
      if (activeProfileId === profileId) {
        localStorage.removeItem('activeProfileId');
      }

      setDeletingProfileId(null);
      
      // If this was the only profile, go to landing page
      if (profiles.length === 1) {
        window.location.href = '/';
      } else {
        // Pass the saved phone to reload other profiles
        await loadProfiles(savedPhone);
      }
    } catch (err) {
      console.error('Error deleting profile:', err);
    }
  }

  async function handleDeleteAllProfiles() {
    setIsDeletingAll(true);

    try {
      // Get all profile IDs
      const profileIds = profiles.map(p => p.id);

      // Cancel all active rivalries for these profiles
      for (const profileId of profileIds) {
        await supabase
          .from('rivalries')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_by_id: profileId
          })
          .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`)
          .eq('status', 'active');
      }

      // Delete all profiles
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', profileIds);

      if (error) throw error;

      // Clear all localStorage
      localStorage.removeItem('activeProfileId');
      localStorage.removeItem('recentProfiles');

      // Redirect to landing page
      window.location.href = '/';
    } catch (err) {
      console.error('Error deleting all profiles:', err);
      setIsDeletingAll(false);
    }
  }

  async function handleCreateNewProfile(e) {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);

    try {
      if (!createFormData.name.trim()) {
        setCreateError('Name is required');
        setIsCreating(false);
        return;
      }

      // Validate phone
      const phoneValidation = validatePhone(createFormData.phone);
      if (!phoneValidation.valid) {
        setCreateError(phoneValidation.error);
        setIsCreating(false);
        return;
      }

      // Normalize phone number
      const normalizedPhone = normalizePhone(createFormData.phone);

      const code = generateCode();

      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          code: code,
          name: createFormData.name.trim(),
          avatar: createFormData.avatar,
          phone: normalizedPhone,
          bio: createFormData.bio.trim() || null,
          sms_consent: createFormData.sms_consent
        })
        .select()
        .single();

      if (error) throw error;

      // Send welcome SMS if opted in
      if (createFormData.sms_consent) {
        try {
          await supabase.functions.invoke('send-sms', {
            body: {
              userId: newProfile.id,
              notificationType: 'welcome',
              contextData: {}
            }
          });
        } catch (smsError) {
          console.error('Failed to send welcome SMS:', smsError);
          // Don't fail the create if SMS fails
        }
      }

      // Add to recent profiles
      const recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
      const profileInfo = {
        id: newProfile.id,
        name: newProfile.name,
        code: newProfile.code,
        avatar: newProfile.avatar
      };
      const updated = [profileInfo, ...recentProfiles];
      localStorage.setItem('recentProfiles', JSON.stringify(updated.slice(0, 10)));

      // Set the new profile as active
      localStorage.setItem('activeProfileId', newProfile.id);

      setShowCreateForm(false);
      setCreateFormData({ name: '', avatar: AVATARS[0], phone: '', bio: '', sms_consent: false });
      setIsCreating(false);
      
      // Navigate to Screen1 which will handle onboarding check
      onNavigate && onNavigate('screen1');
    } catch (err) {
      console.error('Error creating profile:', err);
      setCreateError('Failed to create profile');
      setIsCreating(false);
    }
  }

  function handleViewHistory(profileId) {
    // Phase 2: This will navigate to past rivalries list
    // For now, just log that it was clicked
    console.log('View History clicked for profile:', profileId);
    onNavigate && onNavigate('pastRivalries', { profileId });
  }

  function handleLogOut() {
    localStorage.removeItem('activeProfileId');
    // If only 1 profile, go to landing page
    // If multiple profiles, stay on this screen but logged out
    if (profiles.length <= 1) {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  }

  function handleBack() {
    onNavigate && onNavigate('screen1');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />
        <div className="text-slate-400">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-4 transition-colors"
        >
          <span>←</span>
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-orange-500 mb-1">Your Profiles</h1>
          {currentPhone && (
            <p className="text-sm text-slate-400">
              Tied to ***-***-{currentPhone.slice(-4)}
            </p>
          )}
        </div>

        {/* Profile Cards */}
        <div className="space-y-4 mb-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`rounded-lg p-4 ${
                profile.id === activeProfileId
                  ? 'bg-slate-700/50 border-2 border-orange-500'
                  : 'bg-slate-700/30 border border-slate-600'
              }`}
            >
              {editingProfileId === profile.id ? (
                /* Edit Form */
                <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(profile.id); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Name:</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Avatar:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, avatar: emoji })}
                          className={`text-2xl py-2 bg-slate-700/50 rounded border-2 transition-all ${
                            editFormData.avatar === emoji
                              ? 'border-orange-500 bg-slate-600/60'
                              : 'border-transparent hover:border-slate-500'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Phone:</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="415-555-1234"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Bio <span className="text-slate-500 font-normal">(optional):</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.bio}
                      onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                      placeholder="Pun enthusiast"
                      maxLength={50}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.sms_consent}
                        onChange={(e) => {
                          // If blocked by Twilio, don't allow checking the box
                          if (editFormData.twilio_blocked && e.target.checked) {
                            return; // Prevent checking
                          }
                          setEditFormData({ ...editFormData, sms_consent: e.target.checked });
                        }}
                        className="mt-0.5 w-5 h-5 text-orange-500 bg-slate-700 border-slate-500 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-slate-200">Send me text notifications about my games</span>
                        <p className="text-xs text-slate-400 mt-1">
                          Get notified when it's your turn and results are ready (~3-6 msgs per rivalry). Msg & data rates may apply. Reply STOP to opt out anytime.
                        </p>
                        <p className="text-xs mt-1">
                          <a href="/terms" target="_blank" className="text-orange-400 hover:text-orange-300">Terms</a>
                          <span className="text-slate-500"> | </span>
                          <a href="/privacy" target="_blank" className="text-orange-400 hover:text-orange-300">Privacy</a>
                        </p>
                        {editFormData.twilio_blocked && (
                          <p className="text-xs text-orange-400 mt-2">
                            You previously opted out via text. To resume game messages, text START to (240) 663-8746, then check this box again (as well as on other profiles you may have).
                          </p>
                        )}
                      </div>
                    </label>
                  </div>

                  {editError && <div className="text-red-400 text-sm">{editError}</div>}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-2 bg-orange-500 text-white font-medium rounded hover:bg-orange-400 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Profile Card Display */
                <>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl">{profile.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-slate-100 truncate">
                          {profile.name}
                        </h3>
                        {profile.id === activeProfileId && (
                          <span className="text-orange-500 font-semibold">(active profile)</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">Profile ID: {profile.code}</div>
                    </div>
                  </div>

                  {/* Rivalry Status */}
                  {profile.rivalry ? (
                    <div className="mb-2 text-sm">
                      <div className="text-slate-300">
                        In a rivalry with {profile.opponentName}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 text-sm text-slate-500">Not in a rivalry</div>
                  )}

                  {/* Past Rivalries Win/Loss Record - only show if has completed rivalries */}
                  {profile.hasCompletedRivalries && (
                    <div className="mb-3 text-sm text-slate-400">
                      Past rivalries: {profile.wins} {profile.wins === 1 ? 'win' : 'wins'}, {profile.losses} {profile.losses === 1 ? 'loss' : 'losses'}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {profile.id !== activeProfileId && (
                      <button
                        onClick={() => handleSwitchProfile(profile.id)}
                        className="w-full py-2 px-3 bg-slate-600/50 text-slate-200 text-sm font-medium rounded border border-slate-500 hover:bg-slate-600"
                      >
                        Switch to This
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(profile)}
                      className="w-full py-2 px-3 bg-slate-600/50 text-slate-200 text-sm font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Edit Profile
                    </button>
                    {profile.hasCompletedRivalries && (
                      <button
                        onClick={() => handleViewHistory(profile.id)}
                        className="w-full py-2 px-3 bg-slate-600/50 text-slate-200 text-sm font-medium rounded border border-slate-500 hover:bg-slate-600"
                      >
                        View History
                      </button>
                    )}
                    <button
                      onClick={() => setDeletingProfileId(profile.id)}
                      className="w-full py-2 px-3 bg-slate-600/50 text-slate-200 text-sm font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Delete Profile
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Create New Profile - Only show when NOT editing */}
        {!editingProfileId && (
          <>
            {!showCreateForm ? (
              <button
                onClick={() => {
                  // Pre-fill phone number if we know it
                  if (currentPhone) {
                    setCreateFormData(prev => ({ ...prev, phone: currentPhone }));
                  }
                  setShowCreateForm(true);
                }}
                className="w-full py-3 mb-4 bg-slate-700/30 text-orange-500 font-medium rounded-lg border border-slate-600 hover:bg-slate-700/50"
              >
                + Create New Profile
              </button>
            ) : (
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-orange-500 mb-4">Create New Profile</h3>
                <form onSubmit={handleCreateNewProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Name:</label>
                    <input
                      type="text"
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                      placeholder="Profile name"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Avatar:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCreateFormData({ ...createFormData, avatar: emoji })}
                          className={`text-2xl py-2 bg-slate-700/50 rounded border-2 transition-all ${
                            createFormData.avatar === emoji
                              ? 'border-orange-500 bg-slate-600/60'
                              : 'border-transparent hover:border-slate-500'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Phone:</label>
                    <input
                      type="tel"
                      value={createFormData.phone}
                      onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                      placeholder="415-555-1234"
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
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
                      value={createFormData.bio}
                      onChange={(e) => setCreateFormData({ ...createFormData, bio: e.target.value })}
                      placeholder="Pun enthusiast"
                      maxLength={50}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createFormData.sms_consent}
                        onChange={(e) => setCreateFormData({ ...createFormData, sms_consent: e.target.checked })}
                        className="mt-0.5 w-5 h-5 text-orange-500 bg-slate-700 border-slate-500 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-slate-200">Send me text notifications about my games</span>
                        <p className="text-xs text-slate-400 mt-1">
                          Get notified when it's your turn and results are ready (~3-6 msgs per rivalry). Msg & data rates may apply. Reply STOP to opt out anytime.
                        </p>
                        <p className="text-xs mt-1">
                          <a href="/terms" target="_blank" className="text-orange-400 hover:text-orange-300">Terms</a>
                          <span className="text-slate-500"> | </span>
                          <a href="/privacy" target="_blank" className="text-orange-400 hover:text-orange-300">Privacy</a>
                        </p>
                      </div>
                    </label>
                  </div>

                  {createError && <div className="text-red-400 text-sm">{createError}</div>}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="flex-1 py-2 bg-orange-500 text-white font-medium rounded hover:bg-orange-400 disabled:opacity-50"
                    >
                      {isCreating ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Log Out */}
            <button
              onClick={handleLogOut}
              className="w-full py-3 mb-4 bg-slate-600/30 text-slate-400 font-medium rounded-lg border border-slate-600 hover:bg-slate-600/50"
            >
              Log Out
            </button>

            {/* Delete All - Nuclear Option */}
            <div className="text-center">
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="text-sm text-slate-500 hover:text-red-400 transition-colors"
              >
                Delete all profiles
              </button>
            </div>
          </>
        )}

        {/* Delete Single Profile Confirmation Modal */}
        {deletingProfileId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Delete "{profiles.find(p => p.id === deletingProfileId)?.name}"?
              </h3>
              {profiles.find(p => p.id === deletingProfileId)?.rivalry ? (
                <p className="text-slate-300 text-sm mb-4">
                  This will end your rivalry with{' '}
                  {profiles.find(p => p.id === deletingProfileId)?.opponentName} and delete this profile.
                </p>
              ) : (
                <p className="text-slate-300 text-sm mb-4">
                  This will permanently delete this profile and its history.
                </p>
              )}
              <p className="text-slate-400 text-sm mb-6">This cannot be undone.</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleDeleteProfile(deletingProfileId)}
                  className="w-full py-3 bg-red-600 text-white font-medium rounded hover:bg-red-500"
                >
                  Delete Profile
                </button>
                <button
                  onClick={() => setDeletingProfileId(null)}
                  className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete All Profiles Confirmation Modal */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-red-500/50 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-red-400 mb-4">
                🚨 Delete Everything?
              </h3>
              <p className="text-slate-300 text-sm mb-3">
                This will permanently delete ALL {profiles.length} profile{profiles.length !== 1 ? 's' : ''} tied to this phone number:
              </p>
              <ul className="text-slate-400 text-sm mb-4 space-y-1">
                {profiles.map(p => (
                  <li key={p.id}>• {p.name}</li>
                ))}
              </ul>
              <p className="text-slate-300 text-sm mb-6">
                All active rivalries will be cancelled. All history will be lost.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleDeleteAllProfiles}
                  disabled={isDeletingAll}
                  className="w-full py-3 bg-red-600 text-white font-medium rounded hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingAll ? 'Deleting...' : 'Delete All Profiles'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteAllModal(false);
                  }}
                  className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}