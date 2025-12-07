import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateShowdownRecap, TOTAL_ROUNDS, getShowdownRounds } from '../../services/showdown';

export default function ShowdownHighlights({ showdown, currentPlayer }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [recap, setRecap] = useState(showdown.recap || null);
  const [isLoading, setIsLoading] = useState(!showdown.recap);
  const [showFullResults, setShowFullResults] = useState(false);
  const [rounds, setRounds] = useState([]);
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

    // Card 1: Narrative
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

    // Card 3: Superlatives
    if (recap.superlatives?.length > 0) {
      cards.push({
        type: 'superlatives',
        title: 'Superlatives',
        data: recap.superlatives
      });
    }

    // Card 4: Brag Checks
    if (recap.bragChecks?.length > 0) {
      cards.push({
        type: 'bragChecks',
        title: 'Brag Check',
        data: recap.bragChecks
      });
    }

    // Card 5: Robbed Moment (if exists)
    if (recap.robbedMoment) {
      cards.push({
        type: 'robbed',
        title: 'Robbed',
        data: recap.robbedMoment
      });
    }

    // Card 6: Deep Thought
    if (recap.deepThought) {
      cards.push({
        type: 'deep',
        title: 'Deep Thoughts',
        content: recap.deepThought
      });
    }

    return cards;
  }

  const cards = getHighlightCards();
  const totalCards = cards.length;

  function nextCard() {
    if (currentCard < totalCards - 1) {
      setCurrentCard(currentCard + 1);
    }
  }

  function prevCard() {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
    }
  }

  function handleNewShowdown() {
    sessionStorage.removeItem('showdown_player_id');
    navigate('/showdown');
  }

  function handleDone() {
    sessionStorage.removeItem('showdown_player_id');
    navigate('/');
  }

  function handleShare() {
    // TODO: Implement share functionality
    // For now, could copy a summary to clipboard
    const champion = sortedPlayers[0];
    const text = `🏆 ${getPlayerDisplay(champion).name} won our One-Upper Showdown with ${champion.total_score} points! Play at oneupper.app`;
    navigator.clipboard?.writeText(text);
    alert('Copied to clipboard!');
  }

  // Render a highlight card
  function renderCard(card) {
    switch (card.type) {
      case 'narrative':
        return (
          <div className="text-center px-2">
            <p className="text-slate-200 text-lg leading-relaxed">
              {card.content}
            </p>
          </div>
        );

      case 'quote':
        return (
          <div className="text-center px-2">
            <p className="text-slate-400 text-sm mb-2">
              Round {card.data.round}: "{card.data.prompt}"
            </p>
            <div className="bg-slate-700/50 rounded-xl p-4 mb-3">
              <p className="text-xl text-slate-100 italic">
                "{card.data.answer}"
              </p>
              <p className="text-orange-400 mt-2">
                — {card.data.playerAvatar} {card.data.player}
              </p>
            </div>
            <p className="text-slate-300 text-sm">
              {card.data.reaction}
            </p>
          </div>
        );

      case 'superlatives':
        return (
          <div className="space-y-3 px-2 max-h-64 overflow-y-auto">
            {card.data.map((sup, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-700/30 rounded-lg p-3">
                <span className="text-2xl">{sup.playerAvatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-100">
                    {sup.emoji} {sup.title}
                  </p>
                  <p className="text-slate-400 text-sm">{sup.player}</p>
                  <p className="text-slate-300 text-sm mt-1">{sup.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'bragChecks':
        return (
          <div className="space-y-3 px-2 max-h-64 overflow-y-auto">
            {card.data.map((brag, i) => (
              <div key={i} className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{brag.playerAvatar}</span>
                  <span className="font-semibold text-slate-100">{brag.player}</span>
                </div>
                <p className="text-slate-400 text-sm italic mb-1">
                  Walked in: "{brag.entryBrag}"
                </p>
                <p className="text-slate-200 text-sm">
                  {brag.realityCheck}
                </p>
              </div>
            ))}
          </div>
        );

      case 'robbed':
        return (
          <div className="text-center px-2">
            <p className="text-slate-400 text-sm mb-2">Round {card.data.round}</p>
            <div className="bg-slate-700/50 rounded-xl p-4 mb-3">
              <p className="text-lg text-slate-100 italic">
                "{card.data.answer}"
              </p>
              <p className="text-orange-400 mt-2">— {card.data.player}</p>
            </div>
            <p className="text-slate-300">
              {card.data.commentary}
            </p>
          </div>
        );

      case 'deep':
        return (
          <div className="text-center px-2">
            <p className="text-slate-200 text-lg leading-relaxed italic">
              {card.content}
            </p>
          </div>
        );

      default:
        return null;
    }
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
                        {answer.answer_text || '[no answer]'}
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

  return (
    <div className="max-w-md mx-auto mt-4 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Title */}
      <h1 className="text-xl font-bold text-slate-100 text-center mb-4">
        The Highlights
      </h1>

      {/* Card area - main content */}
      <div className="flex-grow flex flex-col">
        {/* Swipeable card */}
        <div className="bg-slate-800/60 rounded-xl p-4 mb-4 min-h-48 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2 animate-pulse">🎬</div>
                <p className="text-slate-400">Generating highlights...</p>
              </div>
            </div>
          ) : cards.length > 0 ? (
            <>
              {/* Card title */}
              <h2 className="text-orange-400 font-semibold text-sm mb-3 text-center">
                {cards[currentCard]?.title}
              </h2>
              
              {/* Card content with arrows */}
              <div className="flex-1 flex items-center">
                {/* Left arrow */}
                <button
                  onClick={prevCard}
                  className={`p-2 ${currentCard > 0 ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700'}`}
                  disabled={currentCard === 0}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Card content */}
                <div className="flex-1 py-2">
                  {renderCard(cards[currentCard])}
                </div>
                
                {/* Right arrow */}
                <button
                  onClick={nextCard}
                  className={`p-2 ${currentCard < totalCards - 1 ? 'text-slate-400 hover:text-slate-200' : 'text-slate-700'}`}
                  disabled={currentCard >= totalCards - 1}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">No highlights available</p>
            </div>
          )}
        </div>

        {/* Full Results dropdown */}
        <div className="mb-4">
          <button
            onClick={() => setShowFullResults(!showFullResults)}
            className="w-full flex items-center justify-between bg-slate-800/40 rounded-xl p-3 text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <span className="font-medium">Full Results</span>
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
      </div>

      {/* Action buttons - always at bottom */}
      <div className="mt-auto space-y-3">
        <button
          onClick={handleNewShowdown}
          className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          New Showdown
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={handleShare}
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
    </div>
  );
}