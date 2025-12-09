import { useState, useEffect } from 'react';
import { getCurrentRound, getGuessSubmissions } from '../../services/showdown';

// Randomized "answer submitted" lines
const ANSWER_SUBMITTED_LINES = [
  "Locked In!",
  "You're In!",
  "Bold Move.",
  "Nailed It.",
];

// Randomized "guesses submitted" lines
const GUESSES_SUBMITTED_LINES = [
  "Picks Locked In!",
  "Guesses In!",
  "You've Made Your Calls.",
];

// Ripley anticipation lines
const RIPLEY_ANTICIPATION_LINES = [
  "I can cut the tension with a chainsaw.",
  "Someone's about to be embarrassed.",
  "This is my favorite part.",
  "Place your bets.",
  "I've seen the answers. No spoilers.",
  "This should be interesting.",
  "Oh, this is gonna be good.",
  "I already have a favorite.",
  "Somebody went bold. Somebody didn't.",
];

function getRandomLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

export default function ShowdownWaiting({ 
  round: initialRound, 
  showdown, 
  currentPlayer, 
  isHost, 
  phase = 'answering',
  allAnswersIn = false,
  onStartGuessing,
  onStartReveal
}) {
  const [round, setRound] = useState(initialRound);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [guessSubmitters, setGuessSubmitters] = useState([]);
  
  // Randomize lines once on mount
  const [answerSubmittedLine] = useState(() => getRandomLine(ANSWER_SUBMITTED_LINES));
  const [guessesSubmittedLine] = useState(() => getRandomLine(GUESSES_SUBMITTED_LINES));
  const [ripleyLine] = useState(() => getRandomLine(RIPLEY_ANTICIPATION_LINES));

  // Poll for answer updates during answering phase
  useEffect(() => {
    if (phase !== 'answering') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const updatedRound = await getCurrentRound(showdown.id);
        if (updatedRound) {
          setRound(updatedRound);
        }
      } catch (err) {
        console.error('Failed to poll for answers:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [showdown.id, phase]);

  // Poll for guess submissions during guessing phase
  useEffect(() => {
    if (phase !== 'guessing') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const submitters = await getGuessSubmissions(round.id);
        setGuessSubmitters(submitters);
      } catch (err) {
        console.error('Failed to poll for guesses:', err);
      }
    }, 2000); // Poll every 2 seconds

    // Initial fetch
    getGuessSubmissions(round.id).then(setGuessSubmitters);

    return () => clearInterval(pollInterval);
  }, [round.id, phase]);

  // Update round when prop changes
  useEffect(() => {
    setRound(initialRound);
  }, [initialRound]);

  // Calculate time remaining based on phase
  useEffect(() => {
    const deadline = phase === 'answering' 
      ? round.answers_due_at 
      : round.guessing_due_at;
    
    if (!deadline) return;

    const deadlineTime = new Date(deadline).getTime();

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((deadlineTime - now) / 1000));
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [round.answers_due_at, round.guessing_due_at, phase]);

  // Format time as M:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get player display info
  function getPlayerDisplay(player) {
    const name = player.guest_name || player.profile?.name || 'Player';
    const avatar = player.guest_avatar || player.profile?.avatar || '😎';
    return { name, avatar };
  }

  const isLowTime = timeRemaining <= 10;
  const timeExpired = timeRemaining === 0;
  const players = showdown.players || [];

  // Count REAL submissions (not empty auto-submits) for answering phase
  const realAnswerCount = round.answers?.filter(a => 
    a.submitted_at && a.answer_text && a.answer_text !== '[no answer]'
  )?.length || 0;
  const totalPlayers = players.length;

  // Get submission status with time awareness
  const getSubmissionStatus = (player) => {
    if (phase === 'answering') {
      const answer = round.answers?.find(a => a.player_id === player.id);
      // Check if they actually submitted something (not just auto-submitted empty)
      const hasRealAnswer = answer?.submitted_at && answer?.answer_text && answer.answer_text !== '[no answer]';
      if (hasRealAnswer) return 'submitted';
      if (answer?.submitted_at && (!answer?.answer_text || answer.answer_text === '[no answer]')) return 'missed';
      if (timeExpired) return 'missed';
      return 'writing';
    }
    // For guessing phase - check if player has submitted guesses
    if (guessSubmitters.includes(player.id)) return 'submitted';
    if (timeExpired) return 'missed';
    return 'guessing';
  };

  // Calculate everyoneIn based on phase - only count real submissions
  const everyoneInAnswers = realAnswerCount === totalPlayers;
  const everyoneInGuesses = guessSubmitters.length === totalPlayers;
  const everyoneIn = phase === 'answering' ? everyoneInAnswers : everyoneInGuesses;

  // Dynamic header text
  const getHeaderText = () => {
    if (everyoneIn) return "Everyone's in!";
    if (timeExpired) return "That's a wrap!";
    return "Waiting for others...";
  };

  // Show Ripley + button when ready
  const showReadyState = everyoneIn || timeExpired;

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Success message */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-orange-400">
          {phase === 'answering' ? answerSubmittedLine : guessesSubmittedLine}
        </h2>
        <p className="text-slate-400 mt-1">{getHeaderText()}</p>
      </div>

      {/* Player status list */}
      <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
        <div className="space-y-3">
          {players.map((player) => {
            const { name, avatar } = getPlayerDisplay(player);
            const status = getSubmissionStatus(player);
            const isMe = player.id === currentPlayer?.id;

            return (
              <div 
                key={player.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{avatar}</span>
                  <span className={`font-medium ${isMe ? 'text-orange-400' : 'text-slate-200'}`}>
                    {name} {isMe && '(You)'}
                  </span>
                </div>
                <div>
                  {status === 'submitted' ? (
                    <span className="text-green-400">Submitted</span>
                  ) : status === 'missed' ? (
                    <span className="text-red-400">{phase === 'answering' ? "Didn't answer" : "Didn't guess"}</span>
                  ) : status === 'writing' ? (
                    <span className="text-slate-400">Writing...</span>
                  ) : status === 'guessing' ? (
                    <span className="text-slate-400">Guessing...</span>
                  ) : (
                    <span className="text-slate-400">Waiting...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ripley anticipation line - always show */}
      <div className="bg-slate-800/80 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎙️</span>
          <span className="text-orange-400 font-semibold text-sm">Ripley</span>
        </div>
        <p className="text-slate-300 text-sm">
          {ripleyLine}
        </p>
      </div>

      {/* Timer - only show if time remaining */}
      {timeRemaining > 0 && (
        <div className={`text-center mb-6 ${isLowTime ? 'animate-pulse' : ''}`}>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
            isLowTime ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-300'
          }`}>
            <span className="text-lg">⏱️</span>
            <span className={`text-2xl font-mono font-bold ${isLowTime ? 'text-red-400' : ''}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      )}

      {/* Host controls */}
      {isHost && phase === 'answering' && showReadyState && (
        <button
          onClick={onStartGuessing}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          Who Said What?
        </button>
      )}

      {isHost && phase === 'guessing' && showReadyState && (
        <button
          onClick={onStartReveal}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          Who Wrote What?
        </button>
      )}

      {/* Non-host: show disabled button instead of text */}
      {!isHost && showReadyState && (
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