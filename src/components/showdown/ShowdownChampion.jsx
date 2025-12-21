import { useState, useEffect } from 'react';
import { generateShowdownRecap } from '../../services/showdown';

// Ripley quips - same pool for everyone, about the showdown overall
const RIPLEY_QUIPS = [
  "What a showdown!",
  "The judges have spoken!",
  "That was a battle.",
  "Everyone brought their A-game.",
  "Some real creativity out there.",
  "The scores don't lie.",
  "That's a wrap!",
  "Until next time...",
  "You all made it weird. That counts.",
  "Champions are made in moments like these.",
  "The crowd goes wild!",
  "History has been made.",
  "Take notes, everyone.",
];

export default function ShowdownChampion({ showdown, currentPlayer, isHost, onContinue }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [trophySettled, setTrophySettled] = useState(false);
  
  const players = showdown.players || [];
  
  // Sort players by score to find winner(s)
  const sortedPlayers = [...players].sort((a, b) => 
    (b.total_score || 0) - (a.total_score || 0)
  );
  
  const topScore = sortedPlayers[0]?.total_score || 0;
  const winners = sortedPlayers.filter(p => (p.total_score || 0) === topScore);
  const isMultipleWinners = winners.length > 1;
  const iAmWinner = winners.some(w => w.id === currentPlayer?.id);

  // Pick a consistent Ripley quip based on showdown id
  const selectedQuip = RIPLEY_QUIPS[showdown.id?.charCodeAt(0) % RIPLEY_QUIPS.length] || RIPLEY_QUIPS[0];

  // Get player display info
  function getPlayerDisplay(player) {
    return {
      name: player.guest_name || player.profile?.name || 'Player',
      avatar: player.guest_avatar || player.profile?.avatar || '😎'
    };
  }

  // Calculate placement (Olympic-style ties)
  function getPlacement(player) {
    const score = player.total_score || 0;
    return sortedPlayers.filter(p => (p.total_score || 0) > score).length + 1;
  }

  // Winner's name for headline
  const winnerName = winners.length === 1 
    ? getPlayerDisplay(winners[0]).name 
    : winners.map(w => getPlayerDisplay(w).name).join(' & ');

  // Pre-fetch recap in background so it's ready when user advances
  useEffect(() => {
    if (!showdown.recap) {
      generateShowdownRecap(showdown.id).catch(err => {
        console.log('Background recap generation started:', err?.message || 'in progress');
      });
    }
  }, [showdown.id, showdown.recap]);

  // Start confetti for winner only, trigger trophy settle animation
  useEffect(() => {
    if (iAmWinner) {
      setShowConfetti(true);
      const settleTimer = setTimeout(() => setTrophySettled(true), 2000);
      const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
      return () => {
        clearTimeout(settleTimer);
        clearTimeout(confettiTimer);
      };
    } else {
      setTrophySettled(true);
    }
  }, [iAmWinner]);

  // Get placement indicator
  function getPlacementIcon(placement) {
    if (placement === 1) return '🏆';
    if (placement === 2) return '🥈';
    if (placement === 3) return '🥉';
    // Circle numbers for 4th and 5th
    const circleNumbers = ['④', '⑤', '⑥', '⑦', '⑧'];
    return circleNumbers[placement - 4] || `${placement}`;
  }

  // Get card background based on placement
  function getCardBg(placement) {
    if (placement === 1) return 'bg-yellow-500/20';
    if (placement === 2) return 'bg-slate-400/20';
    if (placement === 3) return 'bg-amber-700/20';
    return 'bg-slate-800/30';
  }

  // Calculate animation delays
  const lastPlayerDelay = 500 + ((sortedPlayers.length - 1) * 200);
  const ripleyDelay = lastPlayerDelay + 600;
  const buttonDelay = ripleyDelay + 400;

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Confetti - winner only */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(80)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
                fontSize: `${14 + Math.random() * 16}px`,
              }}
            >
              {['🎉', '✨', '⭐', '🌟', '💫', '🎊', '🏆', '👑'][Math.floor(Math.random() * 8)]}
            </div>
          ))}
        </div>
      )}

      {/* Trophy - winner only, appears immediately */}
      {iAmWinner && (
        <div 
          className={`text-center mb-2 ${!trophySettled ? 'animate-bounce' : ''}`}
        >
          <span className="text-7xl">🏆</span>
        </div>
      )}

      {/* Headline - same for everyone */}
      <h1 
        className="text-2xl font-bold text-center mb-6 animate-reveal"
        style={{ animationDelay: iAmWinner ? '300ms' : '0ms' }}
      >
        <span className={iAmWinner ? 'text-yellow-400' : 'text-slate-100'}>
          {isMultipleWinners ? `${winnerName} Tie!` : `${winnerName} Wins!`}
        </span>
      </h1>

      {/* Player cards - each shaded by placement */}
      <div className="space-y-2 mb-6">
        {sortedPlayers.map((player, index) => {
          const { name, avatar } = getPlayerDisplay(player);
          const placement = getPlacement(player);
          const score = player.total_score || 0;
          const delay = 500 + (index * 200);
          
          return (
            <div
              key={player.id}
              className={`rounded-xl p-3 animate-reveal ${getCardBg(placement)}`}
              style={{ animationDelay: `${delay}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${placement > 3 ? 'text-slate-500' : ''}`}>
                    {getPlacementIcon(placement)}
                  </span>
                  <span className="text-xl">{avatar}</span>
                  <span className={`font-medium ${
                    placement === 1 ? 'text-yellow-400' : 'text-slate-100'
                  }`}>
                    {name}
                  </span>
                </div>
                <span className={`font-bold ${
                  placement === 1 ? 'text-yellow-400' : 'text-slate-300'
                }`}>
                  {score} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ripley quip */}
      <div 
        className="bg-slate-800/50 rounded-xl p-4 mb-6 animate-reveal"
        style={{ animationDelay: `${ripleyDelay}ms` }}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">🎙️</span>
          <div>
            <span className="text-orange-400 font-semibold text-sm">Ripley</span>
            <p className="text-slate-300 text-sm mt-1">{selectedQuip}</p>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <div 
        className="animate-reveal"
        style={{ animationDelay: `${buttonDelay}ms` }}
      >
        {isHost ? (
          <button
            onClick={onContinue}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            Let's Go Deeper
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
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
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
        .animate-fall { 
          animation: fall linear forwards; 
        }
        .animate-reveal {
          opacity: 0;
          animation: reveal 0.4s ease-out forwards;
        }
        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}