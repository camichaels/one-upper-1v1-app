import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { calculateGuessResults, updateRevealStep, TOTAL_ROUNDS } from '../../services/showdown';
import { supabase } from '../../lib/supabase';

// Reveal phases: authors → banter → rankings
const REVEAL_PHASES = ['authors', 'banter', 'rankings'];

// Points for placement: 1st=5, 2nd=3, 3rd=2, 4th=1, 5th=0
const PLACEMENT_POINTS = [5, 3, 2, 1, 0];

export default function ShowdownReveal({ round, showdown, currentPlayer, isHost, onShowLeaderboard }) {
  const [isCalculating, setIsCalculating] = useState(true);
  const [guessResults, setGuessResults] = useState([]);
  
  // Animation states for authors phase
  const [revealedCards, setRevealedCards] = useState([]);
  const [showBestGuesser, setShowBestGuesser] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  
  // Animation states for banter phase
  const [banterKey, setBanterKey] = useState(null);
  const [answersRevealed, setAnswersRevealed] = useState(false);
  const [revealedBanterItems, setRevealedBanterItems] = useState([]);
  const [banterButtonReady, setBanterButtonReady] = useState(false);
  
  // Animation states for rankings phase (NEW - judge-by-judge reveal)
  const [rankingsKey, setRankingsKey] = useState(null);
  const [revealedJudges, setRevealedJudges] = useState([]);
  const [standings, setStandings] = useState([]);
  const [leaderboardFlash, setLeaderboardFlash] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  
  const confettiRef = useRef(false);
  const rankingsInitRef = useRef(null);
  const rankingsTimersRef = useRef([]);

  const players = showdown.players || [];
  const answers = round.answers || [];
  const verdict = round.verdict || {};
  const judges = showdown.judges || [];
  const isLastRound = round.round_number >= TOTAL_ROUNDS;
  
  // Use reveal_step from round (synced via real-time) or default to 'authors'
  const revealPhase = round.reveal_step || 'authors';

  // Get player display info
  function getPlayerDisplay(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return { name: 'Unknown', avatar: '❓' };
    return {
      name: player.guest_name || player.profile?.name || 'Player',
      avatar: player.guest_avatar || player.profile?.avatar || '😎'
    };
  }

  // Truncate name to max length
  function truncateName(name, maxLength = 8) {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  }

  // Calculate standings from judge rankings using Borda count
  // judgeRankingsObj is keyed by judge key, each value is array of { playerId, playerName, placement }
  function calculateStandingsFromJudgeKeys(revealedJudgeKeys, judgeRankingsObj) {
    const pointTotals = {};
    
    // Initialize all players with 0 points
    players.forEach(p => {
      pointTotals[p.id] = 0;
    });
    
    // Add points from each revealed judge
    // Points: 1st gets N points, last gets 1 (where N = player count)
    const playerCount = players.length;
    
    revealedJudgeKeys.forEach(judgeKey => {
      const rankings = judgeRankingsObj[judgeKey];
      if (rankings && Array.isArray(rankings)) {
        rankings.forEach((ranking) => {
          // ranking is { playerId, playerName, placement }
          // Points: position 1 gets playerCount points, position N gets 1
          const points = playerCount - ranking.placement + 1;
          pointTotals[ranking.playerId] = (pointTotals[ranking.playerId] || 0) + points;
        });
      }
    });
    
    // Convert to array and sort
    const standingsArray = Object.entries(pointTotals)
      .map(([playerId, points]) => ({ playerId, points }))
      .sort((a, b) => b.points - a.points);
    
    // Assign placements (handle ties)
    standingsArray.forEach((standing, index) => {
      if (index === 0) {
        standing.placement = 1;
      } else if (standing.points === standingsArray[index - 1].points) {
        standing.placement = standingsArray[index - 1].placement;
      } else {
        standing.placement = index + 1;
      }
    });
    
    return standingsArray;
  }

  // Calculate guess results and fetch guess data on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Calculate who guessed correctly
        await calculateGuessResults(round.id);
        
        // Fetch all guesses for this round
        const { data: guesses, error } = await supabase
          .from('showdown_guesses')
          .select('*')
          .eq('round_id', round.id);
        
        console.log('🔍 Fetched guesses for round:', round.id, guesses, error);
        setGuessResults(guesses || []);
        setIsCalculating(false);
      } catch (err) {
        console.error('Failed to load guess data:', err);
        setIsCalculating(false);
      }
    }
    loadData();
  }, [round.id]);

  // Sort answers consistently by ID (same order for all players)
  useEffect(() => {
    if (answers.length > 0 && shuffledAnswers.length === 0) {
      // Sort by ID to ensure all players see same order
      const sorted = [...answers].sort((a, b) => a.id.localeCompare(b.id));
      setShuffledAnswers(sorted);
    }
  }, [answers]);

  // Staged reveal animation for authors phase
  useEffect(() => {
    if (revealPhase !== 'authors' || isCalculating || shuffledAnswers.length === 0) return;
    
    // Reset animation state when entering this phase
    setRevealedCards([]);
    setShowBestGuesser(false);
    setAnimationComplete(false);
    confettiRef.current = false;
    
    const timers = [];
    
    // Reveal each card with delay
    shuffledAnswers.forEach((answer, index) => {
      // First show the card (answer only)
      timers.push(setTimeout(() => {
        setRevealedCards(prev => [...prev, { answerId: answer.id, stage: 'answer' }]);
      }, index * 2000));
      
      // Then reveal the author
      timers.push(setTimeout(() => {
        setRevealedCards(prev => 
          prev.map(card => 
            card.answerId === answer.id 
              ? { ...card, stage: 'author' }
              : card
          )
        );
      }, index * 2000 + 800));
    });
    
    // Show best guesser after all cards
    const bestGuesserDelay = shuffledAnswers.length * 2000 + 500;
    timers.push(setTimeout(() => {
      setShowBestGuesser(true);
    }, bestGuesserDelay));
    
    // Animation complete - show button
    timers.push(setTimeout(() => {
      setAnimationComplete(true);
    }, bestGuesserDelay + 1000));
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [revealPhase, isCalculating, shuffledAnswers]);

  // Ref to track banter phase initialization and timers
  const banterInitRef = useRef(null);
  const banterTimersRef = useRef([]);

  // Staged reveal animation for banter phase
  useEffect(() => {
    if (revealPhase !== 'banter') {
      // Reset when leaving banter phase
      banterInitRef.current = null;
      banterTimersRef.current.forEach(t => clearTimeout(t));
      banterTimersRef.current = [];
      setBanterKey(null);
      return;
    }
    
    // Skip if we've already initialized for this round
    const initKey = `${round.id}-banter`;
    if (banterInitRef.current === initKey) {
      return;
    }
    
    banterInitRef.current = initKey;
    
    // Clear any old timers from previous round
    banterTimersRef.current.forEach(t => clearTimeout(t));
    banterTimersRef.current = [];
    
    // Reset animation state - everything hidden
    setBanterKey(null);
    setAnswersRevealed(false);
    setRevealedBanterItems([]);
    setBanterButtonReady(false);
    
    // Get banter messages
    const banterMessages = Array.isArray(verdict.banterMessages) 
      ? verdict.banterMessages 
      : [];
    
    // Timing matched to VerdictFlow:
    // 50ms: allow render
    banterTimersRef.current.push(setTimeout(() => {
      setBanterKey(initKey);
    }, 50));
    
    // 150ms: prompt + answers slide in
    banterTimersRef.current.push(setTimeout(() => {
      setAnswersRevealed(true);
    }, 150));
    
    // 1100ms: first banter, then +1200ms for each subsequent
    banterMessages.forEach((_, i) => {
      banterTimersRef.current.push(setTimeout(() => {
        setRevealedBanterItems(prev => [...prev, i]);
      }, 1100 + (i * 1200)));
    });
    
    // Button 500ms after last banter
    const buttonDelay = 1100 + ((banterMessages.length - 1) * 1200) + 500;
    banterTimersRef.current.push(setTimeout(() => {
      setBanterButtonReady(true);
    }, Math.max(buttonDelay, 1600)));
    
  }, [revealPhase, round.id, verdict.banterMessages]);

  // NEW: Staged reveal animation for rankings phase (judge-by-judge)
  useEffect(() => {
    if (revealPhase !== 'rankings') {
      // Reset when leaving rankings phase
      rankingsInitRef.current = null;
      rankingsTimersRef.current.forEach(t => clearTimeout(t));
      rankingsTimersRef.current = [];
      setRankingsKey(null);
      return;
    }
    
    // Skip if we've already initialized for this round
    const initKey = `${round.id}-rankings`;
    if (rankingsInitRef.current === initKey) {
      return;
    }
    
    rankingsInitRef.current = initKey;
    
    // Clear any old timers
    rankingsTimersRef.current.forEach(t => clearTimeout(t));
    rankingsTimersRef.current = [];
    
    // Reset animation state
    setRankingsKey(null);
    setShowWinner(false);
    confettiRef.current = false;
    
    // Get judge rankings from verdict - keyed by judge.key
    const judgeRankingsObj = verdict.judgeRankings || {};
    const judgeKeys = Object.keys(judgeRankingsObj);
    const numJudges = Math.min(judgeKeys.length, 3);
    
    if (numJudges === 0) {
      // No judge data yet, show fallback
      setRankingsKey(initKey);
      setRevealedJudges([]);
      setStandings(players.map((p, i) => ({ playerId: p.id, points: 0, placement: i + 1 })));
      return;
    }
    
    // Start with Judge 1 already revealed
    const initialStandings = calculateStandingsFromJudgeKeys([judgeKeys[0]], judgeRankingsObj);
    setRevealedJudges([judgeKeys[0]]);
    setStandings(initialStandings);
    
    // Allow render
    rankingsTimersRef.current.push(setTimeout(() => {
      setRankingsKey(initKey);
    }, 50));
    
    // Reveal subsequent judges with animation
    for (let i = 1; i < numJudges; i++) {
      const isLastJudge = i === numJudges - 1;
      const delay = i * 2000; // 2s between each judge
      const judgeKey = judgeKeys[i];
      
      rankingsTimersRef.current.push(setTimeout(() => {
        // Add judge to revealed list
        setRevealedJudges(prev => [...prev, judgeKey]);
        
        // Flash leaderboard
        setLeaderboardFlash(true);
        
        // Update standings after flash
        setTimeout(() => {
          const revealedSoFar = judgeKeys.slice(0, i + 1);
          const newStandings = calculateStandingsFromJudgeKeys(revealedSoFar, judgeRankingsObj);
          setStandings(newStandings);
          
          setTimeout(() => {
            setLeaderboardFlash(false);
            
            // If last judge, show winner after dramatic pause
            if (isLastJudge) {
              setTimeout(() => {
                setShowWinner(true);
                
                // Confetti for winner
                const winnerId = newStandings[0]?.playerId;
                if (winnerId === currentPlayer?.id && !confettiRef.current) {
                  confettiRef.current = true;
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.3 }
                  });
                }
              }, 800);
            }
          }, 300);
        }, 200);
      }, delay));
    }
    
    return () => rankingsTimersRef.current.forEach(t => clearTimeout(t));
  }, [revealPhase, round.id, verdict.judgeRankings, players, currentPlayer?.id]);

  // Fire confetti for best guesser
  useEffect(() => {
    if (showBestGuesser && round.best_guesser_id === currentPlayer?.id && !confettiRef.current) {
      confettiRef.current = true;
      
      // Center burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 200);
    }
  }, [showBestGuesser, round.best_guesser_id, currentPlayer?.id]);

  // Handle host advancing phases - updates DB so all players sync
  async function handleContinue() {
    if (!isHost) return;
    
    const currentIndex = REVEAL_PHASES.indexOf(revealPhase);
    if (currentIndex < REVEAL_PHASES.length - 1) {
      const nextStep = REVEAL_PHASES[currentIndex + 1];
      try {
        await updateRevealStep(round.id, nextStep);
      } catch (err) {
        console.error('Failed to advance reveal step:', err);
      }
    } else {
      onShowLeaderboard();
    }
  }

  // Check if current player guessed correctly for a given answer
  function didIGuessCorrectly(answerId, correctPlayerId) {
    const myGuess = guessResults.find(
      g => g.guesser_id === currentPlayer?.id && g.answer_id === answerId
    );
    return myGuess?.guessed_player_id === correctPlayerId;
  }

  if (isCalculating) {
    return (
      <div className="max-w-md mx-auto mt-8 text-center">
        <div className="text-4xl mb-4 animate-bounce">🎲</div>
        <p className="text-slate-300 text-lg">Tallying the results...</p>
      </div>
    );
  }

  // Phase 1: Authors Reveal - animated card reveals with green/red feedback
  if (revealPhase === 'authors') {
    const bestGuesserId = round.best_guesser_id;
    const bestGuesser = bestGuesserId ? getPlayerDisplay(bestGuesserId) : null;
    const iAmBestGuesser = bestGuesserId === currentPlayer?.id;

    return (
      <div className="max-w-md mx-auto mt-4">
        {/* Prompt - bold */}
        <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2">
          {round.prompt_text}
        </p>

        {/* Section header - matches "Who said it?" style */}
        <p className="text-slate-100 font-semibold mb-3">
          Did you guess right?
        </p>

        {/* Answer cards with staged reveal */}
        <div className="space-y-3 mb-6">
          {shuffledAnswers.map((answer) => {
            const author = getPlayerDisplay(answer.player_id);
            const isMyAnswer = answer.player_id === currentPlayer?.id;
            const revealState = revealedCards.find(c => c.answerId === answer.id);
            const isRevealed = revealState?.stage === 'author';
            const isVisible = !!revealState;
            
            // Determine card color based on guess result
            let cardBgClass = 'bg-slate-800/50'; // Default before reveal
            if (isRevealed) {
              if (isMyAnswer) {
                cardBgClass = 'bg-green-500/20'; // Your own answer - green
              } else if (didIGuessCorrectly(answer.id, answer.player_id)) {
                cardBgClass = 'bg-green-500/20'; // Guessed correctly - green
              } else {
                cardBgClass = 'bg-red-500/20'; // Guessed wrong - red
              }
            }

            return (
              <div 
                key={answer.id}
                className={`rounded-xl p-4 transition-all duration-500 ${cardBgClass} ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                {/* Answer text */}
                <p className="text-slate-100 leading-relaxed mb-3">
                  {answer.answer_text || '[no answer]'}
                </p>
                
                {/* Author reveal */}
                <div className={`flex items-center gap-2 transition-all duration-500 ${
                  isRevealed ? 'opacity-100' : 'opacity-0'
                }`}>
                  <span className="text-2xl">{author.avatar}</span>
                  <span className="text-orange-400 font-semibold">
                    {author.name}
                    {isMyAnswer && ' (You)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Best Guesser reveal */}
        {showBestGuesser && bestGuesser && (
          <div className={`rounded-xl p-4 mb-6 transition-all duration-500 ${
            iAmBestGuesser ? 'bg-orange-500/20' : 'bg-slate-800/50'
          }`}>
            <p className={`font-bold text-lg ${iAmBestGuesser ? 'text-orange-400' : 'text-slate-100'}`}>
              {iAmBestGuesser ? 'You guessed best!' : `${bestGuesser.name} guessed best!`}
            </p>
            <p className="text-slate-400 text-sm mt-1">+1 bonus point</p>
            <p className="text-slate-500 text-xs mt-1">Fastest with the most correct</p>
          </div>
        )}

        {/* Continue button - only show after animation */}
        {animationComplete && (
          <div className="transition-all duration-500">
            {isHost ? (
              <button
                onClick={handleContinue}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
              >
                Hear From the Judges
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-slate-700 text-slate-400 font-bold py-4 px-6 rounded-xl text-lg cursor-not-allowed"
              >
                Waiting for host...
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Phase 2: Judge Banter - animated conversation flow
  if (revealPhase === 'banter') {
    // Get banter messages from verdict
    const banterMessages = Array.isArray(verdict.banterMessages) 
      ? verdict.banterMessages 
      : [];

    // Show deliberating animation if no banter yet
    if (banterMessages.length === 0) {
      return (
        <div className="max-w-md mx-auto mt-4">
          {/* Prompt */}
          <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2">
            {round.prompt_text}
          </p>

          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-pulse">🤔</div>
            <p className="text-slate-300">Judges are deliberating...</p>
          </div>
        </div>
      );
    }

    // Don't render content until initialized to prevent flash
    if (!banterKey) {
      return (
        <div className="max-w-md mx-auto mt-4">
          {/* Empty container - same structure, no content yet */}
        </div>
      );
    }

    return (
      <div key={banterKey} className="max-w-md mx-auto mt-4">
        {/* Prompt + Answers animate in together */}
        <div className={`transition-all duration-500 ${
          answersRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {/* Prompt */}
          <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2">
            {round.prompt_text}
          </p>

          {/* Answers for context - single compact box */}
          <div className="bg-slate-700/40 rounded-xl py-3 px-4 mb-6">
            <div className="space-y-1">
              {answers.map((answer) => {
                const author = getPlayerDisplay(answer.player_id);
                return (
                  <p key={answer.id} className="text-slate-200 text-sm">
                    <span className="text-slate-400">{author.name}:</span> {answer.answer_text}
                  </p>
                );
              })}
            </div>
          </div>
        </div>

        {/* Judge banter - animated conversation flow */}
        <div className="space-y-3 mb-6">
          {banterMessages.map((msg, index) => {
            const isLeft = index % 2 === 0;
            const isRevealed = revealedBanterItems.includes(index);
            
            return (
              <div 
                key={index}
                className={`flex ${isLeft ? 'justify-start' : 'justify-end'} transition-all duration-500 ${
                  isRevealed 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4 h-0 overflow-hidden'
                }`}
              >
                <div className={`bg-slate-800/70 rounded-2xl p-4 max-w-[85%] ${
                  isLeft ? 'rounded-tl-sm' : 'rounded-tr-sm'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{msg.emoji}</span>
                    <span className="text-orange-400 text-sm font-medium">{msg.judgeName}</span>
                  </div>
                  <p className="text-slate-200 text-sm">{msg.comment}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue button - animated in */}
        <div className={`transition-all duration-500 ${
          banterButtonReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {isHost ? (
            <button
              onClick={handleContinue}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              And the winner is...
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-slate-700 text-slate-400 font-bold py-4 px-6 rounded-xl text-lg cursor-not-allowed"
            >
              Waiting for host...
            </button>
          )}
        </div>
      </div>
    );
  }

  // Phase 3: Rankings - NEW judge-by-judge reveal with leaderboard shuffle
  if (revealPhase === 'rankings') {
    const judgeRankingsObj = verdict.judgeRankings || {};
    const winnerName = standings[0] ? getPlayerDisplay(standings[0].playerId).name : 'Unknown';
    
    // Circle numbers for rankings
    const circleNumbers = ['①', '②', '③', '④', '⑤'];
    
    // Get circle color based on placement
    function getCircleColor(placement) {
      if (placement === 1) return 'text-yellow-400';
      if (placement === 2) return 'text-slate-300';
      if (placement === 3) return 'text-amber-600';
      return 'text-slate-500';
    }
    
    // Find judge object by key
    function getJudgeByKey(key) {
      return judges.find(j => j.key === key) || { name: key, emoji: '⚖️' };
    }

    // Don't render until initialized
    if (!rankingsKey) {
      return (
        <div className="max-w-md mx-auto mt-4">
          {/* Empty container */}
        </div>
      );
    }

    return (
      <div key={rankingsKey} className="max-w-md mx-auto mt-4">
        {/* Winner headline - appears after all judges revealed */}
        {showWinner && (
          <div className="text-center mb-4 animate-fade-in">
            <h2 className="text-xl font-bold text-orange-500">
              {standings[0]?.playerId === currentPlayer?.id ? 'You win the round!' : `${winnerName} wins the round!`}
            </h2>
          </div>
        )}
        
        {/* Leaderboard - single box, centered content */}
        <div className={`rounded-xl p-4 mb-6 transition-all duration-150 ${
          leaderboardFlash ? 'bg-orange-500/30' : 'bg-slate-800/60'
        }`}>
          <div className="space-y-2 flex flex-col items-center">
            {[1, 2, 3, 4, 5].slice(0, players.length).map(placement => {
              const playersAtRank = standings.filter(s => s.placement === placement);
              
              return playersAtRank.map(standing => {
                const player = getPlayerDisplay(standing.playerId);
                const isMe = standing.playerId === currentPlayer?.id;
                const circleNum = circleNumbers[standing.placement - 1] || standing.placement;
                
                return (
                  <div 
                    key={standing.playerId}
                    className="flex items-center py-2 w-48 transition-all duration-500"
                  >
                    <span className={`text-xl w-10 ${getCircleColor(standing.placement)}`}>
                      {circleNum}
                    </span>
                    <span className={`font-medium ${
                      isMe ? 'text-orange-400' : 'text-slate-100'
                    }`}>
                      {player.name}
                    </span>
                  </div>
                );
              });
            })}
          </div>
        </div>
        
        {/* Judge cards - newest at top, stack down */}
        <div className="space-y-3 mb-6">
          {[...revealedJudges].reverse().map((judgeKey) => {
            const rankings = judgeRankingsObj[judgeKey];
            const judge = getJudgeByKey(judgeKey);
            const isFirstJudge = judgeKey === revealedJudges[0];
            
            if (!rankings || !Array.isArray(rankings)) return null;
            
            // Get one-liner from winnerReactions for this judge
            const oneLiner = verdict.winnerReactions?.[judgeKey] || '';
            
            return (
              <div 
                key={judgeKey}
                className={`bg-slate-800/50 rounded-xl p-4 ${isFirstJudge ? '' : 'animate-slide-up'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{judge.emoji}</span>
                  <span className="font-bold text-orange-400">{judge.name}</span>
                </div>
                {oneLiner && (
                  <p className="text-slate-300 text-sm mb-2">{oneLiner}</p>
                )}
                <div className="text-slate-400 text-sm">
                  {rankings.map((r, i) => (
                    <span key={r.playerId}>
                      {r.playerName || getPlayerDisplay(r.playerId).name}
                      {i < rankings.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Continue button - show after winner revealed */}
        {showWinner && (
          <div className="animate-slide-up">
            {isHost ? (
              <button
                onClick={handleContinue}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
              >
                To the scores
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-slate-700 text-slate-400 font-bold py-4 px-6 rounded-xl text-lg cursor-not-allowed"
              >
                Waiting for host...
              </button>
            )}
          </div>
        )}

        {/* CSS for animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
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

  return null;
}