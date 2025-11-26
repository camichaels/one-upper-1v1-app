import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Header from './Header';
import GoldenMic from '../assets/microphone.svg';

export default function PastRivalriesList({ onNavigate, profileId }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [rivalries, setRivalries] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPastRivalries();
  }, [profileId]);

  async function loadPastRivalries() {
    try {
      // Get profile info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, avatar')
        .eq('id', profileId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Get completed rivalries for this profile
      const { data: rivalriesData, error: rivalriesError } = await supabase
        .from('rivalries')
        .select(`
          id,
          profile_a_id,
          profile_b_id,
          status,
          ended_at,
          summary,
          profile_a:profile_a_id(id, name, avatar),
          profile_b:profile_b_id(id, name, avatar)
        `)
        .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`)
        .eq('status', 'complete')
        .order('ended_at', { ascending: false });

      if (rivalriesError) throw rivalriesError;

      // Process rivalries to determine opponent and win/loss
      const processedRivalries = rivalriesData.map(rivalry => {
        const isProfileA = rivalry.profile_a_id === profileId;
        const opponent = isProfileA ? rivalry.profile_b : rivalry.profile_a;
        
        // Get scores from summary
        const summary = rivalry.summary || {};
        const finalScore = summary.final_score || {};
        
        const myWins = isProfileA ? finalScore.player_a_wins : finalScore.player_b_wins;
        const opponentWins = isProfileA ? finalScore.player_b_wins : finalScore.player_a_wins;
        const iWon = summary.winner_id === profileId;

        return {
          id: rivalry.id,
          opponent,
          myWins: myWins || 0,
          opponentWins: opponentWins || 0,
          iWon,
          endedAt: rivalry.ended_at,
          hasSummary: !!rivalry.summary
        };
      });

      setRivalries(processedRivalries);
      setLoading(false);
    } catch (err) {
      console.error('Error loading past rivalries:', err);
      setError('Failed to load rivalry history');
      setLoading(false);
    }
  }

  function handleBack() {
    onNavigate('screen2');
  }

  function handleViewRivalry(rivalryId) {
    onNavigate('summary', { 
      rivalryId, 
      activeProfileId: profileId,
      context: 'from_history',
      returnTo: 'pastRivalries',
      returnProfileId: profileId
    });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />
        <div className="text-slate-400">Loading rivalry history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
        <Header />
        <div className="max-w-md mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-4 transition-colors"
          >
            <span>←</span>
            <span>Back to Profiles</span>
          </button>
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-4 transition-colors"
        >
          <span>←</span>
          <span>Back to Profiles</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{profile?.avatar}</span>
            <h1 className="text-2xl font-bold text-orange-500">{profile?.name}</h1>
          </div>
          <p className="text-slate-400">Rivalry History</p>
        </div>

        {/* Rivalries List */}
        {rivalries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No completed rivalries yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rivalries.map((rivalry) => (
              <button
                key={rivalry.id}
                onClick={() => handleViewRivalry(rivalry.id)}
                className="w-full bg-slate-700/30 border border-slate-600 rounded-lg p-4 text-left hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rivalry.iWon && <img src={GoldenMic} alt="Won" className="w-6 h-6" />}
                    <span className="text-lg font-semibold text-slate-100">
                      vs {rivalry.opponent?.name}
                    </span>
                    <span className="text-xl">{rivalry.opponent?.avatar}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className={`text-lg font-bold ${rivalry.iWon ? 'text-orange-500' : 'text-slate-400'}`}>
                    {rivalry.iWon ? 'Won' : 'Lost'} {rivalry.myWins}-{rivalry.opponentWins}
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatDate(rivalry.endedAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}