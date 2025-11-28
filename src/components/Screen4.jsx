import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getRandomPrompt, selectJudges } from '../utils/prompts';
import { RIVALRY_LENGTH } from '../config';
import Header from './Header';
import confetti from 'canvas-confetti';
import HowToPlayModal from './HowToPlayModal';
import GoldenMic from '../assets/microphone.svg';
import InterstitialScreen from './InterstitialScreen';

// Brain Boost Messages - shown while waiting for opponent after submitting
const waitingBrainBoosts = [
  "Creative spark ignited",
  "Brain boost earned",
  "Original thinking activated",
  "Neural pathways fired",
  "Creativity flexed",
  "Quick wit engaged",
  "That was pure imagination",
  "Improvisation unlocked",
  "You just got sharper",
  "Creative muscle stretched",
  "Lateral thinking deployed",
  "Originality confirmed",
  "Mental agility +1",
  "Creative range expanded",
  "Brain workout complete",
  "Thinking outside the box",
  "Innovation activated",
  "Creative confidence building",
  "That's creative problem-solving",
  "Wit sharpened",
  "Clever thinking applied",
  "Imagination unleashed",
  "Mental flexibility increased",
  "Creative instinct trusted",
  "Quick thinking practiced",
  "Originality expressed",
  "Creative courage shown",
  "Brain cells celebrating",
  "Unexpected connection made",
  "Creative flow activated",
  "Thinking differently",
  "Mental gymnastics complete",
  "Creative spark captured",
  "Improvisation skills leveled up",
  "Wit training in progress",
  "Creative boundaries pushed",
  "Lateral thinking engaged",
  "Brain plasticity at work",
  "Creative output logged",
  "Thinking on your feet",
  "Cognitive flexibility +1",
  "Creative momentum building",
  "Mental sharpness confirmed",
  "Originality points earned",
  "Creative synapses firing",
  "Quick wit demonstrated",
  "Imagination working overtime",
  "Creative thinking validated",
  "Brain boost secured",
  "Mental agility proven"
];

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
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialText, setInterstitialText] = useState('');
  const [verdictBrainBoost, setVerdictBrainBoost] = useState('');
  const [showNudgeModal, setShowNudgeModal] = useState(false);
  const confettiShownRef = useRef(new Set()); // Track which shows have shown confetti

  // Reset judgeView to 'scores' when show changes
  useEffect(() => {
    if (currentShow?.id) {
      setJudgeView('scores');
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
        alert('😢 Rivalry Ended\n\nThis Rivalry has been cancelled.\n\nYour Show history has been saved.');
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
        // Ignore updates if rivalry is completing/completed - prevents flash during summary generation
        const newStatus = payload.new?.status;
        if (newStatus === 'complete' || newStatus === 'summarizing') {
          return;
        }
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

  // Auto-advance countdown after verdict (30 seconds) - but NOT after final show
  useEffect(() => {
    // Don't auto-advance after the final show - let players click manually
    if (currentShow?.show_number === RIVALRY_LENGTH) {
      setAutoAdvance(false);
      setCountdown(null);
      return;
    }
    
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
  }, [currentShow?.status, currentShow?.show_number, autoAdvance]);

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
      
      // Set brain boost message once when verdict loads
      if (!verdictBrainBoost) {
        const randomBoost = verdictBrainBoosts[Math.floor(Math.random() * verdictBrainBoosts.length)];
        setVerdictBrainBoost(randomBoost);
      }
    }
    // Reset declaration and brain boost when show changes
    if (currentShow?.status !== 'complete') {
      setVerdictDeclaration('');
      setVerdictBrainBoost('');
    }
  }, [currentShow?.status, currentShow?.winner_id, currentShow?.id, activeProfileId, verdictDeclaration, verdictBrainBoost, previousShows]);

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

    // Load previous shows (await to ensure scores are ready before UI renders)
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

    // First, update with answer
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

    // NOW check if both players have submitted (using fresh DB data)
    const bothSubmittedNow = updatedShow.profile_a_answer && updatedShow.profile_b_answer;

    if (bothSubmittedNow) {
      // Determine who submitted first (for SMS targeting and verdict notification later)
      const mySubmitTime = new Date().toISOString();
      const opponentSubmitTime = isProfileA 
        ? updatedShow.profile_b_submitted_at 
        : updatedShow.profile_a_submitted_at;
      
      const iSubmittedFirst = new Date(mySubmitTime) > new Date(opponentSubmitTime);
      const firstSubmitterId = iSubmittedFirst ? opponentProfile.id : activeProfileId;
      
      // Update status to judging with first_submitter_id
      await supabase
        .from('shows')
        .update({ 
          status: 'judging',
          first_submitter_id: firstSubmitterId
        })
        .eq('id', currentShow.id);
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

    // If both submitted, trigger judging
    if (bothSubmittedNow) {
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
      const nextShowNumber = currentShow.show_number + 1;

      // CHECK: If we just completed the final show, go to summary instead
      if (currentShow.show_number === RIVALRY_LENGTH) {
        console.log(`Show ${RIVALRY_LENGTH} complete - navigating to summary`);
        onNavigate('summary', {
          activeProfileId,
          rivalryId
        });
        return;
      }

      // Check if show already exists (avoid race condition)
      const { data: existingShow } = await supabase
        .from('shows')
        .select('*')
        .eq('rivalry_id', rivalryId)
        .eq('show_number', nextShowNumber)
        .single();

      if (existingShow) {
        // Show exists - check if it has emcee_text and show interstitial
        if (existingShow.emcee_text && nextShowNumber > 1) {
          setInterstitialText(existingShow.emcee_text);
          setShowInterstitial(true);
          // Don't load show yet - interstitial will do it via onComplete
          setAutoAdvance(true);
          return;
        }
        
        // No emcee text or Show 1 - load directly
        setCurrentShow(existingShow);
        setAutoAdvance(true);
        return;
      }

      // Get Ripley's commentary BEFORE creating show (only for Show 2+)
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
          // Continue without emcee text
        }
      }

      // Get a random prompt and judges from database
      const prompt = await getRandomPrompt();
      const judgeObjects = await selectJudges();
      const judgeKeys = judgeObjects.map(j => j.key);

      // Create next show (with emcee_text if we got it)
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
        // If insert fails (409 conflict), fetch the show that was created
        if (error.code === '23505') {
          const { data: fetchedShow } = await supabase
            .from('shows')
            .select('*')
            .eq('rivalry_id', rivalryId)
            .eq('show_number', nextShowNumber)
            .single();
          
          if (fetchedShow) {
            // Show interstitial if show has emcee_text and is Show 2+
            if (fetchedShow.emcee_text && nextShowNumber > 1) {
              setInterstitialText(fetchedShow.emcee_text);
              setShowInterstitial(true);
              setAutoAdvance(true);
              return;
            }
            
            // No emcee text or Show 1 - load directly
            setCurrentShow(fetchedShow);
            setAutoAdvance(true);
          }
        } else {
          console.error('Error creating next show:', error);
        }
      } else {
        // Show created successfully
        // Show interstitial if we have emcee_text and it's Show 2+
        if (newShow.emcee_text && nextShowNumber > 1) {
          setInterstitialText(newShow.emcee_text);
          setShowInterstitial(true);
          setAutoAdvance(true);
          return;
        }
        
        // No emcee text or Show 1 - load directly
        setCurrentShow(newShow);
        setAutoAdvance(true);
      }
    } catch (err) {
      console.error('Error in createNextShow:', err);
    }
  }

  async function sendNudge() {
    setShowNudgeModal(false); // Close modal first
    
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
  const showMic = myWins > 0 || opponentWins > 0; // Only show mic if someone has won at least one show

  // Show interstitial if flag is set
  if (showInterstitial && interstitialText) {
    return (
      <InterstitialScreen
        emceeText={interstitialText}
        onComplete={async () => {
          setShowInterstitial(false);
          // Load the next show that was created
          const nextShowNumber = currentShow.show_number + 1;
          const { data: show } = await supabase
            .from('shows')
            .select('*')
            .eq('rivalry_id', rivalryId)
            .eq('show_number', nextShowNumber)
            .single();
          
          if (show) {
            setCurrentShow(show);
            setAutoAdvance(true);
          }
        }}
        duration={10000}
      />
    );
  }

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
              {showMic && iAmMicHolder && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
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
              {showMic && !iAmMicHolder && <img src={GoldenMic} alt="mic" className="w-5 h-5" />}
              <p className="text-lg font-bold text-slate-100">{opponentWins} {opponentWins === 1 ? 'win' : 'wins'}</p>
            </div>
          </div>
        </div>

        {/* Show Number Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-8"></div>
          <h2 className="text-xl font-bold text-slate-300">Show {currentShow.show_number} of {RIVALRY_LENGTH}</h2>
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
                    Your Profiles
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
            <div className="text-center py-8 space-y-4">
              <div className="text-green-400 text-xl font-semibold">✓ You submitted</div>
              <div className="text-slate-300 text-lg">⏳ Waiting for {opponentProfile.name}...</div>
              <button
                onClick={() => setShowNudgeModal(true)}
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

              {/* Artifacts Section */}
              {currentShow.judge_data?.artifacts && currentShow.judge_data.artifacts.length > 0 && (
                <div className="space-y-3 mt-4">
                  {currentShow.judge_data.artifacts.map((artifact, idx) => {
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
              <div className="bg-slate-800/20 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💡</span>
                  <span className="text-sm font-bold text-slate-300">
                    You Boosted Your Brain
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {verdictBrainBoost}
                </p>
              </div>

              {/* Next Show Buttons */}
              <div className="space-y-2">
                {autoAdvance ? (
                  <>
                    {/* Countdown button with embedded timer */}
                    <button
                      onClick={createNextShow}
                      className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-400 transition-all font-semibold"
                    >
                      {countdown !== null 
                        ? (currentShow.show_number === RIVALRY_LENGTH 
                            ? `Rivalry Summary in ${countdown}s • View Now` 
                            : `Next Show in ${countdown}s • Start Now`)
                        : (currentShow.show_number === RIVALRY_LENGTH 
                            ? 'VIEW RIVALRY SUMMARY →' 
                            : 'START NEXT SHOW →')}
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
                    {currentShow.show_number === RIVALRY_LENGTH ? 'VIEW RIVALRY SUMMARY →' : 'NEXT SHOW →'}
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
                      <p className="font-semibold text-slate-100">Show {show.show_number} of {RIVALRY_LENGTH}</p>
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
      {/* Nudge Confirmation Modal */}
      {showNudgeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Send a Nudge?
            </h3>
            <p className="text-slate-300 text-sm mb-6">
              {opponentProfile?.name} already got a notification when you submitted your answer. Send an extra nudge?
            </p>
            <div className="space-y-2">
              <button
                onClick={sendNudge}
                className="w-full py-3 bg-orange-500 text-white font-medium rounded hover:bg-orange-400"
              >
                Send Nudge
              </button>
              <button
                onClick={() => setShowNudgeModal(false)}
                className="w-full py-2 bg-slate-600/50 text-slate-200 font-medium rounded border border-slate-500 hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
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