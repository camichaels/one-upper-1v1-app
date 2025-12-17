import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import GoldenMic from '../assets/microphone.svg';

// ============================================
// FAKE DATA FOR TESTING
// ============================================

const FAKE_SHOW = {
  id: 'test-show-1',
  show_number: 1,
  prompt: "What song plays when you enter a room?",
  profile_a_id: 'player-left',
  profile_b_id: 'player-right',
  profile_a_answer: "who let the nerds out",
  profile_b_answer: "it had to be you...",
  winner_id: 'player-left',
  judge_data: {
    scores: {
      diva: { profile_a_score: 7, profile_b_score: 6, comment: "Both lack pizzazz but nerds has character." },
      tank: { profile_a_score: 6, profile_b_score: 6, comment: "Left brought energy, Right needs more reps." },
      mogul: { profile_a_score: 8, profile_b_score: 6, comment: "Left disrupted a classic, Right played it safe." },
    },
    banter: [
      { judge: "Diva", emoji: "🎬", text: "These entrance themes are giving community theater energy, darlings." },
      { judge: "Mogul", emoji: "💰", text: "Right's playing the long game with vulnerability metrics, but Left's got viral potential." },
      { judge: "Tank", emoji: "🏋️", text: "Left's got that pump-up playlist vibe, Right sounds defeated before warmups." },
      { judge: "Diva", emoji: "🎬", text: "At least Left committed to the bit, Right whispered their way offstage." },
    ],
    artifacts: [
      { type: 'fake_headline', text: "Breaking: Local Man's Entrance Music So Sad Even His Own Spotify Skips It" },
    ],
  },
};

const FAKE_JUDGES = [
  { key: 'diva', name: 'Diva', emoji: '🎬' },
  { key: 'tank', name: 'Tank', emoji: '🏋️' },
  { key: 'mogul', name: 'Mogul', emoji: '💰' },
];

const FAKE_PLAYERS = {
  left: { id: 'player-left', name: 'Craig Left', avatar: '🎃' },
  right: { id: 'player-right', name: 'Craig Right', avatar: '🤖' },
};

const FAKE_RIVALRY = {
  match_length: 5,
  profile_a_id: 'player-left',
  profile_b_id: 'player-right',
};

// ============================================
// PROTOTYPE COMPONENT
// ============================================

export default function VerdictFlowPrototype() {
  // Which screen we're on: 'answers', 'scores', 'wrapup'
  const [screen, setScreen] = useState('answers');
  
  // Animation states for answers screen
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [banterItems, setBanterItems] = useState([]);
  
  // Animation states for scores screen
  const [revealedJudges, setRevealedJudges] = useState([]);
  const [runningScoreLeft, setRunningScoreLeft] = useState(0);
  const [runningScoreRight, setRunningScoreRight] = useState(0);
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [scoreFlash, setScoreFlash] = useState(false);
  
  // Animation states for wrapup screen
  const [wrapupStage, setWrapupStage] = useState(0); // 0 = ripley only, 1 = show tally + buttons
  
  const confettiRef = useRef(false);
  
  // Derived data
  const judges = Object.entries(FAKE_SHOW.judge_data.scores);
  const totalLeft = judges.reduce((sum, [_, d]) => sum + d.profile_a_score, 0);
  const totalRight = judges.reduce((sum, [_, d]) => sum + d.profile_b_score, 0);
  const winnerIsLeft = FAKE_SHOW.winner_id === 'player-left';

  // ============================================
  // SCREEN 1: ANSWERS + BANTER
  // ============================================
  
  useEffect(() => {
    if (screen === 'answers') {
      // Reset states immediately, then start animation
      setAnswersRevealed(false);
      setBanterItems([]);
      
      // Small delay to ensure clean state before animation
      const initTimer = setTimeout(() => {
        setAnswersRevealed(true);
      }, 100);
      
      // Then reveal banter items one by one
      const banterTimers = FAKE_SHOW.judge_data.banter.map((_, i) => {
        return setTimeout(() => {
          setBanterItems(prev => [...prev, i]);
        }, 1000 + (i * 1200)); // Start after answers, 1.2s apart
      });
      
      return () => {
        clearTimeout(initTimer);
        banterTimers.forEach(t => clearTimeout(t));
      };
    }
  }, [screen]);

  // ============================================
  // SCREEN 2: SCORE REVEAL
  // ============================================
  
  useEffect(() => {
    if (screen === 'scores') {
      // Reset states
      setRevealedJudges([]);
      setRunningScoreLeft(0);
      setRunningScoreRight(0);
      setWinnerRevealed(false);
      setScoreFlash(false);
      confettiRef.current = false;
      
      // Reveal judges one by one
      judges.forEach(([judgeKey, data], i) => {
        setTimeout(() => {
          setRevealedJudges(prev => [...prev, judgeKey]);
          
          // Flash and update score after judge appears
          setTimeout(() => {
            setScoreFlash(true);
            setTimeout(() => {
              setRunningScoreLeft(prev => prev + data.profile_a_score);
              setRunningScoreRight(prev => prev + data.profile_b_score);
              setTimeout(() => setScoreFlash(false), 300);
            }, 150);
          }, 500);
        }, i * 2000); // 2 seconds per judge
      });
      
      // Reveal winner after all judges - tighter timing
      setTimeout(() => {
        setWinnerRevealed(true);
        if (winnerIsLeft && !confettiRef.current) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.3 }
          });
          confettiRef.current = true;
        }
      }, judges.length * 2000 + 100);
    }
  }, [screen]);

  // ============================================
  // SCREEN 3: WRAPUP
  // ============================================
  
  useEffect(() => {
    if (screen === 'wrapup') {
      setWrapupStage(0);
      
      // Stage 1: Show leaderboard after pause
      const timer1 = setTimeout(() => {
        setWrapupStage(1);
      }, 1200);
      
      // Stage 2: Show button after leaderboard
      const timer2 = setTimeout(() => {
        setWrapupStage(2);
      }, 1600);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [screen]);

  // ============================================
  // RENDER: ANSWERS + BANTER SCREEN
  // ============================================
  
  if (screen === 'answers') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        {/* Header */}
        <div className="flex justify-center py-4 mb-4">
          <div className="text-2xl font-bold text-orange-500">ONE-UPPER 🎤</div>
        </div>
        
        <div className="max-w-md mx-auto">
          {/* Prompt */}
          <h1 className="text-xl font-bold text-slate-100 text-center mb-6">
            {FAKE_SHOW.prompt}
          </h1>
          
          {/* Answers - Quote block style, fly in from sides */}
          <div className="space-y-3 mb-8">
            {/* Player Left - flies in from left */}
            <div className={`bg-slate-700/40 rounded-xl p-4 transition-all duration-500 ${answersRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <p className="text-slate-100 text-lg text-center mb-1">{FAKE_SHOW.profile_a_answer}</p>
              <p className="text-slate-400 text-sm text-center">— {FAKE_PLAYERS.left.name}</p>
            </div>
            
            {/* Player Right - flies in from right */}
            <div className={`bg-slate-700/40 rounded-xl p-4 transition-all duration-500 delay-200 ${answersRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <p className="text-slate-100 text-lg text-center mb-1">{FAKE_SHOW.profile_b_answer}</p>
              <p className="text-slate-400 text-sm text-center">— {FAKE_PLAYERS.right.name}</p>
            </div>
          </div>
          
          {/* Banter - threaded left/right */}
          <div className="space-y-3 mb-8">
            {FAKE_SHOW.judge_data.banter.map((item, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div 
                  key={i}
                  className={`flex ${isLeft ? 'justify-start' : 'justify-end'} transition-all duration-500 ${banterItems.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0 overflow-hidden'}`}
                >
                  <div className={`bg-slate-800/70 rounded-2xl p-4 max-w-[85%] ${isLeft ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.emoji}</span>
                      <span className="text-orange-400 text-sm font-medium">{item.judge}</span>
                    </div>
                    <p className="text-slate-200 text-sm">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Button - only show after all banter */}
          {banterItems.length >= FAKE_SHOW.judge_data.banter.length && (
            <button
              onClick={() => setScreen('scores')}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 transition-all"
            >
              To the Scores
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: SCORE REVEAL SCREEN
  // ============================================
  
  if (screen === 'scores') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        {/* Header */}
        <div className="flex justify-center py-4 mb-2">
          <div className="text-2xl font-bold text-orange-500">ONE-UPPER 🎤</div>
        </div>
        
        <div className="max-w-md mx-auto">
          {/* Winner headline - appears above scoreboard */}
          {winnerRevealed && (
            <div className="text-center mb-4 animate-fade-in">
              <h2 className="text-xl font-bold text-orange-500">
                {winnerIsLeft ? FAKE_PLAYERS.left.name : FAKE_PLAYERS.right.name} wins the round!
              </h2>
            </div>
          )}
          
          {/* Scoreboard - not sticky, cleaner */}
          <div className="mb-6">
            <div className={`bg-slate-800/60 rounded-xl py-4 px-6 transition-all duration-150 ${scoreFlash ? 'bg-orange-500/30' : ''}`}>
              <div className="flex justify-center items-center">
                {/* Left player with mic space */}
                <div className="flex items-center gap-2">
                  {/* Golden mic for winner - in its own space */}
                  <div className="w-12 flex justify-center">
                    {winnerRevealed && winnerIsLeft && (
                      <img src={GoldenMic} alt="winner" className="w-10 h-10 animate-fade-in" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-100 tabular-nums">
                      {runningScoreLeft}
                    </div>
                    <span className="text-sm text-slate-400">{FAKE_PLAYERS.left.name.split(' ')[1]}</span>
                  </div>
                </div>
                
                <div className="text-2xl text-slate-600 mx-6">—</div>
                
                {/* Right player with mic space */}
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-100 tabular-nums">
                      {runningScoreRight}
                    </div>
                    <span className="text-sm text-slate-400">{FAKE_PLAYERS.right.name.split(' ')[1]}</span>
                  </div>
                  {/* Golden mic for winner - in its own space */}
                  <div className="w-12 flex justify-center">
                    {winnerRevealed && !winnerIsLeft && (
                      <img src={GoldenMic} alt="winner" className="w-10 h-10 animate-fade-in" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Judges - newest at top, animate up from bottom like Screen 1 */}
          <div className="space-y-3 mb-8">
            {[...judges].reverse().map(([judgeKey, data]) => {
              const judge = FAKE_JUDGES.find(j => j.key === judgeKey);
              const isRevealed = revealedJudges.includes(judgeKey);
              const leftWon = data.profile_a_score > data.profile_b_score;
              const rightWon = data.profile_b_score > data.profile_a_score;
              const isTie = data.profile_a_score === data.profile_b_score;
              
              if (!isRevealed) return null;
              
              return (
                <div 
                  key={judgeKey}
                  className="bg-slate-800/50 rounded-xl p-4 animate-slide-up"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{judge?.emoji}</span>
                    <span className="font-bold text-orange-400">{judge?.name}</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">{data.comment}</p>
                  <div className="flex justify-between text-sm">
                    <span className={leftWon || isTie ? 'text-orange-400 font-bold' : 'text-slate-400'}>
                      {FAKE_PLAYERS.left.name.split(' ')[1]}: {data.profile_a_score}
                    </span>
                    <span className={rightWon || isTie ? 'text-orange-400 font-bold' : 'text-slate-400'}>
                      {FAKE_PLAYERS.right.name.split(' ')[1]}: {data.profile_b_score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Continue button - only after winner revealed */}
          {winnerRevealed && (
            <button
              onClick={() => setScreen('wrapup')}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 transition-all"
            >
              Continue
            </button>
          )}
        </div>
        
        {/* Animation styles */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
          }
          .animate-slide-up {
            animation: slideUp 0.4s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // ============================================
  // RENDER: WRAPUP SCREEN
  // ============================================
  
  if (screen === 'wrapup') {
    const artifact = FAKE_SHOW.judge_data.artifacts[0];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        {/* Header */}
        <div className="flex justify-center py-4 mb-6">
          <div className="text-2xl font-bold text-orange-500">ONE-UPPER 🎤</div>
        </div>
        
        <div className="max-w-md mx-auto">
          {/* Ripley artifact - always visible */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎙️</span>
              <span className="font-bold text-orange-400">Ripley</span>
            </div>
            <p className="text-slate-200 text-sm">{artifact.text}</p>
          </div>
          
          {/* Rivalry standings - rolls up */}
          {wrapupStage >= 1 && (
            <div className="bg-slate-800/30 rounded-xl p-6 mb-8 text-center animate-slide-up">
              <h3 className="text-slate-400 text-sm mb-4">The Rivalry So Far</h3>
              <div className="flex justify-center items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-100 mb-1">1</div>
                  <span className="text-sm text-slate-400">{FAKE_PLAYERS.left.name}</span>
                </div>
                <div className="text-2xl text-slate-600">-</div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-100 mb-1">0</div>
                  <span className="text-sm text-slate-400">{FAKE_PLAYERS.right.name}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Buttons - cascade after leaderboard */}
          {wrapupStage >= 2 && (
            <>
              <button
                onClick={() => {
                  setScreen('answers');
                  alert('In the real app, this would start Round 2!');
                }}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 animate-slide-up"
              >
                Onto Round 2
              </button>
              
              {/* Reset for testing */}
              <button
                onClick={() => setScreen('answers')}
                className="w-full py-3 mt-3 bg-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-600"
              >
                ↺ Restart Prototype
              </button>
            </>
          )}
        </div>
        
        {/* Animation styles */}
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slideUp 0.4s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  return null;
}