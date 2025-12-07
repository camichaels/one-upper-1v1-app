import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import ShowdownMenu from './ShowdownMenu';
import { updateShowdownStatus, startRound, leaveShowdown, updateIntroStep } from '../../services/showdown';

// Ripley welcome lines - randomized
const WELCOME_LINES = [
  "Welcome to the Showdown.",
  "Alright, let's do this.",
  "The stage is set.",
  "Time to see what you've got.",
  "Let's find out who's the real one-upper.",
  "Everyone's here. Let's make it weird.",
  "The judges are ready. Are you?",
  "This is gonna be good.",
  "May the best one-upper win.",
  "No pressure. Just your reputation on the line.",
];

// Ripley intro lines
const RIPLEY_INTROS = [
  "I'm your host. I call the rounds and try not to play favorites.",
  "I'm Ripley, your emcee. I'm here for the drama.",
  "I keep things moving and the judges honest. Mostly.",
  "I run the show. The judges do the hard part."
];

// Judge intro lines
const JUDGE_INTRO_LINES = [
  "Three judges. Three egos. Play to the room.",
  "Your fate's in their hands. Learn their quirks.",
  "Each one has a weakness. Find it.",
  "Impress them and you win. Simple as that."
];

// Category display names
const CATEGORY_DISPLAY = {
  mixed: "🔀 Surprise Me",
  pop_culture: "🌟 Pop Culture",
  deep_think: "🤔 Deep Think",
  edgy: "🌶️ More Edgy",
  absurd: "😂 Totally Absurd",
  everyday: "☕ Everyday"
};

function getRandomLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

export default function ShowdownIntro({ showdown, currentPlayer, onShowdownUpdate }) {
  const navigate = useNavigate();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [welcomeLine] = useState(() => getRandomLine(WELCOME_LINES));
  const [ripleyIntro] = useState(() => getRandomLine(RIPLEY_INTROS));
  const [judgeIntroLine] = useState(() => getRandomLine(JUDGE_INTRO_LINES));
  const [selectedJudge, setSelectedJudge] = useState(null);

  const isHost = currentPlayer?.is_host;
  const playerCount = showdown?.players?.length || 0;
  const judges = showdown?.judges || [];
  const categoryDisplay = CATEGORY_DISPLAY[showdown?.prompt_category] || CATEGORY_DISPLAY.mixed;
  
  // Use intro_step from showdown (synced via real-time)
  const introStep = showdown?.intro_step || 'welcome';

  async function handleContinue() {
    if (introStep === 'welcome') {
      // Move to judges step
      setIsAdvancing(true);
      try {
        const updated = await updateIntroStep(showdown.id, 'judges');
        // Update parent state immediately (don't wait for real-time)
        onShowdownUpdate({ ...showdown, intro_step: 'judges' });
      } catch (err) {
        console.error('Failed to advance intro:', err);
      }
      setIsAdvancing(false);
    } else if (introStep === 'judges') {
      // Start the game - begin round 1
      setIsAdvancing(true);
      try {
        await startRound(showdown.id, 1);
        // Update parent state immediately (don't wait for real-time)
        onShowdownUpdate({ ...showdown, status: 'active', current_round: 1 });
      } catch (err) {
        console.error('Failed to start round 1:', err);
        setIsAdvancing(false);
      }
    }
  }

  async function handleEndShowdown() {
    try {
      await updateShowdownStatus(showdown.id, 'cancelled');
      navigate('/showdown');
    } catch (err) {
      console.error('Failed to end showdown:', err);
    }
  }

  async function handleLeave() {
    try {
      const playerId = sessionStorage.getItem('showdown_player_id');
      if (playerId) {
        await leaveShowdown(playerId, showdown.id);
      }
      sessionStorage.removeItem('showdown_player_id');
      navigate('/showdown');
    } catch (err) {
      console.error('Failed to leave showdown:', err);
      sessionStorage.removeItem('showdown_player_id');
      navigate('/showdown');
    }
  }

  // Step 1: Welcome (all info in Ripley's message box)
  if (introStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <ShowdownMenu 
          isHost={isHost}
          onLeave={handleLeave}
          onEndShowdown={handleEndShowdown}
        />
        
        <div className="max-w-md mx-auto mt-4">
          {/* Ripley speech bubble with all intro content */}
          <div className="bg-slate-800/80 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎙️</span>
              <span className="text-orange-400 font-semibold">Ripley</span>
            </div>
            
            <p className="text-xl text-slate-100 font-medium mb-3">
              {welcomeLine}
            </p>
            
            <p className="text-slate-300 mb-3">
              {ripleyIntro}
            </p>

            <p className="text-slate-200 mb-4">
              {playerCount} players. 5 rounds. One winner.
            </p>

            <div className="border-t border-slate-700 pt-4 mt-4">
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                Everyone answers the same prompt. You'll guess who wrote what, 
                vote for the One-Upper, then the judges rank everyone.
              </p>
              <p className="text-slate-400 text-sm">
                Be bold. Be weird. Be memorable.
              </p>
              <p className="text-slate-400 text-sm">
                You have 60 seconds per prompt.
              </p>
            </div>
          </div>

          {/* Category info */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-8">
            <span className="text-slate-400 text-sm">Types of questions: </span>
            <span className="text-slate-200">{categoryDisplay}</span>
          </div>

          {/* Continue button */}
          <div>
            {isHost ? (
              <button
                onClick={handleContinue}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
              >
                Meet Your Judges →
              </button>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <p className="text-slate-400">Waiting for host...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Meet the judges (with popup modal)
  // This shows when introStep === 'judges'
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      <ShowdownMenu 
        isHost={isHost}
        onLeave={handleLeave}
        onEndShowdown={handleEndShowdown}
      />
      
      <div className="max-w-md mx-auto mt-4">
        {/* Judges title */}
        <p className="text-slate-400 text-sm mb-3">Your showdown judges:</p>

        {/* Judge cards - tap to open modal */}
        <div className="space-y-3 mb-6">
          {judges.map((judge, index) => (
            <button
              key={judge.key || index}
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

        {/* Ripley comment */}
        <div className="bg-slate-800/80 rounded-2xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎙️</span>
            <span className="text-orange-400 font-semibold text-sm">Ripley</span>
          </div>
          <p className="text-slate-200">
            {judgeIntroLine}
          </p>
        </div>

        {/* Let's go button */}
        <div>
          {isHost ? (
            <button
              onClick={handleContinue}
              disabled={isAdvancing}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              {isAdvancing ? 'Starting...' : "Let's Go!"}
            </button>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-slate-400">Waiting for host...</p>
            </div>
          )}
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}