import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderWithBack from '../HeaderWithBack';
import { createShowdown, joinShowdown, getShowdownByCode, PROMPT_CATEGORIES, AVATARS } from '../../services/showdown';
import { supabase } from '../../lib/supabase';

// Judge quotes - same pool as GameModeChoice
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
];

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
  const [judgeQuote, setJudgeQuote] = useState(null);

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

    // Pick random judge quote
    setJudgeQuote(JUDGE_QUOTES[Math.floor(Math.random() * JUDGE_QUOTES.length)]);
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
        setJoinError("Can't find that one. Double-check the code?");
        setIsJoining(false);
        return;
      }

      if (showdown.status !== 'lobby') {
        setJoinError('Too late! This one already started.');
        setIsJoining(false);
        return;
      }

      const playerCount = showdown.players?.length || 0;
      if (playerCount >= 5) {
        setJoinError('Full house! This one has 5 players already.');
        setIsJoining(false);
        return;
      }

      // Navigate to join page with code
      navigate(`/showdown/${cleanCode}/join`);
    } catch (err) {
      console.error('Failed to check showdown:', err);
      setJoinError("Can't find that one. Double-check the code?");
      setIsJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <HeaderWithBack backTo="/go" />
      
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-orange-500">Round up the competition.</h1>
        </div>

        <div className="space-y-4">
          {/* Start a Showdown Button */}
          <button
            onClick={() => setShowStartExpanded(!showStartExpanded)}
            className="w-full bg-orange-500 hover:bg-orange-400 hover:scale-[1.02] text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 text-lg flex items-center justify-center gap-2"
          >
            Host a Showdown
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
                  What do they call you?
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
                  Pick your fighter:
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
                  Brag a little:
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
                  Set the vibe:
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
                {isCreating ? 'Creating...' : 'Get Your Code'}
              </button>
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full bg-slate-700 hover:bg-slate-600 hover:scale-[1.02] text-slate-100 py-4 px-6 rounded-xl font-medium transition-all duration-300 border border-slate-600 hover:border-orange-500/50"
          >
            Join with Code
          </button>
        </div>

        {/* Footer - Judge Quote */}
        <div className="mt-10 text-center">
          {judgeQuote && (
            <>
              <p className="text-slate-400 italic text-sm">
                {judgeQuote.text}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {judgeQuote.emoji} {judgeQuote.judge}
              </p>
            </>
          )}
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
              Enter the code:
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
              {isJoining ? 'Checking...' : 'Join'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}