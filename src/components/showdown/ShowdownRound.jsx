import { useState, useEffect, useCallback } from 'react';
import Header from '../Header';
import ShowdownMenu from './ShowdownMenu';
import ShowdownPrompt from './ShowdownPrompt';
import ShowdownWaiting from './ShowdownWaiting';
import ShowdownGuessing from './ShowdownGuessing';
import ShowdownReveal from './ShowdownReveal';
import ShowdownLeaderboard from './ShowdownLeaderboard';
import { 
  getCurrentRound,
  submitAnswer,
  updateRoundStatus,
  updateShowdownStatus,
  endShowdown,
  leaveShowdown,
  judgeRound,
  TOTAL_ROUNDS
} from '../../services/showdown';

export default function ShowdownRound({ showdown, currentPlayer, onShowdownUpdate }) {
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track what phase of the round we're in locally for the current player
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [hasSubmittedGuesses, setHasSubmittedGuesses] = useState(false);

  const isHost = currentPlayer?.is_host;

  // Load current round data
  const loadRound = useCallback(async () => {
    try {
      const roundData = await getCurrentRound(showdown.id);
      if (roundData) {
        setRound(roundData);
        
        // Check if current player has already submitted answer for THIS round
        const myAnswer = roundData.answers?.find(a => a.player_id === currentPlayer?.id);
        setHasSubmittedAnswer(!!myAnswer?.submitted_at);
        
        // Reset guesses state for new round
        // (check if we have guesses submitted would go here)
        setHasSubmittedGuesses(false);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load round:', err);
      setError('Failed to load round');
      setLoading(false);
    }
  }, [showdown.id, currentPlayer?.id]);

  // Initial load and when round number changes
  useEffect(() => {
    // Reset local state when round changes
    setHasSubmittedAnswer(false);
    setHasSubmittedGuesses(false);
    loadRound();
  }, [showdown.current_round]);

  // Reload round data when showdown updates (real-time triggers this)
  // Use a ref to track if we should reload
  useEffect(() => {
    // This effect runs when showdown object changes (via real-time)
    // Reload round to pick up status changes
    if (showdown.current_round && round) {
      loadRound();
    }
  }, [showdown]); // Intentionally depend on showdown object

  // Handle answer submission
  async function handleSubmitAnswer(answerText) {
    if (!round || !currentPlayer) return;
    
    try {
      await submitAnswer(round.id, currentPlayer.id, answerText);
      setHasSubmittedAnswer(true);
      await loadRound(); // Refresh to see updated answers
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer');
    }
  }

  // Handle host advancing to guessing phase
  async function handleStartGuessing() {
    if (!round || !isHost) return;
    
    try {
      await updateRoundStatus(round.id, 'guessing');
      await loadRound();
    } catch (err) {
      console.error('Failed to start guessing phase:', err);
    }
  }

  // Handle guesses submitted
  function handleGuessesSubmitted() {
    setHasSubmittedGuesses(true);
  }

  // Handle host advancing to reveal - triggers AI judging
  async function handleStartReveal() {
    if (!round || !isHost) return;
    
    try {
      // First update status to revealing
      await updateRoundStatus(round.id, 'revealing');
      
      // Trigger AI judging in background
      judgeRound(round.id).catch(err => {
        console.error('AI judging failed:', err);
        // Continue anyway - UI will show placeholder rankings
      });
      
      await loadRound();
    } catch (err) {
      console.error('Failed to start reveal:', err);
    }
  }

  // Handle host advancing to leaderboard (or finale on last round)
  async function handleShowLeaderboard() {
    if (!round || !isHost) return;
    
    const isLastRound = round.round_number >= TOTAL_ROUNDS;
    
    try {
      if (isLastRound) {
        // Skip leaderboard on last round - go straight to finale
        await updateShowdownStatus(showdown.id, 'complete');
      } else {
        // Normal rounds show leaderboard
        await updateRoundStatus(round.id, 'complete');
        await loadRound();
      }
    } catch (err) {
      console.error('Failed to advance:', err);
    }
  }

  // Leave/End handlers
  async function handleLeave() {
    try {
      if (currentPlayer) {
        await leaveShowdown(currentPlayer.id, showdown.id);
      }
      sessionStorage.removeItem('showdown_player_id');
      window.location.href = '/showdown';
    } catch (err) {
      console.error('Failed to leave:', err);
      sessionStorage.removeItem('showdown_player_id');
      window.location.href = '/showdown';
    }
  }

  async function handleEndShowdown() {
    try {
      await endShowdown(showdown.id);
      sessionStorage.removeItem('showdown_player_id');
      window.location.href = '/showdown';
    } catch (err) {
      console.error('Failed to end showdown:', err);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto text-center mt-8">
          <p className="text-slate-400">Loading round...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !round) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto text-center mt-8">
          <p className="text-red-400">{error || 'Round not found'}</p>
        </div>
      </div>
    );
  }

  // Calculate submission status
  const totalPlayers = showdown.players?.length || 0;
  const submittedAnswers = round.answers?.filter(a => a.submitted_at)?.length || 0;
  const allAnswersIn = submittedAnswers === totalPlayers;

  // Route to correct sub-component based on round status
  const renderRoundPhase = () => {
    switch (round.status) {
      case 'answering':
        if (hasSubmittedAnswer) {
          return (
            <ShowdownWaiting
              round={round}
              showdown={showdown}
              currentPlayer={currentPlayer}
              isHost={isHost}
              allAnswersIn={allAnswersIn}
              onStartGuessing={handleStartGuessing}
            />
          );
        }
        return (
          <ShowdownPrompt
            round={round}
            showdown={showdown}
            currentPlayer={currentPlayer}
            onSubmit={handleSubmitAnswer}
          />
        );

      case 'guessing':
        if (hasSubmittedGuesses) {
          return (
            <ShowdownWaiting
              round={round}
              showdown={showdown}
              currentPlayer={currentPlayer}
              isHost={isHost}
              phase="guessing"
              onStartReveal={handleStartReveal}
            />
          );
        }
        return (
          <ShowdownGuessing
            round={round}
            showdown={showdown}
            currentPlayer={currentPlayer}
            onSubmit={handleGuessesSubmitted}
          />
        );

      case 'revealing':
      case 'judging':
        return (
          <ShowdownReveal
            round={round}
            showdown={showdown}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onShowLeaderboard={handleShowLeaderboard}
          />
        );

      case 'complete':
        return (
          <ShowdownLeaderboard
            round={round}
            showdown={showdown}
            currentPlayer={currentPlayer}
            isHost={isHost}
            onShowdownUpdate={onShowdownUpdate}
          />
        );

      default:
        return (
          <div className="max-w-md mx-auto text-center mt-8">
            <p className="text-slate-400">Unknown round status: {round.status}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      <ShowdownMenu
        isHost={isHost}
        onLeave={handleLeave}
        onEndShowdown={handleEndShowdown}
      />
      
      {renderRoundPhase()}
    </div>
  );
}