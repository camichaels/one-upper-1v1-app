import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RIVALRY_LENGTH } from '../config';
import Header from './Header';
import GoldenMic from '../assets/microphone.svg';

// Verdict Screen Brain Boosts - shown after artifacts
const verdictBrainBoosts = [
  "Your brain just got a little sharper.",
  "That's creative thinking in action.",
  "One prompt down, infinite possibilities unlocked.",
  "You're building creative muscle with every show.",
  "Quick thinking is a skill. You just practiced it.",
  "Fun fact: You're training your brain while having fun.",
  "Every answer is a mini creative workout.",
  "This is what daily creative practice looks like.",
  "Keep this up and you'll be unstoppable.",
  "Your creative range is expanding.",
  "That's the kind of thinking that solves problems.",
  "You just exercised three mental skills: wit, speed, and originality.",
  "Creative thinking isn't magic. It's practice. You're doing it.",
  "Most people never flex their imagination. You just did.",
  "Your brain loves novelty. You just gave it a treat.",
  "Quick wit is trainable. You're training it right now.",
  "That prompt made you think differently. That's the point.",
  "You just proved you can think on your feet.",
  "Creative confidence builds one answer at a time.",
  "Your improvisation skills just got stronger.",
  "Lateral thinking: the art of seeing connections others miss. You're practicing it.",
  "Every creative act rewires your brain slightly. You just rewired yours.",
  "You're not just playing a game. You're training a superpower.",
  "Quick thinking under pressure is a learnable skill. You're learning it.",
  "Your brain just formed new neural connections. That's how creativity works.",
  "Most people avoid creative challenges. You're seeking them out.",
  "That answer required courage. Creative thinking always does.",
  "You just demonstrated mental flexibility. That's rare.",
  "Creative problem-solving is a muscle. You're at the gym.",
  "Your willingness to be original is what makes you interesting.",
  "That prompt pushed you outside your comfort zone. Growth happens there.",
  "You're practicing the skill of generating ideas on demand.",
  "Quick wit isn't innate. It's practiced. You're practicing.",
  "Every creative answer strengthens your mental agility.",
  "You just proved you can think creatively under time pressure.",
  "Your brain's pattern-recognition system just got a workout.",
  "Creative thinking is about making unexpected connections. You just made one.",
  "Most people think they're not creative. You're proving them wrong about yourself.",
  "That answer came from a place of originality. Own that.",
  "You're building a habit of creative thinking. Habits compound.",
  "Quick thinking is valuable in every part of life. You're sharpening it.",
  "Your brain just experienced cognitive flexibility. That's what makes you adaptable.",
  "Creative courage is choosing to share your ideas. You just showed it.",
  "You're not just answering prompts. You're training your mind to think differently.",
  "That answer required improvisation. Improvisation is a superpower.",
  "Your creative output matters. You just created something from nothing.",
  "Quick wit is about trusting your instincts. You're learning to trust yours.",
  "Every show is a chance to surprise yourself. Did you surprise yourself this time?",
  "You're practicing the skill that sets innovators apart: thinking differently on purpose.",
  "Creative thinking is a daily practice. You're showing up for it."
];

export default function Screen6({ onNavigate, showId }) {
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(null);
  const [rivalry, setRivalry] = useState(null);
  const [showJudgeBanter, setShowJudgeBanter] = useState(false);
  const [judgeView, setJudgeView] = useState('scores'); // 'scores' or 'chat'
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
          <h2 className="text-xl font-bold text-slate-300">Show {show.show_number} of {RIVALRY_LENGTH}</h2>
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

        {/* Player Answer Cards with Scores */}
        <div className="space-y-3 mb-6">
          {/* Profile A Card */}
          <div className={`rounded-xl p-4 ${
            show.winner_id === profileA.id 
              ? 'bg-orange-500/20 ring-1 ring-orange-500/30' 
              : 'bg-slate-800/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {show.winner_id === profileA.id && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
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
              {show.winner_id === profileB.id && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
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

        {/* Judge Content Section */}
        {show.judge_data?.scores && (
          <div className="space-y-4 mb-6">
            {/* Segmented Toggle for Judge Scores / Judge Chat */}
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
                  Judge Scores
                </button>
                <button
                  onClick={() => setJudgeView('chat')}
                  className={`flex-1 py-2 px-4 rounded font-semibold transition-all ${
                    judgeView === 'chat'
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  Judge Chat
                </button>
              </div>
            )}

            {/* Judge Scores View */}
            {judgeView === 'scores' && (
              <div className="space-y-3">
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

            {/* Judge Chat View */}
            {judgeView === 'chat' && show.judge_data?.banter && (
              <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
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
          </div>
        )}

        {/* Rivalry Commentary Section */}
        {show.judge_data?.rivalry_comment && (
          <div className="bg-slate-800/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {(() => {
                  const commentJudge = judgeProfiles.find(j => j.key === show.judge_data.rivalry_comment.judge);
                  return commentJudge?.emoji || '🎭';
                })()}
              </span>
              <span className="text-sm font-bold text-slate-300">
                {(() => {
                  const commentJudge = judgeProfiles.find(j => j.key === show.judge_data.rivalry_comment.judge);
                  return commentJudge?.name || 'Judge';
                })()} • Rivalry Recap
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {show.judge_data.rivalry_comment.text}
            </p>
          </div>
        )}

        {/* Artifacts Section */}
        {show.judge_data?.artifacts && show.judge_data.artifacts.length > 0 && (
          <div className="space-y-3 mb-6">
            {show.judge_data.artifacts.map((artifact, idx) => {
              // Get icon and label based on artifact type
              const artifactConfig = {
                'celebrity_match': { icon: '⭐', label: 'Celebrity Match' },
                'fake_headline': { icon: '📰', label: 'Fake Headline' },
                'fact_check': { icon: '✅', label: 'Fact Check' }
              };
              const config = artifactConfig[artifact.type] || { icon: '💡', label: 'Artifact' };
              
              return (
                <div key={idx} className="bg-slate-800/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm font-bold text-slate-300">
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {artifact.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Brain Boost Section */}
        <div className="bg-slate-800/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <span className="text-sm font-bold text-slate-300">
              You Boosted Your Brain
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {verdictBrainBoosts[Math.floor(Math.random() * verdictBrainBoosts.length)]}
          </p>
        </div>

        {/* Back to Current Show Button */}
        <button
          onClick={() => onNavigate('screen1')}
          className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
        >
          Back to Current Show
        </button>

      </div>
    </div>
  );
}