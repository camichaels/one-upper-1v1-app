import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderWithBack from '../HeaderWithBack';
import { createShowdown, joinShowdown, getShowdownByCode, PROMPT_CATEGORIES, AVATARS } from '../../services/showdown';
import { supabase } from '../../lib/supabase';

export default function ShowdownEntry() {
  const navigate = useNavigate();
  
  // Expansion states
  const [showStartExpanded, setShowStartExpanded] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState('mixed');
  const [existingProfile, setExistingProfile] = useState(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [brag, setBrag] = useState('');
  
  // Join modal state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Load existing profile and session data
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
    
    if (savedName) setName(savedName);
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
      setError('Please share something un-one-uppable');
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

  async function handleJoinSubmit() {
    const cleanCode = joinCode.toUpperCase().trim();
    
    if (cleanCode.length !== 4) {
      setJoinError('Code must be 4 characters');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      // Validate the code exists and is joinable
      const showdown = await getShowdownByCode(cleanCode);
      
      if (!showdown) {
        setJoinError('Showdown not found. Check the code and try again.');
        setIsJoining(false);
        return;
      }

      if (showdown.status !== 'lobby') {
        setJoinError('This showdown has already started.');
        setIsJoining(false);
        return;
      }

      const playerCount = showdown.players?.length || 0;
      if (playerCount >= 5) {
        setJoinError('This showdown is full (5 players max).');
        setIsJoining(false);
        return;
      }

      // Navigate to join page with code
      navigate(`/showdown/${cleanCode}/join`);
    } catch (err) {
      console.error('Failed to check showdown:', err);
      setJoinError('Could not find that showdown. Check the code.');
      setIsJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <HeaderWithBack backTo="/go" />
      
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-orange-500">It's a One-Up Show-Down!</h1>
        </div>

        <div className="space-y-4">
          {/* Start a Showdown Button */}
          <button
            onClick={() => setShowStartExpanded(!showStartExpanded)}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
          >
            Start a Showdown
            <span className={`transition-transform ${showStartExpanded ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>

          {/* Expanded Form */}
          {showStartExpanded && (
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
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
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  maxLength={20}
                  disabled={!!existingProfile}
                />
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
                      onClick={() => !existingProfile && setAvatar(a)}
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
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  rows={2}
                  maxLength={100}
                />
                <p className="text-slate-500 text-xs mt-1 text-right">
                  {brag.length}/100
                </p>
              </div>

              {/* Category Grid */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-3">
                  Pick a category:
                </label>
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

              {/* Error */}
              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={isCreating || !name.trim() || !brag.trim()}
                className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
              >
                {isCreating ? 'Creating...' : 'Create Showdown Code'}
              </button>
            </div>
          )}

          {/* Have a Code Button */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-4 px-6 rounded-xl font-medium transition-colors border border-slate-600"
          >
            Have a Code?
          </button>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 border border-slate-700">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-orange-500">
                Join a Showdown
              </h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                  setJoinError('');
                }}
                className="text-slate-400 hover:text-slate-200 text-2xl"
              >
                ×
              </button>
            </div>
            
            <label className="block text-slate-300 text-sm font-medium">
              Enter showdown code:
            </label>
            
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 4);
                setJoinCode(cleaned.toUpperCase());
                setJoinError('');
              }}
              placeholder="ABCD"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-3xl uppercase text-center tracking-widest font-mono"
              maxLength={4}
              autoFocus
            />
            
            {joinError && (
              <p className="text-red-400 text-sm text-center">{joinError}</p>
            )}
            
            <button
              onClick={handleJoinSubmit}
              disabled={joinCode.length !== 4 || isJoining}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              {isJoining ? 'Checking...' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}