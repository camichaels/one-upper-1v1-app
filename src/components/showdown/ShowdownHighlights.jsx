import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateShowdownRecap, TOTAL_ROUNDS, getShowdownRounds } from '../../services/showdown';

// Player Recap Carousel Component
function PlayerRecapCarousel({ recaps, animationDelay }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const goNext = () => setCurrentIndex((currentIndex + 1) % recaps.length);
  const goPrev = () => setCurrentIndex((currentIndex - 1 + recaps.length) % recaps.length);
  
  const pr = recaps[currentIndex];
  if (!pr) return null;
  
  return (
    <div 
      className="animate-reveal"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Card with arrows inside */}
      <div className="bg-slate-800/50 rounded-xl p-4 relative">
        {/* Left arrow - vertically centered */}
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Right arrow - vertically centered */}
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        
        {/* Content - with left/right margin for arrows */}
        <div className="mx-6">
          {/* Name + Title */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{pr.avatar}</span>
            <span className="font-bold text-slate-100">{pr.player}</span>
          </div>
          <p className="text-orange-400 font-medium text-sm mb-1">{pr.title}</p>
          <p className="text-slate-300 text-sm mb-3">{pr.roast}</p>
          
          {/* Divider */}
          <div className="border-t border-slate-700/50 my-3"></div>
          
          {/* Psych Take */}
          <div className="flex items-start gap-2">
            <span className="text-sm">🛋️</span>
            <p className="text-slate-400 text-sm">{pr.psychTake}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ripley loading quips
const LOADING_QUIPS = [
  "Let me find the best moments...",
  "This showdown had some doozies...",
  "Reviewing the chaos...",
  "So much to unpack here...",
  "The judges are still talking about this one...",
  "Compiling the greatest hits...",
  "This is gonna be good...",
];

export default function ShowdownHighlights({ showdown, currentPlayer }) {
  const [recap, setRecap] = useState(showdown.recap || null);
  const [isLoading, setIsLoading] = useState(!showdown.recap);
  const [showRoundByRound, setShowRoundByRound] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [loadingQuip] = useState(() => 
    LOADING_QUIPS[Math.floor(Math.random() * LOADING_QUIPS.length)]
  );
  const navigate = useNavigate();

  const players = showdown.players || [];
  const sortedPlayers = [...players].sort((a, b) => 
    (b.total_score || 0) - (a.total_score || 0)
  );

  // Build player map for lookups
  const playerMap = {};
  players.forEach(p => {
    playerMap[p.id] = {
      name: p.guest_name || p.profile?.name || 'Player',
      avatar: p.guest_avatar || p.profile?.avatar || '😎'
    };
  });

  // Load recap and rounds
  useEffect(() => {
    async function loadData() {
      // Load rounds for full results
      try {
        const roundsData = await getShowdownRounds(showdown.id);
        setRounds(roundsData || []);
      } catch (err) {
        console.error('Failed to load rounds:', err);
      }

      // Load recap if not present
      if (!recap) {
        try {
          const result = await generateShowdownRecap(showdown.id);
          if (result?.recap) {
            setRecap(result.recap);
          }
        } catch (err) {
          console.error('Failed to generate recap:', err);
        }
      }
      setIsLoading(false);
    }
    loadData();
  }, [showdown.id]);

  // Check if recap arrived via real-time update
  useEffect(() => {
    if (showdown.recap && !recap) {
      setRecap(showdown.recap);
      setIsLoading(false);
    }
  }, [showdown.recap]);

  // Get player display info
  function getPlayerDisplay(player) {
    if (!player) return { name: 'Unknown', avatar: '❓' };
    return {
      name: player.guest_name || player.profile?.name || 'Player',
      avatar: player.guest_avatar || player.profile?.avatar || '😎'
    };
  }

  // Get placement icon
  function getPlacementIcon(placement) {
    if (placement === 1) return '🥇';
    if (placement === 2) return '🥈';
    if (placement === 3) return '🥉';
    const circleNumbers = ['④', '⑤', '⑥', '⑦', '⑧'];
    return circleNumbers[placement - 4] || `${placement}.`;
  }

  function handleNewShowdown() {
    sessionStorage.removeItem('showdown_player_id');
    navigate('/showdown');
  }

  function handleDone() {
    sessionStorage.removeItem('showdown_player_id');
    navigate('/');
  }

  function getShareText() {
    const sharePrompt = recap?.sharePrompt || "What's your best one-upper moment?";
    return `I just played One-Upper with friends! 🏆

How would you answer: "${sharePrompt}"

Think you can one-up us?
https://oneupper.app`;
  }

  function handleCopyShare() {
    navigator.clipboard?.writeText(getShareText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleTextShare() {
    const text = encodeURIComponent(getShareText());
    window.open(`sms:?&body=${text}`, '_blank');
    setShowShareModal(false);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-4 flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-4xl mb-4 animate-bounce">🎙️</div>
        <p className="text-slate-400 text-center">{loadingQuip}</p>
      </div>
    );
  }

  // No recap fallback
  if (!recap) {
    return (
      <div className="max-w-md mx-auto mt-4">
        <p className="text-slate-400 text-center mb-6">Couldn't load the recap. But hey, you played!</p>
        <button
          onClick={handleNewShowdown}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          Start New Showdown
        </button>
      </div>
    );
  }

  // Render Round by Round content
  function renderRoundByRound() {
    return (
      <div className="mt-4 space-y-4">
        {/* Round cards */}
        {rounds.map((round) => {
          const answers = round.answers || [];
          const verdict = round.verdict || {};
          const rankings = verdict.rankings || [];
          
          // Sort answers by placement
          const sortedAnswers = [...answers].sort((a, b) => {
            const aRank = rankings.find(r => r.playerId === a.player_id)?.placement || 99;
            const bRank = rankings.find(r => r.playerId === b.player_id)?.placement || 99;
            return aRank - bRank;
          });

          return (
            <div key={round.id} className="bg-slate-700/20 rounded-lg p-3">
              <h4 className="text-orange-400 text-sm font-semibold mb-1">
                Round {round.round_number}
              </h4>
              <p className="text-slate-400 text-xs mb-2">
                {round.prompt_text}
              </p>
              <div className="space-y-1">
                {sortedAnswers.map((answer, idx) => {
                  const player = playerMap[answer.player_id];
                  const placement = rankings.find(r => r.playerId === answer.player_id)?.placement || idx + 1;
                  const icon = getPlacementIcon(placement);
                  
                  return (
                    <div key={answer.id} className="flex items-start gap-2 text-sm">
                      <span className="w-6 text-center flex-shrink-0">{icon}</span>
                      <span className="text-slate-300 flex-1 break-words">
                        <span className="text-slate-400">{player?.name}:</span> {answer.answer_text || '[crickets]'}
                      </span>
                    </div>
                  );
                })}
              </div>
              {verdict.bonusWinner && (
                <p className="text-slate-500 text-xs mt-2">
                  {verdict.bonusWinner.categoryDisplay} → {playerMap[verdict.bonusWinner.playerId]?.name}
                </p>
              )}
            </div>
          );
        })}

        {/* Score table */}
        <div className="bg-slate-700/20 rounded-lg p-3">
          <h4 className="text-orange-400 text-sm font-semibold mb-3">Final Scores</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs">
                <th className="text-left pb-2"></th>
                <th className="text-left pb-2"></th>
                {rounds.map((_, i) => (
                  <th key={i} className="text-center pb-2 px-1">R{i + 1}</th>
                ))}
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, idx) => {
                const { name, avatar } = getPlayerDisplay(player);
                const placement = idx + 1;
                const icon = getPlacementIcon(placement);
                
                // Get round scores
                const roundScores = rounds.map(round => {
                  const verdict = round.verdict || {};
                  const rankings = verdict.rankings || [];
                  const ranking = rankings.find(r => r.playerId === player.id);
                  return ranking?.totalPoints || 0;
                });

                return (
                  <tr key={player.id} className="text-slate-300">
                    <td className="py-1 pr-1">{icon}</td>
                    <td className="py-1 pr-2 font-medium whitespace-nowrap">
                      {name.length > 10 ? name.slice(0, 10) + '...' : name}
                    </td>
                    {roundScores.map((score, i) => (
                      <td key={i} className="py-1 text-center text-slate-400 px-1">{score}</td>
                    ))}
                    <td className="py-1 text-right font-bold">{player.total_score || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Share Modal
  function renderShareModal() {
    if (!showShareModal) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Share Results</h3>
          
          {/* Preview */}
          <div className="bg-slate-700/50 rounded-xl p-4 mb-4 text-sm text-slate-300 whitespace-pre-line">
            {getShareText()}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleCopyShare}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
            
            <button
              onClick={handleTextShare}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Share via Text
            </button>
            
            <button
              onClick={() => setShowShareModal(false)}
              className="w-full text-slate-400 hover:text-slate-300 font-medium py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate animation delays
  const storyDelay = 0;
  const oneUpDelay = 400;
  const playerRecapsStartDelay = 800;
  const finalThoughtsDelay = playerRecapsStartDelay + 600;
  const roundByRoundDelay = finalThoughtsDelay + 300;
  const buttonsDelay = roundByRoundDelay + 300;

  return (
    <div className="max-w-md mx-auto mt-4 pb-6">
      {/* Share Modal */}
      {renderShareModal()}

      {/* The Story */}
      {recap.narrative && (
        <div 
          className="mb-8 animate-reveal"
          style={{ animationDelay: `${storyDelay}ms` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎙️</span>
            <span className="text-orange-400 font-semibold text-sm">The Story</span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">
            {recap.narrative}
          </p>
        </div>
      )}

      {/* The One-Up */}
      {recap.theOneUp && (
        <div 
          className="mb-8 animate-reveal"
          style={{ animationDelay: `${oneUpDelay}ms` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎤</span>
            <span className="text-orange-400 font-semibold text-sm">The One-Up</span>
          </div>
          
          <p className="text-2xl font-bold text-slate-100 mb-2">
            {recap.theOneUp.answer}
          </p>
          <p className="text-slate-400 text-sm mb-3">
            — {recap.theOneUp.player}
          </p>
          
          <p className="text-slate-500 text-xs mb-2">
            Responding to: {recap.theOneUp.prompt}
          </p>
          <p className="text-slate-300 text-sm">
            {recap.theOneUp.commentary}
          </p>
        </div>
      )}

      {/* Player Recaps - Carousel */}
      {recap.playerRecaps?.length > 0 && (
        <div className="mb-8">
          <PlayerRecapCarousel 
            recaps={recap.playerRecaps} 
            animationDelay={playerRecapsStartDelay}
          />
        </div>
      )}

      {/* Final Thoughts */}
      {recap.finalThoughts && (
        <div 
          className="mb-8 animate-reveal"
          style={{ animationDelay: `${finalThoughtsDelay}ms` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎙️</span>
            <span className="text-orange-400 font-semibold text-sm">Final Thoughts</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            {recap.finalThoughts}
          </p>
        </div>
      )}

      {/* Round by Round (expandable) */}
      <div 
        className="mb-6 animate-reveal"
        style={{ animationDelay: `${roundByRoundDelay}ms` }}
      >
        <button
          onClick={() => setShowRoundByRound(!showRoundByRound)}
          className="w-full flex items-center justify-between bg-slate-800/40 rounded-xl p-3 text-slate-300 hover:bg-slate-800/60 transition-colors"
        >
          <span className="font-medium">Round by Round</span>
          <svg 
            className={`w-5 h-5 transition-transform ${showRoundByRound ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showRoundByRound && (
          <div className="bg-slate-800/40 rounded-b-xl px-4 pb-4 -mt-2 pt-2">
            {renderRoundByRound()}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div 
        className="space-y-3 animate-reveal"
        style={{ animationDelay: `${buttonsDelay}ms` }}
      >
        <button
          onClick={handleNewShowdown}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          Start New Showdown
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Share
          </button>
          <button
            onClick={handleDone}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
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
        .animate-reveal {
          opacity: 0;
          animation: reveal 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}