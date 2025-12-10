import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Header from './Header';

// Randomized Ripley greetings
const RIPLEY_GREETINGS = [
  "Welcome to the arena.",
  "Let's do this.",
  "Another rivalry begins.",
  "Time to settle this.",
  "Fresh rivalry, fresh blood."
];

// Randomized Ripley self-intros
const RIPLEY_INTROS = [
  "I'm your host. I call the rounds and try not to play favorites.",
  "I'm Ripley, your emcee. I'm here for the drama.",
  "I keep things moving and the judges honest. Mostly.",
  "I run the show. The judges do the hard part."
];

// Randomized intro screen titles
const INTRO_TITLES = [
  "It's on!",
  "Game on!",
  "Here we go!",
  "Let the rivalry begin!",
  "And so it begins...",
  "Ready... set...",
  "Let's goooo!",
  "Oh, it's ON.",
  "Showtime!",
  "Buckle up.",
  "No turning back now.",
  "Challenge accepted."
];

// Randomized game explanations
const GAME_EXPLANATIONS = [
  {
    line1: "Truth won't save you here.",
    line2: "Out-think. Out-weird. Out-do.",
    line3: "One-up your rival."
  },
  {
    line1: "Nobody cares if you're right.",
    line2: "They care if you're memorable.",
    line3: "Out-think. Out-weird. Out-do."
  },
  {
    line1: "The judges want bold.",
    line2: "Play it safe? You lose.",
    line3: "Out-think. Out-weird. Out-do."
  }
];

// Randomized judge intro lines
const JUDGE_INTRO_LINES = [
  "Three judges. Three egos. Play to the room.",
  "Your fate's in their hands. Learn their quirks.",
  "Each one has a weakness. Find it.",
  "Impress them and you win. Simple as that."
];

// Contextual matchup comments based on rivalry history
const MATCHUP_COMMENTS = {
  first_meeting: [
    "First meeting. Make it memorable.",
    "Fresh rivals. Let's see what happens.",
    "New opponent. New possibilities."
  ],
  rematch: [
    "You two again? This should be good.",
    "Back for more? Someone's hungry.",
    "A rematch? I respect that."
  ]
};

// Category display names
const CATEGORY_DISPLAY = {
  mixed: "🔀 Surprise Me",
  pop_culture: "🌟 Pop Culture",
  deep_think: "🤔 Deep Think",
  edgy: "🌶️ More Edgy",
  absurd: "😂 Totally Absurd",
  everyday: "☕ Everyday"
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
  onComplete
}) {
  const [currentScreen, setCurrentScreen] = useState(1);
  const [introTitle] = useState(() => pickRandom(INTRO_TITLES));
  const [ripleyGreeting] = useState(() => pickRandom(RIPLEY_GREETINGS));
  const [ripleyIntro] = useState(() => pickRandom(RIPLEY_INTROS));
  const [gameExplanation] = useState(() => pickRandom(GAME_EXPLANATIONS));
  const [judgeIntroLine] = useState(() => pickRandom(JUDGE_INTRO_LINES));
  const [matchupComment, setMatchupComment] = useState('');
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Check rivalry history between these two players
  useEffect(() => {
    async function checkHistory() {
      const { data: pastRivalries } = await supabase
        .from('rivalries')
        .select('id')
        .or(`and(profile_a_id.eq.${profile.id},profile_b_id.eq.${opponent.id}),and(profile_a_id.eq.${opponent.id},profile_b_id.eq.${profile.id})`)
        .eq('status', 'complete')
        .limit(1);

      if (pastRivalries && pastRivalries.length > 0) {
        setMatchupComment(pickRandom(MATCHUP_COMMENTS.rematch));
      } else {
        setMatchupComment(pickRandom(MATCHUP_COMMENTS.first_meeting));
      }
    }
    checkHistory();
  }, [profile.id, opponent.id]);

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

  // Screen 1: Welcome / Ripley Intro
  if (currentScreen === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <Header />
        <div className="max-w-md mx-auto w-full mt-4">

          {/* Intro title */}
          <h1 className="text-2xl font-bold text-slate-100 text-center mb-6">
            {introTitle}
          </h1>

          {/* Ripley speech bubble */}
          <div className="bg-slate-800/80 rounded-2xl p-5 w-full mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎙️</span>
              <span className="text-orange-400 font-semibold text-sm">Ripley</span>
            </div>
            <p className="text-slate-200 mb-2">
              {ripleyGreeting}
            </p>
            <p className="text-slate-200">
              {ripleyIntro}
            </p>
          </div>

          {/* Continue button */}
          <button
            onClick={() => setCurrentScreen(2)}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
          >
            Meet Your Rival
          </button>
        </div>
      </div>
    );
  }

  // Screen 2: Matchup
  if (currentScreen === 2) {
    const categoryDisplay = CATEGORY_DISPLAY[rivalry.prompt_category] || CATEGORY_DISPLAY.mixed;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <Header />
        <div className="max-w-md mx-auto w-full mt-8">
          
          {/* Players Box */}
          <div className="bg-slate-800/50 rounded-2xl p-6 mb-4">
            {/* VS Display */}
            <div className="flex items-center justify-center gap-6 mb-4">
              <div className="text-center">
                <div className="text-5xl mb-2">{profile.avatar}</div>
                <p className="text-slate-100 font-semibold">{profile.name}</p>
                <p className="text-slate-500 text-sm">You</p>
              </div>
              
              <div className="text-3xl text-orange-500 font-bold">🆚</div>
              
              <div className="text-center">
                <div className="text-5xl mb-2">{opponent.avatar}</div>
                <p className="text-slate-100 font-semibold">{opponent.name}</p>
                <p className="text-slate-500 text-sm">Rival</p>
              </div>
            </div>

            {/* Rivalry info */}
            <p className="text-slate-300 text-center text-lg">
              5 rounds. 3 judges. 1 Golden Mic.
            </p>
          </div>

          {/* Stakes & Category Box */}
          <div className="bg-slate-800/50 rounded-2xl p-5 mb-6">
            {rivalry.stakes && (
              <div className="mb-3">
                <span className="text-slate-400 text-sm">Playing for: </span>
                <span className="text-slate-200 font-semibold">{rivalry.stakes}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400 text-sm">The vibe: </span>
              <span className="text-slate-200">{categoryDisplay}</span>
            </div>
          </div>

          {/* Ripley comment */}
          <div className="bg-slate-800/80 rounded-2xl p-5 w-full mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎙️</span>
              <span className="text-orange-400 font-semibold text-sm">Ripley</span>
            </div>
            <p className="text-slate-200">
              {matchupComment}
            </p>
          </div>

          {/* Continue button */}
          <button
            onClick={() => setCurrentScreen(3)}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
          >
            How It Works
          </button>
        </div>
      </div>
    );
  }

  // Screen 3: The Game
  if (currentScreen === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <Header />
        <div className="max-w-md mx-auto w-full mt-8">

          {/* Game Objective Box */}
          <div className="bg-slate-800/50 rounded-2xl p-5 mb-6">
            <p className="text-slate-400 text-sm mb-1">Game objective:</p>
            <p className="text-slate-200 mb-2">Write the most outlandish answer to ridiculous prompts.</p>
            <p className="text-slate-200">Three judges decide who did it better.</p>
          </div>

          {/* Ripley speech bubble */}
          <div className="bg-slate-800/80 rounded-2xl p-5 w-full mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎙️</span>
              <span className="text-orange-400 font-semibold text-sm">Ripley</span>
            </div>
            <p className="text-slate-200 mb-2">
              {gameExplanation.line1}
            </p>
            <p className="text-slate-200 mb-2">
              {gameExplanation.line2}
            </p>
            <p className="text-slate-200">
              {gameExplanation.line3}
            </p>
          </div>

          {/* Continue button */}
          <button
            onClick={() => setCurrentScreen(4)}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors"
          >
            Meet Your Judges
          </button>
        </div>
      </div>
    );
  }

  // Screen 4: Meet Your Judges
  if (currentScreen === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <Header />
        <div className="max-w-md mx-auto w-full mt-8">

          {/* Judges title */}
          <p className="text-slate-400 text-sm mb-3">Today's judges:</p>

          {/* Judge cards */}
          <div className="space-y-3 mb-6">
            {judges.map((judge) => (
              <button
                key={judge.key}
                onClick={() => setSelectedJudge(judge)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{judge.emoji}</span>
                  <div>
                    <p className="text-slate-100 font-semibold">{judge.name}</p>
                    <p className="text-slate-400 text-sm">{judge.teaser}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Ripley comment at bottom */}
          <div className="bg-slate-800/80 rounded-2xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎙️</span>
              <span className="text-orange-400 font-semibold text-sm">Ripley</span>
            </div>
            <p className="text-slate-200">
              {judgeIntroLine}
            </p>
          </div>

          {/* Let's Go button */}
          <button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-600 text-white font-bold rounded-xl transition-colors text-lg"
          >
            {isCompleting ? 'Starting...' : "Let's Go!"}
          </button>
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
      </div>
    );
  }

  return null;
}