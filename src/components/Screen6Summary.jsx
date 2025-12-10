import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RIVALRY_LENGTH } from '../config';
import Header from './Header';
import GoldenMic from '../assets/microphone.svg';

// Artifact configuration (matching VerdictFlow)
const artifactConfig = {
  'celebrity_match': { icon: '⭐', label: 'Celebrity Match' },
  'fake_headline': { icon: '📰', label: 'In related news…' },
  'fact_check': { icon: '🤓', label: 'Actually...' },
};

export default function Screen6Summary({ onNavigate, showId, rivalryId, context, returnProfileId }) {
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(null);
  const [rivalry, setRivalry] = useState(null);
  const [judgeView, setJudgeView] = useState('scores'); // 'scores' or 'banter'
  const [judgeProfiles, setJudgeProfiles] = useState([]);
  const [currentArtifactIndex, setCurrentArtifactIndex] = useState(0);

  // Determine if we came from history browsing
  const isFromHistory = context === 'from_history';

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

  // Randomize starting artifact when show loads
  useEffect(() => {
    if (show?.judge_data?.artifacts?.length > 0) {
      setCurrentArtifactIndex(Math.floor(Math.random() * show.judge_data.artifacts.length));
    }
  }, [show?.id]);

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

  function handleBack() {
    // Navigate back to rivalry summary with proper context
    onNavigate('summary', { 
      rivalryId: rivalryId || rivalry?.id,
      activeProfileId: returnProfileId,
      context: isFromHistory ? 'from_history' : null,
      returnProfileId: returnProfileId
    });
  }

  // Get all artifacts including rivalry_recap
  function getAllArtifacts() {
    const artifacts = [];
    
    if (show?.judge_data?.artifacts) {
      artifacts.push(...show.judge_data.artifacts);
    }
    
    if (show?.judge_data?.rivalry_comment) {
      artifacts.push({
        type: 'rivalry_recap',
        text: show.judge_data.rivalry_comment.text,
        judge: show.judge_data.rivalry_comment.judge
      });
    }
    
    return artifacts;
  }

  function cycleArtifact() {
    const artifacts = getAllArtifacts();
    if (artifacts.length > 1) {
      setCurrentArtifactIndex((prev) => (prev + 1) % artifacts.length);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!show || !rivalry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />
        <div className="text-center">
          <div className="text-slate-400 mb-4">Round not found</div>
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
  
  // Determine viewer perspective using returnProfileId
  const iAmProfileA = returnProfileId === rivalry.profile_a_id;
  const myProfile = iAmProfileA ? profileA : profileB;
  const opponentProfile = iAmProfileA ? profileB : profileA;
  
  // Winner/loser for display
  const winner = show.winner_id === profileA.id ? profileA : profileB;
  const loser = show.winner_id === profileA.id ? profileB : profileA;
  
  // Calculate total scores
  const getMyTotalScore = () => {
    if (!show.judge_data?.scores) return 0;
    return Object.values(show.judge_data.scores).reduce((sum, data) => {
      return sum + (iAmProfileA ? data.profile_a_score : data.profile_b_score);
    }, 0);
  };
  
  const getOpponentTotalScore = () => {
    if (!show.judge_data?.scores) return 0;
    return Object.values(show.judge_data.scores).reduce((sum, data) => {
      return sum + (iAmProfileA ? data.profile_b_score : data.profile_a_score);
    }, 0);
  };

  const myTotalScore = getMyTotalScore();
  const opponentTotalScore = getOpponentTotalScore();

  // Get artifacts for cycling
  const artifacts = getAllArtifacts();
  const currentArtifact = artifacts[currentArtifactIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      <div className="max-w-md mx-auto">
        
        {/* Round Number */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-300">Round {show.show_number} of {RIVALRY_LENGTH}</h2>
        </div>

        {/* Winner Declaration */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-orange-500">
            <span>{winner.name.toUpperCase()} ONE-UPPED {loser.name.toUpperCase()}</span>
          </div>
        </div>

        {/* Prompt */}
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-slate-100">{show.prompt}</p>
        </div>

        {/* Player Answer Cards - Winner first, then loser */}
        <div className="space-y-3 mb-6">
          {/* Winner Card */}
          <div className="bg-orange-500/20 ring-1 ring-orange-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img src={GoldenMic} alt="mic" className="w-5 h-5" />
                <span className="text-xl">{winner.avatar}</span>
                <span className="font-bold text-slate-100">{winner.name}</span>
              </div>
              <span className="text-lg font-bold text-orange-500">
                {show.winner_id === profileA.id 
                  ? Object.values(show.judge_data?.scores || {}).reduce((sum, d) => sum + d.profile_a_score, 0)
                  : Object.values(show.judge_data?.scores || {}).reduce((sum, d) => sum + d.profile_b_score, 0)
                }
              </span>
            </div>
            <div className="text-slate-200">
              {show.winner_id === profileA.id ? show.profile_a_answer : show.profile_b_answer}
            </div>
          </div>

          {/* Loser Card */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{loser.avatar}</span>
                <span className="font-bold text-slate-100">{loser.name}</span>
              </div>
              <span className="text-lg font-bold text-slate-400">
                {show.winner_id === profileA.id 
                  ? Object.values(show.judge_data?.scores || {}).reduce((sum, d) => sum + d.profile_b_score, 0)
                  : Object.values(show.judge_data?.scores || {}).reduce((sum, d) => sum + d.profile_a_score, 0)
                }
              </span>
            </div>
            <div className="text-slate-200">
              {show.winner_id === profileA.id ? show.profile_b_answer : show.profile_a_answer}
            </div>
          </div>
        </div>

        {/* Judge Content Section */}
        {show.judge_data?.scores && (
          <div className="space-y-4 mb-6">
            {/* Segmented Toggle for Breakdown / Banter */}
            {show.judge_data?.banter && (
              <div className="flex bg-slate-800/50 border border-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setJudgeView('scores')}
                  className={`flex-1 py-2 px-4 rounded font-semibold transition-all ${
                    judgeView === 'scores'
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Breakdown
                </button>
                <button
                  onClick={() => setJudgeView('banter')}
                  className={`flex-1 py-2 px-4 rounded font-semibold transition-all ${
                    judgeView === 'banter'
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Banter
                </button>
              </div>
            )}

            {/* Judge Scores View (Breakdown) */}
            {judgeView === 'scores' && (
              <div className="space-y-2">
                {Object.entries(show.judge_data.scores).map(([judgeKey, data]) => {
                  const judge = judgeProfiles.find(j => j.key === judgeKey);
                  
                  // Get scores for viewer (me) and opponent
                  const myScore = iAmProfileA ? data.profile_a_score : data.profile_b_score;
                  const oppScore = iAmProfileA ? data.profile_b_score : data.profile_a_score;
                  
                  // Determine winner of this judge
                  const iWonThisJudge = myScore > oppScore;
                  const oppWonThisJudge = oppScore > myScore;
                  
                  return (
                    <div key={judgeKey} className="bg-slate-800/30 rounded-xl p-3">
                      <div className="flex items-center flex-wrap gap-x-1 mb-1">
                        <span className="text-lg">{judge?.emoji || '❓'}</span>
                        <span className="text-sm font-bold text-slate-300">{judge?.name || judgeKey}</span>
                        <span className="text-sm text-slate-500">—</span>
                        <span className={`text-sm ${iWonThisJudge ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}>
                          {myProfile.name}: {myScore}
                        </span>
                        <span className="text-sm text-slate-500">•</span>
                        <span className={`text-sm ${oppWonThisJudge ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}>
                          {opponentProfile.name}: {oppScore}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 italic">{data.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Judge Banter View - Threaded left/right */}
            {judgeView === 'banter' && show.judge_data?.banter && (
              <div className="space-y-3">
                {show.judge_data.banter.map((line, i) => {
                  const judge = judgeProfiles.find(j => j.key === line.judge);
                  const isLeft = i % 2 === 0;
                  
                  return (
                    <div 
                      key={i} 
                      className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[85%] ${isLeft ? 'bg-slate-700/50' : 'bg-slate-600/50'} rounded-xl p-3`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{judge?.emoji || '❓'}</span>
                          <span className="text-sm font-semibold text-slate-300">
                            {judge?.name || line.judge}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200">{line.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Artifacts Section - Arrow cycling like VerdictFlow */}
        {currentArtifact && (
          currentArtifact.type === 'rivalry_recap' ? (
            // Ripley bubble style for rivalry recap
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎙️</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-orange-400">Ripley</span>
                    {artifacts.length > 1 && (
                      <button
                        onClick={cycleArtifact}
                        className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{currentArtifact.text}</p>
                </div>
              </div>
            </div>
          ) : (
            // Standard artifact style
            <div className="bg-slate-800/30 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{artifactConfig[currentArtifact.type]?.icon || '✨'}</span>
                  <span className="text-sm font-bold text-slate-300">
                    {artifactConfig[currentArtifact.type]?.label || 'Artifact'}
                  </span>
                </div>
                {artifacts.length > 1 && (
                  <button
                    onClick={cycleArtifact}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{currentArtifact.text}</p>
            </div>
          )
        )}

        {/* Back to Summary Button */}
        <button
          onClick={handleBack}
          className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
        >
          Back to Summary
        </button>

      </div>
    </div>
  );
}