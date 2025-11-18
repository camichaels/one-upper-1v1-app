import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Screen6({ onNavigate, showId }) {
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(null);
  const [rivalry, setRivalry] = useState(null);
  const [showJudgeBanter, setShowJudgeBanter] = useState(false);
  const [judgeProfiles, setJudgeProfiles] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState(null);

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

    // Load the show
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

  function handleShowJudgeProfile(judgeKey) {
    const judge = judgeProfiles.find(j => j.key === judgeKey);
    if (judge) {
      setSelectedJudge(judge);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!show || !rivalry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
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
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate('screen1')}
            className="text-slate-400 hover:text-slate-200 transition-colors mb-4 flex items-center gap-2"
          >
            ← Back to Game
          </button>
          <div className="text-xl font-bold text-orange-500">🎤 ONE-UPPER</div>
          <div className="text-sm text-slate-400">
            {profileA.avatar} {profileA.name} vs {profileB.avatar} {profileB.name}
          </div>
        </div>

        {/* Show Info */}
        <div className="mb-6">
          <div className="text-sm text-slate-400 mb-2">SHOW #{show.show_number}</div>
          <div className="text-lg font-bold text-slate-100 mb-3">{show.prompt}</div>
          <div className="text-sm text-slate-400 mb-1">JUDGES:</div>
          <div className="flex flex-wrap gap-2">
            {show.judges.map((judgeKey, i) => {
              const judge = judgeProfiles.find(j => j.key === judgeKey);
              return (
                <button
                  key={i}
                  onClick={() => handleShowJudgeProfile(judgeKey)}
                  className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-full text-slate-200 hover:bg-slate-600 hover:border-orange-500/50 transition-all text-sm"
                >
                  {judge?.emoji || '❓'} {judge?.name || judgeKey}
                </button>
              );
            })}
          </div>
        </div>

        {/* Verdict */}
        <div className="mb-6">
          <div className="text-center mb-4">
            <div className="text-2xl mb-2 text-slate-100">
              🎤 {winner.name.toUpperCase()} ONE-UPPED {loser.name.toUpperCase()}
            </div>
          </div>

          {/* Show both answers */}
          <div className="mb-4 space-y-3">
            <div className={`p-3 border-2 rounded-lg ${show.winner_id === profileA.id ? 'border-orange-500 bg-orange-500/10' : 'border-slate-600 bg-slate-700/30'}`}>
              <div className="font-bold mb-1 text-slate-200">
                {profileA.avatar} {profileA.name.toUpperCase()} {show.winner_id === profileA.id && '🎤'}
              </div>
              <div className="text-sm text-slate-300">{show.profile_a_answer}</div>
            </div>
            <div className={`p-3 border-2 rounded-lg ${show.winner_id === profileB.id ? 'border-orange-500 bg-orange-500/10' : 'border-slate-600 bg-slate-700/30'}`}>
              <div className="font-bold mb-1 text-slate-200">
                {profileB.avatar} {profileB.name.toUpperCase()} {show.winner_id === profileB.id && '🎤'}
              </div>
              <div className="text-sm text-slate-300">{show.profile_b_answer}</div>
            </div>
          </div>

          {/* Judge scores */}
          {show.judge_data?.scores && (
            <div className="mb-4 space-y-2">
              <div className="border-t-2 border-slate-600 pt-3">
                {Object.entries(show.judge_data.scores).map(([judgeKey, data]) => {
                  const judge = judgeProfiles.find(j => j.key === judgeKey);
                  
                  // Get both player scores
                  const profileAScore = data.profile_a_score;
                  const profileBScore = data.profile_b_score;
                  
                  return (
                    <div key={judgeKey} className="mb-2">
                      <div className="text-sm text-slate-300">
                        <span className="font-bold">
                          {judge?.emoji || '❓'} {judge?.name || judgeKey}:
                        </span>{' '}
                        {profileA.name} {profileAScore}, {profileB.name} {profileBScore} — "{data.comment}"
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Judge banter toggle */}
          {show.judge_data?.banter && (
            <button
              onClick={() => setShowJudgeBanter(!showJudgeBanter)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-600 text-slate-200 transition-colors mb-4"
            >
              {showJudgeBanter ? '↑ Hide judge banter' : '↓ See judge banter'}
            </button>
          )}

          {showJudgeBanter && show.judge_data?.banter && (
            <div className="mb-4 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
              {show.judge_data.banter.map((line, i) => {
                // Look up judge name from key
                const judge = judgeProfiles.find(j => j.key === line.judge);
                const displayName = judge?.name || line.judge;
                
                return (
                  <div key={i} className="text-sm mb-1 text-slate-300">
                    <span className="font-bold text-slate-200">{displayName}:</span> "{line.text}"
                  </div>
                );
              })}
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => onNavigate('screen1')}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"
          >
            Back to Game
          </button>
        </div>
      </div>

      {/* Judge Profile Modal */}
      {selectedJudge && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border-2 border-slate-600 rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">{selectedJudge.emoji}</div>
              <h2 className="text-2xl font-bold text-orange-500">{selectedJudge.name}</h2>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-400 mb-1">JUDGING STYLE:</h3>
              <p className="text-slate-200">{selectedJudge.description}</p>
            </div>
            
            {selectedJudge.examples && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-400 mb-2">CLASSIC ONE-LINERS:</h3>
                <div className="space-y-1">
                  {selectedJudge.examples.split('|').map((example, i) => {
                    // Parse by commas within quotes to separate one-liners
                    const cleanExample = example.trim();
                    // Split by ", " pattern to get individual quotes
                    const oneLiners = cleanExample.split(/",\s*"/).map(line => 
                      line.replace(/^["']|["']$/g, '').trim()
                    );
                    
                    return oneLiners.map((oneLiner, j) => (
                      <div key={`${i}-${j}`} className="text-sm text-slate-300 italic">
                        "{oneLiner}"
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}
            
            <button
              onClick={() => setSelectedJudge(null)}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}