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
  
  // Edit state
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Delete state
  const [deletingProfileId, setDeletingProfileId] = useState(null);
  
  // Create new profile state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    avatar: AVATARS[0],
    phone: '',
    bio: ''
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

  async function loadProfiles() {
    try {
      const activeId = localStorage.getItem('activeProfileId');
      setActiveProfileId(activeId);

      const recentProfiles = JSON.parse(localStorage.getItem('recentProfiles') || '[]');
      
      if (recentProfiles.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const profileIds = recentProfiles.map(p => p.id);
      
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds);

      if (error) throw error;

      // Get rivalry data for each profile
      const profilesWithRivalries = await Promise.all(
        profilesData.map(async (profile) => {
          const { data: rivalryData } = await supabase
  .from('rivalries')
  .select('*, profile_a:profile_a_id(*), profile_b:profile_b_id(*)')
  .or(`profile_a_id.eq.${profile.id},profile_b_id.eq.${profile.id}`)
  .eq('status', 'active');

const rivalry = rivalryData && rivalryData.length > 0 ? rivalryData[0] : null;

return {
  ...profile,
  rivalry: rivalry || null,
  opponentName: rivalry
    ? (rivalry.profile_a_id === profile.id ? rivalry.profile_b.name : rivalry.profile_a.name)
    : null
};
        })
      );

      // Sort: active first, then by recent usage
      const sorted = profilesWithRivalries.sort((a, b) => {
        if (a.id === activeId) return -1;
        if (b.id === activeId) return 1;
        return 0;
      });

      setProfiles(sorted);
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
      bio: profile.bio || ''
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

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editFormData.name.trim(),
          avatar: editFormData.avatar,
          phone: normalizedPhone,
          bio: editFormData.bio.trim() || null
        })
        .eq('id', profileId);

      if (error) throw error;

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
      // First, delete any rivalries this profile is in
      await supabase
        .from('rivalries')
        .delete()
        .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`);

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
      await loadProfiles();
    } catch (err) {
      console.error('Error deleting profile:', err);
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
          bio: createFormData.bio.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

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

      setShowCreateForm(false);
      setCreateFormData({ name: '', avatar: AVATARS[0], phone: '', bio: '' });
      setIsCreating(false);
      await loadProfiles();
    } catch (err) {
      console.error('Error creating profile:', err);
      setCreateError('Failed to create profile');
      setIsCreating(false);
    }
  }

  function handleLogOut() {
    localStorage.removeItem('activeProfileId');
    window.location.reload();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />  {/* ← ADD THIS LINE */}
        <div className="text-slate-400">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />  {/* ← ADD THIS LINE */}
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('screen1')}
            className="text-slate-400 hover:text-slate-200 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-orange-500">Your Profiles</h1>
        </div>

        {/* Profiles List */}
        <div className="space-y-4 mb-6">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`bg-slate-700/30 border rounded-lg p-4 ${
                profile.id === activeProfileId ? 'border-orange-500' : 'border-slate-600'
              }`}
            >
              {editingProfileId === profile.id ? (
                // EDIT MODE
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-orange-500 mb-3">Edit Profile</h3>
                  
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Name:</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
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
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">US phone number (10 digits)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">Bio:</label>
                    <input
                      type="text"
                      value={editFormData.bio}
                      onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                      placeholder="Pun enthusiast"
                      maxLength={50}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-slate-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="text-sm text-slate-400">
                    Code: <span className="text-orange-500">{profile.code}</span> (permanent)
                  </div>

                  {editError && <div className="text-red-400 text-sm">{editError}</div>}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(profile.id)}
                      disabled={isSaving}
                      className="flex-1 py-2 bg-orange-500 text-white font-medium rounded hover:bg-orange-400 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <button
                    onClick={() => setDeletingProfileId(profile.id)}
                    className="w-full py-2 bg-red-600/20 text-red-400 font-medium rounded border border-red-600/50 hover:bg-red-600/30"
                  >
                    Delete Profile
                  </button>
                </div>
              ) : (
                // VIEW MODE
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-lg font-semibold text-slate-100">
                        {profile.avatar} {profile.name}
                        {profile.id === activeProfileId && (
                          <span className="ml-2 text-xs text-orange-500">(active)</span>
                        )}
                      </div>
                      <div className="text-sm text-slate-400">Code: {profile.code}</div>
                    </div>
                  </div>

                  {profile.rivalry ? (
                    <div className="mb-3 text-sm">
                      <div className="text-slate-300">
                        Rivalry with {profile.opponentName}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 text-sm text-slate-500">No active Rivalry</div>
                  )}

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
                    <button
                      onClick={() => setDeletingProfileId(profile.id)}
                      className="w-full py-2 px-3 bg-slate-600/50 text-slate-200 text-sm font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Delete Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create New Profile - Only show when NOT editing */}
        {!editingProfileId && (
          <>
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
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
                  placeholder="Craig"
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
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Phone:
                </label>
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

        {/* Log Out - Only show when NOT editing */}
        <button
          onClick={handleLogOut}
          className="w-full py-3 bg-slate-600/30 text-slate-400 font-medium rounded-lg border border-slate-600 hover:bg-slate-600/50"
        >
          Log Out
        </button>
        </>
        )}

        {/* Delete Confirmation Modal */}
        {deletingProfileId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Delete "{profiles.find(p => p.id === deletingProfileId)?.name}"?
              </h3>
              {profiles.find(p => p.id === deletingProfileId)?.rivalry ? (
                <p className="text-slate-300 text-sm mb-4">
                  This will end your Rivalry <span className="text-orange-500">with</span>{' '}
                  {profiles.find(p => p.id === deletingProfileId)?.opponentName} and delete all Show history.
                </p>
              ) : (
                <p className="text-slate-300 text-sm mb-4">
                  This will permanently delete this profile.
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
      </div>
    </div>
  );
}