import { useState, useEffect } from 'react';
import { startRound, updateShowdownStatus, getShowdownRounds, TOTAL_ROUNDS } from '../../services/showdown';

// Truncate name to max length
function truncateName(name, maxLength = 8) {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '...';
}

export default function ShowdownLeaderboard({ round, showdown, currentPlayer, isHost, onShowdownUpdate }) {
  const [isStartingNext, setIsStartingNext] = useState(false);
  const [allRounds, setAllRounds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const players = showdown.players || [];
  const currentRound = round.round_number;
  const isLastRound = currentRound >= TOTAL_ROUNDS;
  const verdict = round.verdict || {};

  // Circle numbers for rankings
  const circleNumbers = ['①', '②', '③', '④', '⑤'];

  // Get circle color based on placement
  function getCircleColor(placement) {
    if (placement === 1) return 'text-yellow-400';
    if (placement === 2) return 'text-slate-300';
    if (placement === 3) return 'text-amber-600';
    return 'text-slate-500';
  }

  // Headlines based on game state - uses round number for deterministic selection
  const HEADLINES = {
    blowout: [ // Leader ahead by 5+
      "{leader} is absolutely cooking right now",
      "Is this even a competition? {leader} says no",
      "{leader} came to play and it shows",
      "{leader} making it look easy",
      "Somebody stop {leader}",
    ],
    tight: [ // Gap of 2 or less
      "This one's going down to the wire",
      "Anyone's game at this point",
      "Too close to call",
      "Nail-biter alert",
      "The tension is palpable",
    ],
    comfortable: [ // Gap of 3-4
      "{leader} sitting pretty... for now",
      "The pack is hungry and {leader} knows it",
      "{leader} has some breathing room",
      "Comfortable but not safe",
    ],
    earlyLead: [ // Round 1-2
      "{leader} draws first blood",
      "Early lead for {leader}",
      "{leader} off to a hot start",
      "And we're off!",
    ],
    lateGame: [ // Round 4-5
      "Final stretch!",
      "It's now or never",
      "Last chances coming up",
      "Crunch time",
    ],
  };

  function getHeadline(leaderName, leaderScore, secondScore, roundNum) {
    const gap = leaderScore - secondScore;
    
    // Determine which headline pool to use
    let pool;
    if (roundNum <= 2) {
      pool = HEADLINES.earlyLead;
    } else if (roundNum >= 4) {
      pool = gap <= 2 ? HEADLINES.tight : HEADLINES.lateGame;
    } else if (gap >= 5) {
      pool = HEADLINES.blowout;
    } else if (gap <= 2) {
      pool = HEADLINES.tight;
    } else {
      pool = HEADLINES.comfortable;
    }
    
    // Use round number as seed for deterministic selection
    const index = roundNum % pool.length;
    return pool[index].replace('{leader}', leaderName);
  }

  // Fetch all rounds to build score history
  useEffect(() => {
    async function loadRounds() {
      try {
        const rounds = await getShowdownRounds(showdown.id);
        setAllRounds(rounds || []);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load rounds:', err);
        setIsLoading(false);
      }
    }
    loadRounds();
  }, [showdown.id, currentRound]);

  // Get player display info
  function getPlayerDisplay(player) {
    return {
      name: player.guest_name || player.profile?.name || 'Player',
      avatar: player.guest_avatar || player.profile?.avatar || '😎'
    };
  }

  // Calculate per-round scores for each player
  function calculateRoundScores() {
    const playerScores = {};
    
    // Initialize all players
    players.forEach(p => {
      playerScores[p.id] = {
        playerId: p.id,
        roundScores: [],
        cumulativeTotal: 0
      };
    });

    // Calculate scores from each round
    allRounds.forEach((r) => {
      const v = r.verdict || {};
      const rankings = v.rankings || [];
      const judgeWhisperers = v.judgeWhisperers || [];
      const bonusWinner = v.bonusWinner;
      const bestGuesserId = r.best_guesser_id;
      
      // Placement points: 1st=5, 2nd=3, 3rd=2, 4th=1, 5th=0
      const placementPoints = [5, 3, 2, 1, 0];
      
      players.forEach(p => {
        let roundTotal = 0;
        
        // Find this player in rankings
        const playerRanking = rankings.find(rank => rank.playerId === p.id);
        if (playerRanking) {
          // Use placement (1-indexed) to get points
          const placementIndex = playerRanking.placement - 1;
          roundTotal += placementPoints[placementIndex] || 0;
        }
        
        // Bonus: Best Guesser
        if (bestGuesserId === p.id) {
          roundTotal += 1;
        }
        
        // Bonus: Judge Whisperer (predicted winner)
        if (judgeWhisperers.includes(p.id)) {
          roundTotal += 1;
        }
        
        // Bonus: AI bonus category
        if (bonusWinner?.playerId === p.id) {
          roundTotal += 1;
        }
        
        playerScores[p.id].roundScores.push(roundTotal);
        playerScores[p.id].cumulativeTotal += roundTotal;
      });
    });
    
    return Object.values(playerScores);
  }

  // Sort players by cumulative total and assign placements
  const playerScores = calculateRoundScores();
  const sortedScores = [...playerScores].sort((a, b) => b.cumulativeTotal - a.cumulativeTotal);
  
  // Assign placements (handle ties)
  sortedScores.forEach((score, index) => {
    if (index === 0) {
      score.placement = 1;
    } else if (score.cumulativeTotal === sortedScores[index - 1].cumulativeTotal) {
      score.placement = sortedScores[index - 1].placement;
    } else {
      score.placement = index + 1;
    }
  });

  // Get random tidbit from verdict
  function getRandomTidbit() {
    const tidbits = [];
    
    if (verdict.mvpMoment) {
      tidbits.push(verdict.mvpMoment);
    }
    if (verdict.lastPlaceRoast) {
      tidbits.push(verdict.lastPlaceRoast);
    }
    if (verdict.winnerReactions && Array.isArray(verdict.winnerReactions)) {
      tidbits.push(...verdict.winnerReactions);
    }
    
    if (tidbits.length === 0) {
      return null;
    }
    
    // Use round number as seed for consistent selection
    const index = currentRound % tidbits.length;
    return tidbits[index];
  }

  const randomTidbit = getRandomTidbit();

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

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-4 text-center">
        <p className="text-slate-400">Loading scores...</p>
      </div>
    );
  }

  // Calculate headline from sorted scores
  const leaderName = sortedScores[0] 
    ? getPlayerDisplay(players.find(p => p.id === sortedScores[0].playerId) || {}).name 
    : 'Someone';
  const leaderScore = sortedScores[0]?.cumulativeTotal || 0;
  const secondScore = sortedScores[1]?.cumulativeTotal || 0;
  const headline = getHeadline(leaderName, leaderScore, secondScore, currentRound);

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Headline */}
      <h2 className="text-xl font-bold text-orange-400 text-center mb-4">
        {headline}
      </h2>

      {/* Score Table - left justified, expands rightward */}
      <div className="bg-slate-800/60 rounded-xl p-4 mb-6 overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="text-slate-400 text-xs">
              <th className="text-left py-2 pr-3 w-6"></th>
              <th className="text-left py-2 pr-4"></th>
              {allRounds.slice(0, currentRound).map((_, i) => (
                <th 
                  key={i} 
                  className={`text-left py-2 pr-3 w-10 ${
                    i === currentRound - 1 ? 'text-slate-100' : 'text-slate-400'
                  }`}
                >
                  R{i + 1}
                </th>
              ))}
              <th className="text-left py-2 text-orange-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.map(score => {
              const player = players.find(p => p.id === score.playerId);
              if (!player) return null;
              
              const { name } = getPlayerDisplay(player);
              const circleNum = circleNumbers[score.placement - 1] || score.placement;
              
              return (
                <tr key={score.playerId} className="text-slate-100">
                  <td className={`py-2 pr-2 text-left w-6 text-lg ${getCircleColor(score.placement)}`}>
                    {circleNum}
                  </td>
                  <td className="py-2 pr-4 font-medium whitespace-nowrap">
                    {truncateName(name)}
                  </td>
                  {score.roundScores.map((pts, i) => (
                    <td 
                      key={i} 
                      className={`py-2 pr-3 ${
                        i === currentRound - 1 ? 'font-medium text-slate-100' : 'text-slate-400'
                      }`}
                    >
                      {pts}
                    </td>
                  ))}
                  <td className="py-2 font-bold">{score.cumulativeTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tidbit */}
      {randomTidbit && (
        <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
          <p className="text-slate-300 text-sm flex items-start gap-2">
            <span>🎙️</span>
            <span>{randomTidbit}</span>
          </p>
        </div>
      )}

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
              ? 'See Who Won' 
              : `Onto Round ${currentRound + 1}`
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