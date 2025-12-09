import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../Header';
import ShowdownMenu from './ShowdownMenu';
import { 
  startShowdown, 
  endShowdown,
  leaveShowdown
} from '../../services/showdown';

export default function ShowdownLobby({ showdown, currentPlayer, onShowdownUpdate }) {
  const navigate = useNavigate();
  const { code } = useParams();
  
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');

  const isHost = currentPlayer?.is_host;
  const playerCount = showdown?.players?.length || 0;
  const canStart = playerCount >= 3;

  // No local subscription - parent (ShowdownGame) handles real-time updates
  // and passes updated showdown as prop

  async function handleStart() {
    if (!canStart) return;

    setIsStarting(true);
    setError('');

    try {
      await startShowdown(showdown.id);
      // Parent's subscription will pick up the status change
    } catch (err) {
      console.error('Failed to start showdown:', err);
      setError(err.message || 'Failed to start showdown');
      setIsStarting(false);
    }
  }

  async function handleEndShowdown() {
    try {
      await endShowdown(showdown.id);
      navigate('/showdown');
    } catch (err) {
      console.error('Failed to end showdown:', err);
    }
  }

  async function handleLeave() {
    setIsLeaving(true);
    try {
      const playerId = sessionStorage.getItem('showdown_player_id');
      if (playerId) {
        await leaveShowdown(playerId, showdown.id);
      }
      sessionStorage.removeItem('showdown_player_id');
      navigate('/showdown');
    } catch (err) {
      console.error('Failed to leave showdown:', err);
      // Still navigate away even if delete failed
      sessionStorage.removeItem('showdown_player_id');
      navigate('/showdown');
    }
  }

  // Get player display info
  function getPlayerDisplay(player) {
    const name = player.guest_name || player.profile?.name || 'Player';
    const avatar = player.guest_avatar || player.profile?.avatar || '😎';
    return { name, avatar };
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      
      {/* Menu */}
      <ShowdownMenu 
        isHost={isHost}
        onLeave={handleLeave}
        onEndShowdown={handleEndShowdown}
      />
      
      <div className="max-w-md mx-auto">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-orange-500 mb-2">Gathering the Lineup</h1>
        </div>

        {/* Instructions for host */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
          <p className="text-slate-300 text-sm font-medium mb-3">
            Spread the word:
          </p>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-slate-500">1.</span>
              <span className="text-slate-300">Go to <span className="text-orange-400 font-mono">oneupper.app/showdown</span></span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-500">2.</span>
              <span className="text-slate-300">Tap "Join with Code"</span>
            </li>
            <li className="flex gap-2 items-baseline">
              <span className="text-slate-500">3.</span>
              <span className="text-slate-300">Enter: <span className="text-orange-400 font-mono font-bold tracking-wider">{code}</span></span>
            </li>
          </ol>
        </div>

        {/* Players header */}
        <p className="text-slate-400 text-sm mb-3">
          The Contenders
        </p>

        {/* Player list */}
        <div className="space-y-3 mb-6">
          {showdown?.players?.map((player) => {
            const { name, avatar } = getPlayerDisplay(player);
            return (
              <div 
                key={player.id}
                className="bg-slate-800/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{name}</span>
                      {player.is_host && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                          Host
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1 italic">
                      {player.entry_brag}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Waiting placeholder - no box, just text */}
          {playerCount < 3 && (
            <p className="text-slate-500 text-center py-2">
              ⏳ Waiting on the slow ones... (need at least 3)
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* Start button (host only) */}
        {isHost ? (
          <div>
            <button
              onClick={handleStart}
              disabled={!canStart || isStarting}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              {isStarting ? 'Starting...' : 'Start the Show'}
            </button>
            {canStart && (
              <p className="text-slate-500 text-sm text-center mt-2 italic">
                May the boldest win.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400">
                Waiting for host to start...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}