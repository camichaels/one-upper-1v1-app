import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getRandomPrompt, selectJudges } from '../utils/prompts';
import Header from './Header';
import confetti from 'canvas-confetti';
import HowToPlayModal from './HowToPlayModal';
import GoldenMic from '../assets/microphone.svg';

// Winner declarations (what you see when you win)
const winnerDeclarations = [
  'YOU ONE-UPPED THEM!',
  'YOU CRUSHED IT!',
  'YOU DOMINATED!',
  'YOU BROUGHT THE HEAT!',
  'YOU CAME OUT ON TOP!',
  'YOU OWNED THAT!',
  'YOU SHOWED UP!',
  'YOU TOOK THE W!',
  'YOU WENT OFF!',
  'YOU BODIED THEM!',
  'YOU ATE THAT UP!',
  'YOU COOKED!',
  'YOU SNAPPED!',
  'YOU SLAYED!',
  'FLAWLESS VICTORY!'
];

// Loser declarations (what you see when you lose)
const loserDeclarations = [
  'THEY ONE-UPPED YOU!',
  'THEY CRUSHED IT!',
  'THEY DOMINATED!',
  'THEY BROUGHT THE HEAT!',
  'THEY CAME OUT ON TOP!',
  'THEY OWNED THAT!',
  'THEY SHOWED UP!',
  'THEY TOOK THE W!',
  'THEY WENT OFF!',
  'THEY BODIED YOU!',
  'THEY ATE THAT UP!',
  'THEY COOKED!',
  'NOT YOUR BEST WORK!',
  'MAYBE NEXT TIME!',
  'CLOSE BUT NO CIGAR!'
];

export default function Screen4({ onNavigate, activeProfileId, rivalryId }) {
  const [loading, setLoading] = useState(true);
  const [rivalry, setRivalry] = useState(null);
  const [currentShow, setCurrentShow] = useState(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showJudgeBanter, setShowJudgeBanter] = useState(false);
  const [judgeView, setJudgeView] = useState('scores'); // 'scores' or 'chat'
  const [previousShows, setPreviousShows] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [judgeProfiles, setJudgeProfiles] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isJudgingOwner, setIsJudgingOwner] = useState(false);
  const [judgingTimeout, setJudgingTimeout] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [verdictDeclaration, setVerdictDeclaration] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const confettiShownRef = useRef(new Set()); // Track which shows have shown confetti

  // Load rivalry and current show
  useEffect(() => {
    loadRivalryAndShow();
  }, [activeProfileId, rivalryId]);

  // Real-time subscription for rivalry deletion
  useEffect(() => {
    if (!rivalryId) return;

    const channel = supabase
      .channel(`rivalry-deletion-${rivalryId}`)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'rivalries',
        filter: `id=eq.${rivalryId}`
      }, (payload) => {
        alert('😢 Rivalry Ended\n\nYour opponent cancelled the Rivalry.\n\nYour Show history has been saved.');
        onNavigate('screen1');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rivalryId]);

  // Real-time subscription for rivalry updates (mic holder changes)
  useEffect(() => {
    if (!rivalryId) return;

    const channel = supabase
      .channel(`rivalry-updates-${rivalryId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rivalries',
        filter: `id=eq.${rivalryId}`
      }, (payload) => {
        // Reload rivalry data to get updated mic_holder_id
        loadRivalryAndShow();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rivalryId]);

  // Real-time subscription for show updates
  useEffect(() => {
    if (!currentShow) return;

    const channel = supabase
      .channel(`show-${currentShow.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shows',
          filter: `id=eq.${currentShow.id}`
        },
        (payload) => {
          setCurrentShow(payload.new);
          // Reload previous shows when show completes to update stats
          if (payload.new.status === 'complete') {
            setTimeout(() => {
              loadPreviousShows();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentShow?.id]);

  // Auto-advance countdown after verdict (30 seconds)
  useEffect(() => {
    if (currentShow?.status === 'complete' && autoAdvance) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return 30;
          if (prev <= 1) {
            createNextShow();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [currentShow?.status, autoAdvance]);

  // Judging timeout timer (tracks how long we've been in judging state)
  useEffect(() => {
    if (currentShow?.status === 'judging' && isJudgingOwner) {
      setJudgingTimeout(0);
      const timer = setInterval(() => {
        setJudgingTimeout((prev) => prev + 1);
      }, 1000);

      return () => {
        clearInterval(timer);
        setJudgingTimeout(0);
      };
    } else {
      setJudgingTimeout(0);
    }
  }, [currentShow?.status, isJudgingOwner]);

  // Polling backup for judging state (check every 10 seconds)
  useEffect(() => {
    if (currentShow?.status === 'judging') {
      const pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from('shows')
          .select('*')
          .eq('id', currentShow.id)
          .single();
        
        if (data && data.status !== 'judging') {
          setCurrentShow(data);
          if (data.status === 'complete') {
            setTimeout(() => {
              loadPreviousShows();
            }, 500);
          }
        }
      }, 10000);

      return () => clearInterval(pollInterval);
    }
  }, [currentShow?.id, currentShow?.status]);

  // Fetch judge profiles when show loads
  useEffect(() => {
    if (!currentShow?.judges) return;

    async function fetchJudgeProfiles() {
      const { data, error } = await supabase
        .from('judges')
        .select('*')
        .in('key', currentShow.judges);

      if (!error && data) {
        setJudgeProfiles(data);
      }
    }

    fetchJudgeProfiles();
  }, [currentShow?.judges]);

  // Confetti effect for winner - only fires once per show
  useEffect(() => {
    if (currentShow?.status === 'complete' && 
        currentShow.winner_id === activeProfileId && 
        !confettiShownRef.current.has(currentShow.id)) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      // Mark this show as having shown confetti
      confettiShownRef.current.add(currentShow.id);
    }
  }, [currentShow?.status, currentShow?.winner_id, currentShow?.id, activeProfileId]);

  // Pick random verdict declaration once when verdict appears
  useEffect(() => {
    if (currentShow?.status === 'complete' && currentShow.winner_id && !verdictDeclaration) {
      const isWinner = currentShow.winner_id === activeProfileId;
      const declarations = isWinner ? winnerDeclarations : loserDeclarations;
      let randomDeclaration = declarations[Math.floor(Math.random() * declarations.length)];
      
      // Calculate win streak for milestone callouts (only for winners)
      if (isWinner) {
        let winStreak = 0;
        for (const show of previousShows) {
          if (show.status === 'complete' && show.winner_id === activeProfileId) {
            winStreak++;
          } else {
            break;
          }
        }
        
        // Add streak callout at milestones: 3, 5, 10
        if (winStreak === 3) {
          randomDeclaration += ' 🔥 3-SHOW STREAK!';
        } else if (winStreak === 5) {
          randomDeclaration += ' 🔥🔥 5-SHOW STREAK!';
        } else if (winStreak === 10) {
          randomDeclaration += ' 🔥🔥🔥 10-SHOW STREAK! LEGENDARY!';
        }
      }
      
      setVerdictDeclaration(randomDeclaration);
    }
    // Reset declaration when show changes
    if (currentShow?.status !== 'complete') {
      setVerdictDeclaration('');
    }
  }, [currentShow?.status, currentShow?.winner_id, currentShow?.id, activeProfileId, verdictDeclaration, previousShows]);

  async function loadRivalryAndShow() {
    setLoading(true);

    // Load rivalry with both profiles
    const { data: rivalryData, error: rivalryError } = await supabase
      .from('rivalries')
      .select(`
        *,
        profile_a:profiles!rivalries_profile_a_id_fkey(*),
        profile_b:profiles!rivalries_profile_b_id_fkey(*)
      `)
      .eq('id', rivalryId);

    if (rivalryError) {
      console.error('Error loading rivalry:', rivalryError);
      setLoading(false);
      return;
    }

    setRivalry(rivalryData[0]);

    // Load current show (highest show_number - including complete shows so verdict displays)
    const { data: currentShowData, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('rivalry_id', rivalryId)
      .neq('status', 'skipped')
      .order('show_number', { ascending: false })
      .limit(1);

    if (showError) {
      console.error('Error loading current show:', showError);
    } else if (currentShowData && currentShowData.length > 0) {
      setCurrentShow(currentShowData[0]);
    }

    // Load previous shows
    loadPreviousShows();

    setLoading(false);
  }

  async function loadPreviousShows() {
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .eq('rivalry_id', rivalryId)
      .eq('status', 'complete')
      .order('show_number', { ascending: false });

    if (!error && data) {
      setPreviousShows(data);
    }
  }

  function handleAnswerChange(e) {
    const text = e.target.value;
    setMyAnswer(text);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }

  async function submitAnswer() {
    if (!myAnswer.trim() || wordCount > 30) return;

    const isProfileA = activeProfileId === currentShow.profile_a_id;
    const updateData = isProfileA
      ? {
          profile_a_answer: myAnswer.trim(),
          profile_a_submitted_at: new Date().toISOString()
        }
      : {
          profile_b_answer: myAnswer.trim(),
          profile_b_submitted_at: new Date().toISOString()
        };

    // Check if both players will have submitted
    const bothSubmitted = isProfileA
      ? currentShow.profile_b_answer
      : currentShow.profile_a_answer;

    if (bothSubmitted) {
      updateData.status = 'judging';
      
      // Determine who submitted first (for SMS targeting and verdict notification later)
      const mySubmitTime = new Date().toISOString();
      const opponentSubmitTime = isProfileA 
        ? currentShow.profile_b_submitted_at 
        : currentShow.profile_a_submitted_at;
      
      const iSubmittedFirst = new Date(mySubmitTime) > new Date(opponentSubmitTime);
      const firstSubmitterId = iSubmittedFirst ? opponentProfile.id : activeProfileId;
      
      updateData.first_submitter_id = firstSubmitterId;
    } else {
      // Only one player submitted - send "your_turn" SMS to opponent who hasn't submitted
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            userId: opponentProfile.id,
            notificationType: 'your_turn',
            contextData: {
              opponent: myProfile.name,
              show_num: currentShow.show_number,
              prompt: currentShow.prompt
            }
          }
        });
      } catch (smsErr) {
        console.error('Failed to send your_turn SMS:', smsErr);
        // Don't block gameplay if SMS fails
      }
    }

    const { error } = await supabase
      .from('shows')
      .update(updateData)
      .eq('id', currentShow.id);

    if (error) {
      console.error('Error submitting answer:', error);
      return;
    }

    // If both submitted, trigger judging
    if (bothSubmitted) {
      setIsJudgingOwner(true); // This player owns the judging process
      await triggerJudging();
    }

    setMyAnswer('');
    setWordCount(0);
  }

  async function triggerJudging() {
    try {
      // Call Supabase Edge Function to judge the show with AI
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/judge-show`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            showId: currentShow.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error judging show:', errorData);
        alert('Failed to judge the show. Please try again.');
        return;
      }

      const result = await response.json();
      console.log('Judging complete:', result);
      
      // Reset judge banter visibility
      setShowJudgeBanter(false);

      // Small delay to ensure database is fully updated before reloading
      setTimeout(() => {
        loadPreviousShows();
      }, 500);
      
    } catch (error) {
      console.error('Error in triggerJudging:', error);
      alert('An error occurred while judging. Please try again.');
    }
  }

  async function handleRetryJudging() {
    setIsRetrying(true);
    setJudgingTimeout(0); // Reset timeout counter
    await triggerJudging();
    setIsRetrying(false);
  }

  async function handlePickRandomWinner() {
    try {
      setIsRetrying(true);
      
      // Pick random winner
      const winnerId = Math.random() < 0.5 ? currentShow.profile_a_id : currentShow.profile_b_id;
      const loserId = winnerId === currentShow.profile_a_id ? currentShow.profile_b_id : currentShow.profile_a_id;
      
      // Update show with random winner
      const { error } = await supabase
        .from('shows')
        .update({
          status: 'complete',
          winner_id: winnerId,
          loser_id: loserId,
          verdict: 'Judges were unable to decide. Winner selected randomly.',
          judge_scores: null,
          judge_comments: null
        })
        .eq('id', currentShow.id);

      if (error) throw error;

      // Reset states
      setIsJudgingOwner(false);
      setJudgingTimeout(0);
      setShowJudgeBanter(false);
      setIsRetrying(false);
      
      // Reload to show verdict
      setTimeout(() => {
        loadPreviousShows();
      }, 500);
      
    } catch (error) {
      console.error('Error picking random winner:', error);
      alert('Failed to pick random winner. Please try again.');
      setIsRetrying(false);
    }
  }

  async function handleSkipShow() {
    try {
      // Create next show immediately
      await createNextShow();
      setShowSkipModal(false);
      setIsJudgingOwner(false);
      setJudgingTimeout(0);
    } catch (error) {
      console.error('Error skipping show:', error);
      alert('Failed to skip show. Please try again.');
    }
  }

  async function createNextShow() {
    try {
      setAutoAdvance(true); // Reset auto-advance for next show
      const nextShowNumber = currentShow.show_number + 1;

      // Check if show already exists (avoid race condition)
      const { data: existingShow } = await supabase
        .from('shows')
        .select('*')
        .eq('rivalry_id', rivalryId)
        .eq('show_number', nextShowNumber)
        .single();

      if (existingShow) {
        setCurrentShow(existingShow);
        return;
      }

      // Get a random prompt and judges from database
      const prompt = await getRandomPrompt();
      const judgeObjects = await selectJudges();
      const judgeKeys = judgeObjects.map(j => j.key);

      // Create next show
      const { data: newShow, error } = await supabase
        .from('shows')
        .insert({
          rivalry_id: rivalryId,
          show_number: nextShowNumber,
          prompt_id: prompt.id,
          prompt: prompt.text,
          judges: judgeKeys,
          profile_a_id: rivalry.profile_a_id,
          profile_b_id: rivalry.profile_b_id,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) {
        // If insert fails (409 conflict), fetch the show that was created
        if (error.code === '23505') {
          const { data: fetchedShow } = await supabase
            .from('shows')
            .select('*')
            .eq('rivalry_id', rivalryId)
            .eq('show_number', nextShowNumber)
            .single();
          
          if (fetchedShow) {
            setCurrentShow(fetchedShow);
          }
        } else {
          console.error('Error creating next show:', error);
        }
      } else {
        setCurrentShow(newShow);
      }
    } catch (err) {
      console.error('Error in createNextShow:', err);
    }
  }

  async function sendNudge() {
    try {
      // Check rate limit
      const { data: show } = await supabase
        .from('shows')
        .select('last_nudge_at')
        .eq('id', currentShow.id)
        .single();
      
      if (show?.last_nudge_at) {
        const minutesSinceLastNudge = (Date.now() - new Date(show.last_nudge_at)) / 1000 / 60;
        if (minutesSinceLastNudge < 5) {
          alert('You can only nudge once every 5 minutes ⏰');
          return;
        }
      }
      
      // Send SMS
      await supabase.functions.invoke('send-sms', {
        body: {
          userId: opponentProfile.id,
          notificationType: 'nudge',
          contextData: {
            opponent: myProfile.name
          }
        }
      });
      
      // Update last nudge timestamp
      await supabase
        .from('shows')
        .update({ last_nudge_at: new Date().toISOString() })
        .eq('id', currentShow.id);
      
      alert('Nudge sent! ⚡');
    } catch (err) {
      console.error('Failed to send nudge:', err);
      alert('Failed to send nudge. Try again?');
    }
  }

  async function handleCancelRivalry() {
    try {
      const { error } = await supabase
        .from('rivalries')
        .delete()
        .eq('id', rivalryId);

      if (error) throw error;

      // Send cancellation SMS to opponent
      try {
        await supabase.functions.invoke('send-sms', {
          body: {
            userId: opponentProfile.id,
            notificationType: 'rivalry_cancelled',
            contextData: {
              opponent: myProfile.name
            }
          }
        });
      } catch (smsErr) {
        console.error('Failed to send cancellation SMS:', smsErr);
        // Don't block cancellation if SMS fails
      }

      setShowCancelModal(false);
      onNavigate('screen1');
    } catch (err) {
      console.error('Error canceling rivalry:', err);
      alert('Failed to cancel Rivalry. Please try again.');
    }
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
        <Header />  {/* ← ADD THIS LINE */}
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!rivalry || !currentShow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Header />
        <div className="text-center">
          <div className="text-slate-400 mb-4">
            {isCreatingShow ? 'Creating show...' : 'No active show found'}
          </div>
          <button
            onClick={async () => {
              if (rivalry && !isCreatingShow) {
                setIsCreatingShow(true);
                try {
                  // FIRST: Check if opponent already created a show while we were waiting
                  const { data: checkShow } = await supabase
                    .from('shows')
                    .select('*')
                    .eq('rivalry_id', rivalryId)
                    .neq('status', 'complete')
                    .neq('status', 'skipped')
                    .order('show_number', { ascending: false })
                    .limit(1)
                    .single();
                  
                  if (checkShow) {
                    // Show exists! Just reload
                    await loadRivalryAndShow();
                    setIsCreatingShow(false);
                    return;
                  }
                  
                  // No active show exists, find the next show number
                  const { data: allShows } = await supabase
                    .from('shows')
                    .select('show_number')
                    .eq('rivalry_id', rivalryId)
                    .order('show_number', { ascending: false })
                    .limit(1);
                  
                  const nextShowNumber = allShows && allShows.length > 0 ? allShows[0].show_number + 1 : 1;
                  
                  // Get random prompt and judges
                  const prompt = await getRandomPrompt();
                  const judgeObjects = await selectJudges();
                  const judgeKeys = judgeObjects.map(j => j.key);
                  
                  // Create the show
                  const { data: newShow, error } = await supabase
                    .from('shows')
                    .insert({
                      rivalry_id: rivalryId,
                      show_number: nextShowNumber,
                      prompt_id: prompt.id,
                      prompt: prompt.text,
                      judges: judgeKeys,
                      profile_a_id: rivalry.profile_a_id,
                      profile_b_id: rivalry.profile_b_id,
                      status: 'waiting'
                    })
                    .select()
                    .single();
                  
                  if (error) {
                    // If conflict error, another player created it - just reload
                    if (error.code === '23505') {
                      await loadRivalryAndShow();
                    } else {
                      console.error('Error creating show:', error);
                      alert('Failed to create show. Please try again.');
                    }
                  } else if (newShow) {
                    // Reload to show the new show
                    await loadRivalryAndShow();
                  }
                } catch (err) {
                  console.error('Error in show creation:', err);
                  // Even on error, try to reload in case opponent created it
                  await loadRivalryAndShow();
                } finally {
                  setIsCreatingShow(false);
                }
              } else if (!rivalry) {
                onNavigate('screen1');
              }
            }}
            disabled={isCreatingShow}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rivalry ? (isCreatingShow ? 'Creating...' : 'Start Next Show') : 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  const myProfile = activeProfileId === rivalry.profile_a_id ? rivalry.profile_a : rivalry.profile_b;
  const opponentProfile = activeProfileId === rivalry.profile_a_id ? rivalry.profile_b : rivalry.profile_a;
  
  const myAnswer_db = activeProfileId === currentShow.profile_a_id ? currentShow.profile_a_answer : currentShow.profile_b_answer;
  const opponentAnswer_db = activeProfileId === currentShow.profile_a_id ? currentShow.profile_b_answer : currentShow.profile_a_answer;

  const micHolder = rivalry.mic_holder_id === rivalry.profile_a_id ? rivalry.profile_a : rivalry.profile_b;

  // Determine state
  let state = 'yourTurn';
  if (currentShow.status === 'judging') {
    state = 'judging';
  } else if (currentShow.status === 'complete') {
    state = 'verdict';
  } else if (myAnswer_db) {
    state = 'waiting';
  }

  // Calculate stats for scoreboard
  const myWins = previousShows.filter(s => s.winner_id === activeProfileId).length;
  const opponentWins = previousShows.filter(s => s.winner_id === (activeProfileId === rivalry.profile_a_id ? rivalry.profile_b_id : rivalry.profile_a_id)).length;
  const iAmMicHolder = rivalry.mic_holder_id === activeProfileId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-8">
      <Header />
      <div className="max-w-md mx-auto">
        {/* Scoreboard Cards - Two cards side by side */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* My Card */}
          <div className={`rounded-xl py-3 px-4 transition-all ${
            iAmMicHolder 
              ? 'bg-orange-500/20 ring-1 ring-orange-500/30' 
              : 'bg-slate-700/40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{myProfile.avatar}</span>
              <p className="font-medium text-sm truncate text-slate-100">{myProfile.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {iAmMicHolder && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
              <p className="text-lg font-bold text-slate-100">{myWins} {myWins === 1 ? 'win' : 'wins'}</p>
            </div>
          </div>

          {/* Opponent Card */}
          <div className={`rounded-xl py-3 px-4 transition-all ${
            !iAmMicHolder 
              ? 'bg-orange-500/20 ring-1 ring-orange-500/30' 
              : 'bg-slate-700/40'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{opponentProfile.avatar}</span>
              <p className="font-medium text-sm truncate text-slate-100">{opponentProfile.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {!iAmMicHolder && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
              <p className="text-lg font-bold text-slate-100">{opponentWins} {opponentWins === 1 ? 'win' : 'wins'}</p>
            </div>
          </div>
        </div>

        {/* Show Number Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-8"></div>
          <h2 className="text-xl font-bold text-slate-300">Show #{currentShow.show_number}</h2>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
            >
              ⋮
            </button>
            {showMenu && (
              <>
                {/* Overlay to dismiss menu */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                ></div>
                {/* Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowHowToPlay(true);
                    }}
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    How to Play
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onNavigate('screen2');
                    }}
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    Switch Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onNavigate('screen2', { editProfileId: activeProfileId });
                    }}
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      localStorage.removeItem('activeProfileId');
                      window.location.reload();
                    }}
                    className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
                  >
                    Log Out
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowCancelModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 border-t border-slate-700"
                  >
                    Cancel Rivalry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Winner Declaration - Only show in verdict state */}
        {state === 'verdict' && (
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-orange-500">
              {currentShow.winner_id === activeProfileId && <img src={GoldenMic} alt="mic" className="w-7 h-7" />}
              <span>{verdictDeclaration}</span>
            </div>
          </div>
        )}

        {/* Prompt Section */}
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-slate-100">{currentShow.prompt}</p>
        </div>

        {/* Judges - Only show during 'yourTurn' state */}
        {state === 'yourTurn' && (
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-semibold text-slate-400">Meet the Judges:</h3>
            <div className="flex flex-wrap gap-2">
              {currentShow.judges.map((judgeKey, i) => {
                const judge = judgeProfiles.find(j => j.key === judgeKey);
                return (
                  <button
                    key={i}
                    onClick={() => handleShowJudgeProfile(judgeKey)}
                    className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-slate-200"
                  >
                    {judge?.emoji || '❓'} {judge?.name || judgeKey}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="mb-6">
          {/* State A: Your Turn */}
          {state === 'yourTurn' && (
            <div>
              <textarea
                value={myAnswer}
                onChange={handleAnswerChange}
                placeholder="[Type here...]"
                className="w-full h-32 p-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-500 resize-none mb-2 focus:outline-none focus:border-orange-500 transition-colors"
                maxLength={300}
              />
              <div className="text-sm text-right mb-4">
                <span className={wordCount > 30 ? 'text-red-400' : 'text-slate-400'}>
                  {wordCount}/30 words
                </span>
              </div>
              <button
                onClick={submitAnswer}
                disabled={!myAnswer.trim() || wordCount > 30}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all disabled:bg-slate-600 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                SUBMIT
              </button>
            </div>
          )}

          {/* State B: Waiting */}
          {state === 'waiting' && (
            <div className="text-center py-8 space-y-6">
              <div className="text-green-400 text-xl font-semibold">✓ You submitted</div>
              <div className="text-slate-300 text-lg">⏳ Waiting for {opponentProfile.name}...</div>
              <button
                onClick={sendNudge}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
              >
                NUDGE {opponentProfile.name.toUpperCase()}
              </button>
            </div>
          )}

          {/* Judging State */}
          {state === 'judging' && (
            <div className="text-center py-8 space-y-4">
              <div className="text-xl mb-4 text-slate-200">⏳ JUDGES DELIBERATING...</div>
              <div className="flex justify-center gap-2 text-3xl mb-4">
                {judgeProfiles.map((judge, i) => (
                  <span key={i} className="animate-pulse">
                    {judge.emoji}
                  </span>
                ))}
              </div>

              {/* Timeout messages and recovery options for judging owner */}
              {isJudgingOwner && (
                <>
                  {judgingTimeout >= 30 && judgingTimeout < 60 && (
                    <div className="text-slate-400 text-sm">
                      🤔 This is taking longer than usual...
                    </div>
                  )}

                  {judgingTimeout >= 60 && (
                    <div className="space-y-4">
                      <div className="text-yellow-400 text-sm">
                        ⚠️ Judging seems stuck. You can:
                      </div>
                      <div className="flex gap-3 justify-center flex-wrap">
                        <button
                          onClick={handleRetryJudging}
                          disabled={isRetrying}
                          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                        >
                          {isRetrying ? 'Retrying...' : 'Try Again'}
                        </button>
                        <button
                          onClick={handlePickRandomWinner}
                          disabled={isRetrying}
                          className="px-6 py-3 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium border border-slate-500"
                        >
                          Pick Random Winner
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            setShowSkipModal(true);
                          }}
                          disabled={isRetrying}
                          className="px-6 py-3 bg-slate-600 text-slate-200 rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium border border-slate-500"
                        >
                          Skip This Show
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Message for non-owner waiting player */}
              {!isJudgingOwner && judgingTimeout >= 60 && (
                <div className="text-slate-400 text-sm">
                  ⏳ Still waiting on judges... Your opponent can retry if needed.
                </div>
              )}
            </div>
          )}

          {/* State C: Verdict */}
          {state === 'verdict' && (
            <div className="space-y-6">
              {/* Show both answers with scores */}
              <div className="space-y-3">
                {/* My Answer Card */}
                <div className={`rounded-xl p-4 ${
                  currentShow.winner_id === activeProfileId 
                    ? 'bg-orange-500/20 ring-1 ring-orange-500/30' 
                    : 'bg-slate-800/50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {currentShow.winner_id === activeProfileId && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
                    <span className="text-xl">{myProfile.avatar}</span>
                    <span className="font-bold text-slate-100">{myProfile.name}</span>
                    {currentShow.judge_data?.scores && (
                      <span className="ml-auto text-lg font-bold text-orange-500">
                        {(() => {
                          const scores = Object.values(currentShow.judge_data.scores).map(data => 
                            activeProfileId === currentShow.profile_a_id ? data.profile_a_score : data.profile_b_score
                          );
                          const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                          return avg;
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-200">
                    {activeProfileId === currentShow.profile_a_id ? currentShow.profile_a_answer : currentShow.profile_b_answer}
                  </div>
                </div>

                {/* Opponent Answer Card */}
                <div className={`rounded-xl p-4 ${
                  currentShow.winner_id === opponentProfile.id 
                    ? 'bg-orange-500/20 ring-1 ring-orange-500/30' 
                    : 'bg-slate-800/50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {currentShow.winner_id === opponentProfile.id && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
                    <span className="text-xl">{opponentProfile.avatar}</span>
                    <span className="font-bold text-slate-100">{opponentProfile.name}</span>
                    {currentShow.judge_data?.scores && (
                      <span className="ml-auto text-lg font-bold text-orange-500">
                        {(() => {
                          const scores = Object.values(currentShow.judge_data.scores).map(data => 
                            activeProfileId === currentShow.profile_a_id ? data.profile_b_score : data.profile_a_score
                          );
                          const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                          return avg;
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-200">
                    {activeProfileId === currentShow.profile_a_id ? currentShow.profile_b_answer : currentShow.profile_a_answer}
                  </div>
                </div>
              </div>

              {/* Judge Content Section */}
              {currentShow.judge_data?.scores && (
                <div className="space-y-4">
                  {/* Segmented Toggle for Judge Scores / Judge Chat */}
                  {currentShow.judge_data?.banter && (
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
                      {Object.entries(currentShow.judge_data.scores).map(([judgeKey, data]) => {
                        const judge = judgeProfiles.find(j => j.key === judgeKey);
                        const myScore = activeProfileId === currentShow.profile_a_id 
                          ? data.profile_a_score 
                          : data.profile_b_score;
                        const opponentScore = activeProfileId === currentShow.profile_a_id 
                          ? data.profile_b_score 
                          : data.profile_a_score;
                        
                        return (
                          <div key={judgeKey} className="bg-slate-800/30 rounded-lg p-3">
                            <div className="text-sm font-bold text-slate-300 mb-1">
                              {judge?.emoji || '❓'} {judge?.name || judgeKey}: {myProfile.name} {myScore}, {opponentProfile.name} {opponentScore}
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
                  {judgeView === 'chat' && currentShow.judge_data?.banter && (
                    <div className="bg-slate-800/30 rounded-lg p-4 space-y-2">
                      {currentShow.judge_data.banter.map((line, i) => {
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
              {currentShow.judge_data?.rivalry_comment && (
                <div className="bg-slate-800/20 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {(() => {
                        const commentJudge = judgeProfiles.find(j => j.key === currentShow.judge_data.rivalry_comment.judge);
                        return commentJudge?.emoji || '🎭';
                      })()}
                    </span>
                    <span className="text-sm font-bold text-slate-300">
                      {(() => {
                        const commentJudge = judgeProfiles.find(j => j.key === currentShow.judge_data.rivalry_comment.judge);
                        return commentJudge?.name || 'Judge';
                      })()} • Rivalry Recap
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {currentShow.judge_data.rivalry_comment.text}
                  </p>
                </div>
              )}

              {/* Next Show Buttons */}
              <div className="space-y-2">
                {autoAdvance ? (
                  <>
                    {/* Countdown button with embedded timer */}
                    <button
                      onClick={() => {
                        setAutoAdvance(false);
                        setCountdown(null);
                        createNextShow();
                      }}
                      className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
                    >
                      {countdown !== null ? `Next Show in ${countdown}s • Start Now` : 'START NEXT SHOW →'}
                    </button>
                    
                    {/* Stay Here button */}
                    <button
                      onClick={() => {
                        setAutoAdvance(false);
                        setCountdown(null);
                      }}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600 transition-all font-semibold"
                    >
                      STAY HERE
                    </button>
                  </>
                ) : (
                  <button
                    onClick={createNextShow}
                    className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
                  >
                    NEXT SHOW →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* History Toggle Button */}
        {previousShows.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full py-3 bg-slate-800/50 border border-slate-700 rounded-lg font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-slate-200 mb-4"
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
        )}

        {/* Previous Shows - Collapsible */}
        {showHistory && previousShows.length > 0 && (
          <div className="space-y-3">
            {previousShows.map((show) => {
              const winner = show.winner_id === rivalry.profile_a_id ? rivalry.profile_a : rivalry.profile_b;
              return (
                <button
                  key={show.id}
                  onClick={() => onNavigate('screen6', { showId: show.id })}
                  className="w-full bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:bg-slate-700 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-semibold text-slate-100">Show #{show.show_number}</p>
                      <p className="text-sm text-slate-400 line-clamp-1">{show.prompt}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {show.winner_id === activeProfileId && (
                        <img src={GoldenMic} alt="mic" className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
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

      {/* Cancel Rivalry Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Cancel Rivalry?
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              This will end your Rivalry with {opponentProfile.name}. Your Show history will be saved, but your opponent will be notified.
            </p>
            <p className="text-slate-400 text-sm mb-6">This cannot be undone.</p>
            <div className="space-y-2">
              <button
                onClick={handleCancelRivalry}
                className="w-full py-3 bg-red-600 text-white font-medium rounded hover:bg-red-500"
              >
                Cancel Rivalry
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
              >
                Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Show Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              ⚠️ Skip This Show?
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              This show won't count toward your rivalry stats.
            </p>
            <p className="text-slate-400 text-sm mb-6">A new show will start immediately.</p>
            <div className="space-y-2">
              <button
                onClick={handleSkipShow}
                className="w-full py-3 bg-orange-500 text-white font-medium rounded hover:bg-orange-400"
              >
                Skip & Start Next
              </button>
              <button
                onClick={() => setShowSkipModal(false)}
                className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </div>
  );
}