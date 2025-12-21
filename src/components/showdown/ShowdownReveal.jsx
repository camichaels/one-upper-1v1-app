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
  
  // Animation states for rankings phase
  const [rankingsKey, setRankingsKey] = useState(null);
  
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

  // NEW: Sequential reveal animation for rankings phase
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
    confettiRef.current = false;
    setRankingsKey(initKey);
    
    // Fire confetti for winner after headline appears
    rankingsTimersRef.current.push(setTimeout(() => {
      const rankings = verdict.rankings || [];
      const winnerId = rankings[0]?.playerId;
      if (winnerId === currentPlayer?.id && !confettiRef.current) {
        confettiRef.current = true;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 }
        });
      }
    }, 400));
    
    return () => rankingsTimersRef.current.forEach(t => clearTimeout(t));
  }, [revealPhase, round.id, verdict.rankings, currentPlayer?.id]);

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

  // Phase 3: Rankings - The Verdict
  if (revealPhase === 'rankings') {
    const rankings = verdict.rankings || [];
    const judgeRankingsObj = verdict.judgeRankings || {};
    const judgeKeys = Object.keys(judgeRankingsObj);
    
    // Get winner info
    const winner = rankings[0];
    const winnerName = winner ? getPlayerDisplay(winner.playerId).name : 'Unknown';
    const isWinnerMe = winner?.playerId === currentPlayer?.id;
    
    // Circle numbers for rankings
    const circleNumbers = ['①', '②', '③', '④', '⑤'];
    
    // Get circle color based on placement
    function getCircleColor(placement) {
      if (placement === 1) return 'text-yellow-400';
      if (placement === 2) return 'text-slate-400';
      if (placement === 3) return 'text-amber-600';
      return 'text-slate-500';
    }
    
    // Get background for placement card - winner is shaded, others normal
    function getCardBg(placement) {
      if (placement === 1) return 'bg-yellow-500/15';
      return 'bg-slate-800/50';
    }
    
    // Find judge object by key
    function getJudgeByKey(key) {
      return judges.find(j => j.key === key) || { name: key, emoji: '⚖️' };
    }
    
    // Get bonuses for a player
    function getPlayerBonuses(playerId) {
      const bonuses = [];
      
      // Best Guesser
      if (round.best_guesser_id === playerId) {
        bonuses.push({ icon: '🎯', label: 'Best Guesser', points: 1 });
      }
      
      // Predicted Winner (Judge Whisperer)
      if (verdict.judgeWhisperers?.includes(playerId)) {
        bonuses.push({ icon: '🔮', label: 'Predicted Winner', points: 1 });
      }
      
      // AI Bonus Category
      if (verdict.bonusWinner?.playerId === playerId) {
        bonuses.push({ 
          icon: '🎪', 
          label: verdict.bonusWinner.categoryDisplay || verdict.bonusWinner.category, 
          points: 1 
        });
      }
      
      return bonuses;
    }
    
    // Quippy transition lines
    const quippyLines = [
      "But what did the judges really think?",
      "The judges have thoughts...",
      "Behind the scores...",
      "Let's hear from the panel...",
      "The judges weigh in...",
      "What were they thinking?",
      "Inside the judges' heads...",
      "The verdict breakdown...",
      "How it went down...",
      "Judge logic incoming...",
      "The method to the madness...",
      "Why these rankings?",
      "The judges explain themselves...",
    ];
    
    // Pick a consistent quippy line based on round number
    const quippyLine = quippyLines[round.round_number % quippyLines.length];
    
    // Calculate animation delays
    const lastPlayerCardDelay = 700 + ((rankings.length - 1) * 300);
    const quippyDelay = lastPlayerCardDelay + 900; // longer pause after player cards
    const firstJudgeDelay = quippyDelay + 600;

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
        {/* Winner headline */}
        <h2 
          className="text-xl font-bold text-orange-400 text-center mb-2 animate-reveal"
          style={{ animationDelay: '0ms' }}
        >
          {isWinnerMe ? 'You win the round!' : `${winnerName} wins the round!`}
        </h2>
        
        {/* Prompt */}
        <p 
          className="text-slate-100 text-center mb-6 animate-reveal"
          style={{ animationDelay: '400ms' }}
        >
          {round.prompt_text}
        </p>
        
        {/* Player answer cards */}
        <div className="space-y-3 mb-6">
          {rankings.map((ranking, index) => {
            const player = getPlayerDisplay(ranking.playerId);
            const circleNum = circleNumbers[ranking.placement - 1] || ranking.placement;
            const bonuses = getPlayerBonuses(ranking.playerId);
            const rankingPoints = PLACEMENT_POINTS[ranking.placement - 1] || 0;
            const delay = 700 + (index * 300);
            
            return (
              <div
                key={ranking.playerId}
                className={`rounded-xl p-4 animate-reveal ${getCardBg(ranking.placement)}`}
                style={{ animationDelay: `${delay}ms` }}
              >
                {/* Two-column layout: big rank number | content */}
                <div className="flex gap-4">
                  {/* Rank number - large, vertically centered */}
                  <div className={`text-4xl font-bold ${getCircleColor(ranking.placement)} flex items-center`}>
                    {circleNum}
                  </div>
                  
                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    {/* Player name */}
                    <p className="font-bold text-slate-100 mb-1">{player.name}</p>
                    
                    {/* Answer */}
                    <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                      {ranking.answer || '[no answer]'}
                    </p>
                    
                    {/* Ranking points row */}
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>⭐</span>
                        <span>Ranking Points</span>
                      </div>
                      <span className="text-slate-200">+{rankingPoints}</span>
                    </div>
                    
                    {/* Bonus rows */}
                    {bonuses.map((bonus, i) => (
                      <div key={i} className="flex items-center justify-between text-sm text-slate-400 mt-1">
                        <div className="flex items-center gap-2">
                          <span>{bonus.icon}</span>
                          <span>{bonus.label}</span>
                        </div>
                        <span className="text-slate-200">+{bonus.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Quippy transition - acts as visual divider */}
        <div 
          className="bg-slate-700/50 rounded-xl px-4 py-3 mb-6 animate-reveal"
          style={{ animationDelay: `${quippyDelay}ms` }}
        >
          <p className="text-slate-300 text-sm flex items-center gap-2">
            <span>🎙️</span>
            <span>{quippyLine}</span>
          </p>
        </div>
        
        {/* Judges section - no boxes, slide from right */}
        <div className="space-y-4 mb-6">
          {judgeKeys.map((judgeKey, index) => {
            const judge = getJudgeByKey(judgeKey);
            const judgeRankings = judgeRankingsObj[judgeKey] || [];
            const oneLiner = verdict.winnerReactions?.[judgeKey] || '';
            const delay = firstJudgeDelay + (index * 400);
            
            return (
              <div
                key={judgeKey}
                className="animate-slide-right"
                style={{ animationDelay: `${delay}ms` }}
              >
                {/* Judge name: ranking sequence */}
                <p className="text-sm mb-1">
                  <span className="mr-1">{judge.emoji}</span>
                  <span className="text-orange-400 font-medium">{judge.name}:</span>
                  <span className="text-slate-400 ml-2">
                    {judgeRankings.map((r, i) => (
                      <span key={r.playerId}>
                        {r.playerName || getPlayerDisplay(r.playerId).name}
                        {i < judgeRankings.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </span>
                </p>
                {/* One-liner */}
                {oneLiner && (
                  <p className="text-slate-300 text-sm pl-6">{oneLiner}</p>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Continue button */}
        <div 
          className="animate-reveal"
          style={{ animationDelay: `${firstJudgeDelay + (judgeKeys.length * 400) + 400}ms` }}
        >
          {isHost ? (
            <button
              onClick={handleContinue}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              {isLastRound ? 'See the Winner' : 'Showdown Standings'}
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

        {/* CSS for animations */}
        <style>{`
          @keyframes reveal {
            from { 
              opacity: 0; 
              transform: translateY(12px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          @keyframes slideRight {
            from { 
              opacity: 0; 
              transform: translateX(30px); 
            }
            to { 
              opacity: 1; 
              transform: translateX(0); 
            }
          }
          .animate-reveal {
            opacity: 0;
            animation: reveal 0.4s ease-out forwards;
          }
          .animate-slide-right {
            opacity: 0;
            animation: slideRight 0.4s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  return null;
}