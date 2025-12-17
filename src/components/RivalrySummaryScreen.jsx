import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RIVALRY_LENGTH } from '../config';
import Header from './Header';
import GoldenMic from '../assets/microphone.svg';
import ShareCard from './ShareCard';
import { shareAsImage } from '../utils/shareUtils';
import RematchModal from './RematchModal';

// Helper function to normalize old summary format to new format
function normalizeSummary(summary, rivalry) {
  // Check if it's already new format (has ai_generated)
  if (summary.ai_generated) {
    return summary;
  }

  // Old format detected - convert to new format
  const profileA = rivalry.profile_a;
  const profileB = rivalry.profile_b;
  
  // Determine winner from old format (winner_id was at top level)
  const winnerId = summary.winner_id || summary.final_score?.winner_id;
  const isWinnerA = winnerId === profileA?.id;
  
  const winnerProfile = isWinnerA ? profileA : profileB;
  const loserProfile = isWinnerA ? profileB : profileA;
  
  const winnerWins = isWinnerA 
    ? (summary.final_score?.player_a_wins || 0)
    : (summary.final_score?.player_b_wins || 0);
  const loserWins = isWinnerA 
    ? (summary.final_score?.player_b_wins || 0)
    : (summary.final_score?.player_a_wins || 0);

  // Build normalized summary
  return {
    final_score: {
      winner_id: winnerId,
      winner_name: winnerProfile?.name || 'Winner',
      loser_name: loserProfile?.name || 'Opponent',
      winner_wins: winnerWins,
      loser_wins: loserWins,
      winner_total_points: isWinnerA 
        ? (summary.final_score?.player_a_total_points || 0)
        : (summary.final_score?.player_b_total_points || 0),
      loser_total_points: isWinnerA
        ? (summary.final_score?.player_b_total_points || 0)
        : (summary.final_score?.player_a_total_points || 0),
      tiebreaker: summary.final_score?.tiebreaker || null
    },
    ai_generated: {
      headline: "A Rivalry for the Ages", // Fallback headline for old rivalries
      ripley_analysis: summary.analysis || "A hard-fought rivalry between two competitors.",
      ripley_tip: "Keep practicing and come back stronger next time.",
      winner_style: {
        short: summary.player_profiles?.player_a_style && isWinnerA 
          ? truncateStyle(summary.player_profiles.player_a_style)
          : summary.player_profiles?.player_b_style && !isWinnerA
            ? truncateStyle(summary.player_profiles.player_b_style)
            : "Creative competitor",
        detail: isWinnerA 
          ? (summary.player_profiles?.player_a_style || "Brought their A-game.")
          : (summary.player_profiles?.player_b_style || "Brought their A-game.")
      },
      loser_style: {
        short: summary.player_profiles?.player_b_style && isWinnerA
          ? truncateStyle(summary.player_profiles.player_b_style)
          : summary.player_profiles?.player_a_style && !isWinnerA
            ? truncateStyle(summary.player_profiles.player_a_style)
            : "Worthy opponent",
        detail: isWinnerA
          ? (summary.player_profiles?.player_b_style || "Put up a good fight.")
          : (summary.player_profiles?.player_a_style || "Put up a good fight.")
      }
    },
    stats: {
      // Old format didn't have stats, so we provide null values
      biggest_blowout: null,
      closest_round: null,
      judges_favorite: null,
      unanimous_rounds: null
    }
  };
}

// Helper to clean up style text (no truncation - show full title)
function truncateStyle(styleText) {
  if (!styleText) return "Creative player";
  return styleText;
}

// Stats configuration for carousel - format functions receive (stat, allShows, rivalry)
const STAT_CONFIGS = [
  {
    key: 'biggest_blowout',
    emoji: '🔥',
    label: 'Biggest Blowout',
    format: (stat) => stat ? `Round ${stat.round}: ${stat.winner_name} (+${stat.margin})` : null,
    getContext: (stat, allShows) => {
      if (!stat || !allShows) return null;
      const show = allShows.find(s => s.show_number === stat.round);
      return show ? `"${show.prompt}"` : null;
    }
  },
  {
    key: 'closest_round',
    emoji: '😤',
    label: 'Closest Round',
    format: (stat) => stat ? `Round ${stat.round}: ${stat.winner_name} (+${stat.margin})` : null,
    getContext: (stat, allShows) => {
      if (!stat || !allShows) return null;
      const show = allShows.find(s => s.show_number === stat.round);
      return show ? `"${show.prompt}"` : null;
    }
  },
  {
    key: 'judges_favorite',
    emoji: '💕',
    label: "Judge's Favorite",
    format: (stat) => stat ? `${stat.judge_emoji} ${stat.judge_name} loved ${stat.favored_player}` : null,
    getContext: (stat) => stat ? `(+${stat.avg_margin} avg point edge)` : null
  },
  {
    key: 'unanimous_rounds',
    emoji: '🎯',
    label: 'Unanimous Decisions',
    format: (stat, allShows, rivalry, activeProfileId) => {
      if (stat === null || stat === undefined) return null;
      return `${stat} round${stat !== 1 ? 's' : ''} with full judge agreement`;
    },
    getContext: (stat, allShows) => {
      // We'd need to know which rounds were unanimous - for now just show count
      return null;
    }
  }
];

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
  
  // New state for animations and UI
  const [showMicAnimation, setShowMicAnimation] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [currentStatIndex, setCurrentStatIndex] = useState(0);
  const [showStyleModal, setShowStyleModal] = useState(null); // 'winner' | 'loser' | null
  const [animationTriggered, setAnimationTriggered] = useState(false);
  const [showRematchModal, setShowRematchModal] = useState(false);
  
  // Staged reveal animation
  const [revealStage, setRevealStage] = useState(0);

  // Determine if we came from history browsing or just completed a rivalry
  const isFromHistory = context === 'from_history';
  const isReturningFromRound = context === 'from_rivalry_summary';

  // Check if we've already shown animation for this rivalry
  const animationKey = `micAnimation_${rivalryId}`;
  const hasSeenAnimation = sessionStorage.getItem(animationKey) === 'true';

  useEffect(() => {
    loadSummary();
    loadAllShows();
  }, []);

  // Mark summary as seen when it loads successfully
  useEffect(() => {
    if (summary && rivalry && activeProfileId) {
      markSummaryAsSeen();
    }
  }, [summary, rivalry, activeProfileId]);

  async function markSummaryAsSeen() {
    try {
      const isProfileA = activeProfileId === rivalry.profile_a_id;
      const column = isProfileA ? 'profile_a_seen_summary' : 'profile_b_seen_summary';
      
      await supabase
        .from('rivalries')
        .update({ [column]: true })
        .eq('id', rivalryId);
    } catch (err) {
      // Non-critical - don't block the UI if this fails
      console.error('Failed to mark summary as seen:', err);
    }
  }

  // Trigger mic animation for winner after summary loads (only once ever)
  useEffect(() => {
    if (summary && rivalry && !animationTriggered) {
      setAnimationTriggered(true);
      
      const iWon = summary.final_score.winner_id === activeProfileId;
      const shouldAnimate = iWon && !isFromHistory && !isReturningFromRound && !hasSeenAnimation;
      
      if (shouldAnimate) {
        setShowMicAnimation(true);
        sessionStorage.setItem(animationKey, 'true');
        // After animation, reveal content with staged delays
        setTimeout(() => {
          setShowMicAnimation(false);
          setAnimationComplete(true);
          // Stage 0: headline/score (immediate)
          setRevealStage(1);
          // Stage 1: Ripley analysis
          setTimeout(() => setRevealStage(2), 800);
          // Stage 2: Player cards
          setTimeout(() => setRevealStage(3), 1600);
          // Stage 3: Ripley tips
          setTimeout(() => setRevealStage(4), 2400);
          // Stage 4: Buttons
          setTimeout(() => setRevealStage(5), 3000);
        }, 2500);
      } else {
        // No animation - show content immediately (skip staged reveals)
        setAnimationComplete(true);
        setRevealStage(5);
      }
    }
  }, [summary, rivalry, animationTriggered]);

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
          profile_a:profiles!rivalries_profile_a_id_fkey(id, name, avatar, code, phone, sms_consent),
          profile_b:profiles!rivalries_profile_b_id_fkey(id, name, avatar, code, phone, sms_consent)
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
        // Normalize to new format (handles old rivalries)
        const normalizedSummary = normalizeSummary(parsedSummary, rivalryData);
        setSummary(normalizedSummary);
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
      setIsGenerating(false);
      setIsRetrying(false);
      setError(null);
    } catch (err) {
      console.error('Failed to generate summary:', err);
      
      // Wait a few seconds - the edge function might still be completing
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check if summary was actually generated despite the error (race condition / timeout)
      const { data: checkRivalry } = await supabase
        .from('rivalries')
        .select('summary')
        .eq('id', rivalryId)
        .single();
      
      if (checkRivalry?.summary) {
        // Summary exists! Use it instead of showing error
        const parsedSummary = typeof checkRivalry.summary === 'string'
          ? JSON.parse(checkRivalry.summary)
          : checkRivalry.summary;
        setSummary(parsedSummary);
        setLoading(false);
        setIsGenerating(false);
        setIsRetrying(false);
        setError(null);
        return;
      }
      
      setError('Failed to generate AI summary. Please try again.');
      setLoading(false);
      setIsGenerating(false);
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

  // Stats carousel navigation
  function handleNextStat() {
    setCurrentStatIndex((prev) => (prev + 1) % STAT_CONFIGS.length);
  }

  function handlePrevStat() {
    setCurrentStatIndex((prev) => (prev - 1 + STAT_CONFIGS.length) % STAT_CONFIGS.length);
  }

  // Get a random prompt from the shows for the share card
  function getRandomPrompt() {
    if (allShows.length === 0) return "What's the worst thing to say at a job interview?";
    const randomShow = allShows[Math.floor(Math.random() * allShows.length)];
    return randomShow.prompt;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          {isGenerating ? (
            <>
              <div className="text-6xl mb-4 animate-pulse">🎙️</div>
              <div className="text-orange-500 text-xl mb-2">
                Ripley is reviewing the tapes...
              </div>
              <div className="text-slate-400 text-sm">
                Analyzing {RIVALRY_LENGTH} rounds of creative chaos
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

  // Determine win/loss using new summary structure
  const iWon = summary.final_score.winner_id === activeProfileId;
  const winnerName = summary.final_score.winner_name;
  const loserName = summary.final_score.loser_name;
  const winnerWins = summary.final_score.winner_wins;
  const loserWins = summary.final_score.loser_wins;
  const tiebreaker = summary.final_score.tiebreaker;

  // Get profiles
  const myProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_a : rivalry.profile_b;
  const opponentProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_b : rivalry.profile_a;

  // Determine which style is mine vs opponent (with safe fallbacks)
  const defaultStyle = { short: "Creative competitor", detail: "Brought their best to this rivalry." };
  const winnerStyle = summary.ai_generated?.winner_style || defaultStyle;
  const loserStyle = summary.ai_generated?.loser_style || defaultStyle;
  const myStyle = iWon ? winnerStyle : loserStyle;
  const opponentStyle = iWon ? loserStyle : winnerStyle;

  // Get current stat for carousel (with safe fallback for old rivalries)
  const currentStatConfig = STAT_CONFIGS[currentStatIndex];
  const currentStatValue = summary.stats?.[currentStatConfig.key] ?? null;
  const currentStatDisplay = currentStatConfig.format(currentStatValue);
  const currentStatContext = currentStatConfig.getContext ? currentStatConfig.getContext(currentStatValue, allShows) : null;
  
  // Check if any stats are available (for old rivalries, may be all null)
  const hasAnyStats = summary.stats && Object.values(summary.stats).some(v => v !== null && v !== undefined);

  // Winner animation screen
  if (showMicAnimation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <img 
            src={GoldenMic} 
            alt="Golden Mic" 
            className="w-32 h-32 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]"
          />
          <h1 className="text-3xl font-bold text-orange-400 mb-2">
            You Won!
          </h1>
          <p className="text-slate-300">
            The Golden Mic is yours
          </p>
        </div>
      </div>
    );
  }

  // Wait for animation to complete before showing content
  if (!animationComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
      <Header />
      
      {/* Hidden ShareCard for image generation */}
      <div className="absolute -left-[9999px] top-0">
        <ShareCard
          winnerName={winnerName}
          loserName={loserName}
          winnerScore={winnerWins}
          loserScore={loserWins}
          stakes={rivalry.stakes}
          samplePrompt={getRandomPrompt()}
          rivalryId={rivalryId}
        />
      </div>
      
      <div className="max-w-2xl mx-auto mt-2 space-y-5 pb-24">
        
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

        {/* Golden Mic + Headline + Score */}
        <div className={`text-center space-y-3 transition-all duration-500 ${revealStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Golden Mic - only show for winner */}
          {iWon && (
            <img 
              src={GoldenMic} 
              alt="Golden Mic" 
              className="w-16 h-16 mx-auto drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]"
            />
          )}
          
          {/* AI-Generated Headline - no quotes */}
          <h1 className="text-2xl font-bold text-slate-100 px-4">
            {summary.ai_generated?.headline || 'A Rivalry for the Ages'}
          </h1>

          {/* Score: Winner: X • Loser: Y */}
          <div className="text-xl text-slate-300">
            <span className="text-orange-400 font-bold">{winnerName}: {winnerWins}</span>
            <span className="text-slate-500 mx-2">•</span>
            <span>{loserName}: {loserWins}</span>
          </div>

          {/* Tiebreaker if applicable */}
          {tiebreaker && (
            <p className="text-sm text-slate-400">
              {tiebreaker}
            </p>
          )}

          {/* Stakes display */}
          {rivalry.stakes && (
            <p className="text-base">
              {iWon ? (
                <span className="text-orange-400 font-semibold">🎯 You won: {rivalry.stakes}</span>
              ) : (
                <span className="text-slate-400">🎯 You owe: <span className="text-orange-400 font-semibold">{rivalry.stakes}</span></span>
              )}
            </p>
          )}
        </div>

        {/* Ripley Analysis - inline format */}
        <div className={`bg-slate-800/50 rounded-xl p-5 transition-all duration-500 ${revealStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-slate-200 leading-relaxed">
            <span className="text-xl mr-2">🎙️</span>
            {summary.ai_generated?.ripley_analysis || "A hard-fought rivalry between two worthy competitors."}
          </p>
        </div>

        {/* Player Style Cards - animate from edges */}
        <div className="grid grid-cols-2 gap-3">
          {/* My Style - slides in from left */}
          <button
            onClick={() => setShowStyleModal('me')}
            className={`bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center hover:bg-slate-700/50 transition-all duration-500 ${revealStage >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">{myProfile.avatar}</span>
              <span className="font-semibold text-slate-100 text-sm">{myProfile.name}</span>
            </div>
            <p className="text-orange-400 text-sm font-medium">{myStyle.short}</p>
          </button>

          {/* Opponent Style - slides in from right */}
          <button
            onClick={() => setShowStyleModal('opponent')}
            className={`bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center hover:bg-slate-700/50 transition-all duration-500 delay-100 ${revealStage >= 3 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">{opponentProfile.avatar}</span>
              <span className="font-semibold text-slate-100 text-sm">{opponentProfile.name}</span>
            </div>
            <p className="text-orange-400 text-sm font-medium">{opponentStyle.short}</p>
          </button>
        </div>

        {/* Ripley's Tips */}
        <div className={`bg-slate-800/50 rounded-xl p-5 transition-all duration-500 ${revealStage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎙️</span>
            <span className="text-orange-400 font-semibold">Ripley's Tips</span>
          </div>
          <p className="text-slate-200 leading-relaxed">
            {summary.ai_generated?.ripley_tip || "Keep practicing and come back stronger next time."}
          </p>
        </div>

        {/* Past Rounds - Collapsible */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`w-full py-3 bg-slate-800/50 border border-slate-700 rounded-xl font-semibold hover:bg-slate-700 transition-all duration-500 flex items-center justify-center gap-2 text-slate-200 ${revealStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {showHistory ? (
            <>
              Hide the Rounds
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              Relive the Rounds
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
                    <p className="font-semibold text-slate-100">Round {show.show_number}</p>
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

        {/* Action Buttons */}
        <div className={`flex gap-3 transition-all duration-500 ${revealStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={handleShareSummary}
            disabled={isSharing}
            className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 text-slate-200 rounded-xl hover:bg-slate-600 transition-all font-semibold disabled:opacity-50"
          >
            {isSharing ? '...' : 'Share'}
          </button>
          
          {isFromHistory ? (
            <button
              onClick={handleBack}
              className="flex-[2] px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold"
            >
              ← Back to History
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowRematchModal(true)}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-400 transition-all font-semibold"
              >
                Rematch
              </button>
              <button
                onClick={handleChallengeNewFriend}
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 text-slate-200 rounded-xl hover:bg-slate-600 transition-all font-semibold"
              >
                New Rivalry
              </button>
            </>
          )}
        </div>
        
        {/* Share feedback message */}
        {shareMessage && (
          <p className="text-center text-sm text-slate-400">{shareMessage}</p>
        )}
      </div>

      {/* Style Detail Modal - no quotes */}
      {showStyleModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
          onClick={() => setShowStyleModal(null)}
        >
          <div 
            className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {showStyleModal === 'me' ? (
              <>
                <div className="text-center mb-4">
                  <span className="text-5xl">{myProfile.avatar}</span>
                  <h3 className="text-xl font-bold text-slate-100 mt-2">{myProfile.name}</h3>
                  <p className="text-orange-400 font-medium mt-1">{myStyle.short}</p>
                </div>
                <p className="text-slate-300 text-center leading-relaxed">
                  {myStyle.detail?.endsWith('.') ? myStyle.detail : `${myStyle.detail}.`}
                </p>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <span className="text-5xl">{opponentProfile.avatar}</span>
                  <h3 className="text-xl font-bold text-slate-100 mt-2">{opponentProfile.name}</h3>
                  <p className="text-orange-400 font-medium mt-1">{opponentStyle.short}</p>
                </div>
                <p className="text-slate-300 text-center leading-relaxed">
                  {opponentStyle.detail?.endsWith('.') ? opponentStyle.detail : `${opponentStyle.detail}.`}
                </p>
              </>
            )}
            
            <button
              onClick={() => setShowStyleModal(null)}
              className="w-full mt-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-xl transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Rematch Modal */}
      <RematchModal
        isOpen={showRematchModal}
        onClose={(wasSent) => {
          setShowRematchModal(false);
          if (wasSent) {
            onNavigate('screen1');
          }
        }}
        myProfile={myProfile}
        opponent={opponentProfile}
      />
    </div>
  );
}