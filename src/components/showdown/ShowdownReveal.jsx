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
        {/* Round indicator */}
        <div className="text-center mb-2">
          <p className="text-2xl font-bold text-slate-100">Round {round.round_number} of {TOTAL_ROUNDS}</p>
        </div>
        
        {/* Prompt - same as previous screens */}
        <p className="text-xl text-slate-100 font-medium text-center leading-relaxed mb-4 px-2">
          {round.prompt_text}
        </p>

        <div className="text-center mb-4">
          <h2 className="text-lg text-slate-400">Who wrote what?</h2>
        </div>

        {/* Answers with authors and guess results */}
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
                {/* Author */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{author.avatar}</span>
                  <span className={`font-semibold ${isMe ? 'text-orange-400' : 'text-slate-100'}`}>
                    {author.name} {isMe && '(You)'}
                  </span>
                </div>
                
                {/* Answer text - no quotes */}
                <p className="text-slate-300 leading-relaxed mb-2">
                  {answer.answer_text || '[no answer]'}
                </p>

                {/* Who guessed correctly/incorrectly */}
                {guessers.length > 0 && (
                  <div className="text-sm">
                    <span className="text-slate-500">Guessed by: </span>
                    {guessers.map((g, i) => (
                      <span key={g.guesserId}>
                        {i > 0 && <span className="text-slate-600"> · </span>}
                        <span className={g.isCorrect ? 'text-green-400' : 'text-red-400'}>
                          {g.isCorrect ? '✓' : '✗'} {g.name}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Best Guesser */}
        {bestGuesser && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-slate-400 text-sm mb-1">Best Who Said What +1 point</p>
            <p className="text-slate-100">
              <span className="text-xl mr-2">{bestGuesser.avatar}</span>
              <span className="font-semibold">{bestGuesser.name}</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">Fastest player with the most correct guesses</p>
          </div>
        )}

        {/* Continue button */}
        {isHost ? (
          <button
            onClick={handleContinue}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            See What the Judges Think →
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

  // Phase 2: Judge Banter - Ripley format
  if (revealPhase === 'banter') {
    const judges = showdown.judges || [];
    const banter = verdict.banter || {};

    return (
      <div className="max-w-md mx-auto mt-4">
        <div className="text-center mb-2">
          <p className="text-2xl font-bold text-slate-100">Round {round.round_number} of {TOTAL_ROUNDS}</p>
        </div>
        
        {/* Prompt */}
        <p className="text-xl text-slate-100 font-medium text-center leading-relaxed mb-4 px-2">
          {round.prompt_text}
        </p>

        {/* Ripley intro - same format as elsewhere */}
        <div className="bg-slate-800/80 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎙️</span>
            <div>
              <span className="text-orange-400 font-semibold">Ripley</span>
              <p className="text-slate-200 mt-1">
                The judges have thoughts. They always do.
              </p>
            </div>
          </div>
        </div>

        {/* Judge comments */}
        <div className="space-y-3 mb-6">
          {judges.length > 0 ? (
            judges.map((judge, index) => {
              const judgeComment = banter[judge.key] || "Still deliberating...";
              
              return (
                <div key={judge.key || index} className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{judge.emoji}</span>
                    <div>
                      <span className="text-slate-100 font-semibold">{judge.name}</span>
                      <p className="text-slate-300 text-sm mt-1">
                        {judgeComment}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-slate-400">Judges are deliberating...</p>
              <p className="text-slate-500 text-sm mt-2">(AI judging coming soon)</p>
            </div>
          )}
        </div>

        {/* Continue button */}
        {isHost ? (
          <button
            onClick={handleContinue}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            See Results →
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

        <div className="text-center mb-2">
          <p className="text-2xl font-bold text-slate-100">Round {round.round_number} of {TOTAL_ROUNDS}</p>
        </div>
        
        {/* Prompt */}
        <p className="text-xl text-slate-100 font-medium text-center leading-relaxed mb-6 px-2">
          {round.prompt_text}
        </p>

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
                {ranking.answer && (
                  <p className="text-slate-300 text-sm mt-2 ml-11">
                    {ranking.answer.slice(0, 100)}{ranking.answer.length > 100 ? '...' : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Judges Pick - Most X (judge award first) */}
        {bonusWinner && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <p className="text-slate-400 text-sm mb-1">Judges Pick for {bonusWinner.categoryDisplay} +1 point</p>
            <p className="text-slate-100">
              <span className="text-xl mr-2">{getPlayerDisplay(bonusWinner.playerId).avatar}</span>
              <span className="font-semibold">{getPlayerDisplay(bonusWinner.playerId).name}</span>
            </p>
          </div>
        )}

        {/* Best Who Said What (guessing bonus second) */}
        {round.best_guesser_id && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <p className="text-slate-400 text-sm mb-1">Best Who Said What +1 point</p>
            <p className="text-slate-100">
              <span className="text-xl mr-2">{getPlayerDisplay(round.best_guesser_id).avatar}</span>
              <span className="font-semibold">{getPlayerDisplay(round.best_guesser_id).name}</span>
            </p>
            <p className="text-slate-500 text-xs mt-1">Fastest player with the most correct guesses</p>
          </div>
        )}

        {/* Most Like The Judges (voting bonus third) */}
        {judgeWhisperers.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-slate-400 text-sm mb-1">Most Like The Judges +1 point{judgeWhisperers.length > 1 ? ' each' : ''}</p>
            <p className="text-slate-100">
              {judgeWhisperers.map(id => {
                const player = getPlayerDisplay(id);
                return `${player.avatar} ${player.name}`;
              }).join(', ')}
            </p>
            <p className="text-slate-500 text-xs mt-1">They picked the winning answer!</p>
          </div>
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
            {isLastRound ? 'See Who Won! 🏆' : 'See Standings →'}
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