import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../Header';
import ShowdownLobby from './ShowdownLobby';
import ShowdownIntro from './ShowdownIntro';
import ShowdownRound from './ShowdownRound';
import ShowdownFinale from './ShowdownFinale';
import { 
  getShowdownByCode, 
  getShowdown,
  subscribeToShowdown, 
  unsubscribeFromShowdown,
  endShowdown
} from '../../services/showdown';

export default function ShowdownGame() {
  const navigate = useNavigate();
  const { code } = useParams();
  
  const [showdown, setShowdown] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load showdown and find current player
  useEffect(() => {
    async function loadShowdown() {
      try {
        const playerId = sessionStorage.getItem('showdown_player_id');
        
        if (!playerId) {
          // No player ID - redirect to join
          navigate(`/showdown/${code}/join`);
          return;
        }

        const data = await getShowdownByCode(code);
        
        if (!data) {
          setError('Showdown not found');
          setLoading(false);
          return;
        }

        // Check if this showdown was cancelled or ended
        if (data.status === 'cancelled') {
          setError('This Showdown was ended by the host.');
          setLoading(false);
          return;
        }

        // Find current player
        const player = data.players?.find(p => p.id === playerId);
        
        if (!player) {
          // Player not in this showdown - redirect to join
          sessionStorage.removeItem('showdown_player_id');
          navigate(`/showdown/${code}/join`);
          return;
        }

        setShowdown(data);
        setCurrentPlayer(player);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load showdown:', err);
        setError('Failed to load showdown');
        setLoading(false);
      }
    }

    loadShowdown();
  }, [code, navigate]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!showdown?.id) {
      console.log('⏳ Waiting for showdown.id to subscribe...');
      return;
    }

    console.log('🔌 Setting up real-time subscription for showdown:', showdown.id);
    
    const channel = subscribeToShowdown(showdown.id, async (payload) => {
      console.log('🔔 Real-time event received:', payload);
      // Reload showdown data on any change
      try {
        const data = await getShowdown(showdown.id);
        console.log('📦 Reloaded showdown data:', { 
          status: data.status, 
          intro_step: data.intro_step,
          host_player_id: data.host_player_id 
        });
        setShowdown(data);

        // Update current player from reloaded data (includes is_host status)
        const playerId = sessionStorage.getItem('showdown_player_id');
        const player = data.players?.find(p => p.id === playerId);
        if (player) {
          console.log('👤 Current player updated:', { id: player.id, is_host: player.is_host });
          setCurrentPlayer(player);
        }
        // Note: cancelled status is handled by the switch statement in render
      } catch (err) {
        console.error('Failed to reload showdown:', err);
      }
    });

    return () => {
      console.log('🔌 Cleaning up subscription for showdown:', showdown.id);
      unsubscribeFromShowdown(channel);
    };
  }, [showdown?.id]);

  // Handle showdown updates from child components
  function handleShowdownUpdate(updatedShowdown) {
    setShowdown(updatedShowdown);
  }

  // Handle leaving/ending
  async function handleEndShowdown() {
    try {
      await endShowdown(showdown.id);
      sessionStorage.removeItem('showdown_player_id');
      navigate('/showdown');
    } catch (err) {
      console.error('Failed to end showdown:', err);
    }
  }

  function handleLeave() {
    sessionStorage.removeItem('showdown_player_id');
    navigate('/showdown');
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto text-center">
          <p className="text-slate-400">Loading showdown...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Oops!</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/showdown')}
            className="bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Back to Showdown
          </button>
        </div>
      </div>
    );
  }

  // Route to correct component based on showdown status
  switch (showdown.status) {
    case 'lobby':
      return (
        <ShowdownLobby 
          showdown={showdown}
          currentPlayer={currentPlayer}
          onShowdownUpdate={handleShowdownUpdate}
        />
      );

    case 'intro':
      return (
        <ShowdownIntro
          showdown={showdown}
          currentPlayer={currentPlayer}
          onShowdownUpdate={handleShowdownUpdate}
        />
      );

    case 'active':
      return (
        <ShowdownRound
          showdown={showdown}
          currentPlayer={currentPlayer}
          onShowdownUpdate={handleShowdownUpdate}
        />
      );

    case 'complete':
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
          <Header />
          <ShowdownFinale
            showdown={showdown}
            currentPlayer={currentPlayer}
            isHost={currentPlayer?.is_host}
          />
        </div>
      );

    case 'cancelled':
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
          <Header />
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Showdown Ended</h2>
            <p className="text-slate-400 mb-6">The host ended this Showdown.</p>
            <button
              onClick={() => navigate('/showdown')}
              className="bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Back to Showdown
            </button>
          </div>
        </div>
      );

    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
          <Header />
          <div className="max-w-md mx-auto text-center">
            <p className="text-slate-400">Unknown showdown state: {showdown.status}</p>
          </div>
        </div>
      );
  }
}