import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderWithBack from '../HeaderWithBack';
import { createShowdown, joinShowdown, PROMPT_CATEGORIES, AVATARS } from '../../services/showdown';
import { supabase } from '../../lib/supabase';

export default function ShowdownCreate() {
  const navigate = useNavigate();
  
  // Category selection
  const [selectedCategory, setSelectedCategory] = useState('mixed');
  
  // Host player info
  const [existingProfile, setExistingProfile] = useState(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [brag, setBrag] = useState('');
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Check for existing profile
  useEffect(() => {
    async function loadProfile() {
      const profileId = localStorage.getItem('activeProfileId');
      if (profileId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, avatar')
          .eq('id', profileId)
          .single();
        
        if (profile) {
          setExistingProfile(profile);
          setName(profile.name);
          setAvatar(profile.avatar);
        }
      }
    }
    loadProfile();

    // Load from session storage (for repeat plays)
    const savedName = sessionStorage.getItem('showdown_name');
    const savedAvatar = sessionStorage.getItem('showdown_avatar');
    const savedBrag = sessionStorage.getItem('showdown_brag');
    
    if (savedName && !existingProfile) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
    if (savedBrag) setBrag(savedBrag);
  }, []);

  async function handleCreate() {
    // Validate
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!brag.trim()) {
      setError('Please share your un-one-uppable brag');
      return;
    }
    if (brag.length > 100) {
      setError('Brag must be 100 characters or less');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create the showdown
      const showdown = await createShowdown(selectedCategory);

      // Save to session for repeat plays
      sessionStorage.setItem('showdown_name', name);
      sessionStorage.setItem('showdown_avatar', avatar);
      sessionStorage.setItem('showdown_brag', brag);

      // Join as host
      const player = await joinShowdown({
        showdownId: showdown.id,
        profileId: existingProfile?.id || null,
        guestName: existingProfile ? null : name.trim(),
        guestAvatar: existingProfile ? null : avatar,
        entryBrag: brag.trim(),
        isHost: true
      });

      // Store player ID for this session
      sessionStorage.setItem('showdown_player_id', player.id);

      // Navigate to lobby
      navigate(`/showdown/${showdown.code}`);
    } catch (err) {
      console.error('Failed to create showdown:', err);
      setError(err.message || 'Failed to create showdown');
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <HeaderWithBack backTo="/showdown" />
      
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-orange-500 mb-2">Create Showdown</h1>
          <p className="text-slate-400 text-sm">
            You'll be the host - you control when things move forward
          </p>
        </div>

        <div className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-3">
              Pick a category:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROMPT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700"></div>

          {/* Name */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Your name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              maxLength={20}
              disabled={!!existingProfile}
            />
            {existingProfile && (
              <p className="text-slate-500 text-xs mt-1">Using your profile name</p>
            )}
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Avatar:
            </label>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`text-4xl p-4 rounded-lg transition-all bg-slate-700/50 hover:bg-slate-600/50 ${
                    avatar === a
                      ? 'ring-2 ring-orange-500 bg-slate-600/50'
                      : ''
                  }`}
                  disabled={!!existingProfile}
                >
                  {a}
                </button>
              ))}
            </div>
            {existingProfile && (
              <p className="text-slate-500 text-xs mt-1">Using your profile avatar</p>
            )}
          </div>

          {/* Entry Brag */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Share something un-one-uppable about yourself:
            </label>
            <textarea
              value={brag}
              onChange={(e) => setBrag(e.target.value)}
              placeholder="I once got a standing ovation for parallel parking..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              rows={2}
              maxLength={100}
            />
            <p className="text-slate-500 text-xs mt-1 text-right">
              {brag.length}/100
            </p>
            <p className="text-slate-400 text-xs mt-1">
              This will be revealed at the end!
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !brag.trim()}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            {isCreating ? 'Creating...' : 'Create Showdown'}
          </button>
        </div>
      </div>
    </div>
  );
}