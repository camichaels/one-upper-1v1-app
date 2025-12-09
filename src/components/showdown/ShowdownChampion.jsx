import { useState, useEffect } from 'react';
import { generateShowdownRecap } from '../../services/showdown';

// Ripley quips for winners
const WINNER_QUIPS = [
  "Absolutely dominant!",
  "The One-Upper has been crowned!",
  "That's how it's done!",
  "You understood the assignment.",
  "Take a bow!",
  "The judges have spoken!",
  "Remember this moment.",
  "Champion energy right there.",
  "You came to play!",
  "Bow down, everyone.",
];

// Ripley quips for non-winners
const NON_WINNER_QUIPS = [
  "Tough crowd tonight!",
  "You'll get 'em next time.",
  "Hey, someone had to lose.",
  "The judges are harsh. We know.",
  "Shake it off.",
  "There's always next showdown.",
  "Not your night. It happens.",
  "The real win was the chaos we caused.",
  "Can't win 'em all.",
  "You made it weird. That counts.",
];

export default function ShowdownChampion({ showdown, currentPlayer, isHost, onContinue }) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [trophySettled, setTrophySettled] = useState(false);
  const [ripleyQuip] = useState(() => {
    // Will be set properly once we know if player is winner
    return '';
  });
  
  const players = showdown.players || [];
  
  // Sort players by score to find winner(s)
  const sortedPlayers = [...players].sort((a, b) => 
    (b.total_score || 0) - (a.total_score || 0)
  );
  
  const topScore = sortedPlayers[0]?.total_score || 0;
  const winners = sortedPlayers.filter(p => (p.total_score || 0) === topScore);
  const isMultipleWinners = winners.length > 1;
  const iAmWinner = winners.some(w => w.id === currentPlayer?.id);
  
  // Get my placement
  const myPlayer = players.find(p => p.id === currentPlayer?.id);
  const myPlacement = myPlayer ? getPlacement(myPlayer) : 999;

  // Pick a random Ripley quip based on winner status
  const [selectedQuip] = useState(() => {
    const pool = iAmWinner ? WINNER_QUIPS : NON_WINNER_QUIPS;
    return pool[Math.floor(Math.random() * pool.length)];
  });

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

  // Winner's name for non-winners to see
  const winnerName = winners.length === 1 
    ? getPlayerDisplay(winners[0]).name 
    : winners.map(w => getPlayerDisplay(w).name).join(' & ');

  // Pre-fetch recap in background so it's ready when user advances
  useEffect(() => {
    if (!showdown.recap) {
      // Start generating recap in background
      generateShowdownRecap(showdown.id).catch(err => {
        console.log('Background recap generation started:', err?.message || 'in progress');
      });
    }
  }, [showdown.id, showdown.recap]);

  // Start confetti for winner, trigger trophy settle animation
  useEffect(() => {
    if (iAmWinner) {
      setShowConfetti(true);
      // Trophy settles after 2 seconds
      const settleTimer = setTimeout(() => setTrophySettled(true), 2000);
      // Confetti stops after 5 seconds
      const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
      return () => {
        clearTimeout(settleTimer);
        clearTimeout(confettiTimer);
      };
    } else {
      // Non-winners see settled state immediately
      setTrophySettled(true);
    }
  }, [iAmWinner]);

  // Render placement indicator based on position
  function renderPlacementIndicator(placement, isLarge = false) {
    if (placement === 1) {
      return (
        <div className={`${isLarge ? 'text-7xl' : 'text-4xl'} ${isLarge && !trophySettled && iAmWinner ? 'animate-bounce' : ''}`}>
          🏆
        </div>
      );
    }
    if (placement === 2) {
      return <div className={isLarge ? 'text-6xl' : 'text-3xl'}>🥈</div>;
    }
    if (placement === 3) {
      return <div className={isLarge ? 'text-6xl' : 'text-3xl'}>🥉</div>;
    }
    // 4th and 5th get muted boxes
    return (
      <div className={`${isLarge ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-xl'} bg-slate-700/50 rounded-lg flex items-center justify-center text-slate-400 font-bold`}>
        {placement}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-4 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
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
          <style>{`
            @keyframes fall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
            .animate-fall { animation: fall linear forwards; }
          `}</style>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-grow flex flex-col justify-center text-center pb-4">
        
        {/* Placement indicator */}
        <div className="flex justify-center mb-3">
          {renderPlacementIndicator(myPlacement, true)}
        </div>

        {/* Title - different for winner vs others */}
        {iAmWinner ? (
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">
            You Won!
          </h1>
        ) : (
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            {isMultipleWinners ? `${winnerName} Tie!` : `${winnerName} Wins!`}
          </h1>
        )}

        {/* Show my info for non-winners */}
        {!iAmWinner && myPlayer && (
          <div className="mt-2 mb-4">
            <div className="text-3xl mb-1">{getPlayerDisplay(myPlayer).avatar}</div>
            <p className="text-orange-400 font-medium">{getPlayerDisplay(myPlayer).name}</p>
            <p className="text-slate-400 text-sm">{myPlayer.total_score || 0} points</p>
          </div>
        )}

        {/* Winner shows their avatar and score */}
        {iAmWinner && myPlayer && (
          <div className="mb-4">
            <div className="text-4xl mb-1">{getPlayerDisplay(myPlayer).avatar}</div>
            <p className="text-orange-400 font-medium text-lg">{getPlayerDisplay(myPlayer).name}</p>
            <p className="text-slate-400">{myPlayer.total_score || 0} points</p>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-4 mx-2">
          <div className="space-y-2">
            {sortedPlayers.map((player) => {
              const { name, avatar } = getPlayerDisplay(player);
              const isMe = player.id === currentPlayer?.id;
              const placement = getPlacement(player);
              const score = player.total_score || 0;
              const isWinner = placement === 1;
              
              return (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-2 rounded-lg ${isMe ? 'bg-slate-700/50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center">
                      {renderPlacementIndicator(placement, false)}
                    </div>
                    <span className="text-xl">{avatar}</span>
                    <span className={`font-medium ${isMe ? 'text-orange-400' : isWinner ? 'text-yellow-400' : 'text-slate-200'}`}>
                      {name}
                    </span>
                  </div>
                  <span className={`font-bold ${isWinner ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {score} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ripley quip */}
        <div className="bg-slate-800/80 rounded-xl p-4 mx-2 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎙️</span>
            <span className="text-orange-400 font-semibold text-sm">Ripley</span>
          </div>
          <p className="text-slate-300 text-sm">{selectedQuip}</p>
        </div>
      </div>

      {/* Continue button */}
      <div className="mt-auto">
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
    </div>
  );
}