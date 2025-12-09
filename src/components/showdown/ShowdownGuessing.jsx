import { useState, useEffect } from 'react';
import { submitGuessesAndVote, TOTAL_ROUNDS } from '../../services/showdown';

export default function ShowdownGuessing({ round, showdown, currentPlayer, onSubmit }) {
  const [guesses, setGuesses] = useState({});
  const [vote, setVote] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(45);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);

  const players = showdown.players || [];
  const answers = round.answers || [];

  // Shuffle answers on mount (but keep order stable)
  useEffect(() => {
    const otherAnswers = answers.filter(a => a.player_id !== currentPlayer?.id);
    const myAnswer = answers.find(a => a.player_id === currentPlayer?.id);
    
    // Shuffle other answers
    const shuffled = [...otherAnswers].sort(() => Math.random() - 0.5);
    
    // Add my answer at the end (not in dropdown)
    if (myAnswer) {
      shuffled.push(myAnswer);
    }
    
    setShuffledAnswers(shuffled);
  }, [answers, currentPlayer?.id]);

  // Timer countdown
  useEffect(() => {
    if (!round.guessing_due_at) return;

    const deadline = new Date(round.guessing_due_at).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0 && !hasAutoSubmitted) {
        setHasAutoSubmitted(true);
        // Only auto-submit if they have at least one guess AND a vote
        const hasAnyGuesses = Object.keys(guesses).length > 0;
        if (hasAnyGuesses && vote) {
          handleSubmit(true);
        } else {
          // No submission, but still move to waiting screen
          onSubmit();
        }
      }
    }, 100);

    return () => clearInterval(timer);
  }, [round.guessing_due_at, hasAutoSubmitted, guesses, vote]);

  // Get player display info
  function getPlayerDisplay(player) {
    const name = player.guest_name || player.profile?.name || 'Player';
    const avatar = player.guest_avatar || player.profile?.avatar || '😎';
    return { name, avatar };
  }

  // Get players available for a dropdown (not already assigned elsewhere)
  function getAvailablePlayers(currentAnswerId) {
    const assignedPlayerIds = Object.entries(guesses)
      .filter(([answerId, playerId]) => answerId !== currentAnswerId && playerId)
      .map(([_, playerId]) => playerId);

    return players.filter(p => 
      p.id !== currentPlayer?.id && // Not yourself
      !assignedPlayerIds.includes(p.id) // Not already assigned
    );
  }

  // Handle guess selection
  function handleGuessChange(answerId, playerId) {
    setGuesses(prev => ({
      ...prev,
      [answerId]: playerId
    }));
  }

  // Check if all guesses are complete
  const otherAnswers = shuffledAnswers.filter(a => a.player_id !== currentPlayer?.id);
  const allGuessesComplete = otherAnswers.every(a => guesses[a.id]);
  const canSubmit = allGuessesComplete && vote && !isSubmitting;

  async function handleSubmit(isAuto = false) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Format guesses for API
      const guessArray = Object.entries(guesses).map(([answerId, playerId]) => ({
        answerId,
        guessedPlayerId: playerId
      }));

      await submitGuessesAndVote(round.id, currentPlayer.id, guessArray, vote);
      onSubmit();
    } catch (err) {
      console.error('Submit error:', err);
      setIsSubmitting(false);
    }
  }

  // Format time as M:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining <= 10;

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Header - smaller, orange */}
      <div className="text-center mb-3">
        <p className="text-sm font-medium text-orange-400">Round {round.round_number} of {TOTAL_ROUNDS}</p>
      </div>
      
      {/* Prompt - bold */}
      <p className="text-xl text-slate-100 font-bold text-center leading-relaxed mb-4 px-2">
        {round.prompt_text}
      </p>

      {/* Timer */}
      <div className={`text-center mb-6 ${isLowTime ? 'animate-pulse' : ''}`}>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
          isLowTime ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-300'
        }`}>
          <span>⏱️</span>
          <span className={`text-lg font-mono font-bold ${isLowTime ? 'text-red-400' : ''}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Who wrote what section */}
      <p className="text-slate-100 font-semibold mb-3">Who wrote what?</p>
      
      <div className="bg-slate-800/50 rounded-xl overflow-hidden mb-6">
        {shuffledAnswers.map((answer, index) => {
          const isMyAnswer = answer.player_id === currentPlayer?.id;
          const availablePlayers = getAvailablePlayers(answer.id);
          const selectedPlayerId = guesses[answer.id];
          const selectedPlayer = players.find(p => p.id === selectedPlayerId);

          return (
            <div 
              key={answer.id}
              className="p-4"
            >
              {/* Answer text */}
              <p className="text-slate-100 mb-3 leading-relaxed">
                {answer.answer_text || '[no answer]'}
              </p>

              {isMyAnswer ? (
                <div className="flex items-center gap-2 text-orange-400 text-sm">
                  <span>★</span>
                  <span>Yours</span>
                </div>
              ) : (
                <div>
                  <select
                    value={selectedPlayerId || ''}
                    onChange={(e) => handleGuessChange(answer.id, e.target.value || null)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500 text-sm"
                  >
                    <option value="">Select a player...</option>
                    {/* Show currently selected player first if assigned */}
                    {selectedPlayer && (
                      <option value={selectedPlayer.id}>
                        {getPlayerDisplay(selectedPlayer).avatar} {getPlayerDisplay(selectedPlayer).name}
                      </option>
                    )}
                    {/* Show available players */}
                    {availablePlayers
                      .filter(p => p.id !== selectedPlayerId)
                      .map(player => {
                        const { name, avatar } = getPlayerDisplay(player);
                        return (
                          <option key={player.id} value={player.id}>
                            {avatar} {name}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pick the winner section */}
      <p className="text-slate-100 font-semibold mb-3">Pick the judges' favorite</p>
      
      <div className="bg-slate-800/50 rounded-xl overflow-hidden mb-6">
        {shuffledAnswers.map((answer, index) => {
          const isSelected = vote === answer.id;

          return (
            <button
              key={answer.id}
              onClick={() => setVote(answer.id)}
              className={`w-full text-left p-4 transition-colors ${
                isSelected 
                  ? 'bg-orange-500/20' 
                  : 'hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                  isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-500'
                }`}>
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs">✓</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {answer.answer_text?.slice(0, 60) || '[no answer]'}{answer.answer_text?.length > 60 ? '...' : ''}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit button */}
      <button
        onClick={() => handleSubmit(false)}
        disabled={!canSubmit}
        className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
      >
        {isSubmitting ? 'Locking In...' : 'Lock It In'}
      </button>
    </div>
  );
}