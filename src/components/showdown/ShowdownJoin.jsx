import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../Header';
import HeaderWithBack from '../HeaderWithBack';
import { getShowdownByCode, joinShowdown, AVATARS } from '../../services/showdown';
import { supabase } from '../../lib/supabase';

export default function ShowdownJoin() {
  const navigate = useNavigate();
  const { code } = useParams();
  
  // Showdown data
  const [showdown, setShowdown] = useState(null);
  const [loadingShowdown, setLoadingShowdown] = useState(true);
  const [showdownError, setShowdownError] = useState('');
  
  // Player info
  const [existingProfile, setExistingProfile] = useState(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [brag, setBrag] = useState('');
  
  // UI state
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  // Load showdown and check if valid
  useEffect(() => {
    async function loadShowdown() {
      try {
        const data = await getShowdownByCode(code);
        
        if (!data) {
          setShowdownError('Invalid code. Check with the host and try again.');
          setLoadingShowdown(false);
          return;
        }

        if (data.status !== 'lobby') {
          setShowdownError('This Showdown has already begun. Ask the host to start a new one.');
          setLoadingShowdown(false);
          return;
        }

        if (data.players && data.players.length >= 5) {
          setShowdownError('This Showdown is full (5/5 players). Ask the host to start a new one.');
          setLoadingShowdown(false);
          return;
        }

        setShowdown(data);
        setLoadingShowdown(false);
      } catch (err) {
        console.error('Failed to load showdown:', err);
        setShowdownError('Failed to load showdown. Try again.');
        setLoadingShowdown(false);
      }
    }

    loadShowdown();
  }, [code]);

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
    
    if (savedName) setName(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
    if (savedBrag) setBrag(savedBrag);
  }, []);

  async function handleJoin() {
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

    setIsJoining(true);
    setError('');

    try {
      // Save to session for repeat plays
      sessionStorage.setItem('showdown_name', name);
      sessionStorage.setItem('showdown_avatar', avatar);
      sessionStorage.setItem('showdown_brag', brag);

      // Join the showdown
      const player = await joinShowdown({
        showdownId: showdown.id,
        profileId: existingProfile?.id || null,
        guestName: existingProfile ? null : name.trim(),
        guestAvatar: existingProfile ? null : avatar,
        entryBrag: brag.trim(),
        isHost: false
      });

      // Store player ID for this session
      sessionStorage.setItem('showdown_player_id', player.id);

      // Navigate to lobby
      navigate(`/showdown/${code}`);
    } catch (err) {
      console.error('Failed to join showdown:', err);
      setError(err.message || 'Failed to join showdown');
      setIsJoining(false);
    }
  }

  // Loading state
  if (loadingShowdown) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <HeaderWithBack backTo="/showdown" />
        <div className="max-w-md mx-auto text-center">
          <p className="text-slate-400">Loading showdown...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (showdownError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <HeaderWithBack backTo="/showdown" />
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Oops!</h2>
          <p className="text-slate-400 mb-6">{showdownError}</p>
          <button
            onClick={() => navigate('/showdown')}
            className="bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Back to Showdown
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <HeaderWithBack backTo="/showdown" />
      
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-orange-500 mb-2">Join Showdown</h1>
          <p className="text-slate-400">
            Code: <span className="font-mono text-slate-200">{code}</span>
          </p>
          {showdown.players && (
            <p className="text-slate-500 text-sm mt-1">
              {showdown.players.length} player{showdown.players.length !== 1 ? 's' : ''} waiting
            </p>
          )}
        </div>

        {/* Form box - matches ShowdownEntry expanded style */}
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
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none"
              rows={2}
              maxLength={100}
            />
            <p className="text-slate-500 text-xs mt-1 text-right">
              {brag.length}/100
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={isJoining || !name.trim() || !brag.trim()}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            {isJoining ? 'Joining...' : 'Join Showdown'}
          </button>
        </div>
      </div>
    </div>
  );
}