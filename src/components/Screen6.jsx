import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Header from './Header';

export default function Screen6({ onNavigate, showId }) {
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(null);
  const [rivalry, setRivalry] = useState(null);
  const [showJudgeBanter, setShowJudgeBanter] = useState(false);
  const [judgeProfiles, setJudgeProfiles] = useState([]);

  useEffect(() => {
    loadShow();
  }, [showId]);

  // Fetch judge profiles when show loads
  useEffect(() => {
    if (!show?.judges) return;

    async function fetchJudgeProfiles() {
      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .in('key', show.judges);

      if (!error && data) {
        setJudgeProfiles(data);
      }
    }

    fetchJudgeProfiles();
  }, [show?.judges]);

  async function loadShow() {
    setLoading(true);
    const { data: showData, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .single();

    if (showError) {
      console.error('Error loading show:', showError);
      setLoading(false);
      return;
    }

    setShow(showData);

    // Load rivalry with both profiles
    const { data: rivalryData, error: rivalryError } = await supabase
      .from('rivalries')
      .select(`
        *,
        profile_a:profiles!rivalries_profile_a_id_fkey(*),
        profile_b:profiles!rivalries_profile_b_id_fkey(*)
      `)
      .eq('id', showData.rivalry_id)
      .single();

    if (rivalryError) {
      console.error('Error loading rivalry:', rivalryError);
    } else {
      setRivalry(rivalryData);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />  {/* ← ADD THIS LINE */}
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!show || !rivalry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />  {/* ← ADD THIS LINE */}
        <div className="text-center">
          <div className="text-slate-400 mb-4">Show not found</div>
          <button
            onClick={() => onNavigate('screen1')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const profileA = rivalry.profile_a;
  const profileB = rivalry.profile_b;
  const winner = show.winner_id === profileA.id ? profileA : profileB;
  const loser = show.winner_id === profileA.id ? profileB : profileA;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      <div className="max-w-md mx-auto">
        
        {/* Show Number */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-300">Show #{show.show_number}</h2>
        </div>

        {/* Winner Declaration */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-orange-500">
            🎤 {winner.name.toUpperCase()} ONE-UPPED {loser.name.toUpperCase()}
          </div>
        </div>

        {/* Prompt */}
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-slate-100">{show.prompt}</p>
        </div>

        {/* Player Answer Cards with Scores */}
        <div className="space-y-3 mb-6">
          {/* Profile A Card */}
          <div className={`rounded-xl p-4 ${
            show.winner_id === profileA.id 
              ? 'bg-orange-500/20 ring-1 ring-orange-500/30' 
              : 'bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {show.winner_id === profileA.id && <span className="text-lg">🎤</span>}
              <span className="text-xl">{profileA.avatar}</span>
              <span className="font-bold text-slate-100">{profileA.name}</span>
              {show.judge_data?.scores && (
                <span className="ml-auto text-lg font-bold text-orange-500">
                  {(() => {
                    const scores = Object.values(show.judge_data.scores).map(data => data.profile_a_score);
                    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                    return avg;
                  })()}
                </span>
              )}
            </div>
            <div className="text-slate-200">
              {show.profile_a_answer}
            </div>
          </div>

          {/* Profile B Card */}
          <div className={`rounded-xl p-4 ${
            show.winner_id === profileB.id 
              ? 'bg-orange-500/20 ring-1 ring-orange-500/30' 
              : 'bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {show.winner_id === profileB.id && <span className="text-lg">🎤</span>}
              <span className="text-xl">{profileB.avatar}</span>
              <span className="font-bold text-slate-100">{profileB.name}</span>
              {show.judge_data?.scores && (
                <span className="ml-auto text-lg font-bold text-orange-500">
                  {(() => {
                    const scores = Object.values(show.judge_data.scores).map(data => data.profile_b_score);
                    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                    return avg;
                  })()}
                </span>
              )}
            </div>
            <div className="text-slate-200">
              {show.profile_b_answer}
            </div>
          </div>
        </div>

        {/* Judges Say Header */}
        {show.judge_data?.scores && (
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-slate-300">Judges Say...</h3>
          </div>
        )}

        {/* Judge Scores & Comments */}
        {show.judge_data?.scores && (
          <div className="space-y-3 mb-6">
            {Object.entries(show.judge_data.scores).map(([judgeKey, data]) => {
              const judge = judgeProfiles.find(j => j.key === judgeKey);
              
              return (
                <div key={judgeKey} className="bg-slate-800/30 rounded-lg p-3">
                  <div className="text-sm font-bold text-slate-300 mb-1">
                    {judge?.emoji || '❓'} {judge?.name || judgeKey}: {profileA.name} {data.profile_a_score}, {profileB.name} {data.profile_b_score}
                  </div>
                  <div className="text-sm text-slate-400 italic">
                    "{data.comment}"
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Judge Banter Toggle */}
        {show.judge_data?.banter && (
          <>
            <button
              onClick={() => setShowJudgeBanter(!showJudgeBanter)}
              className="w-full py-3 bg-slate-800/50 border border-slate-700 rounded-lg font-semibold hover:bg-slate-700 transition-colors text-slate-200 mb-6"
            >
              {showJudgeBanter ? 'Hide Judge Banter' : 'See Judge Banter'}
            </button>

            {showJudgeBanter && (
              <div className="bg-slate-800/30 rounded-lg p-4 space-y-2 mb-6">
                {show.judge_data.banter.map((line, i) => {
                  const judge = judgeProfiles.find(j => j.key === line.judge);
                  return (
                    <div key={i}>
                      <div className="text-xs font-semibold text-slate-400 mb-0.5">
                        {judge?.name || line.judge}
                      </div>
                      <div className="text-sm text-slate-200">
                        "{line.text}"
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Back to Game Button */}
        <button
          onClick={() => onNavigate('screen1')}
          className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
        >
          Back to Game
        </button>

      </div>
    </div>
  );
}