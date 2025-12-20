import { useState, useEffect } from 'react';
import { submitGuessesAndVote, TOTAL_ROUNDS } from '../../services/showdown';

export default function ShowdownGuessing({ round, showdown, currentPlayer, onSubmit }) {
  const [guesses, setGuesses] = useState({});
  const [selectedAnswerId, setSelectedAnswerId] = useState(null); // For matching UI
  const [vote, setVote] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const [shuffledAnswers, setShuffledAnswers] = useState([]);
  const [shuffledVoteAnswers, setShuffledVoteAnswers] = useState([]);
  const [shuffledPlayers, setShuffledPlayers] = useState([]);
  const [revealStage, setRevealStage] = useState(0);

  const players = showdown.players || [];
  const answers = round.answers || [];

  // Shuffle answers and players on mount
  useEffect(() => {
    const otherAnswers = answers.filter(a => a.player_id !== currentPlayer?.id);
    const myAnswer = answers.find(a => a.player_id === currentPlayer?.id);
    
    // Shuffle other answers for "Who said it"
    const shuffledOthers = [...otherAnswers].sort(() => Math.random() - 0.5);
    
    // Add my answer at the end
    if (myAnswer) {
      shuffledOthers.push(myAnswer);
    }
    
    setShuffledAnswers(shuffledOthers);

    // Separate shuffle for "Which will judges pick" (all answers, different order)
    const allAnswersShuffled = [...answers].sort(() => Math.random() - 0.5);
    setShuffledVoteAnswers(allAnswersShuffled);

    // Shuffle other players for the picker
    const otherPlayers = players.filter(p => p.id !== currentPlayer?.id);
    setShuffledPlayers([...otherPlayers].sort(() => Math.random() - 0.5));
  }, [answers, players, currentPlayer?.id]);

  // Reveal animation on mount
  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealStage(1), 100),   // Prompt visible
      setTimeout(() => setRevealStage(2), 300),   // Timer visible
      setTimeout(() => setRevealStage(3), 500),   // "Who said it?" label
      setTimeout(() => setRevealStage(4), 700),   // Answer cards start
      setTimeout(() => setRevealStage(5), 700 + (shuffledAnswers.length * 150) + 200), // Player chips
      setTimeout(() => setRevealStage(6), 700 + (shuffledAnswers.length * 150) + 500), // "Who wins" section
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, [shuffledAnswers.length]);

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
        const hasAnyGuesses = Object.keys(guesses).length > 0;
        if (hasAnyGuesses && vote) {
          handleSubmit(true);
        } else {
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

  // Get players not yet assigned
  function getAvailablePlayers() {
    const assignedPlayerIds = Object.values(guesses).filter(Boolean);
    return shuffledPlayers.filter(p => !assignedPlayerIds.includes(p.id));
  }

  // Handle tapping an answer card (for matching)
  function handleAnswerTap(answerId) {
    const answer = shuffledAnswers.find(a => a.id === answerId);
    if (answer?.player_id === currentPlayer?.id) return; // Can't select your own
    
    if (selectedAnswerId === answerId) {
      setSelectedAnswerId(null); // Deselect
    } else {
      setSelectedAnswerId(answerId);
    }
  }

  // Handle tapping a player chip to assign
  function handlePlayerAssign(playerId) {
    if (!selectedAnswerId) return;
    
    const newGuesses = {
      ...guesses,
      [selectedAnswerId]: playerId
    };
    
    // Auto-slot: if only one player left and one answer left, assign automatically
    const assignedPlayerIds = Object.values(newGuesses).filter(Boolean);
    const remainingPlayers = shuffledPlayers.filter(p => !assignedPlayerIds.includes(p.id));
    const unassignedAnswers = otherAnswers.filter(a => !newGuesses[a.id]);
    
    if (remainingPlayers.length === 1 && unassignedAnswers.length === 1) {
      newGuesses[unassignedAnswers[0].id] = remainingPlayers[0].id;
    }
    
    setGuesses(newGuesses);
    setSelectedAnswerId(null);
  }

  // Handle removing an assignment
  function handleRemoveAssignment(answerId) {
    setGuesses(prev => {
      const updated = { ...prev };
      delete updated[answerId];
      return updated;
    });
  }

  // Check if all guesses are complete
  const otherAnswers = shuffledAnswers.filter(a => a.player_id !== currentPlayer?.id);
  const allGuessesComplete = otherAnswers.every(a => guesses[a.id]);
  const canSubmit = allGuessesComplete && vote && !isSubmitting;

  async function handleSubmit(isAuto = false) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
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
  const availablePlayers = getAvailablePlayers();

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Timer */}
      <div className={`text-center mb-4 transition-all duration-500 ${
        revealStage >= 1 ? 'opacity-100' : 'opacity-0'
      } ${isLowTime ? 'animate-pulse' : ''}`}>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
          isLowTime ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-300'
        }`}>
          <span>⏱️</span>
          <span className={`text-lg font-mono font-bold ${isLowTime ? 'text-red-400' : ''}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
      </div>

      {/* Prompt */}
      <p className={`text-xl text-slate-100 font-bold text-center leading-relaxed mb-6 px-2 transition-all duration-500 ${
        revealStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}>
        {round.prompt_text}
      </p>

      {/* Who said it section */}
      <p className={`text-slate-100 font-semibold mb-3 transition-all duration-500 ${
        revealStage >= 3 ? 'opacity-100' : 'opacity-0'
      }`}>
        Who said it?
      </p>
      
      <div className="space-y-3 mb-4">
        {shuffledAnswers.map((answer, index) => {
          const isMyAnswer = answer.player_id === currentPlayer?.id;
          const assignedPlayerId = guesses[answer.id];
          const assignedPlayer = players.find(p => p.id === assignedPlayerId);
          const isSelected = selectedAnswerId === answer.id;
          
          // Stagger the reveal of each answer card
          const cardDelay = 700 + (index * 150);
          const isVisible = revealStage >= 4 && Date.now() > cardDelay;

          return (
            <div
              key={answer.id}
              onClick={() => !isMyAnswer && !assignedPlayerId && handleAnswerTap(answer.id)}
              className={`bg-slate-800/50 rounded-xl p-4 transition-all duration-300 ${
                revealStage >= 4 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              } ${
                isMyAnswer 
                  ? 'border border-slate-700' 
                  : isSelected
                    ? 'border-2 border-orange-500 bg-orange-500/10 cursor-pointer'
                    : assignedPlayerId
                      ? 'border border-green-500/50 bg-green-500/5'
                      : 'border border-slate-700 hover:border-slate-500 cursor-pointer'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-slate-100 leading-relaxed flex-1">
                  {answer.answer_text || '[no answer]'}
                </p>
                
                {isMyAnswer ? (
                  <span className="text-green-400 text-sm font-medium whitespace-nowrap shrink-0">✓ You</span>
                ) : assignedPlayer ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAssignment(answer.id);
                    }}
                    className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 rounded-full px-2 py-1 text-sm transition-colors shrink-0"
                  >
                    <span>{getPlayerDisplay(assignedPlayer).avatar}</span>
                    <span className="text-slate-200">{getPlayerDisplay(assignedPlayer).name}</span>
                    <span className="text-slate-400 ml-1">×</span>
                  </button>
                ) : isSelected ? (
                  <span className="text-orange-400 text-sm whitespace-nowrap shrink-0">Pick below ↓</span>
                ) : (
                  <span className="text-slate-500 text-sm whitespace-nowrap shrink-0">Tap to match</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Available players to assign */}
      {(selectedAnswerId || availablePlayers.length > 0) && (
        <div className={`mb-6 transition-all duration-500 ${
          revealStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {selectedAnswerId ? (
            <>
              <p className="text-slate-400 text-sm mb-2">Tap a player:</p>
              <div className="flex flex-wrap gap-2">
                {availablePlayers.map(player => {
                  const { name, avatar } = getPlayerDisplay(player);
                  return (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerAssign(player.id)}
                      className="flex items-center gap-2 bg-slate-700 hover:bg-orange-500 text-slate-100 rounded-full px-3 py-2 transition-colors"
                    >
                      <span className="text-lg">{avatar}</span>
                      <span className="font-medium">{name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : availablePlayers.length > 0 ? (
            <>
              <p className="text-slate-500 text-sm mb-2">Unmatched:</p>
              <div className="flex flex-wrap gap-2">
                {availablePlayers.map(player => {
                  const { name, avatar } = getPlayerDisplay(player);
                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 bg-slate-800 text-slate-400 rounded-full px-3 py-2"
                    >
                      <span className="text-lg">{avatar}</span>
                      <span>{name}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* All matched indicator */}
      {allGuessesComplete && (
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 text-green-400 text-sm">
            <span>✓</span>
            <span>All matched!</span>
          </span>
        </div>
      )}

      {/* Which will judges pick section */}
      <p className={`text-slate-100 font-semibold mb-3 transition-all duration-500 ${
        revealStage >= 6 ? 'opacity-100' : 'opacity-0'
      }`}>
        Predict the judges' favorite
      </p>
      
      <div className={`space-y-2 mb-6 transition-all duration-500 ${
        revealStage >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        {shuffledVoteAnswers.map((answer) => {
          const isSelected = vote === answer.id;

          return (
            <button
              key={answer.id}
              onClick={() => setVote(answer.id)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                isSelected 
                  ? 'bg-orange-500/20 border-2 border-orange-500 scale-[1.02]' 
                  : 'bg-slate-800/50 border border-slate-700 hover:border-slate-500'
              }`}
            >
              <p className={`leading-relaxed ${isSelected ? 'text-orange-100' : 'text-slate-200'}`}>
                {answer.answer_text || '[no answer]'}
              </p>
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