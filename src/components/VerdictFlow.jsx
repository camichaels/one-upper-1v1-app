import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import HeaderWithMenu from './HeaderWithMenu';
import HowToPlayModal from './HowToPlayModal';
import AllRoundsModal from './AllRoundsModal';
import GoldenMic from '../assets/microphone.svg';

// Rivalry outcome headlines
const winnerHeadlines = [
  "You Won!",
  "Victory!",
  "Crushed It!",
  "Champion!",
  "Mic Drop!",
  "Legendary!",
  "Nailed It!",
  "Top Dog!",
];

const loserHeadlines = [
  "Not This Time",
  "So Close!",
  "Tough Break",
  "Next Time!",
  "Almost Had It",
  "Oof.",
  "Welp.",
  "Bested!",
];

// Ripley verdict lines (triggered by situation)
const ripleyVerdictLines = {
  blowout_winner: [
    "That wasn't even close!",
    "Dominant performance right there.",
    "Someone brought their A-game today!",
  ],
  close_game: [
    "Now THAT was a battle!",
    "Could've gone either way!",
    "The judges had their work cut out for them!",
  ],
  streak_3: [
    "Three in a row! Someone's heating up!",
    "That's a hat trick! Momentum is building!",
    "Three straight! Can anyone stop this streak?",
  ],
  streak_4: [
    "Four in a row! This is getting serious!",
    "Domination mode: activated!",
    "Four straight wins! One more for the sweep!",
  ],
  perfect_sweep: [
    "FIVE FOR FIVE! A PERFECT SWEEP!",
    "Undefeated! Flawless victory!",
    "The clean sweep! Absolutely dominant!",
  ],
  comeback: [
    "And just like that, we've got a new leader!",
    "The comeback is ON!",
    "Momentum shift! This rivalry just got interesting!",
  ],
  final_round: [
    "And that's the final round! What a rivalry!",
    "That's a wrap on this rivalry!",
    "The last round is in the books!",
  ],
  default: [
    "Another round in the books!",
    "The judges have spoken!",
  ],
};

export default function VerdictFlow({
  currentShow,
  rivalry,
  myProfile,
  opponentProfile,
  activeProfileId,
  previousShows,
  judgeProfiles,
  onNextRound,
  onNavigateToSummary,
  onNavigate,
  onCancelRivalry,
  initialStep = 1,
  onStepChange,
}) {
  // Map initialStep to screen name
  // Old: 1=answers, 2=banter, 3=winner, 4=breakdown
  // New: 1=answers+banter, 2=scores, 3=wrapup
  // For SMS deep links, initialStep=1 means start fresh
  const getInitialScreen = () => {
    if (initialStep >= 3) return 'wrapup'; // Old steps 3-4 map to wrapup-ish
    if (initialStep === 2) return 'scores';
    return 'answers';
  };
  
  // Screen state: 'answers', 'scores', 'wrapup', 'rivalry_outcome'
  const [screen, setScreen] = useState(getInitialScreen);
  
  // Animation states for answers screen
  const [answersInitialized, setAnswersInitialized] = useState(false);
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [banterItems, setBanterItems] = useState([]);
  const [buttonReady, setButtonReady] = useState(false);
  
  // Animation states for scores screen
  const [revealedJudges, setRevealedJudges] = useState([]);
  const [runningScoreLeft, setRunningScoreLeft] = useState(0);
  const [runningScoreRight, setRunningScoreRight] = useState(0);
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [scoreFlash, setScoreFlash] = useState(false);
  
  // Animation states for wrapup screen
  const [wrapupStage, setWrapupStage] = useState(0);
  
  // Animation states for rivalry outcome (final round)
  const [showRivalryOutcome, setShowRivalryOutcome] = useState(false);
  
  // Randomized outcome headlines (picked once on mount)
  const [outcomeHeadline] = useState(() => ({
    winner: winnerHeadlines[Math.floor(Math.random() * winnerHeadlines.length)],
    loser: loserHeadlines[Math.floor(Math.random() * loserHeadlines.length)],
  }));
  
  // Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAllRounds, setShowAllRounds] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  const confettiRef = useRef(false);

  // ============================================
  // DERIVED DATA
  // ============================================
  
  const judges = currentShow.judge_data?.scores ? Object.entries(currentShow.judge_data.scores) : [];
  const banter = currentShow.judge_data?.banter || [];
  
  // Get profiles in consistent left/right order (viewer always on left)
  const leftProfile = myProfile;
  const rightProfile = opponentProfile;
  const leftIsProfileA = activeProfileId === currentShow.profile_a_id;
  
  // Calculate scores
  function getScoreForProfile(profileId, judgeData) {
    const isProfileA = profileId === currentShow.profile_a_id;
    return isProfileA ? judgeData.profile_a_score : judgeData.profile_b_score;
  }
  
  function getTotalScore(profileId) {
    if (!currentShow.judge_data?.scores) return 0;
    const isProfileA = profileId === currentShow.profile_a_id;
    return Object.values(currentShow.judge_data.scores).reduce((sum, data) => {
      return sum + (isProfileA ? data.profile_a_score : data.profile_b_score);
    }, 0);
  }
  
  const totalLeft = getTotalScore(leftProfile.id);
  const totalRight = getTotalScore(rightProfile.id);
  
  const winnerIsLeft = currentShow.winner_id === leftProfile.id;
  const iAmWinner = currentShow.winner_id === activeProfileId;
  const winnerName = currentShow.winner_id === rivalry.profile_a_id 
    ? rivalry.profile_a.name 
    : rivalry.profile_b.name;
  
  // Round wins calculation
  const pastShows = previousShows.filter(s => s.id !== currentShow.id);
  const myWins = pastShows.filter(s => s.winner_id === activeProfileId).length + 
    (currentShow.winner_id === activeProfileId ? 1 : 0);
  const opponentWins = pastShows.filter(s => s.winner_id === opponentProfile.id).length +
    (currentShow.winner_id === opponentProfile.id ? 1 : 0);
  
  // Rivalry winner (for final round)
  const iWonRivalry = myWins > opponentWins;
  
  // Tiebreaker detection
  const isTie = currentShow.judge_data?.was_tiebreaker || totalLeft === totalRight;
  
  // Final round detection
  const matchLength = rivalry?.match_length || 5;
  const isFinalRound = currentShow.show_number === matchLength;
  
  // Get answers
  const leftAnswer = leftIsProfileA ? currentShow.profile_a_answer : currentShow.profile_b_answer;
  const rightAnswer = leftIsProfileA ? currentShow.profile_b_answer : currentShow.profile_a_answer;
  
  // Get all artifacts and pick a random one
  function getAllArtifacts() {
    const artifacts = [];
    if (currentShow.judge_data?.rivalry_comment) {
      artifacts.push({
        type: 'rivalry_recap',
        text: currentShow.judge_data.rivalry_comment.text,
      });
    }
    if (currentShow.judge_data?.artifacts) {
      artifacts.push(...currentShow.judge_data.artifacts);
    }
    return artifacts;
  }
  
  // Pick random artifact on mount
  const [selectedArtifact] = useState(() => {
    const artifacts = getAllArtifacts();
    if (artifacts.length === 0) return null;
    return artifacts[Math.floor(Math.random() * artifacts.length)];
  });
  
  // Get verdict line based on game state
  function getVerdictLine() {
    const winnerScore = getTotalScore(currentShow.winner_id);
    const loserId = currentShow.winner_id === currentShow.profile_a_id 
      ? currentShow.profile_b_id 
      : currentShow.profile_a_id;
    const loserScore = getTotalScore(loserId);
    const scoreDiff = winnerScore - loserScore;
    
    // Calculate win streak
    let winStreak = 1;
    const winnerId = currentShow.winner_id;
    for (const show of pastShows) {
      if (show.status === 'complete' && show.winner_id === winnerId) {
        winStreak++;
      } else {
        break;
      }
    }
    
    // Check for comeback
    const myWinsBefore = pastShows.filter(s => s.winner_id === activeProfileId).length;
    const oppWinsBefore = pastShows.filter(s => s.winner_id !== activeProfileId && s.winner_id).length;
    const myWinsNow = myWinsBefore + (iAmWinner ? 1 : 0);
    const oppWinsNow = oppWinsBefore + (iAmWinner ? 0 : 1);
    const wasLosingNowWinning = myWinsBefore < oppWinsBefore && myWinsNow > oppWinsNow;
    
    if (isFinalRound) return getRandomLine(ripleyVerdictLines.final_round);
    if (winStreak === 5) return getRandomLine(ripleyVerdictLines.perfect_sweep);
    if (winStreak === 4) return getRandomLine(ripleyVerdictLines.streak_4);
    if (winStreak === 3) return getRandomLine(ripleyVerdictLines.streak_3);
    if (wasLosingNowWinning) return getRandomLine(ripleyVerdictLines.comeback);
    if (scoreDiff >= 6) return getRandomLine(ripleyVerdictLines.blowout_winner);
    if (scoreDiff <= 2) return getRandomLine(ripleyVerdictLines.close_game);
    return getRandomLine(ripleyVerdictLines.default);
  }
  
  function getRandomLine(lines) {
    return lines[Math.floor(Math.random() * lines.length)];
  }
  
  // Store verdict line on mount
  const [verdictLine] = useState(() => getVerdictLine());

  // ============================================
  // EFFECTS
  // ============================================
  
  // Sync screen state with parent via onStepChange
  useEffect(() => {
    if (onStepChange) {
      const stepMap = { answers: 1, scores: 2, wrapup: 3 };
      onStepChange(stepMap[screen] || 1);
    }
  }, [screen, onStepChange]);
  
  // Pre-fetch rivalry summary on final round
  useEffect(() => {
    if (isFinalRound && rivalry?.id) {
      supabase.functions.invoke('summarize-rivalry', {
        body: { rivalryId: rivalry.id }
      }).catch(() => {});
    }
  }, [isFinalRound, rivalry?.id]);

  // ============================================
  // SCREEN 1: ANSWERS + BANTER
  // ============================================
  
  useEffect(() => {
    if (screen === 'answers') {
      // Reset all state first
      setAnswersInitialized(false);
      setAnswersRevealed(false);
      setBanterItems([]);
      setButtonReady(false);
      
      // Small delay to ensure state is reset before showing
      const initTimer = setTimeout(() => {
        setAnswersInitialized(true);
      }, 50);
      
      // Then start revealing
      const revealTimer = setTimeout(() => {
        setAnswersRevealed(true);
      }, 150);
      
      const banterTimers = banter.map((_, i) => {
        return setTimeout(() => {
          setBanterItems(prev => [...prev, i]);
        }, 1100 + (i * 1200));
      });
      
      // Show button shortly after last banter appears
      const buttonTimer = setTimeout(() => {
        setButtonReady(true);
      }, 1100 + ((banter.length - 1) * 1200) + 500);
      
      return () => {
        clearTimeout(initTimer);
        clearTimeout(revealTimer);
        clearTimeout(buttonTimer);
        banterTimers.forEach(t => clearTimeout(t));
      };
    }
  }, [screen, currentShow.id]);

  // ============================================
  // SCREEN 2: SCORE REVEAL
  // ============================================
  
  useEffect(() => {
    if (screen !== 'scores') return;
    
    // Reset all scores to 0 first
    setRevealedJudges([]);
    setRunningScoreLeft(0);
    setRunningScoreRight(0);
    setWinnerRevealed(false);
    setScoreFlash(false);
    confettiRef.current = false;
    
    // Use a cancelled flag to stop animations if effect re-runs
    let cancelled = false;
    
    judges.forEach(([judgeKey, data], i) => {
      setTimeout(() => {
        if (cancelled) return;
        setRevealedJudges(prev => [...prev, judgeKey]);
        
        // Flash almost immediately after judge appears
        setTimeout(() => {
          if (cancelled) return;
          setScoreFlash(true);
          
          // Update score quickly
          setTimeout(() => {
            if (cancelled) return;
            const leftScore = getScoreForProfile(leftProfile.id, data);
            const rightScore = getScoreForProfile(rightProfile.id, data);
            setRunningScoreLeft(prev => prev + leftScore);
            setRunningScoreRight(prev => prev + rightScore);
            
            // Flash off
            setTimeout(() => {
              if (cancelled) return;
              setScoreFlash(false);
            }, 250);
          }, 100);
        }, 150);
      }, i * 2000);
    });
    
    // Winner reveal - tight timing after last judge
    setTimeout(() => {
      if (cancelled) return;
      setWinnerRevealed(true);
      if (iAmWinner && !confettiRef.current) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 }
        });
        confettiRef.current = true;
      }
    }, judges.length * 2000 + 100);
    
    // Cleanup: set cancelled flag
    return () => {
      cancelled = true;
    };
  }, [screen, currentShow.id]);

  // ============================================
  // SCREEN 3: WRAPUP
  // ============================================
  
  useEffect(() => {
    if (screen === 'wrapup') {
      setWrapupStage(0);
      
      const timer1 = setTimeout(() => setWrapupStage(1), 1200);
      const timer2 = setTimeout(() => setWrapupStage(2), 1600);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [screen]);

  // ============================================
  // RIVALRY OUTCOME (Final Round)
  // ============================================
  
  useEffect(() => {
    if (screen === 'rivalry_outcome' && iWonRivalry) {
      // Big confetti celebration for rivalry win
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 }
      });
      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5, x: 0.3 }
        });
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5, x: 0.7 }
        });
      }, 300);
    }
  }, [screen, iWonRivalry]);

  // ============================================
  // MENU HANDLERS
  // ============================================
  
  const handleMenuAction = (action) => {
    setShowMenu(false);
    switch (action) {
      case 'allRounds':
        setShowAllRounds(true);
        break;
      case 'profiles':
        onNavigate('screen2');
        break;
      case 'howToPlay':
        setShowHowToPlay(true);
        break;
      case 'cancel':
        setShowCancelModal(true);
        break;
    }
  };

  // ============================================
  // RENDER: ANSWERS + BANTER SCREEN
  // ============================================
  
  if (screen === 'answers') {
    // Don't render until initialized to prevent flash
    if (!answersInitialized) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
          <HeaderWithMenu
            onAllRounds={() => setShowAllRounds(true)}
            onProfiles={() => onNavigate('screen2')}
            onHowToPlay={() => setShowHowToPlay(true)}
            onCancel={() => setShowCancelModal(true)}
          />
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <HeaderWithMenu
          onAllRounds={() => setShowAllRounds(true)}
          onProfiles={() => onNavigate('screen2')}
          onHowToPlay={() => setShowHowToPlay(true)}
          onCancel={() => setShowCancelModal(true)}
        />
        
        <div className="max-w-md mx-auto">
          {/* Prompt */}
          <h1 className="text-xl font-bold text-slate-100 text-center mb-6">
            {currentShow.prompt}
          </h1>
          
          {/* Answers - fly in from sides */}
          <div className="space-y-3 mb-8">
            {/* Left (me) - flies in from left */}
            <div className={`bg-slate-700/40 rounded-xl p-4 transition-all duration-500 ${answersRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <p className="text-slate-100 text-lg text-center mb-1">{leftAnswer}</p>
              <p className="text-slate-400 text-sm text-center">— {leftProfile.name}</p>
            </div>
            
            {/* Right (opponent) - flies in from right */}
            <div className={`bg-slate-700/40 rounded-xl p-4 transition-all duration-500 delay-200 ${answersRevealed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <p className="text-slate-100 text-lg text-center mb-1">{rightAnswer}</p>
              <p className="text-slate-400 text-sm text-center">— {rightProfile.name}</p>
            </div>
          </div>
          
          {/* Banter - threaded left/right */}
          <div className="space-y-3 mb-8">
            {banter.map((item, i) => {
              const judge = judgeProfiles.find(j => j.key === item.judge);
              const isLeft = i % 2 === 0;
              return (
                <div 
                  key={i}
                  className={`flex ${isLeft ? 'justify-start' : 'justify-end'} transition-all duration-500 ${banterItems.includes(i) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 h-0 overflow-hidden'}`}
                >
                  <div className={`bg-slate-800/70 rounded-2xl p-4 max-w-[85%] ${isLeft ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{judge?.emoji || '❓'}</span>
                      <span className="text-orange-400 text-sm font-medium">{judge?.name || item.judge}</span>
                    </div>
                    <p className="text-slate-200 text-sm">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Button - only show after all banter has animated in */}
          {buttonReady && (
            <button
              onClick={() => setScreen('scores')}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400"
            >
              To the Scores
            </button>
          )}
        </div>

        {/* Modals */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showAllRounds && (
          <AllRoundsModal 
            previousShows={[...previousShows]}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
        {showCancelModal && (
          <CancelModal 
            opponentName={opponentProfile.name}
            onConfirm={onCancelRivalry}
            onClose={() => setShowCancelModal(false)}
          />
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: SCORE REVEAL SCREEN
  // ============================================
  
  if (screen === 'scores') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <HeaderWithMenu
          onAllRounds={() => setShowAllRounds(true)}
          onProfiles={() => onNavigate('screen2')}
          onHowToPlay={() => setShowHowToPlay(true)}
          onCancel={() => setShowCancelModal(true)}
        />
        
        <div className="max-w-md mx-auto">
          {/* Winner headline - appears above scoreboard */}
          {winnerRevealed && (
            <div className="text-center mb-4 animate-fade-in">
              <h2 className="text-xl font-bold text-orange-500">
                {winnerName} wins the round!
              </h2>
            </div>
          )}
          
          {/* Scoreboard */}
          <div className="mb-6">
            <div 
              className="rounded-xl py-4 px-6 transition-all duration-150"
              style={{ 
                backgroundColor: scoreFlash ? 'rgba(249, 115, 22, 0.3)' : 'rgba(30, 41, 59, 0.6)'
              }}
            >
              <div className="flex justify-center items-center">
                {/* Left player with mic space */}
                <div className="flex items-center gap-2">
                  <div className="w-12 flex justify-center">
                    {winnerRevealed && winnerIsLeft && (
                      <img src={GoldenMic} alt="winner" className="w-10 h-10 animate-fade-in" />
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-100 tabular-nums">
                      {runningScoreLeft}
                    </div>
                    <span className="text-sm text-slate-400">{leftProfile.name}</span>
                  </div>
                </div>
                
                <div className="text-2xl text-slate-600 mx-6">—</div>
                
                {/* Right player with mic space */}
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-100 tabular-nums">
                      {runningScoreRight}
                    </div>
                    <span className="text-sm text-slate-400">{rightProfile.name}</span>
                  </div>
                  <div className="w-12 flex justify-center">
                    {winnerRevealed && !winnerIsLeft && (
                      <img src={GoldenMic} alt="winner" className="w-10 h-10 animate-fade-in" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Judges - newest at top, animate up from bottom */}
          <div className="space-y-3 mb-8">
            {[...judges].reverse().map(([judgeKey, data]) => {
              const judge = judgeProfiles.find(j => j.key === judgeKey);
              const isRevealed = revealedJudges.includes(judgeKey);
              const leftScore = getScoreForProfile(leftProfile.id, data);
              const rightScore = getScoreForProfile(rightProfile.id, data);
              const leftWon = leftScore > rightScore;
              const rightWon = rightScore > leftScore;
              const judgeTie = leftScore === rightScore;
              
              if (!isRevealed) return null;
              
              return (
                <div 
                  key={judgeKey}
                  className="bg-slate-800/50 rounded-xl p-4 animate-slide-up"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{judge?.emoji || '❓'}</span>
                    <span className="font-bold text-orange-400">{judge?.name || judgeKey}</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">{data.comment}</p>
                  <div className="flex justify-between text-sm">
                    <span className={leftWon || judgeTie ? 'text-orange-400 font-bold' : 'text-slate-400'}>
                      {leftProfile.name}: {leftScore}
                    </span>
                    <span className={rightWon || judgeTie ? 'text-orange-400 font-bold' : 'text-slate-400'}>
                      {rightProfile.name}: {rightScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Continue button - only after winner revealed */}
          {winnerRevealed && (
            <button
              onClick={() => {
                if (isFinalRound) {
                  setScreen('rivalry_outcome');
                } else {
                  setScreen('wrapup');
                }
              }}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400"
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

        {/* Modals */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showAllRounds && (
          <AllRoundsModal 
            previousShows={[...previousShows]}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
        {showCancelModal && (
          <CancelModal 
            opponentName={opponentProfile.name}
            onConfirm={onCancelRivalry}
            onClose={() => setShowCancelModal(false)}
          />
        )}
      </div>
    );
  }

  // ============================================
  // RENDER: RIVALRY OUTCOME SCREEN (Final Round Only)
  // ============================================
  
  if (screen === 'rivalry_outcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          {iWonRivalry ? (
            <>
              <img 
                src={GoldenMic} 
                alt="Golden Mic" 
                className="w-32 h-32 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)] animate-pulse"
              />
              <h1 className="text-3xl font-bold text-orange-400 mb-2">
                {outcomeHeadline.winner}
              </h1>
              <p className="text-slate-300 mb-8">
                The Golden Mic is yours
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-6">😔</div>
              <h1 className="text-3xl font-bold text-slate-300 mb-2">
                {outcomeHeadline.loser}
              </h1>
              <p className="text-slate-400 mb-8">
                {opponentProfile.name} claims the Golden Mic
              </p>
            </>
          )}
          
          <button
            onClick={onNavigateToSummary}
            className="px-8 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400"
          >
            See Rivalry Summary
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: WRAPUP SCREEN
  // ============================================
  
  if (screen === 'wrapup') {
    // For final round, skip the tally and go straight to summary after artifact
    if (isFinalRound) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
          <HeaderWithMenu
            onAllRounds={() => setShowAllRounds(true)}
            onProfiles={() => onNavigate('screen2')}
            onHowToPlay={() => setShowHowToPlay(true)}
            onCancel={() => setShowCancelModal(true)}
          />
          
          <div className="max-w-md mx-auto">
            {/* Ripley artifact */}
            {selectedArtifact && (
              <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎙️</span>
                  <span className="font-bold text-orange-400">Ripley</span>
                </div>
                <p className="text-slate-200 text-sm">{selectedArtifact.text}</p>
              </div>
            )}
            
            {/* Final results - show immediately for final round */}
            {wrapupStage >= 1 && (
              <div className="bg-slate-800/30 rounded-xl p-6 mb-8 text-center animate-slide-up">
                <h3 className="text-slate-400 text-sm mb-4">Final Results</h3>
                <div className="flex justify-center items-center gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-100 mb-1">{myWins}</div>
                    <span className="text-sm text-slate-400">{myProfile.name}</span>
                  </div>
                  <div className="text-2xl text-slate-600">-</div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-100 mb-1">{opponentWins}</div>
                    <span className="text-sm text-slate-400">{opponentProfile.name}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Button */}
            {wrapupStage >= 2 && (
              <button
                onClick={onNavigateToSummary}
                className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 animate-slide-up"
              >
                See Rivalry Summary
              </button>
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

          {/* Modals */}
          {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
          {showAllRounds && (
            <AllRoundsModal 
              previousShows={[...previousShows]}
              rivalry={rivalry}
              activeProfileId={activeProfileId}
              onClose={() => setShowAllRounds(false)}
              onSelectRound={(showId) => {
                setShowAllRounds(false);
                onNavigate('screen6', { showId });
              }}
            />
          )}
          {showCancelModal && (
            <CancelModal 
              opponentName={opponentProfile.name}
              onConfirm={onCancelRivalry}
              onClose={() => setShowCancelModal(false)}
            />
          )}
        </div>
      );
    }
    
    // Non-final rounds
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <HeaderWithMenu
          onAllRounds={() => setShowAllRounds(true)}
          onProfiles={() => onNavigate('screen2')}
          onHowToPlay={() => setShowHowToPlay(true)}
          onCancel={() => setShowCancelModal(true)}
        />
        
        <div className="max-w-md mx-auto">
          {/* Ripley artifact - always visible */}
          {selectedArtifact && (
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎙️</span>
                <span className="font-bold text-orange-400">Ripley</span>
              </div>
              <p className="text-slate-200 text-sm">{selectedArtifact.text}</p>
            </div>
          )}
          
          {/* Rivalry standings - rolls up */}
          {wrapupStage >= 1 && (
            <div className="bg-slate-800/30 rounded-xl p-6 mb-8 text-center animate-slide-up">
              <h3 className="text-slate-400 text-sm mb-4">The Rivalry So Far</h3>
              <div className="flex justify-center items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-100 mb-1">{myWins}</div>
                  <span className="text-sm text-slate-400">{myProfile.name}</span>
                </div>
                <div className="text-2xl text-slate-600">-</div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-100 mb-1">{opponentWins}</div>
                  <span className="text-sm text-slate-400">{opponentProfile.name}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Button - cascades after leaderboard */}
          {wrapupStage >= 2 && (
            <button
              onClick={onNextRound}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 animate-slide-up"
            >
              Onto Round {currentShow.show_number + 1}
            </button>
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

        {/* Modals */}
        {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
        {showAllRounds && (
          <AllRoundsModal 
            previousShows={[...previousShows]}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
        {showCancelModal && (
          <CancelModal 
            opponentName={opponentProfile.name}
            onConfirm={onCancelRivalry}
            onClose={() => setShowCancelModal(false)}
          />
        )}
      </div>
    );
  }

  return null;
}

// Cancel Modal Component
function CancelModal({ opponentName, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-slate-100 mb-2">
          Cancel Rivalry?
        </h3>
        <p className="text-slate-300 text-sm mb-4">
          This will end your Rivalry with {opponentName}. Your history will be saved, but your opponent will be notified.
        </p>
        <p className="text-slate-400 text-sm mb-6">This cannot be undone.</p>
        <div className="space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 bg-red-600 text-white font-medium rounded hover:bg-red-500"
          >
            Cancel Rivalry
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
          >
            Keep Playing
          </button>
        </div>
      </div>
    </div>
  );
}