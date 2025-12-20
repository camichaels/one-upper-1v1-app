import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

// ============================================
// FAKE DATA FOR TESTING
// ============================================

const FAKE_PLAYERS = [
  { id: 'p1', name: 'Craig', avatar: '🎃' },
  { id: 'p2', name: 'Sarah', avatar: '🦊' },
  { id: 'p3', name: 'Mike', avatar: '🤖' },
  { id: 'p4', name: 'Jen', avatar: '🦄' },
];

const FAKE_JUDGES = [
  { key: 'rockstar', name: 'Rockstar', emoji: '🎸' },
  { key: 'savage', name: 'Savage', emoji: '🔥' },
  { key: 'snoot', name: 'Snoot', emoji: '🎺' },
];

// Each judge's ranking of players (1st to 4th)
const FAKE_JUDGE_RANKINGS = {
  rockstar: ['p1', 'p3', 'p2', 'p4'], // Craig, Mike, Sarah, Jen
  savage: ['p2', 'p1', 'p4', 'p3'],   // Sarah, Craig, Jen, Mike
  snoot: ['p1', 'p2', 'p3', 'p4'],    // Craig, Sarah, Mike, Jen
};

const FAKE_JUDGE_ONE_LINERS = {
  rockstar: "Craig brought the chaos energy I needed!",
  savage: "Sarah's answer was deliciously unhinged.",
  snoot: "Finally, someone with actual wit.",
};

const FAKE_VERDICT = {
  winnerReactions: {
    rockstar: "That answer had main character energy.",
    savage: "Pure chaos. My favorite kind.",
    snoot: "Refined taste, excellent execution.",
  },
  lastPlaceRoast: "Jen's answer was so safe it wore a helmet.",
  mvpMoment: "Craig committed to the bit harder than anyone.",
  bonusWinner: {
    playerId: 'p2',
    category: "Biggest swing energy",
    playerName: 'Sarah',
  },
};

const FAKE_BEST_GUESSER = 'p3'; // Mike
const FAKE_JUDGE_WHISPERERS = ['p1', 'p2']; // Craig and Sarah predicted winner

// Points for placement: 1st=5, 2nd=3, 3rd=2, 4th=1
const PLACEMENT_POINTS = [5, 3, 2, 1, 0];

// Simulate all 5 rounds of data (with bonuses already included, realistic totals)
const ALL_ROUNDS_DATA = {
  1: { scores: { p1: 7, p2: 5, p3: 3, p4: 2 } },
  2: { scores: { p1: 6, p2: 7, p3: 4, p4: 2 } },
  3: { scores: { p1: 5, p2: 6, p3: 7, p4: 3 } },
  4: { scores: { p1: 7, p2: 4, p3: 5, p4: 3 } },
  5: { scores: { p1: 6, p2: 7, p3: 4, p4: 2 } },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate cumulative standings after revealing N judges
function calculateStandings(judgeKeys, judgeRankings) {
  const points = {};
  FAKE_PLAYERS.forEach(p => points[p.id] = 0);
  
  judgeKeys.forEach(judgeKey => {
    const rankings = judgeRankings[judgeKey];
    rankings.forEach((playerId, index) => {
      points[playerId] += PLACEMENT_POINTS[index] || 0;
    });
  });
  
  // Sort by points descending
  const sorted = Object.entries(points)
    .sort(([, a], [, b]) => b - a)
    .map(([playerId, pts], index) => ({
      playerId,
      points: pts,
      placement: index + 1,
    }));
  
  // Handle ties - give same placement to tied players
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].points === sorted[i - 1].points) {
      sorted[i].placement = sorted[i - 1].placement;
    }
  }
  
  return sorted;
}

// Get player by ID
function getPlayer(playerId) {
  return FAKE_PLAYERS.find(p => p.id === playerId) || { name: 'Unknown', avatar: '❓' };
}

// Truncate name to max length
function truncateName(name, maxLength = 8) {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '...';
}

// Get random tidbit
function getRandomTidbit() {
  const options = [
    { type: 'mvp', text: FAKE_VERDICT.mvpMoment },
    { type: 'roast', text: FAKE_VERDICT.lastPlaceRoast },
    { type: 'reaction', text: FAKE_VERDICT.winnerReactions.rockstar },
    { type: 'reaction', text: FAKE_VERDICT.winnerReactions.savage },
    { type: 'reaction', text: FAKE_VERDICT.winnerReactions.snoot },
  ];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================
// PROTOTYPE COMPONENT
// ============================================

export default function ShowdownRevealPrototype() {
  // Round selector for testing
  const [currentRoundNumber, setCurrentRoundNumber] = useState(2);
  
  // Current viewing player (for confetti logic)
  const [currentPlayerId] = useState('p1'); // Craig is "me"
  
  // Screen state: 'rankings', 'scores'
  const [screen, setScreen] = useState('rankings');
  
  // Rankings reveal animation state
  const [revealedJudges, setRevealedJudges] = useState([]);
  const [standings, setStandings] = useState(() => 
    FAKE_PLAYERS.map((p, i) => ({ playerId: p.id, points: 0, placement: i + 1 }))
  );
  const [showWinner, setShowWinner] = useState(false);
  const [leaderboardFlash, setLeaderboardFlash] = useState(false);
  
  const confettiRef = useRef(false);
  const [randomTidbit] = useState(() => getRandomTidbit());

  // ============================================
  // RANKINGS REVEAL ANIMATION
  // ============================================
  
  useEffect(() => {
    if (screen !== 'rankings') return;
    
    // Start with Judge 1 already revealed
    const judgeKeys = ['rockstar', 'savage', 'snoot'];
    const initialStandings = calculateStandings([judgeKeys[0]], FAKE_JUDGE_RANKINGS);
    
    setRevealedJudges([judgeKeys[0]]);
    setStandings(initialStandings);
    setShowWinner(false);
    confettiRef.current = false;
    
    const timers = [];
    
    // Start from Judge 2 (index 1)
    judgeKeys.slice(1).forEach((judgeKey, index) => {
      const actualIndex = index + 1; // Since we're starting from slice(1)
      const isLastJudge = actualIndex === judgeKeys.length - 1;
      const delay = (index + 1) * 2000; // 2s, 4s for judges 2 and 3
      
      timers.push(setTimeout(() => {
        setRevealedJudges(prev => [...prev, judgeKey]);
        
        // Flash leaderboard
        setLeaderboardFlash(true);
        
        // Update standings after flash
        setTimeout(() => {
          const revealedSoFar = judgeKeys.slice(0, actualIndex + 1);
          const newStandings = calculateStandings(revealedSoFar, FAKE_JUDGE_RANKINGS);
          setStandings(newStandings);
          
          setTimeout(() => {
            setLeaderboardFlash(false);
            
            // If last judge, show winner after a dramatic pause
            if (isLastJudge) {
              setTimeout(() => {
                setShowWinner(true);
                
                // Confetti for winner
                const winnerId = newStandings[0]?.playerId;
                if (winnerId === currentPlayerId && !confettiRef.current) {
                  confettiRef.current = true;
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.3 }
                  });
                }
              }, 800);
            }
          }, 300);
        }, 200);
        
      }, delay));
    });
    
    return () => timers.forEach(t => clearTimeout(t));
  }, [screen, currentPlayerId]);

  // ============================================
  // RENDER: RANKINGS REVEAL SCREEN
  // ============================================
  
  if (screen === 'rankings') {
    const finalStandings = calculateStandings(['rockstar', 'savage', 'snoot'], FAKE_JUDGE_RANKINGS);
    const winnerId = finalStandings[0]?.playerId;
    const winnerName = getPlayer(winnerId).name;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        {/* Header */}
        <div className="flex justify-center py-4 mb-4">
          <div className="text-2xl font-bold text-orange-500">ONE-UPPER 🎤</div>
        </div>
        
        <div className="max-w-md mx-auto">
          {/* Winner headline - appears immediately when Judge 3 tallied */}
          {showWinner && (
            <div className="text-center mb-4 animate-fade-in">
              <h2 className="text-xl font-bold text-orange-500">
                {winnerName} wins the round!
              </h2>
            </div>
          )}
          
          {/* Leaderboard - single box, centered content */}
          <div className={`rounded-xl p-4 mb-6 transition-all duration-150 ${
            leaderboardFlash ? 'bg-orange-500/30' : 'bg-slate-800/60'
          }`}>
            <div className="space-y-2 flex flex-col items-center">
              {[1, 2, 3, 4].map(placement => {
                const playersAtRank = standings.filter(s => s.placement === placement);
                
                return playersAtRank.map(standing => {
                  const player = getPlayer(standing.playerId);
                  const isMe = standing.playerId === currentPlayerId;
                  const standingCircle = ['①', '②', '③', '④', '⑤'][standing.placement - 1];
                  
                  const standingCircleColor = standing.placement === 1 ? 'text-yellow-400' :
                                  standing.placement === 2 ? 'text-slate-300' :
                                  standing.placement === 3 ? 'text-amber-600' :
                                  'text-slate-500';
                  
                  return (
                    <div 
                      key={standing.playerId}
                      className="flex items-center py-2 w-48 transition-all duration-500"
                    >
                      <span className={`text-xl w-10 ${standingCircleColor}`}>
                        {standingCircle}
                      </span>
                      <span className={`font-medium ${
                        isMe ? 'text-orange-400' : 'text-slate-100'
                      }`}>
                        {player.name}
                      </span>
                    </div>
                  );
                });
              })}
            </div>
          </div>
          
          {/* Judge cards - newest at top, stack down */}
          <div className="space-y-3 mb-6">
            {[...revealedJudges].reverse().map(judgeKey => {
              const judge = FAKE_JUDGES.find(j => j.key === judgeKey);
              const rankings = FAKE_JUDGE_RANKINGS[judgeKey];
              const oneLiner = FAKE_JUDGE_ONE_LINERS[judgeKey];
              
              return (
                <div 
                  key={judgeKey}
                  className="bg-slate-800/50 rounded-xl p-4 animate-slide-up"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{judge?.emoji}</span>
                    <span className="font-bold text-orange-400">{judge?.name}</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-2">{oneLiner}</p>
                  <div className="text-slate-400 text-sm">
                    {rankings.map((pid, i) => (
                      <span key={pid}>
                        {getPlayer(pid).name}
                        {i < rankings.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Continue button */}
          {showWinner && (
            <button
              onClick={() => setScreen('scores')}
              className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 transition-all animate-slide-up"
            >
              To the scores
            </button>
          )}
        </div>
        
        {/* Animation styles */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
          }
          .animate-slide-up {
            animation: slideUp 0.4s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  // ============================================
  // RENDER: SCORE TABLE SCREEN
  // ============================================
  
  if (screen === 'scores') {
    // Get previous rounds based on current round
    const previousRounds = [];
    for (let i = 1; i < currentRoundNumber; i++) {
      previousRounds.push({ roundNumber: i, scores: ALL_ROUNDS_DATA[i].scores });
    }
    
    // Current round scores come from the judge rankings calculation + bonuses
    const finalStandings = calculateStandings(['rockstar', 'savage', 'snoot'], FAKE_JUDGE_RANKINGS);
    
    // Add bonus points
    const roundScores = finalStandings.map(standing => {
      let bonus = 0;
      const bonusReasons = [];
      
      // Best guesser
      if (standing.playerId === FAKE_BEST_GUESSER) {
        bonus += 1;
        bonusReasons.push('Best Guesser');
      }
      
      // Judge whisperer
      if (FAKE_JUDGE_WHISPERERS.includes(standing.playerId)) {
        bonus += 1;
        bonusReasons.push('Predicted Winner');
      }
      
      // Bonus category winner
      if (standing.playerId === FAKE_VERDICT.bonusWinner.playerId) {
        bonus += 1;
        bonusReasons.push(FAKE_VERDICT.bonusWinner.category);
      }
      
      return {
        ...standing,
        basePoints: standing.points,
        bonus,
        totalRoundPoints: standing.points + bonus,
        bonusReasons,
      };
    });
    
    // Sort by total round points
    roundScores.sort((a, b) => b.totalRoundPoints - a.totalRoundPoints);
    
    // Recalculate placement after bonuses
    roundScores.forEach((score, index) => {
      score.placement = index + 1;
      if (index > 0 && score.totalRoundPoints === roundScores[index - 1].totalRoundPoints) {
        score.placement = roundScores[index - 1].placement;
      }
    });
    
    // Build cumulative scores including previous rounds
    const cumulativeScores = roundScores.map(score => {
      const prevRoundScores = previousRounds.map(r => r.scores[score.playerId] || 0);
      const prevTotal = prevRoundScores.reduce((sum, pts) => sum + pts, 0);
      
      return {
        ...score,
        previousRounds: prevRoundScores,
        cumulativeTotal: prevTotal + score.totalRoundPoints,
      };
    });
    
    // Sort by cumulative total
    cumulativeScores.sort((a, b) => b.cumulativeTotal - a.cumulativeTotal);
    
    // Recalculate final placement
    cumulativeScores.forEach((score, index) => {
      score.finalPlacement = index + 1;
      if (index > 0 && score.cumulativeTotal === cumulativeScores[index - 1].cumulativeTotal) {
        score.finalPlacement = cumulativeScores[index - 1].finalPlacement;
      }
    });
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        {/* Header */}
        <div className="flex justify-center py-4 mb-4">
          <div className="text-2xl font-bold text-orange-500">ONE-UPPER 🎤</div>
        </div>
        
        <div className="max-w-md mx-auto">
          {/* Round Selector for Testing */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map(round => (
              <button
                key={round}
                onClick={() => setCurrentRoundNumber(round)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  currentRoundNumber === round
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                R{round}
              </button>
            ))}
          </div>
          
          {/* Score Table - left justified, expands rightward */}
          <div className="bg-slate-800/60 rounded-xl p-4 mb-6 overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="text-left py-2 pr-3 w-6"></th>
                  <th className="text-left py-2 pr-4"></th>
                  {previousRounds.map((_, i) => (
                    <th key={i} className="text-left py-2 pr-3 w-10">R{i + 1}</th>
                  ))}
                  <th className="text-left py-2 pr-3 w-10 text-slate-100">R{currentRoundNumber}</th>
                  <th className="text-left py-2 text-orange-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {cumulativeScores.map(score => {
                  const player = getPlayer(score.playerId);
                  const isMe = score.playerId === currentPlayerId;
                  const circleNum = ['①', '②', '③', '④', '⑤'][score.finalPlacement - 1] || score.finalPlacement;
                  
                  // Circle color based on placement
                  const circleColor = score.finalPlacement === 1 ? 'text-yellow-400' :
                                      score.finalPlacement === 2 ? 'text-slate-300' :
                                      score.finalPlacement === 3 ? 'text-amber-600' :
                                      'text-slate-500';
                  
                  return (
                    <tr key={score.playerId} className={isMe ? 'text-orange-400' : 'text-slate-100'}>
                      <td className={`py-2 pr-2 text-left w-6 text-lg ${circleColor}`}>
                        {circleNum}
                      </td>
                      <td className="py-2 pr-4 font-medium whitespace-nowrap">{truncateName(player.name)}</td>
                      {score.previousRounds.map((pts, i) => (
                        <td key={i} className="py-2 pr-3 text-slate-400">{pts}</td>
                      ))}
                      <td className="py-2 pr-3 font-medium">{score.totalRoundPoints}</td>
                      <td className="py-2 font-bold">{score.cumulativeTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Bonus Points */}
          <div className="bg-slate-800/40 rounded-xl p-4 mb-4">
            <p className="text-slate-400 text-xs mb-3">Round {currentRoundNumber} Bonuses</p>
            <div className="space-y-2 text-sm">
              {FAKE_BEST_GUESSER && (
                <p className="text-slate-300">
                  🎯 Best Guesser: <span className="text-orange-400 font-medium">{getPlayer(FAKE_BEST_GUESSER).name}</span> (+1)
                </p>
              )}
              {FAKE_JUDGE_WHISPERERS.length > 0 && (
                <p className="text-slate-300">
                  🔮 Predicted Winner: <span className="text-orange-400 font-medium">{FAKE_JUDGE_WHISPERERS.map(id => getPlayer(id).name).join(', ')}</span> (+1 each)
                </p>
              )}
              {FAKE_VERDICT.bonusWinner && (
                <p className="text-slate-300">
                  🎪 {FAKE_VERDICT.bonusWinner.category}: <span className="text-orange-400 font-medium">{FAKE_VERDICT.bonusWinner.playerName}</span> (+1)
                </p>
              )}
            </div>
          </div>
          
          {/* Random tidbit - mic icon, no italics, no quotes */}
          <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
            <p className="text-slate-300 text-sm flex items-start gap-2">
              <span>🎙️</span>
              <span>{randomTidbit.text}</span>
            </p>
          </div>
          
          {/* Continue button */}
          <button
            onClick={() => {
              if (currentRoundNumber < 5) {
                setCurrentRoundNumber(currentRoundNumber + 1);
                setScreen('rankings');
              } else {
                alert('In real app: See Who Won! (Finale screen)');
              }
            }}
            className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-400 transition-all"
          >
            {currentRoundNumber < 5 ? `Onto Round ${currentRoundNumber + 1}` : 'See Who Won'}
          </button>
          
          {/* Reset for testing */}
          <button
            onClick={() => setScreen('rankings')}
            className="w-full py-3 mt-3 bg-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-600"
          >
            ↺ Back to Rankings
          </button>
        </div>
      </div>
    );
  }

  return null;
}