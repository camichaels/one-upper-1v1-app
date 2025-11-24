import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RIVALRY_LENGTH } from '../config';
import Header from './Header';

export default function RivalrySummaryScreen({ rivalryId, onNavigate, activeProfileId }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [rivalry, setRivalry] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      // Fetch rivalry with player profiles
      const { data: rivalryData, error: rivalryError } = await supabase
        .from('rivalries')
        .select(`
          *,
          profile_a:profiles!rivalries_profile_a_id_fkey(id, name, avatar, code),
          profile_b:profiles!rivalries_profile_b_id_fkey(id, name, avatar, code)
        `)
        .eq('id', rivalryId)
        .single();
      
      if (rivalryError) throw rivalryError;
      
      setRivalry(rivalryData);
      
      // If summary already exists, use it
      if (rivalryData.summary) {
        const parsedSummary = typeof rivalryData.summary === 'string' 
          ? JSON.parse(rivalryData.summary) 
          : rivalryData.summary;
        setSummary(parsedSummary);
        setLoading(false);
      } else {
        // Generate new summary
        await generateSummary();
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
      setError('Failed to load rivalry data');
      setLoading(false);
    }
  }

  async function generateSummary() {
    try {
      setIsRetrying(true);
      
      const { data, error } = await supabase.functions.invoke('summarize-rivalry', {
        body: { rivalryId }
      });
      
      if (error) throw error;
      
      setSummary(data);
      setLoading(false);
      setIsRetrying(false);
      setError(null);
    } catch (err) {
      console.error('Failed to generate summary:', err);
      setError('Failed to generate AI summary. Please try again.');
      setLoading(false);
      setIsRetrying(false);
    }
  }

  async function handleRetry() {
    if (retryCount >= 3) {
      setError('Maximum retry attempts reached. Please contact support.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
    await generateSummary();
  }

  async function handleRematch() {
    if (!rivalry) return;
    
    try {
      // Determine opponent
      const opponentId = rivalry.profile_a_id === activeProfileId 
        ? rivalry.profile_b_id 
        : rivalry.profile_a_id;
      
      // Create new rivalry with same opponent
      const { data: newRivalry, error: rivalryError } = await supabase
        .from('rivalries')
        .insert({
          profile_a_id: activeProfileId,
          profile_b_id: opponentId,
          status: 'active',
          first_show_started: false,
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (rivalryError) throw rivalryError;
      
      // Get intro emcee text for new rivalry
      const { data: emceeData, error: emceeError } = await supabase.functions.invoke('select-emcee-line', {
        body: {
          rivalryId: newRivalry.id,
          showNumber: 0,
          triggerType: 'rivalry_intro'
        }
      });
      
      if (emceeError) {
        console.error('Failed to get intro text:', emceeError);
      }
      
      // Update rivalry with intro text
      if (emceeData?.emcee_text) {
        await supabase
          .from('rivalries')
          .update({ intro_emcee_text: emceeData.emcee_text })
          .eq('id', newRivalry.id);
      }
      
      // Navigate to game with new rivalry
      onNavigate('screen4', {
        activeProfileId,
        rivalryId: newRivalry.id
      });
      
    } catch (err) {
      console.error('Failed to create rematch:', err);
      alert('Failed to start rematch. Please try again.');
    }
  }

  function handleChallengeNewFriend() {
    // Navigate back to Screen1
    onNavigate('screen1');
  }

  function handleShareSummary() {
    // Simple text copy for now (stub for future image generation)
    if (!summary || !rivalry) return;
    
    const myProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_a : rivalry.profile_b;
    const opponentProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_b : rivalry.profile_a;
    const myWins = rivalry.profile_a_id === activeProfileId 
      ? summary.final_score.player_a_wins 
      : summary.final_score.player_b_wins;
    const opponentWins = rivalry.profile_a_id === activeProfileId 
      ? summary.final_score.player_b_wins 
      : summary.final_score.player_a_wins;
    
    const shareText = `I just ${myWins > opponentWins ? 'beat' : 'lost to'} ${opponentProfile.name} ${myWins}-${opponentWins} in a ${RIVALRY_LENGTH}-show One-Upper rivalry! 🎤\n\nChallenge me: oneupper.app`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Summary copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy summary');
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-orange-500 text-2xl mb-4 animate-pulse">
            ✨ Generating rivalry summary...
          </div>
          <div className="text-slate-400 text-sm">
            Analyzing {RIVALRY_LENGTH} shows of creative brilliance
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Header />
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-slate-800 border-2 border-red-500/50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-red-400 mb-3">⚠️ Something Went Wrong</h2>
            <p className="text-slate-300 mb-4">{error}</p>
            {retryCount < 3 && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold disabled:opacity-50"
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            )}
          </div>
          <button
            onClick={handleChallengeNewFriend}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 transition-all font-semibold"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Success state - show summary
  if (!summary || !rivalry) {
    return null;
  }

  // Determine which profile is "me" and which is opponent
  const myProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_a : rivalry.profile_b;
  const opponentProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_b : rivalry.profile_a;
  const myWins = rivalry.profile_a_id === activeProfileId 
    ? summary.final_score.player_a_wins 
    : summary.final_score.player_b_wins;
  const opponentWins = rivalry.profile_a_id === activeProfileId 
    ? summary.final_score.player_b_wins 
    : summary.final_score.player_a_wins;
  const iWon = myWins > opponentWins;
  const tiebreaker = summary.final_score.tiebreaker;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
      <Header />
      
      <div className="max-w-2xl mx-auto mt-6 space-y-6 pb-24">
        
        {/* Final Score Header */}
        <div className="text-center space-y-3">
          {/* Golden Mic - prominent display */}
          <div className={`text-6xl ${iWon ? '' : 'opacity-40'}`}>🎤</div>
          
          <h1 className="text-3xl font-bold text-slate-100">
            {iWon ? 'You Won the Golden Mic!' : `${opponentProfile.name} Won the Golden Mic`}
          </h1>
          
          <div className="text-5xl font-bold">
            <span className={iWon ? 'text-orange-500' : 'text-slate-400'}>
              {myWins}
            </span>
            <span className="text-slate-500 mx-3">-</span>
            <span className={!iWon ? 'text-orange-500' : 'text-slate-400'}>
              {opponentWins}
            </span>
          </div>
          {tiebreaker && (
            <p className="text-sm text-slate-400">
              {tiebreaker}
            </p>
          )}
          <p className="text-slate-300">
            vs {opponentProfile.name} {opponentProfile.avatar}
          </p>
        </div>

        {/* Rivalry Analysis */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-orange-400">Rivalry Analysis</h2>
          <p className="text-slate-200 leading-relaxed whitespace-pre-line">
            {summary.analysis}
          </p>
        </div>

        {/* Player Profiles */}
        <div className="grid grid-cols-2 gap-4">
          {/* My Profile */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
            <div className="text-center">
              <div className="text-3xl mb-2">{myProfile.avatar}</div>
              <p className="font-semibold text-slate-100">{myProfile.name}</p>
              <p className="text-sm text-slate-400">You</p>
            </div>
            <div className="text-center pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Your Style</p>
              <p className="text-sm text-slate-200">{summary.player_profiles.player_a_style}</p>
            </div>
          </div>

          {/* Opponent Profile */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
            <div className="text-center">
              <div className="text-3xl mb-2">{opponentProfile.avatar}</div>
              <p className="font-semibold text-slate-100">{opponentProfile.name}</p>
              <p className="text-sm text-slate-400">Opponent</p>
            </div>
            <div className="text-center pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Their Style</p>
              <p className="text-sm text-slate-200">{summary.player_profiles.player_b_style}</p>
            </div>
          </div>
        </div>

        {/* Memorable Moments */}
        {summary.memorable_moments && summary.memorable_moments.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-3">
            <h2 className="text-xl font-bold text-orange-400">Memorable Moments</h2>
            <ul className="space-y-2">
              {summary.memorable_moments.map((moment, index) => (
                <li key={index} className="text-slate-200 leading-relaxed">
                  • {moment}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRematch}
              className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
            >
              Rematch {opponentProfile.name}
            </button>
            <button
              onClick={handleChallengeNewFriend}
              className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 transition-all font-semibold"
            >
              Challenge New Friend
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShareSummary}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-all font-semibold"
          >
            📋 Share Summary
          </button>
        </div>
      </div>
    </div>
  );
}