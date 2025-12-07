import { useState, useEffect } from 'react';
import { startRound, updateShowdownStatus, TOTAL_ROUNDS } from '../../services/showdown';

export default function ShowdownLeaderboard({ round, showdown, currentPlayer, isHost, onShowdownUpdate }) {
  const [isStartingNext, setIsStartingNext] = useState(false);

  const players = showdown.players || [];
  const currentRound = round.round_number;
  const isLastRound = currentRound >= TOTAL_ROUNDS;

  // Sort players by total score
  const sortedPlayers = [...players].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

  // Get player display info
  function getPlayerDisplay(player) {
    return {
      name: player.guest_name || player.profile?.name || 'Player',
      avatar: player.guest_avatar || player.profile?.avatar || '😎'
    };
  }

  // Calculate position change indicator (would need previous standings to be accurate)
  function getPositionIndicator(player, index) {
    // For now, just show position
    return null;
  }

  // Ripley commentary based on standings
  function getRipleyCommentary() {
    if (sortedPlayers.length < 2) return "Let's see how this plays out.";
    
    const leader = sortedPlayers[0];
    const second = sortedPlayers[1];
    const gap = (leader.total_score || 0) - (second.total_score || 0);
    
    if (isLastRound) {
      return "That's a wrap! Time for the final results.";
    }
    
    if (gap === 0) {
      return "It's a tie at the top! Anyone's game.";
    } else if (gap >= 5) {
      return `${getPlayerDisplay(leader).name} is running away with it. Can anyone catch up?`;
    } else if (gap <= 2) {
      return "This is tight! Every point matters now.";
    }
    
    return `${getPlayerDisplay(leader).name} leads, but there's plenty of game left.`;
  }

  async function handleNextRound() {
    if (!isHost) return;
    setIsStartingNext(true);
    
    try {
      await startRound(showdown.id, currentRound + 1);
      // Real-time will pick up the new round
    } catch (err) {
      console.error('Failed to start next round:', err);
      setIsStartingNext(false);
    }
  }

  async function handleSeeResults() {
    if (!isHost) return;
    setIsStartingNext(true);
    
    try {
      await updateShowdownStatus(showdown.id, 'complete');
      // Real-time will trigger navigation to recap
    } catch (err) {
      console.error('Failed to complete showdown:', err);
      setIsStartingNext(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-100">
          Standings after Round {currentRound}
        </h2>
      </div>

      {/* Leaderboard - individual shaded rows */}
      <div className="space-y-2 mb-6">
        {sortedPlayers.map((player, index) => {
          const { name, avatar } = getPlayerDisplay(player);
          const isMe = player.id === currentPlayer?.id;
          const score = player.total_score || 0;
          
          // Calculate actual placement (Olympic-style ties)
          // If tied with someone above, get their placement
          let placement = 1;
          for (let i = 0; i < index; i++) {
            if ((sortedPlayers[i].total_score || 0) > score) {
              placement = i + 2; // +2 because we want 1-indexed and we're comparing to people above
            }
          }
          // Simpler: count how many people have MORE points than you, add 1
          placement = sortedPlayers.filter(p => (p.total_score || 0) > score).length + 1;
          
          const isLeader = placement === 1;
          
          // Get medal or number based on placement
          const getMedalOrNumber = () => {
            if (placement === 1) return <span className="text-xl">🥇</span>;
            if (placement === 2) return <span className="text-xl">🥈</span>;
            if (placement === 3) return <span className="text-xl">🥉</span>;
            return <span className="text-slate-400 font-bold">{placement}.</span>;
          };

          return (
            <div 
              key={player.id}
              className={`rounded-xl p-4 ${
                isLeader 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' 
                  : 'bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center">
                    {getMedalOrNumber()}
                  </span>
                  <span className="text-2xl">{avatar}</span>
                  <span className={`font-medium ${isMe ? 'text-orange-400' : 'text-slate-100'}`}>
                    {name} {isMe && '(You)'}
                  </span>
                </div>
                <span className={`font-bold text-lg ${isLeader ? 'text-yellow-400' : 'text-slate-200'}`}>
                  {score} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ripley commentary */}
      <div className="bg-slate-800/80 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🎙️</span>
          <span className="text-orange-400 font-semibold text-sm">Ripley</span>
        </div>
        <p className="text-slate-200 text-sm">
          {getRipleyCommentary()}
        </p>
      </div>

      {/* Next round / Final results button */}
      {isHost ? (
        <button
          onClick={isLastRound ? handleSeeResults : handleNextRound}
          disabled={isStartingNext}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          {isStartingNext 
            ? 'Loading...' 
            : isLastRound 
              ? 'See Final Results →' 
              : `Start Round ${currentRound + 1} →`
          }
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