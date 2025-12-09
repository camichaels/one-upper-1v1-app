import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateShowdownRecap, TOTAL_ROUNDS, getShowdownRounds } from '../../services/showdown';

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
  const [currentCard, setCurrentCard] = useState(0);
  const [recap, setRecap] = useState(showdown.recap || null);
  const [isLoading, setIsLoading] = useState(!showdown.recap);
  const [showFullResults, setShowFullResults] = useState(false);
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
  const champion = sortedPlayers[0];

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

  // Build highlight cards from recap data
  function getHighlightCards() {
    if (!recap) return [];

    const cards = [];

    // Card 1: The Story (Ripley)
    if (recap.narrative) {
      cards.push({
        type: 'narrative',
        title: 'The Story',
        content: recap.narrative
      });
    }

    // Card 2: Quote of the Night
    if (recap.quoteOfTheNight) {
      cards.push({
        type: 'quote',
        title: 'Quote of the Night',
        data: recap.quoteOfTheNight
      });
    }

    // Card 3: For the Runner-Uppers (non-winners only)
    // Support both old format (superlatives) and new format (runnerUpperAwards)
    const awards = recap.runnerUpperAwards || recap.superlatives;
    if (awards?.length > 0) {
      cards.push({
        type: 'runnerUppers',
        title: 'For the Runner-Uppers',
        data: awards
      });
    }

    // Card 4: Brag Check (all players)
    if (recap.bragChecks?.length > 0) {
      cards.push({
        type: 'bragChecks',
        title: 'Brag Check',
        data: recap.bragChecks
      });
    }

    // Card 5: Final Thoughts (Ripley)
    if (recap.deepThought) {
      cards.push({
        type: 'deep',
        title: 'Final Thoughts',
        content: recap.deepThought
      });
    }

    return cards;
  }

  const cards = getHighlightCards();
  const totalCards = cards.length;

  // Circular navigation
  function nextCard() {
    setCurrentCard((currentCard + 1) % totalCards);
  }

  function prevCard() {
    setCurrentCard((currentCard - 1 + totalCards) % totalCards);
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

  // Render full results dropdown
  function renderFullResults() {
    return (
      <div className="mt-4 space-y-6">
        {/* Round by round */}
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
              <p className="text-slate-400 text-xs mb-2 italic">
                "{round.prompt_text}"
              </p>
              <div className="space-y-1">
                {sortedAnswers.map((answer, idx) => {
                  const player = playerMap[answer.player_id];
                  const placement = rankings.find(r => r.playerId === answer.player_id)?.placement || idx + 1;
                  const medal = placement === 1 ? '🥇' : placement === 2 ? '🥈' : placement === 3 ? '🥉' : `${placement}.`;
                  
                  return (
                    <div key={answer.id} className="flex items-start gap-2 text-sm">
                      <span className="w-6 text-center flex-shrink-0">{medal}</span>
                      <span className="flex-shrink-0">{player?.avatar}</span>
                      <span className="text-slate-300 flex-1 break-words">
                        {answer.answer_text || '[crickets]'}
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

        {/* Final standings */}
        <div>
          <h3 className="text-orange-400 text-sm font-semibold mb-2">Final Standings</h3>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => {
              const { name, avatar } = getPlayerDisplay(player);
              const isMe = player.id === currentPlayer?.id;
              const placement = index + 1;
              const medal = placement === 1 ? '🥇' : placement === 2 ? '🥈' : placement === 3 ? '🥉' : `${placement}.`;
              
              return (
                <div key={player.id} className="flex items-center gap-3 bg-slate-700/30 rounded-lg p-2">
                  <span className="w-8 text-center">{medal}</span>
                  <span className="text-xl">{avatar}</span>
                  <span className={`flex-1 ${isMe ? 'text-orange-400' : 'text-slate-200'}`}>
                    {name}
                  </span>
                  <span className="text-slate-400">{player.total_score || 0} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Full-screen loading state
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-4">
        {/* Title */}
        <h1 className="text-xl font-bold text-orange-400 text-center mb-8">
          Highlights
        </h1>

        {/* Loading content */}
        <div className="text-center mb-8">
          {/* Animated clapperboard */}
          <div className="text-6xl mb-6 animate-pulse">🎬</div>
          
          <p className="text-xl text-slate-200 font-medium mb-6">
            Generating highlights...
          </p>

          {/* Ripley quip */}
          <div className="bg-slate-800/80 rounded-xl p-4 mx-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎙️</span>
              <span className="text-orange-400 font-semibold text-sm">Ripley</span>
            </div>
            <p className="text-slate-300 text-sm text-left">{loadingQuip}</p>
          </div>
        </div>

        {/* Round by Round dropdown - available even while loading */}
        <div className="mb-6">
          <button
            onClick={() => setShowFullResults(!showFullResults)}
            className="w-full flex items-center justify-between bg-slate-800/40 rounded-xl p-3 text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <span className="font-medium">Round by Round</span>
            <svg 
              className={`w-5 h-5 transition-transform ${showFullResults ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showFullResults && (
            <div className="bg-slate-800/40 rounded-b-xl px-4 pb-4 -mt-2 pt-2">
              {renderFullResults()}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
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
              Share Results
            </button>
            <button
              onClick={handleDone}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render a highlight card
  function renderCard(card) {
    switch (card.type) {
      case 'narrative':
        return (
          <div className="text-left">
            {/* Ripley attribution */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎙️</span>
              <span className="text-orange-400 font-semibold">Ripley</span>
            </div>
            <p className="text-slate-200 text-base leading-relaxed">
              {card.content}
            </p>
          </div>
        );

      case 'quote':
        return (
          <div className="text-left">
            <p className="text-slate-400 text-sm mb-3">
              Round {card.data.round}: "{card.data.prompt}"
            </p>
            <div className="bg-slate-700/50 rounded-xl p-4 mb-3">
              <p className="text-lg text-slate-100 italic leading-relaxed">
                "{card.data.answer}"
              </p>
              <p className="text-orange-400 mt-3 font-medium">
                — {card.data.playerAvatar} {card.data.player}
              </p>
            </div>
            <p className="text-slate-400 text-sm">
              {card.data.reaction}
            </p>
          </div>
        );

      case 'runnerUppers':
        return (
          <div className="space-y-4 text-left">
            {card.data.map((award, i) => (
              <div key={i}>
                <p className="text-orange-400 font-semibold">
                  {award.emoji} {award.title}
                </p>
                <p className="text-slate-200 text-sm">{award.player}</p>
                <p className="text-slate-400 text-sm mt-1">{award.explanation}</p>
              </div>
            ))}
          </div>
        );

      case 'bragChecks':
        return (
          <div className="space-y-4 text-left">
            {card.data.map((brag, i) => (
              <div key={i}>
                <p className="text-slate-200 font-medium">
                  {brag.playerAvatar} {brag.player}
                </p>
                <p className="text-slate-500 text-sm italic">
                  Walked in: "{brag.entryBrag}"
                </p>
                <p className="text-slate-300 text-sm">
                  {brag.realityCheck}
                </p>
              </div>
            ))}
          </div>
        );

      case 'deep':
        return (
          <div className="text-left">
            {/* Ripley attribution */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎙️</span>
              <span className="text-orange-400 font-semibold">Ripley</span>
            </div>
            <p className="text-slate-200 text-base leading-relaxed italic">
              {card.content}
            </p>
          </div>
        );

      default:
        return null;
    }
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
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleTextShare}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>Share via Text</span>
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

  return (
    <div className="max-w-md mx-auto mt-4">
      {/* Share Modal */}
      {renderShareModal()}

      {/* Title */}
      <h1 className="text-xl font-bold text-orange-400 text-center mb-4">
        Highlights
      </h1>

      {/* Card area - takes up most of the screen */}
      <div className="bg-slate-800/60 rounded-xl p-4 mb-4" style={{ minHeight: '320px' }}>
        {cards.length > 0 ? (
          <>
            {/* Card title */}
            <h2 className="text-orange-400 font-semibold text-sm mb-4 text-center">
              {cards[currentCard]?.title}
            </h2>
            
            {/* Card content with centered arrows */}
            <div className="flex items-center gap-2">
              {/* Left arrow */}
              <button
                onClick={prevCard}
                className="p-1 flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              {/* Card content */}
              <div className="flex-1 min-h-[240px] flex flex-col justify-center">
                {renderCard(cards[currentCard])}
              </div>
              
              {/* Right arrow */}
              <button
                onClick={nextCard}
                className="p-1 flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Card counter */}
            <p className="text-center text-slate-500 text-xs mt-3">
              {currentCard + 1} of {totalCards}
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">No highlights available</p>
          </div>
        )}
      </div>

      {/* Round by Round dropdown */}
      <div className="mb-4">
        <button
          onClick={() => setShowFullResults(!showFullResults)}
          className="w-full flex items-center justify-between bg-slate-800/40 rounded-xl p-3 text-slate-300 hover:bg-slate-800/60 transition-colors"
        >
          <span className="font-medium">Round by Round</span>
          <svg 
            className={`w-5 h-5 transition-transform ${showFullResults ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showFullResults && (
          <div className="bg-slate-800/40 rounded-b-xl px-4 pb-4 -mt-2 pt-2">
            {renderFullResults()}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
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
            Share Results
          </button>
          <button
            onClick={handleDone}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}