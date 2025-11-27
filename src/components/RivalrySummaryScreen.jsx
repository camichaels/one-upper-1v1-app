import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RIVALRY_LENGTH } from '../config';
import Header from './Header';
import GoldenMic from '../assets/microphone.svg';
import ShareCard from './ShareCard';
import { shareAsImage } from '../utils/shareUtils';

export default function RivalrySummaryScreen({ rivalryId, onNavigate, activeProfileId, context, returnProfileId }) {
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rivalry, setRivalry] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [allShows, setAllShows] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState(null);

  // Determine if we came from history browsing or just completed a rivalry
  const isFromHistory = context === 'from_history';

  useEffect(() => {
    loadSummary();
    loadAllShows();
  }, []);

  async function loadAllShows() {
    try {
      const { data: shows, error: showsError } = await supabase
        .from('shows')
        .select('*')
        .eq('rivalry_id', rivalryId)
        .eq('status', 'complete')
        .order('show_number', { ascending: false });
      
      if (!showsError && shows) {
        setAllShows(shows);
      }
    } catch (err) {
      console.error('Failed to load shows:', err);
    }
  }

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
        // Generate new summary - show generating state
        setIsGenerating(true);
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

  function handleBack() {
    if (isFromHistory && returnProfileId) {
      // Go back to past rivalries list
      onNavigate('pastRivalries', { profileId: returnProfileId });
    } else {
      // Go back to main screen
      onNavigate('screen1');
    }
  }

  function handleChallengeNewFriend() {
    // Navigate back to Screen1
    onNavigate('screen1');
  }

  async function handleShareSummary() {
    if (!summary || !rivalry) return;
    
    setIsSharing(true);
    setShareMessage(null);
    
    try {
      const result = await shareAsImage({
        elementId: 'share-card',
        fileName: 'one-upper-result.png',
        shareTitle: 'One-Upper Result',
        shareText: 'Challenge me on One-Upper!\nhttps://oneupper.app'
      });
      
      if (result.success) {
        if (result.method === 'download-copy') {
          setShareMessage('Image downloaded & text copied!');
        } else if (result.method === 'share-text-download-image') {
          setShareMessage('Image downloaded!');
        }
        // Clear message after 3 seconds
        setTimeout(() => setShareMessage(null), 3000);
      }
    } catch (err) {
      console.error('Share failed:', err);
      setShareMessage('Share failed. Please try again.');
      setTimeout(() => setShareMessage(null), 3000);
    } finally {
      setIsSharing(false);
    }
  }

  // Function to skip summary and go home
  async function handleSkipSummary() {
    try {
      // Mark rivalry as complete without summary
      await supabase
        .from('rivalries')
        .update({ 
          status: 'complete',
          ended_at: new Date().toISOString()
        })
        .eq('id', rivalryId);
      
      onNavigate('screen1');
    } catch (err) {
      console.error('Failed to skip summary:', err);
      onNavigate('screen1');
    }
  }

  function handleViewShow(show) {
    // Pass context so Screen6Summary knows where to return
    onNavigate('screen6summary', { 
      showId: show.id, 
      rivalryId: rivalryId,
      context: isFromHistory ? 'from_history' : 'from_rivalry_summary',
      returnProfileId: returnProfileId
    });
  }

  // Get a random prompt from the shows for the share card
  function getRandomPrompt() {
    if (allShows.length === 0) return "What's the worst thing to say at a job interview?";
    const randomShow = allShows[Math.floor(Math.random() * allShows.length)];
    return randomShow.prompt;
  }

  // Loading state - only show "generating" if we're actually generating
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          {isGenerating ? (
            <>
              <div className="text-orange-500 text-2xl mb-4 animate-pulse">
                ✨ Generating rivalry summary...
              </div>
              <div className="text-slate-400 text-sm">
                Analyzing {RIVALRY_LENGTH} shows of creative brilliance
              </div>
            </>
          ) : (
            <div className="text-slate-400 text-lg animate-pulse">
              Loading...
            </div>
          )}
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
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold disabled:opacity-50"
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            )}
          </div>
          <div className="space-y-3">
            <button
              onClick={handleSkipSummary}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 transition-all font-semibold"
            >
              Skip Summary & Go Home
            </button>
          </div>
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

  // Determine winner/loser names for share card (always show winner first)
  const winnerProfile = iWon ? myProfile : opponentProfile;
  const loserProfile = iWon ? opponentProfile : myProfile;
  const winnerScore = iWon ? myWins : opponentWins;
  const loserScore = iWon ? opponentWins : myWins;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
      <Header />
      
      {/* Hidden ShareCard for image generation */}
      <div className="absolute -left-[9999px] top-0">
        <ShareCard
          winnerName={winnerProfile.name}
          loserName={loserProfile.name}
          winnerScore={winnerScore}
          loserScore={loserScore}
          stakes={rivalry.stakes}
          samplePrompt={getRandomPrompt()}
          rivalryId={rivalryId}
        />
      </div>
      
      <div className="max-w-2xl mx-auto mt-2 space-y-6 pb-24">
        
        {/* Back Button - Only show when viewing from history */}
        {isFromHistory && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>Back to History</span>
          </button>
        )}

        {/* Final Score Header */}
        <div className="text-center space-y-3">
          {/* Golden Mic - only shown for winner */}
          {iWon && (
            <img src={GoldenMic} alt="Golden Mic" className="w-16 h-16 mx-auto" />
          )}
          
          <h1 className="text-3xl font-bold text-slate-100">
            {iWon ? 'You Won the Golden Mic!' : `${opponentProfile.name} Won the Golden Mic`}
          </h1>

          {/* Stakes display */}
          {rivalry.stakes && (
            <p className="text-lg">
              {iWon ? (
                <span className="text-orange-400 font-semibold">+ {rivalry.stakes} from {opponentProfile.name}</span>
              ) : (
                <span className="text-slate-400">You owe {opponentProfile.name}: <span className="text-orange-400 font-semibold">{rivalry.stakes}</span></span>
              )}
            </p>
          )}
          
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
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-orange-400">Memorable Moments</h2>
            <div className="space-y-4">
              {summary.memorable_moments.map((moment, index) => (
                <p key={index} className="text-slate-200 leading-relaxed">
                  {moment}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Share Button - always visible */}
        <button
          onClick={handleShareSummary}
          disabled={isSharing}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-all font-semibold disabled:opacity-50"
        >
          {isSharing ? 'Generating...' : 'Share Rivalry Result'}
        </button>
        
        {/* Share feedback message */}
        {shareMessage && (
          <p className="text-center text-sm text-slate-400">{shareMessage}</p>
        )}

        {/* Past Shows - Collapsible */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full py-3 bg-slate-800/50 border border-slate-700 rounded-lg font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-slate-200"
        >
          {showHistory ? (
            <>
              Hide Past Shows
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              See Past Shows
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>

        {showHistory && allShows.length > 0 && (
          <div className="space-y-3">
            {allShows.map((show) => (
              <button
                key={show.id}
                onClick={() => handleViewShow(show)}
                className="w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:bg-slate-700 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-semibold text-slate-100">Show {show.show_number} of {RIVALRY_LENGTH}</p>
                    <p className="text-sm text-slate-400 line-clamp-1">{show.prompt}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {show.winner_id === activeProfileId && (
                      <img src={GoldenMic} alt="Won" className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons - Different based on context */}
        <div className="space-y-3">
          {isFromHistory ? (
            /* Viewing from history - show back button */
            <button
              onClick={handleBack}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
            >
              ← Back to Rivalry History
            </button>
          ) : (
            /* Just completed rivalry - show start new rivalry */
            <button
              onClick={handleChallengeNewFriend}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
            >
              Start a New Rivalry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}