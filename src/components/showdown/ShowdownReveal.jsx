import { useState, useEffect } from 'react';
import { calculateGuessResults, updateRevealStep, TOTAL_ROUNDS } from '../../services/showdown';
import { supabase } from '../../lib/supabase';

// Reveal phases: authors → banter → rankings
const REVEAL_PHASES = ['authors', 'banter', 'rankings'];

export default function ShowdownReveal({ round, showdown, currentPlayer, isHost, onShowLeaderboard }) {
  const [isCalculating, setIsCalculating] = useState(true);
  const [guessResults, setGuessResults] = useState([]);

  const players = showdown.players || [];
  const answers = round.answers || [];
  const verdict = round.verdict || {};
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

  // Get who guessed a particular answer and whether they were correct
  function getGuessersForAnswer(answerId, correctPlayerId) {
    // Find all guesses for this answer
    const guessesForAnswer = guessResults.filter(g => g.answer_id === answerId);
    
    const guessers = guessesForAnswer.map(guess => {
      const guesser = getPlayerDisplay(guess.guesser_id);
      const isCorrect = guess.guessed_player_id === correctPlayerId;
      return { ...guesser, isCorrect, guesserId: guess.guesser_id };
    });

    // Sort: correct first, then wrong, alphabetical within each group
    return guessers.sort((a, b) => {
      if (a.isCorrect !== b.isCorrect) {
        return a.isCorrect ? -1 : 1; // Correct first
      }
      return a.name.localeCompare(b.name); // Alphabetical within group
    });
  }

  if (isCalculating) {
    return (
      <div className="max-w-md mx-auto mt-8 text-center">
        <div className="text-4xl mb-4 animate-bounce">🎲</div>
        <p className="text-slate-300 text-lg">Tallying the results...</p>
      </div>
    );
  }

  // Phase 1: Authors Reveal - who wrote what with guess accuracy
  if (revealPhase === 'authors') {
    const bestGuesserId = round.best_guesser_id;
    const bestGuesser = bestGuesserId ? getPlayerDisplay(bestGuesserId) : null;

    return (
      <div className="max-w-md mx-auto mt-4">
        {/* Round indicator - smaller, orange */}
        <div className="text-center mb-3">
          <p className="text-sm font-medium text-orange-400">Round {round.round_number} of {TOTAL_ROUNDS}</p>
        </div>
        
        {/* Prompt - bold */}
        <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2">
          {round.prompt_text}
        </p>

        {/* Answers with authors and guess results - separate boxes */}
        <div className="space-y-3 mb-6">
          {answers.map((answer) => {
            const author = getPlayerDisplay(answer.player_id);
            const isMe = answer.player_id === currentPlayer?.id;
            const guessers = getGuessersForAnswer(answer.id, answer.player_id);

            return (
              <div 
                key={answer.id}
                className="bg-slate-800/50 rounded-xl p-4"
              >
                {/* Answer text */}
                <p className="text-slate-100 leading-relaxed mb-3">
                  {answer.answer_text || '[no answer]'}
                </p>
                
                {/* Written by */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-slate-500 text-sm">Written by:</span>
                  <span className="text-xl">{author.avatar}</span>
                  <span className={`font-semibold ${isMe ? 'text-orange-400' : 'text-orange-400'}`}>
                    {author.name} {isMe && '(You)'}
                  </span>
                </div>

                {/* Predicted by */}
                {guessers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">Predicted by:</span>
                    <div>
                      {guessers.map((g, i) => (
                        <span key={g.guesserId}>
                          {i > 0 && <span className="text-slate-600"> · </span>}
                          <span className={g.isCorrect ? 'text-green-400' : 'text-red-400'}>
                            {g.isCorrect ? '✓' : '✗'} {g.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Best Guesser */}
        {bestGuesser && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-orange-400 font-semibold">
              {bestGuesser.name} guessed best!
            </p>
            <p className="text-slate-300 text-sm mt-1">Bonus +1 point</p>
            <p className="text-slate-500 text-xs mt-1">Fastest with the most correct predictions</p>
          </div>
        )}

        {/* Continue button */}
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
    );
  }

  // Phase 2: Judge Banter - conversation flow like Rivalry
  if (revealPhase === 'banter') {
    const judges = showdown.judges || [];
    const banter = verdict.banter || {};
    
    // Check if banter is an array (conversation) or object (one comment per judge)
    const banterMessages = Array.isArray(verdict.banterMessages) 
      ? verdict.banterMessages 
      : judges.map(judge => ({
          judgeKey: judge.key,
          judgeName: judge.name,
          emoji: judge.emoji,
          comment: banter[judge.key] || ""
        })).filter(msg => msg.comment); // Filter out empty comments

    // Show deliberating animation if no banter yet
    if (banterMessages.length === 0) {
      return (
        <div className="max-w-md mx-auto mt-4">
          {/* Round indicator */}
          <div className="text-center mb-3">
            <p className="text-sm font-medium text-orange-400">Round {round.round_number} of {TOTAL_ROUNDS}</p>
          </div>
          
          {/* Prompt */}
          <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-8 px-2">
            {round.prompt_text}
          </p>

          {/* Deliberating message */}
          <div className="text-center space-y-8">
            <div className="text-xl text-slate-200 font-medium">Judges are deliberating...</div>
            
            {/* Orbiting judges */}
            <div className="relative w-48 h-48 mx-auto">
              <div className="judges-orbit w-full h-full relative">
                {judges.map((judge, i) => {
                  const angle = (i * (360 / judges.length) - 90) * (Math.PI / 180);
                  const radius = 70;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  
                  return (
                    <div
                      key={judge.key}
                      className="absolute left-1/2 top-1/2"
                      style={{
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                      }}
                    >
                      <div className="judge-item-inner flex flex-col items-center">
                        <span className="text-4xl">{judge.emoji}</span>
                        <span className="text-xs text-slate-400 mt-1">{judge.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-slate-400 text-sm">This won't take long...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto mt-4">
        {/* Round indicator - smaller, orange */}
        <div className="text-center mb-3">
          <p className="text-sm font-medium text-orange-400">Round {round.round_number} of {TOTAL_ROUNDS}</p>
        </div>
        
        {/* Prompt - bold */}
        <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2">
          {round.prompt_text}
        </p>

        {/* Ripley intro */}
        <div className="bg-slate-800/80 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎙️</span>
            <span className="text-orange-400 font-semibold text-sm">Ripley</span>
          </div>
          <p className="text-slate-300 text-sm mb-2">
            Judges, what are you thinking?
          </p>
          <p className="text-slate-300 text-sm">
            Players, feel free to read these aloud. We won't judge. They will.
          </p>
        </div>

        {/* Judge banter - alternating conversation flow */}
        <div className="space-y-3 mb-6">
          {banterMessages.map((msg, index) => {
            // Alternate left/right positioning
            const isLeft = index % 2 === 0;
            
            return (
              <div 
                key={index} 
                className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`bg-slate-800/50 rounded-xl p-4 max-w-[85%]`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{msg.emoji}</span>
                    <span className="text-slate-100 font-semibold text-sm">{msg.judgeName}</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    {msg.comment}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue button */}
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
    );
  }

  // Phase 3: Rankings - cleaner design, no trophy icon, no outline boxes
  if (revealPhase === 'rankings') {
    const rankings = verdict.rankings || [];
    const bonusWinner = verdict.bonusWinner;
    const judgeWhisperers = verdict.judgeWhisperers || [];

    // If no AI rankings yet, show placeholder based on submission order
    const displayRankings = rankings.length > 0 ? rankings : answers.map((a, i) => ({
      playerId: a.player_id,
      placement: i + 1,
      answer: a.answer_text
    }));

    // Check if current player won this round
    const isWinner = displayRankings[0]?.playerId === currentPlayer?.id;

    // Placement points
    const placementPoints = [5, 3, 2, 1, 0];

    return (
      <div className="max-w-md mx-auto mt-4">
        {/* Confetti for winner */}
        {isWinner && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  fontSize: `${12 + Math.random() * 12}px`,
                }}
              >
                {['🎉', '✨', '⭐', '🌟', '💫', '🎊'][Math.floor(Math.random() * 6)]}
              </div>
            ))}
            <style>{`
              @keyframes fall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
              }
              .animate-fall { animation: fall linear forwards; }
            `}</style>
          </div>
        )}

        {/* Round indicator - smaller, orange */}
        <div className="text-center mb-3">
          <p className="text-sm font-medium text-orange-400">Round {round.round_number} of {TOTAL_ROUNDS}</p>
        </div>
        
        {/* Prompt - bold */}
        <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2">
          {round.prompt_text}
        </p>

        {/* Section header */}
        <p className="text-slate-400 text-sm mb-3">Judges say...</p>

        {/* Rankings - show all players with their answers */}
        <div className="space-y-2 mb-6">
          {displayRankings.map((ranking, index) => {
            const player = getPlayerDisplay(ranking.playerId);
            const isMe = ranking.playerId === currentPlayer?.id;
            const isFirst = index === 0;
            const points = placementPoints[index] || 0;

            return (
              <div 
                key={ranking.playerId}
                className={`rounded-xl p-4 ${
                  isFirst 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' 
                    : 'bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-8 ${isFirst ? 'text-yellow-400' : 'text-slate-400'}`}>
                      {index + 1}.
                    </span>
                    <span className="text-2xl">{player.avatar}</span>
                    <span className={`font-semibold ${isMe ? 'text-orange-400' : 'text-slate-100'}`}>
                      {player.name}
                    </span>
                  </div>
                  <span className={`font-bold ${isFirst ? 'text-yellow-400' : 'text-slate-400'}`}>
                    +{points} pts
                  </span>
                </div>
                <p className="text-slate-300 text-sm mt-2 ml-11">
                  {ranking.answer || '[crickets]'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bonus Awards */}
        {(bonusWinner || round.best_guesser_id || judgeWhisperers.length > 0) && (
          <>
            <p className="text-slate-400 text-sm mb-3">Bonus points (+1 each)</p>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 space-y-2">
              {/* Judges Pick */}
              {bonusWinner && (
                <p className="text-slate-300 text-sm">
                  {bonusWinner.categoryDisplay}: <span className="text-orange-400 font-medium">{getPlayerDisplay(bonusWinner.playerId).name}</span>
                </p>
              )}

              {/* Best Guesser */}
              {round.best_guesser_id && (
                <p className="text-slate-300 text-sm">
                  Best Guesser: <span className="text-orange-400 font-medium">{getPlayerDisplay(round.best_guesser_id).name}</span>
                </p>
              )}

              {/* Judge Whisperers */}
              {judgeWhisperers.length > 0 && (
                <p className="text-slate-300 text-sm">
                  Predicted the Winner: <span className="text-orange-400 font-medium">{judgeWhisperers.map(id => getPlayerDisplay(id).name).join(', ')}</span>
                </p>
              )}
            </div>
          </>
        )}

        {/* No AI results notice */}
        {rankings.length === 0 && (
          <div className="bg-slate-700/30 rounded-xl p-3 mb-6 text-center">
            <p className="text-slate-500 text-sm">AI judging coming soon - showing submission order</p>
          </div>
        )}

        {/* Continue button */}
        {isHost ? (
          <button
            onClick={handleContinue}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            {isLastRound ? 'See Who Won' : "Who's Winning?"}
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
    );
  }

  return null;
}