import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getRandomPrompt, selectJudges } from '../utils/prompts';
import Header from './Header';
import HeaderWithMenu from './HeaderWithMenu';
import HowToPlayModal from './HowToPlayModal';
import DeliberationChat from './DeliberationChat';
import AllRoundsModal from './AllRoundsModal';
import GoldenMic from '../assets/microphone.svg';
import InterstitialScreen from './InterstitialScreen';
import VerdictFlow from './VerdictFlow';
import RivalryIntroFlow from './RivalryIntroFlow';

// Rotating headlines for waiting state
const WAITING_HEADLINES = [
  "Locked in!",
  "You're in.",
  "Done and done.",
  "Nailed it.",
  "Looking good.",
  "Feeling confident?",
  "Oh yeah.",
  "Boom.",
  "That's the one.",
  "No take-backs.",
  "Bold move.",
  "That's how it's done."
];

// Randomized placeholder text for answer input
const ANSWER_PLACEHOLDERS = [
  "Drop your best answer here...",
  "Go on, one-up everyone...",
  "Make the judges nervous...",
  "What's your wildest take?",
  "Channel your inner chaos...",
  "Say something unhinged...",
  "Your most outlandish answer...",
  "Time to get weird...",
  "What would Florida Man say?",
  "Make it memorable...",
  "The wilder the better...",
  "Trust your worst instincts...",
  "Go full chaos mode...",
  "Overthink this. Or don't.",
  "Your therapist can't see this...",
  "No wrong answers. Just boring ones.",
  "Make future you cringe...",
  "Type something unhinged...",
  "What's the worst best answer?",
  "Let the intrusive thoughts win...",
  "This is a safe space for chaos...",
  "Be the answer they remember...",
  "Normal is boring...",
  "Convince no one you're normal...",
  "Reality is optional here...",
];

export default function GameplayScreen({ onNavigate, activeProfileId, rivalryId, verdictStep, setVerdictStep }) {
  const [loading, setLoading] = useState(true);
  const [rivalry, setRivalry] = useState(null);
  const [currentShow, setCurrentShow] = useState(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [previousShows, setPreviousShows] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [judgeProfiles, setJudgeProfiles] = useState([]);
  const [selectedJudge, setSelectedJudge] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isJudgingOwner, setIsJudgingOwner] = useState(false);
  const [judgingTimeout, setJudgingTimeout] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isCreatingShow, setIsCreatingShow] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showAllRounds, setShowAllRounds] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialText, setInterstitialText] = useState('');
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const [showIntroFlow, setShowIntroFlow] = useState(false);
  const [rivalryJudges, setRivalryJudges] = useState([]);
  const [rivalryCancelled, setRivalryCancelled] = useState(false);
  const [waitingHeadline] = useState(() => WAITING_HEADLINES[Math.floor(Math.random() * WAITING_HEADLINES.length)]);
  const [answerPlaceholder] = useState(() => ANSWER_PLACEHOLDERS[Math.floor(Math.random() * ANSWER_PLACEHOLDERS.length)]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptRevealed, setPromptRevealed] = useState(false);
  const [contentRevealed, setContentRevealed] = useState(false);
  const [promptScreenInitialized, setPromptScreenInitialized] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const prevShowIdRef = useRef(null);
  const judgingTriggeredRef = useRef(false); // Prevent multiple judge-show calls

  // Reset verdictStep when moving to a new show
  useEffect(() => {
    if (currentShow?.id && currentShow.id !== prevShowIdRef.current) {
      // Only reset if this is actually a different show
      if (prevShowIdRef.current !== null) {
        setVerdictStep(1);
      }
      prevShowIdRef.current = currentShow.id;
      judgingTriggeredRef.current = false; // Reset judging guard for new show
    }
  }, [currentShow?.id]);

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
        // Set state to show cancellation modal
        setRivalryCancelled(true);
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
        const newStatus = payload.new?.status;
        if (newStatus === 'complete' || newStatus === 'summarizing') {
          return;
        }
        
        // Ignore intro flag updates - these shouldn't trigger reload for other player
        // Only reload for meaningful changes like mic_holder or status
        const oldData = payload.old || {};
        const newData = payload.new || {};
        const introFlagChanged = 
          oldData.profile_a_seen_intro !== newData.profile_a_seen_intro ||
          oldData.profile_b_seen_intro !== newData.profile_b_seen_intro;
        
        if (introFlagChanged) {
          // Don't reload for intro flag changes
          return;
        }
        
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
          // When transitioning to complete, batch the updates
          if (payload.new.status === 'complete' && currentShow.status === 'judging') {
            // Load previous shows first, then update currentShow
            // This prevents flash by ensuring all data is ready
            loadPreviousShows().then(() => {
              setCurrentShow(payload.new);
            });
          } else {
            setCurrentShow(payload.new);
            if (payload.new.status === 'complete') {
              setTimeout(() => {
                loadPreviousShows();
              }, 500);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentShow?.id]);

  // Judging timeout timer
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

  // Polling backup for judging state
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

  // Fetch judge profiles
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

  // Prompt reveal animation when entering yourTurn state
  useEffect(() => {
    // Only animate on yourTurn state
    if (!currentShow) return;
    
    const myAnswer_db = activeProfileId === currentShow.profile_a_id 
      ? currentShow.profile_a_answer 
      : currentShow.profile_b_answer;
    const isYourTurn = currentShow.status !== 'judging' && currentShow.status !== 'complete' && !myAnswer_db;
    
    if (isYourTurn) {
      // Reset animations - set initialized false first
      setPromptScreenInitialized(false);
      setPromptRevealed(false);
      setContentRevealed(false);
      
      // Small delay before showing anything
      const initTimer = setTimeout(() => setPromptScreenInitialized(true), 50);
      
      // Stagger the reveals
      const promptTimer = setTimeout(() => setPromptRevealed(true), 350);
      const contentTimer = setTimeout(() => setContentRevealed(true), 850);
      
      return () => {
        clearTimeout(initTimer);
        clearTimeout(promptTimer);
        clearTimeout(contentTimer);
      };
    }
  }, [currentShow?.id, activeProfileId]);

  async function loadRivalryAndShow() {
    setLoading(true);

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

    const loadedRivalry = rivalryData[0];
    setRivalry(loadedRivalry);

    // Check if this player has seen the intro
    const isProfileA = activeProfileId === loadedRivalry.profile_a_id;
    const hasSeenIntro = isProfileA 
      ? loadedRivalry.profile_a_seen_intro 
      : loadedRivalry.profile_b_seen_intro;

    // Load rivalry judges if we need to show intro
    if (!hasSeenIntro && loadedRivalry.judges) {
      const { data: judges } = await supabase
        .from('judges')
        .select('*')
        .in('key', loadedRivalry.judges);
      
      if (judges) {
        // Sort judges to match the order in rivalry.judges
        const sortedJudges = loadedRivalry.judges.map(key => 
          judges.find(j => j.key === key)
        ).filter(Boolean);
        setRivalryJudges(sortedJudges);
      }
      setShowIntroFlow(true);
      setLoading(false);
      return; // Don't load show yet - show intro first
    }

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
    } else if (!isCreatingShow) {
      // No show exists - create the first one (with lock to prevent race condition)
      setIsCreatingShow(true);
      
      // Check one more time if show was created by other player
      const { data: doubleCheck } = await supabase
        .from('shows')
        .select('*')
        .eq('rivalry_id', rivalryId)
        .eq('show_number', 1)
        .single();
      
      if (doubleCheck) {
        // Other player already created it
        setCurrentShow(doubleCheck);
        setIsCreatingShow(false);
        setLoading(false);
        return;
      }
      
      const usedPromptIds = await getUsedPromptIds();
      const prompt = await getRandomPrompt(usedPromptIds, loadedRivalry.prompt_category);
      const judgeKeys = loadedRivalry.judges;
      
      // Safety check - judges must exist
      if (!judgeKeys || judgeKeys.length === 0) {
        console.error('No judges found on rivalry');
        setIsCreatingShow(false);
        setLoading(false);
        return;
      }

      const { data: newShow, error: createError } = await supabase
        .from('shows')
        .insert({
          rivalry_id: rivalryId,
          show_number: 1,
          prompt_id: prompt.id,
          prompt: prompt.text,
          judges: judgeKeys,
          profile_a_id: loadedRivalry.profile_a_id,
          profile_b_id: loadedRivalry.profile_b_id,
          status: 'waiting'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating first show:', createError);
        // Check if it was created by other player (race condition)
        const { data: raceCheck } = await supabase
          .from('shows')
          .select('*')
          .eq('rivalry_id', rivalryId)
          .eq('show_number', 1)
          .single();
        
        if (raceCheck) {
          setCurrentShow(raceCheck);
        }
      } else {
        setCurrentShow(newShow);
        // Mark first show as started
        await supabase
          .from('rivalries')
          .update({ first_show_started: true })
          .eq('id', rivalryId);
      }
      setIsCreatingShow(false);
    }

    await loadPreviousShows();
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

  // Get prompt IDs already used in this rivalry
  async function getUsedPromptIds() {
    try {
      const { data: shows } = await supabase
        .from('shows')
        .select('prompt_id')
        .eq('rivalry_id', rivalryId)
        .not('prompt_id', 'is', null);
      
      return shows ? shows.map(s => s.prompt_id).filter(Boolean) : [];
    } catch (err) {
      console.error('Error fetching used prompts:', err);
      return [];
    }
  }

  async function submitAnswer() {
    if (!myAnswer.trim() || wordCount > 30) return;

    // Prevent double-submission
    if (isSubmitting) {
      console.log('[submitAnswer] Already submitting, ignoring');
      return;
    }
    setIsSubmitting(true);

    // Check if rivalry was cancelled
    if (rivalryCancelled) {
      return;
    }

    // Verify rivalry still exists before submitting
    const { data: rivalryCheck, error: rivalryError } = await supabase
      .from('rivalries')
      .select('id, status')
      .eq('id', rivalryId)
      .single();

    if (rivalryError || !rivalryCheck) {
      setRivalryCancelled(true);
      return;
    }

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

    const { data: updatedShow, error } = await supabase
      .from('shows')
      .update(updateData)
      .eq('id', currentShow.id)
      .select()
      .single();

    if (error) {
      console.error('Error submitting answer:', error);
      return;
    }

    const bothSubmittedNow = updatedShow.profile_a_answer && updatedShow.profile_b_answer;

    if (bothSubmittedNow) {
      const mySubmitTime = new Date().toISOString();
      const opponentSubmitTime = isProfileA 
        ? updatedShow.profile_b_submitted_at 
        : updatedShow.profile_a_submitted_at;
      
      const iSubmittedFirst = new Date(mySubmitTime) > new Date(opponentSubmitTime);
      const firstSubmitterId = iSubmittedFirst ? opponentProfile.id : activeProfileId;
      
      await supabase
        .from('shows')
        .update({ 
          status: 'judging',
          first_submitter_id: firstSubmitterId
        })
        .eq('id', currentShow.id);
    } else {
      // Only send SMS if enabled for this rivalry
      if (rivalry.sms_enabled) {
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
        }
      }
    }

    if (bothSubmittedNow) {
      // Prevent multiple judge-show calls
      if (judgingTriggeredRef.current) {
        console.log('[submitAnswer] Judging already triggered for this show, skipping');
      } else {
        judgingTriggeredRef.current = true;
        setIsJudgingOwner(true);
        await triggerJudging();
      }
    }

    setMyAnswer('');
    setWordCount(0);
    setIsSubmitting(false);
  }

  async function triggerJudging() {
    try {
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
        alert('Failed to judge the round. Please try again.');
        return;
      }

      const result = await response.json();
      console.log('Judging complete:', result);
      
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
    setJudgingTimeout(0);
    await triggerJudging();
    setIsRetrying(false);
  }

  async function handlePickRandomWinner() {
    try {
      setIsRetrying(true);
      
      const winnerId = Math.random() < 0.5 ? currentShow.profile_a_id : currentShow.profile_b_id;
      const loserId = winnerId === currentShow.profile_a_id ? currentShow.profile_b_id : currentShow.profile_a_id;
      
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

      setIsJudgingOwner(false);
      setJudgingTimeout(0);
      setIsRetrying(false);
      
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
      const nextShowNumber = currentShow.show_number + 1;

      // Use rivalry.match_length from database (not config constant) to support varying rivalry lengths
      const matchLength = rivalry?.match_length || 5;
      if (currentShow.show_number === matchLength) {
        console.log(`Show ${matchLength} complete - navigating to summary`);
        onNavigate('summary', {
          activeProfileId,
          rivalryId
        });
        return;
      }

      const { data: existingShow } = await supabase
        .from('shows')
        .select('*')
        .eq('rivalry_id', rivalryId)
        .eq('show_number', nextShowNumber)
        .single();

      if (existingShow) {
        // Skip interstitial - go directly to show
        setCurrentShow(existingShow);
        return;
      }

      let emceeText = null;
      if (nextShowNumber > 1) {
        try {
          const emceeResponse = await supabase.functions.invoke('select-emcee-line', {
            body: {
              rivalryId: rivalryId,
              showNumber: nextShowNumber
            }
          });

          if (emceeResponse.data?.emcee_text) {
            emceeText = emceeResponse.data.emcee_text;
          }
        } catch (emceeErr) {
          console.error('Failed to get emcee text:', emceeErr);
        }
      }

      const usedPromptIds = await getUsedPromptIds();
      const prompt = await getRandomPrompt(usedPromptIds, rivalry.prompt_category);
      
      // Use judges from rivalry (selected once at rivalry creation)
      // Fall back to selecting new judges if rivalry doesn't have them (legacy rivalries)
      let judgeKeys = rivalry.judges;
      if (!judgeKeys || judgeKeys.length === 0) {
        const judgeObjects = await selectJudges();
        judgeKeys = judgeObjects.map(j => j.key);
        // Optionally save to rivalry for consistency
        await supabase
          .from('rivalries')
          .update({ judges: judgeKeys })
          .eq('id', rivalryId);
      }

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
          status: 'waiting',
          emcee_text: emceeText
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: fetchedShow } = await supabase
            .from('shows')
            .select('*')
            .eq('rivalry_id', rivalryId)
            .eq('show_number', nextShowNumber)
            .single();
          
          if (fetchedShow) {
            // Skip interstitial - go directly to show
            setCurrentShow(fetchedShow);
          }
        } else {
          console.error('Error creating next show:', error);
        }
      } else {
        // Skip interstitial - go directly to next show
        setCurrentShow(newShow);
      }
    } catch (err) {
      console.error('Error in createNextShow:', err);
    }
  }

  async function sendNudge() {
    setShowNudgeModal(false);
    
    try {
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
      
      // Only send SMS if enabled for this rivalry
      if (rivalry.sms_enabled) {
        await supabase.functions.invoke('send-sms', {
          body: {
            userId: opponentProfile.id,
            notificationType: 'nudge',
            contextData: {
              opponent: myProfile.name
            }
          }
        });
        
        await supabase
          .from('shows')
          .update({ last_nudge_at: new Date().toISOString() })
          .eq('id', currentShow.id);
        
        alert('Nudge sent! ⚡');
      } else {
        alert('SMS is off for this rivalry. Use the link option instead!');
        return;
      }
    } catch (err) {
      console.error('Failed to send nudge:', err);
      alert('Failed to send nudge. Try again?');
    }
  }

  function getNudgeLink() {
    return `https://oneupper.app/play?p=${opponentProfile.id}`;
  }

  function handleCopyNudgeLink() {
    navigator.clipboard.writeText(getNudgeLink());
    setShowNudgeModal(false);
    alert('Link copied! ⚡');
  }

  function handleShareNudgeViaText() {
    const message = `Hey! Your turn in One-Upper 🎤 ${getNudgeLink()}`;
    const smsUrl = `sms:?&body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
    setShowNudgeModal(false);
  }

  async function handleCancelRivalry() {
    try {
      const { error } = await supabase
        .from('rivalries')
        .delete()
        .eq('id', rivalryId);

      if (error) throw error;

      // Only send SMS if enabled for this rivalry
      if (rivalry.sms_enabled) {
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
        }
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

  // Ripley waiting quips
  const waitingQuips = [
    (name) => `Your move's locked in. Let's see if ${name} can keep up.`,
    (name) => `Submitted and confident? You should be... or should you?`,
    (name) => `Now we wait. The anticipation is half the fun.`,
    (name) => `${name}'s turn to sweat.`,
    (name) => `Answer's in. No take-backs now.`,
    (name) => `Clock's ticking for ${name}...`,
    (name) => `You've done your part. Time to see what you're up against.`,
  ];

  // Rivalry cancelled - show modal immediately
  if (rivalryCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Header />
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">😢</div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            Rivalry Ended
          </h3>
          <p className="text-slate-300 text-sm mb-6">
            This rivalry has been cancelled by your opponent. Your history has been saved.
          </p>
          <button
            onClick={() => onNavigate('screen1')}
            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-400"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Header />
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // Show intro flow if player hasn't seen it yet
  if (showIntroFlow && rivalry) {
    const myProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_a : rivalry.profile_b;
    const opponentProfile = rivalry.profile_a_id === activeProfileId ? rivalry.profile_b : rivalry.profile_a;

    return (
      <RivalryIntroFlow
        rivalry={rivalry}
        profile={myProfile}
        opponent={opponentProfile}
        judges={rivalryJudges}
        onNavigate={onNavigate}
        onComplete={async () => {
          setShowIntroFlow(false);
          // Reload to get the show
          await loadRivalryAndShow();
        }}
      />
    );
  }

  // No rivalry or show
  if (!rivalry || !currentShow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Header />
        <div className="text-center">
          <div className="text-slate-400 mb-4">
            {isCreatingShow ? 'Creating round...' : 'No active round found'}
          </div>
          <button
            onClick={async () => {
              if (rivalry && !isCreatingShow) {
                setIsCreatingShow(true);
                try {
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
                    await loadRivalryAndShow();
                    setIsCreatingShow(false);
                    return;
                  }
                  
                  const { data: allShows } = await supabase
                    .from('shows')
                    .select('show_number')
                    .eq('rivalry_id', rivalryId)
                    .order('show_number', { ascending: false })
                    .limit(1);
                  
                  const nextShowNumber = allShows && allShows.length > 0 ? allShows[0].show_number + 1 : 1;
                  
                  const usedPromptIds = await getUsedPromptIds();
                  const prompt = await getRandomPrompt(usedPromptIds, rivalry.prompt_category);
                  // Use judges from rivalry (selected once at rivalry creation)
                  const judgeKeys = rivalry.judges;
                  
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
                    if (error.code === '23505') {
                      await loadRivalryAndShow();
                    } else {
                      console.error('Error creating show:', error);
                      alert('Failed to create round. Please try again.');
                    }
                  } else if (newShow) {
                    await loadRivalryAndShow();
                  }
                } catch (err) {
                  console.error('Error in show creation:', err);
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
            {rivalry ? (isCreatingShow ? 'Creating...' : 'Start Next Round') : 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  const myProfile = activeProfileId === rivalry.profile_a_id ? rivalry.profile_a : rivalry.profile_b;
  const opponentProfile = activeProfileId === rivalry.profile_a_id ? rivalry.profile_b : rivalry.profile_a;
  
  const myAnswer_db = activeProfileId === currentShow.profile_a_id ? currentShow.profile_a_answer : currentShow.profile_b_answer;
  const opponentAnswer_db = activeProfileId === currentShow.profile_a_id ? currentShow.profile_b_answer : currentShow.profile_a_answer;

  // Determine state
  let state = 'yourTurn';
  if (currentShow.status === 'judging') {
    state = 'judging';
  } else if (currentShow.status === 'complete') {
    state = 'verdict';
  } else if (myAnswer_db && opponentAnswer_db) {
    // Both answers are in - show judging state immediately (avoid waiting blip)
    state = 'judging';
  } else if (myAnswer_db) {
    state = 'waiting';
  }

  // Calculate stats for scoreboard
  const myWins = previousShows.filter(s => s.winner_id === activeProfileId).length;
  const opponentWins = previousShows.filter(s => s.winner_id === (activeProfileId === rivalry.profile_a_id ? rivalry.profile_b_id : rivalry.profile_a_id)).length;
  const iAmMicHolder = rivalry.mic_holder_id === activeProfileId;
  const showMic = myWins > 0 || opponentWins > 0;

  // Interstitial screen - check BEFORE verdict to prevent flash
  if (showInterstitial && interstitialText) {
    return (
      <InterstitialScreen
        emceeText={interstitialText}
        nextRound={currentShow.show_number + 1}
        onComplete={async () => {
          // Load the next show FIRST, before hiding interstitial
          const nextShowNumber = currentShow.show_number + 1;
          const { data: show } = await supabase
            .from('shows')
            .select('*')
            .eq('rivalry_id', rivalryId)
            .eq('show_number', nextShowNumber)
            .single();
          
          if (show) {
            setCurrentShow(show);
          }
          setVerdictStep(1); // Reset verdict step for next round
          setShowInterstitial(false); // Hide interstitial AFTER new show is ready
        }}
      />
    );
  }

  // VERDICT STATE - Hand off to VerdictFlow
  if (state === 'verdict') {
    return (
      <VerdictFlow
        currentShow={currentShow}
        rivalry={rivalry}
        myProfile={myProfile}
        opponentProfile={opponentProfile}
        activeProfileId={activeProfileId}
        previousShows={previousShows}
        judgeProfiles={judgeProfiles}
        onNextRound={createNextShow}
        onNavigateToSummary={() => {
          setVerdictStep(1); // Reset step
          onNavigate('summary', { activeProfileId, rivalryId });
        }}
        onNavigate={onNavigate}
        onCancelRivalry={handleCancelRivalry}
        initialStep={verdictStep}
        onStepChange={setVerdictStep}
      />
    );
  }

  // Menu component
  const MenuButton = () => (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center"
      >
        ⋮
      </button>
      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
            {previousShows.length > 0 && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowAllRounds(true);
                }}
                className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
              >
                See All Rounds
              </button>
            )}
            <button
              onClick={() => {
                setShowMenu(false);
                onNavigate('screen2');
              }}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700"
            >
              Your Profiles
            </button>
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
  );

  // Get a stable Ripley quip based on answer length (won't change on re-render)
  const getWaitingQuip = () => {
    const seed = myAnswer_db?.length || 0;
    const quipFn = waitingQuips[seed % waitingQuips.length];
    return quipFn(opponentProfile.name);
  };

  // WAITING STATE - Animated, focused on confirmation
  if (state === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <HeaderWithMenu
          onHowToPlay={() => setShowHowToPlay(true)}
          onAllRounds={() => setShowAllRounds(true)}
          onProfiles={() => onNavigate('screen2')}
          onCancel={() => setShowCancelModal(true)}
          showAllRounds={previousShows.length > 0}
        />
        <div className="max-w-md mx-auto">

          {/* Confirmation headline */}
          <h1 className="text-2xl font-bold text-orange-500 text-center mb-4">
            {waitingHeadline}
          </h1>

          {/* Prompt - white, same size as headline */}
          <p className="text-slate-100 text-2xl font-bold text-center mb-6">{currentShow.prompt}</p>

          {/* Answer box with checkmark label */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-8 border border-slate-700/50">
            <div className="text-green-400 text-sm font-semibold mb-2">✓ Your answer</div>
            <p className="text-slate-200 text-lg">{myAnswer_db}</p>
          </div>

          {/* Waiting indicator - just text, pulsing */}
          <div className="text-center animate-pulse">
            <span className="text-slate-400 text-lg">⏳ Waiting on {opponentProfile.name}...</span>
          </div>

        </div>

        {/* Modals */}
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
                      const cleanExample = example.trim();
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

        {showNudgeModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Nudge {opponentProfile?.name}?
              </h3>
              {opponentProfile?.sms_consent ? (
                <>
                  <p className="text-slate-300 text-sm mb-6">
                    {opponentProfile?.name} got a notification when you submitted. Send another?
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={sendNudge}
                      className="w-full py-3 bg-orange-500 text-white font-medium rounded hover:bg-orange-400"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => setShowNudgeModal(false)}
                      className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Never mind
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-300 text-sm mb-6">
                    {opponentProfile?.name} has game messaging off, so you'll have to send it yourself.
                  </p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyNudgeLink}
                        className="flex-1 py-3 bg-slate-700 text-slate-200 font-medium rounded hover:bg-slate-600"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={handleShareNudgeViaText}
                        className="flex-1 py-3 bg-slate-700 text-slate-200 font-medium rounded hover:bg-slate-600"
                      >
                        Share via Text
                      </button>
                    </div>
                    <button
                      onClick={() => setShowNudgeModal(false)}
                      className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {showCancelModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Cancel Rivalry?
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                This will end your Rivalry with {opponentProfile.name}. Your history will be saved, but your opponent will be notified.
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

        {showHowToPlay && (
          <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
        )}

        {showAllRounds && (
          <AllRoundsModal 
            previousShows={previousShows}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
      </div>
    );
  }

  // JUDGING STATE - Chat bubbles from deliberating judges
  if (state === 'judging') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6 flex flex-col">
        <HeaderWithMenu
          onHowToPlay={() => setShowHowToPlay(true)}
          onAllRounds={() => setShowAllRounds(true)}
          onProfiles={() => onNavigate('screen2')}
          onCancel={() => setShowCancelModal(true)}
          showAllRounds={previousShows.length > 0}
        />
        <div className="max-w-md mx-auto flex-1 flex flex-col w-full">

          {/* Headline */}
          <h1 className="text-2xl font-bold text-orange-500 text-center mb-2">
            Consulting the judges...
          </h1>

          {/* Deliberation bubble - takes up remaining space, centers vertically */}
          <DeliberationChat judgeProfiles={judgeProfiles} />

          {/* Timeout handling */}
          {isJudgingOwner && (
            <>
              {judgingTimeout >= 30 && judgingTimeout < 60 && (
                <div className="text-slate-400 text-sm text-center">
                  🤔 This is taking longer than usual...
                </div>
              )}

              {judgingTimeout >= 60 && (
                <div className="space-y-4 text-center">
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
                      Skip This Round
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!isJudgingOwner && judgingTimeout >= 60 && (
            <div className="text-slate-400 text-sm text-center">
              ⏳ Still waiting on judges... Your opponent can retry if needed.
            </div>
          )}
        </div>

        {/* Modals */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                Cancel Rivalry?
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                This will end your Rivalry with {opponentProfile.name}. Your history will be saved, but your opponent will be notified.
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

        {showSkipModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-slate-100 mb-2">
                ⚠️ Skip This Round?
              </h3>
              <p className="text-slate-300 text-sm mb-4">
                This round won't count toward your rivalry stats.
              </p>
              <p className="text-slate-400 text-sm mb-6">A new round will start immediately.</p>
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

        {showHowToPlay && (
          <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
        )}

        {showAllRounds && (
          <AllRoundsModal 
            previousShows={previousShows}
            rivalry={rivalry}
            activeProfileId={activeProfileId}
            onClose={() => setShowAllRounds(false)}
            onSelectRound={(showId) => {
              setShowAllRounds(false);
              onNavigate('screen6', { showId });
            }}
          />
        )}
      </div>
    );
  }

  // YOUR TURN STATE - Full context, answer input
  // Show minimal screen until initialized to prevent flash
  if (!promptScreenInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
        <HeaderWithMenu
          onHowToPlay={() => setShowHowToPlay(true)}
          onAllRounds={() => setShowAllRounds(true)}
          onProfiles={() => onNavigate('screen2')}
          onCancel={() => setShowCancelModal(true)}
          showAllRounds={previousShows.length > 0}
        />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-6">
      <HeaderWithMenu
        onHowToPlay={() => setShowHowToPlay(true)}
        onAllRounds={() => setShowAllRounds(true)}
        onProfiles={() => onNavigate('screen2')}
        onCancel={() => setShowCancelModal(true)}
        showAllRounds={previousShows.length > 0}
      />
      <div className="max-w-md mx-auto">
        
        {/* Context - Round, Score, Judges (no box, fades when input focused) */}
        <div className={`mb-6 transition-opacity duration-300 ${isInputFocused ? 'opacity-30' : 'opacity-100'}`}>
          {/* Round */}
          <div className="text-center mb-3">
            <h2 className="text-xl font-bold text-slate-300">Round {currentShow.show_number} of {rivalry?.match_length || 5}</h2>
          </div>
          
          {/* Score Line */}
          <div className="flex items-center justify-center gap-1 text-slate-200 text-sm mb-3">
            <span>{myProfile.avatar}</span>
            <span>{myProfile.name.split(' ')[0]}: <span className="font-bold">{myWins}</span></span>
            <span className="text-slate-500 mx-2">vs</span>
            <span>{opponentProfile.avatar}</span>
            <span>{opponentProfile.name.split(' ')[0]}: <span className="font-bold">{opponentWins}</span></span>
          </div>
          
          {/* Judges - clickable */}
          <div className="flex justify-center gap-2">
            {currentShow.judges.map((judgeKey, i) => {
              const judge = judgeProfiles.find(j => j.key === judgeKey);
              return (
                <button
                  key={i}
                  onClick={() => handleShowJudgeProfile(judgeKey)}
                  className="px-3 py-1.5 bg-slate-800/50 border border-slate-600 rounded-lg hover:bg-slate-700 hover:border-slate-500 transition-all text-slate-200 text-sm"
                >
                  {judge?.emoji || '❓'} {judge?.name || judgeKey}
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt - Hero with animation */}
        <div className={`mb-6 text-center transition-all duration-500 ${promptRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-2xl font-bold text-slate-100">{currentShow.prompt}</p>
        </div>

        {/* Main Content - Answer area with animation */}
        <div className={`mb-6 transition-all duration-500 ${contentRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* State A: Your Turn */}
          {state === 'yourTurn' && (
            <div>
              <textarea
                value={myAnswer}
                onChange={handleAnswerChange}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder={answerPlaceholder}
                className="w-full h-32 p-4 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 resize-none mb-2 focus:outline-none focus:border-orange-500 transition-all text-lg"
                maxLength={300}
              />
              <div className="flex justify-between text-sm mb-4">
                <span className={wordCount > 30 ? 'text-red-400' : 'text-slate-500'}>
                  {wordCount}/30 words
                </span>
                <span className="text-slate-500">Be bold. Be weird. Be unexpected.</span>
              </div>
              <button
                onClick={submitAnswer}
                disabled={!myAnswer.trim() || wordCount > 30 || isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-400 hover:to-orange-500 transition-all disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed disabled:text-slate-400 font-semibold text-lg shadow-lg shadow-orange-500/20 disabled:shadow-none"
              >
                {isSubmitting ? 'Submitting...' : 'Lock It In'}
              </button>
            </div>
          )}


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
                    const cleanExample = example.trim();
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

      {/* Nudge Modal */}
      {showNudgeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Nudge {opponentProfile?.name}?
            </h3>
            {opponentProfile?.sms_consent ? (
              <>
                <p className="text-slate-300 text-sm mb-6">
                  {opponentProfile?.name} got a notification when you submitted. Send another?
                </p>
                <div className="space-y-2">
                  <button
                    onClick={sendNudge}
                    className="w-full py-3 bg-orange-500 text-white font-medium rounded hover:bg-orange-400"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setShowNudgeModal(false)}
                    className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                  >
                    Never mind
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-300 text-sm mb-6">
                  {opponentProfile?.name} has game messaging off, so you'll have to send it yourself.
                </p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyNudgeLink}
                      className="flex-1 py-3 bg-slate-700 text-slate-200 font-medium rounded hover:bg-slate-600"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={handleShareNudgeViaText}
                      className="flex-1 py-3 bg-slate-700 text-slate-200 font-medium rounded hover:bg-slate-600"
                    >
                      Share via Text
                    </button>
                  </div>
                  <button
                    onClick={() => setShowNudgeModal(false)}
                    className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Cancel Rivalry?
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              This will end your Rivalry with {opponentProfile.name}. Your history will be saved, but your opponent will be notified.
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

      {/* Skip Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              ⚠️ Skip This Round?
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              This round won't count toward your rivalry stats.
            </p>
            <p className="text-slate-400 text-sm mb-6">A new round will start immediately.</p>
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

      {/* All Rounds Modal */}
      {showAllRounds && (
        <AllRoundsModal 
          previousShows={previousShows}
          rivalry={rivalry}
          activeProfileId={activeProfileId}
          onClose={() => setShowAllRounds(false)}
          onSelectRound={(showId) => {
            setShowAllRounds(false);
            onNavigate('screen6', { showId });
          }}
        />
      )}
    </div>
  );
}