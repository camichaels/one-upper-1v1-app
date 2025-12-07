import { useState } from 'react';
import { TOTAL_ROUNDS } from '../../services/showdown';

export default function ShowdownFinalStandings({ showdown, currentPlayer, isHost, onNewShowdown, onDone }) {
  const players = showdown.players || [];
  
  // Sort players by score
  const sortedPlayers = [...players].sort((a, b) => 
    (b.total_score || 0) - (a.total_score || 0)
  );

  // Get player display info
  function getPlayerDisplay(player) {
    return {
      name: player.guest_name || player.profile?.name || 'Player',
      avatar: player.guest_avatar || player.profile?.avatar || '😎'
    };
  }

  // Calculate actual placement (Olympic-style ties)
  function getPlacement(player) {
    const score = player.total_score || 0;
    return sortedPlayers.filter(p => (p.total_score || 0) > score).length + 1;
  }

  // Get medal or number based on placement
  function getMedalOrNumber(placement) {
    if (placement === 1) return <span className="text-2xl">🥇</span>;
    if (placement === 2) return <span className="text-2xl">🥈</span>;
    if (placement === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-slate-400 font-bold text-lg">{placement}.</span>;
  }

  // Calculate some fun stats
  const myPlayer = sortedPlayers.find(p => p.id === currentPlayer?.id);
  const myPlacement = myPlayer ? getPlacement(myPlayer) : null;

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">Final Standings</h1>
        <p className="text-slate-400">After {TOTAL_ROUNDS} rounds</p>
      </div>

      {/* Standings */}
      <div className="space-y-2 mb-6">
        {sortedPlayers.map((player) => {
          const { name, avatar } = getPlayerDisplay(player);
          const isMe = player.id === currentPlayer?.id;
          const placement = getPlacement(player);
          const isWinner = placement === 1;
          const score = player.total_score || 0;

          return (
            <div 
              key={player.id}
              className={`rounded-xl p-4 ${
                isWinner 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' 
                  : 'bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 text-center">
                    {getMedalOrNumber(placement)}
                  </span>
                  <span className="text-3xl">{avatar}</span>
                  <div>
                    <span className={`font-semibold ${isMe ? 'text-orange-400' : 'text-slate-100'}`}>
                      {name} {isMe && '(You)'}
                    </span>
                    {isWinner && (
                      <span className="ml-2 text-yellow-400 text-sm">👑 Champion</span>
                    )}
                  </div>
                </div>
                <span className={`font-bold text-xl ${isWinner ? 'text-yellow-400' : 'text-slate-200'}`}>
                  {score}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Your result message */}
      {myPlayer && (
        <div className="bg-slate-800/80 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎙️</span>
            <div className="text-left">
              <span className="text-orange-400 font-semibold">Ripley</span>
              <p className="text-slate-200 mt-1">
                {myPlacement === 1 
                  ? "Champion status! You one-upped everyone. Now the question is... can you do it again?"
                  : myPlacement === 2
                    ? "So close! Silver's nothing to sneeze at. You've got the skills, just need that extra edge."
                    : myPlacement === 3
                      ? "Bronze! You made the podium. Not too shabby for someone competing against these storytellers."
                      : "Not your day, but every champion started somewhere. Come back and show them what you've got!"
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3">
        {isHost ? (
          <>
            <button
              onClick={onNewShowdown}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              Start New Showdown
            </button>
            <button
              onClick={onDone}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onNewShowdown}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              Start My Own Showdown
            </button>
            <button
              onClick={onDone}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}