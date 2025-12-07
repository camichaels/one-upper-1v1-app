import { useState, useEffect } from 'react';

export default function ShowdownChampion({ showdown, currentPlayer, isHost, onContinue }) {
  const [showConfetti, setShowConfetti] = useState(true);
  
  const players = showdown.players || [];
  
  // Sort players by score to find winner(s)
  const sortedPlayers = [...players].sort((a, b) => 
    (b.total_score || 0) - (a.total_score || 0)
  );
  
  const topScore = sortedPlayers[0]?.total_score || 0;
  const winners = sortedPlayers.filter(p => (p.total_score || 0) === topScore);
  const isMultipleWinners = winners.length > 1;
  const iAmWinner = winners.some(w => w.id === currentPlayer?.id);

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

  // Get medal emoji for placement
  function getMedal(placement) {
    if (placement === 1) return '🥇';
    if (placement === 2) return '🥈';
    if (placement === 3) return '🥉';
    return `${placement}.`;
  }

  // Stop confetti after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-md mx-auto mt-4 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Confetti */}
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

      {/* Top 3/4: Winner Spotlight */}
      <div className="flex-grow flex flex-col justify-center text-center pb-4">
        {/* Trophy */}
        <div className="text-7xl mb-2 animate-bounce">🏆</div>

        {/* Winner announcement */}
        {isMultipleWinners ? (
          <>
            <h1 className="text-2xl font-bold text-yellow-400 mb-2">
              It's a Tie!
            </h1>
            
            {/* Multiple winners - horizontal */}
            <div className="flex justify-center gap-4 mb-4">
              {winners.map(winner => {
                const { name, avatar } = getPlayerDisplay(winner);
                const isMe = winner.id === currentPlayer?.id;
                return (
                  <div key={winner.id} className="text-center">
                    <span className="text-4xl block mb-1">{avatar}</span>
                    <span className={`font-bold ${isMe ? 'text-orange-400' : 'text-yellow-400'}`}>
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-slate-400 text-sm">{topScore} points each</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-yellow-400 mb-1">
              {iAmWinner ? 'You Won!' : 'Champion'}
            </h1>
            
            {/* Single winner */}
            {winners[0] && (
              <>
                <div className="text-5xl mb-2">
                  {getPlayerDisplay(winners[0]).avatar}
                </div>
                <h2 className={`text-2xl font-bold ${iAmWinner ? 'text-orange-400' : 'text-yellow-400'}`}>
                  {getPlayerDisplay(winners[0]).name}
                </h2>
                <p className="text-slate-400">
                  {topScore} points
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom 1/4: Compact Standings + Button */}
      <div className="mt-auto">
        {/* Compact standings - horizontal row */}
        <div className="bg-slate-800/60 rounded-xl p-3 mb-4">
          <div className="flex justify-around items-center">
            {sortedPlayers.map((player) => {
              const { name, avatar } = getPlayerDisplay(player);
              const isMe = player.id === currentPlayer?.id;
              const placement = getPlacement(player);
              const score = player.total_score || 0;
              
              return (
                <div key={player.id} className="text-center px-1">
                  <div className="text-sm mb-1">{getMedal(placement)}</div>
                  <div className="text-xl">{avatar}</div>
                  <div className={`text-xs font-medium truncate max-w-16 ${isMe ? 'text-orange-400' : 'text-slate-300'}`}>
                    {name.split(' ')[0]}
                  </div>
                  <div className="text-xs text-slate-500">{score}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Continue button */}
        {isHost ? (
          <button
            onClick={onContinue}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
          >
            See Highlights →
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