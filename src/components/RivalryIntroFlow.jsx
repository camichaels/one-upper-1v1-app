import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import HeaderWithMenu from './HeaderWithMenu';
import HowToPlayModal from './HowToPlayModal';

// Logo
import Logo from '/logo-wide.png';

// Randomized intro taglines (shown with logo in animation)
const INTRO_TAGLINES = [
  "Be bold. Be memorable. Out-do your rival.",
  "Be weird. Be unforgettable. Win.",
  "Out-think. Out-weird. Out-do.",
  "No points for playing it safe.",
  "Make them remember you."
];

// Randomized Ripley lines for first-time rivalries
const RIPLEY_FIRST_MEETING = [
  "Welcome to the arena. I'm Ripley, your host. Let's see what you've got.",
  "Fresh rivals. I'm Ripley — I run this show. Make it interesting.",
  "New blood! I'm your host, Ripley. I call the rounds and try not to play favorites.",
  "First time facing off? I'm Ripley. I keep things moving and the judges honest. Mostly."
];

// Randomized Ripley lines for rematches
const RIPLEY_REMATCH = [
  "Back for more? I respect that. Let's see if anything's changed.",
  "You two again? This should be good.",
  "A rematch? Someone's hungry for redemption.",
  "You two can't quit each other. I love it."
];

// Randomized lines after judges (the reminder)
const JUDGE_REMINDER_LINES = [
  "They don't care if you're right. They care if you're memorable.",
  "Truth won't save you here. Only boldness.",
  "Play it safe and you lose. Simple as that.",
  "Impress them or go home.",
  "The judges reward risk. Remember that."
];

// Category display names
const CATEGORY_DISPLAY = {
  mixed: "Surprise Me",
  pop_culture: "Pop Culture",
  deep_think: "Deep Think",
  edgy: "More Edgy",
  absurd: "Totally Absurd",
  everyday: "Everyday"
};

// Helper to pick random item from array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function RivalryIntroFlow({ 
  rivalry, 
  profile, 
  opponent,
  judges,
  onComplete,
  onNavigate
}) {
  // Animation phases
  const [phase, setPhase] = useState('intro'); // 'intro' | 'reveal'
  const [introStep, setIntroStep] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  
  // Randomized text (set once on mount)
  const [introTagline] = useState(() => pickRandom(INTRO_TAGLINES));
  const [judgeReminder] = useState(() => pickRandom(JUDGE_REMINDER_LINES));
  const [ripleyLine, setRipleyLine] = useState('');
  
  // Rivalry history
  const [rivalryNumber, setRivalryNumber] = useState(1);
  const [headToHead, setHeadToHead] = useState({ player: 0, rival: 0 });
  const [isRematch, setIsRematch] = useState(false);
  
  // UI state
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Check rivalry history between these two players
  useEffect(() => {
    async function checkHistory() {
      // Get all completed rivalries, then filter client-side for this pair
      const { data: allCompleted, error } = await supabase
        .from('rivalries')
        .select('id, summary, profile_a_id, profile_b_id')
        .eq('status', 'complete');

      if (error) {
        console.error('Error checking rivalry history:', error);
        setRipleyLine(pickRandom(RIPLEY_FIRST_MEETING));
        return;
      }

      // Filter to rivalries between these exact two players
      const pastRivalries = (allCompleted || []).filter(r => 
        (r.profile_a_id === profile.id && r.profile_b_id === opponent.id) ||
        (r.profile_a_id === opponent.id && r.profile_b_id === profile.id)
      );

      console.log('Past rivalries between players:', pastRivalries.length);

      if (pastRivalries.length > 0) {
        setIsRematch(true);
        setRivalryNumber(pastRivalries.length + 1);
        
        // Calculate head-to-head (winner_id is inside summary JSON)
        const playerWins = pastRivalries.filter(r => r.summary?.winner_id === profile.id).length;
        const rivalWins = pastRivalries.filter(r => r.summary?.winner_id === opponent.id).length;
        setHeadToHead({ player: playerWins, rival: rivalWins });
        
        setRipleyLine(pickRandom(RIPLEY_REMATCH));
      } else {
        setRipleyLine(pickRandom(RIPLEY_FIRST_MEETING));
      }
    }
    
    if (profile?.id && opponent?.id) {
      checkHistory();
    }
  }, [profile?.id, opponent?.id]);

  // Intro animation sequence
  useEffect(() => {
    if (phase !== 'intro') return;
    
    const timers = [
      setTimeout(() => setIntroStep(1), 100),    // Logo + tagline fades in
      setTimeout(() => setIntroStep(2), 3000),   // Ripley bubble fades in (extra second)
      setTimeout(() => setIntroStep(3), 5000),   // Start fading out
      setTimeout(() => {
        setPhase('reveal');
        setRevealStep(0);
      }, 5600),
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [phase]);

  // Reveal animation sequence
  useEffect(() => {
    if (phase !== 'reveal') return;
    
    const timers = [
      setTimeout(() => setRevealStep(1), 100),   // Players slide in
      setTimeout(() => setRevealStep(2), 600),   // VS badge punches in
      setTimeout(() => setRevealStep(3), 900),   // Rematch line fades in
      setTimeout(() => setRevealStep(4), 1200),  // Vibe/stakes fade in
      setTimeout(() => setRevealStep(5), 1500),  // Judges fade in
      setTimeout(() => setRevealStep(6), 1900),  // Reminder line fades in
      setTimeout(() => setRevealStep(7), 2400),  // Button appears
    ];
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [phase]);

  // Handle completing intro and marking as seen
  async function handleComplete() {
    setIsCompleting(true);
    
    // Determine which field to update based on which profile we are
    const updateField = rivalry.profile_a_id === profile.id 
      ? 'profile_a_seen_intro' 
      : 'profile_b_seen_intro';

    await supabase
      .from('rivalries')
      .update({ [updateField]: true })
      .eq('id', rivalry.id);

    onComplete();
  }

  // Get display values
  const categoryDisplay = CATEGORY_DISPLAY[rivalry.prompt_category] || CATEGORY_DISPLAY.mixed;
  const roundCount = rivalry.match_length || 5;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      
      {/* INTRO ANIMATION OVERLAY */}
      {phase === 'intro' && (
        <div className={`fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center px-6 transition-opacity duration-500 ${introStep >= 3 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Logo + Tagline */}
          <div className={`text-center mb-12 transition-all duration-700 ${introStep >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            <img 
              src={Logo} 
              alt="One-Upper" 
              className="h-10 mx-auto mb-4"
            />
            <p className="text-slate-300 text-lg">{introTagline}</p>
          </div>
          
          {/* Ripley speech bubble */}
          <div className={`relative max-w-sm transition-all duration-500 ${introStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/80 rounded-2xl p-5 border border-slate-600/50 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🎙️</span>
                <span className="text-orange-500 font-bold text-lg">Ripley</span>
              </div>
              <p className="text-white text-lg leading-relaxed">{ripleyLine}</p>
            </div>
            {/* Speech bubble tail */}
            <svg 
              className="absolute -bottom-3 left-10 w-6 h-4 text-slate-800" 
              viewBox="0 0 24 16" 
              fill="currentColor"
            >
              <path d="M0 0 L12 16 L24 0 Z" />
            </svg>
          </div>
          
        </div>
      )}

      {/* MAIN CONTENT - Header hidden during intro */}
      <div className={`${phase === 'intro' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
        <div className="px-5 py-6">
          <HeaderWithMenu
            onHowToPlay={() => setShowHowToPlay(true)}
            onProfiles={() => onNavigate && onNavigate('screen2')}
            onCancel={() => setShowCancelModal(true)}
          />
        </div>
        
        <div className="max-w-md mx-auto px-6 pb-8">

          {/* VS Card */}
          <div className="relative rounded-2xl p-6 mb-6 overflow-hidden">
            {/* Gradient background - subtler */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-indigo-900/20"></div>
            {/* Subtle glow behind VS area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-32 h-32 bg-orange-500/15 rounded-full blur-3xl transition-opacity duration-1000 ${revealStep >= 2 ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>
            {/* Border - lighter */}
            <div className="absolute inset-0 rounded-2xl border border-slate-700/30"></div>
            
            {/* Content */}
            <div className="relative">
              {/* Players */}
              <div className="flex items-center justify-center gap-8 mb-4">
                {/* Player */}
                <div className={`text-center transition-all duration-500 ${revealStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                  <div className="text-5xl mb-2">{profile.avatar}</div>
                  <p className="font-semibold text-white text-lg">{profile.name}</p>
                  <p className="text-base text-slate-400">You</p>
                </div>
                
                {/* VS Badge - purple to differentiate from orange buttons */}
                <div className={`transition-all duration-300 ${revealStep >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500 rounded-lg blur-md opacity-60 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-violet-400 to-violet-600 text-white font-bold text-base px-5 py-2 rounded-lg shadow-lg">
                      VS
                    </div>
                  </div>
                </div>
                
                {/* Rival */}
                <div className={`text-center transition-all duration-500 ${revealStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                  <div className="text-5xl mb-2">{opponent.avatar}</div>
                  <p className="font-semibold text-white text-lg">{opponent.name}</p>
                  <p className="text-base text-slate-400">Rival</p>
                </div>
              </div>
              
              {/* Rematch line - simplified for now, no stats */}
              {isRematch && (
                <div className={`text-center transition-all duration-500 ${revealStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="inline-flex items-center gap-2 bg-slate-900/60 backdrop-blur-sm px-4 py-1.5 rounded-full text-base border border-slate-700/50">
                    <span className="text-orange-400">🔥</span>
                    <span className="text-slate-300">Rematch</span>
                  </span>
                </div>
              )}

              {/* Round count */}
              <p className={`text-slate-400 text-center text-base mt-4 transition-all duration-500 ${revealStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                {roundCount} rounds. 3 judges. 1 winner.
              </p>
            </div>
          </div>

          {/* Vibe & Stakes */}
          <div className={`space-y-3 mb-6 transition-all duration-500 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {/* Vibe */}
            <div className="bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/40">
              <p className="text-slate-400 text-base">
                Prompt vibe: <span className="text-orange-400 font-medium">{categoryDisplay}</span>
              </p>
            </div>
            
            {/* Stakes / Golden Mic */}
            <div className="relative bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/40 overflow-hidden">
              {/* Subtle gold shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent"></div>
              <div className="relative">
                {rivalry.stakes ? (
                  <p className="text-slate-400 text-base">
                    Playing for: <span className="text-orange-400 font-medium">The Golden Mic + {rivalry.stakes}</span>
                  </p>
                ) : (
                  <p className="text-slate-400 text-base">
                    Playing for: <span className="text-orange-400 font-medium">The Golden Mic</span>
                  </p>
                )}
              </div>
            </div>
            
          </div>

          {/* Judges */}
          <div className={`mb-6 transition-all duration-500 ${revealStep >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-slate-400 text-base mb-3">🎙️ Your judges today...</p>
            
            <div className="grid grid-cols-3 gap-2">
              {judges.map((judge, idx) => (
                <button 
                  key={judge.key}
                  onClick={() => setSelectedJudge(judge)}
                  className={`relative rounded-xl p-3 text-center transition-all duration-300 overflow-hidden border-2 border-slate-600/50 hover:border-slate-500 hover:scale-105 cursor-pointer`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  {/* Subtle colored tint based on judge */}
                  <div className={`absolute inset-0 opacity-30 ${
                    idx === 0 ? 'bg-gradient-to-br from-blue-900/40 to-transparent' :
                    idx === 1 ? 'bg-gradient-to-br from-red-900/40 to-transparent' :
                    'bg-gradient-to-br from-amber-900/40 to-transparent'
                  }`}></div>
                  <div className="absolute inset-0 bg-slate-800/60"></div>
                  <div className="relative">
                    <div className="text-3xl mb-1">{judge.emoji}</div>
                    <p className="font-semibold text-white text-base">{judge.name}</p>
                    <p className="text-slate-500 text-sm">{judge.teaser}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Judge reminder line */}
          <div className={`mb-8 transition-all duration-500 ${revealStep >= 6 ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-slate-400 text-base">
              🎙️ {judgeReminder}
            </p>
          </div>

          {/* Let's Go Button */}
          <div className={`transition-all duration-500 ${revealStep >= 7 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button 
              onClick={handleComplete}
              disabled={isCompleting}
              className="relative w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold text-xl rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              {isCompleting ? 'Starting...' : "Let's Go!"}
            </button>
            
            {/* Learn more link */}
            <p className="text-center mt-4">
              <button 
                onClick={() => setShowHowToPlay(true)}
                className="text-slate-400 text-sm hover:text-white transition-colors"
              >
                First time? Learn how to play →
              </button>
            </p>
          </div>

        </div>
      </div>

      {/* Judge Detail Modal */}
      {selectedJudge && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedJudge(null)}
        >
          <div 
            className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-5xl">{selectedJudge.emoji}</span>
              <h3 className="text-xl font-bold text-orange-400 mt-2">{selectedJudge.name}</h3>
            </div>
            
            <p className="text-slate-400 text-sm font-semibold mb-1">JUDGING STYLE:</p>
            <p className="text-slate-200 mb-4">
              {selectedJudge.description}
            </p>

            {selectedJudge.examples && (
              <div className="mb-4">
                <p className="text-slate-400 text-sm font-semibold mb-2">CLASSIC ONE-LINERS:</p>
                <div className="space-y-1">
                  {selectedJudge.examples.split('", "').map((quote, i) => (
                    <p key={i} className="text-slate-300 text-sm italic">
                      {quote.replace(/^"|"$/g, '')}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedJudge(null)}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* How To Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Cancel Rivalry?
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              This will end your Rivalry with {opponent?.name || 'your opponent'}. This cannot be undone.
            </p>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  try {
                    await supabase
                      .from('rivalries')
                      .delete()
                      .eq('id', rivalry.id);
                    onNavigate && onNavigate('screen1');
                  } catch (err) {
                    console.error('Failed to cancel rivalry:', err);
                  }
                }}
                className="w-full py-3 bg-red-600 text-white font-medium rounded hover:bg-red-500"
              >
                Cancel Rivalry
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
              >
                Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}