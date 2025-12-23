// Showdown service - API calls for party mode
import { supabase } from '../lib/supabase';

// Total number of rounds in a showdown
export const TOTAL_ROUNDS = 5;

// Generate a 4-character code (same pattern as rivalry invites)
function generateShowdownCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1, L)
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Bonus categories for each round (fixed order)
const BONUS_CATEGORIES = [
  { key: 'dramatic', label: 'Most Dramatic', emoji: '🎭' },
  { key: 'unhinged', label: 'Most Unhinged', emoji: '🤢' },
  { key: 'funny', label: 'Made Judges Laugh', emoji: '😂' },
  { key: 'clever', label: 'Big Brain Energy', emoji: '🧠' },
  { key: 'edgy', label: 'Most Likely to Get Cancelled', emoji: '💀' },
];

export function getBonusCategoryForRound(roundNumber) {
  return BONUS_CATEGORIES[roundNumber - 1] || BONUS_CATEGORIES[0];
}

// Create a new showdown (host action)
export async function createShowdown(category = 'mixed') {
  // Generate unique code (retry if collision)
  let code;
  let attempts = 0;
  
  while (attempts < 5) {
    code = generateShowdownCode();
    const { data: existing } = await supabase
      .from('showdowns')
      .select('id')
      .eq('code', code)
      .single();
    
    if (!existing) break;
    attempts++;
  }

  // Select 3 random judges
  const { data: allJudges, error: judgesError } = await supabase
    .from('judges')
    .select('*')
    .eq('is_active', true);

  if (judgesError || !allJudges || allJudges.length < 3) {
    throw new Error('Failed to load judges');
  }

  // Shuffle and pick 3
  const shuffled = allJudges.sort(() => Math.random() - 0.5);
  const selectedJudges = shuffled.slice(0, 3);

  // Create showdown
  const { data: showdown, error } = await supabase
    .from('showdowns')
    .insert({
      code,
      prompt_category: category,
      judges: selectedJudges,
      status: 'lobby'
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to create showdown: ' + error.message);
  }

  return showdown;
}

// Join a showdown (creates showdown_player record)
export async function joinShowdown({ 
  showdownId, 
  profileId = null, 
  guestName = null, 
  guestAvatar = null, 
  entryBrag,
  isHost = false 
}) {
  const { data: player, error } = await supabase
    .from('showdown_players')
    .insert({
      showdown_id: showdownId,
      profile_id: profileId,
      guest_name: guestName,
      guest_avatar: guestAvatar,
      entry_brag: entryBrag,
      is_host: isHost
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to join showdown: ' + error.message);
  }

  // If this is the host, update the showdown's host_player_id
  if (isHost) {
    await supabase
      .from('showdowns')
      .update({ host_player_id: player.id })
      .eq('id', showdownId);
  }

  return player;
}

// Get showdown by code
export async function getShowdownByCode(code) {
  // First get the showdown
  const { data: showdown, error: showdownError } = await supabase
    .from('showdowns')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (showdownError || !showdown) {
    console.error('getShowdownByCode error:', showdownError);
    return null;
  }

  // Then get players separately
  const { data: players, error: playersError } = await supabase
    .from('showdown_players')
    .select('*')
    .eq('showdown_id', showdown.id)
    .order('joined_at', { ascending: true });

  if (playersError) {
    console.error('getShowdownByCode players error:', playersError);
  }

  return {
    ...showdown,
    players: players || []
  };
}

// Get showdown by ID with all players
export async function getShowdown(showdownId) {
  // Get showdown
  const { data: showdown, error: showdownError } = await supabase
    .from('showdowns')
    .select('*')
    .eq('id', showdownId)
    .single();

  if (showdownError || !showdown) {
    throw new Error('Failed to load showdown: ' + (showdownError?.message || 'not found'));
  }

  // Get players separately
  const { data: players, error: playersError } = await supabase
    .from('showdown_players')
    .select('*')
    .eq('showdown_id', showdownId)
    .order('joined_at', { ascending: true });

  if (playersError) {
    console.error('getShowdown players error:', playersError);
  }

  return {
    ...showdown,
    players: players || []
  };
}

// Start the showdown (host action)
export async function startShowdown(showdownId) {
  const { error } = await supabase
    .from('showdowns')
    .update({ 
      status: 'intro',
      started_at: new Date().toISOString()
    })
    .eq('id', showdownId);

  if (error) {
    throw new Error('Failed to start showdown: ' + error.message);
  }
}

// Update showdown status
export async function updateShowdownStatus(showdownId, status) {
  const updates = { status };
  
  if (status === 'complete') {
    updates.completed_at = new Date().toISOString();
  } else if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('showdowns')
    .update(updates)
    .eq('id', showdownId);

  if (error) {
    throw new Error('Failed to update showdown status: ' + error.message);
  }
}

// Start a new round
export async function startRound(showdownId, roundNumber) {
  // Get a random prompt
  const { data: showdown } = await supabase
    .from('showdowns')
    .select('prompt_category')
    .eq('id', showdownId)
    .single();

  // Get used prompt IDs for this showdown
  const { data: usedPrompts } = await supabase
    .from('showdown_rounds')
    .select('prompt_id')
    .eq('showdown_id', showdownId);

  const usedIds = usedPrompts?.map(p => p.prompt_id) || [];

  // Fetch a random prompt
  let query = supabase
    .from('showdown_prompts')
    .select('*')
    .eq('is_active', true);

  if (usedIds.length > 0) {
    query = query.not('id', 'in', `(${usedIds.join(',')})`);
  }

  if (showdown?.prompt_category && showdown.prompt_category !== 'mixed') {
    query = query.contains('categories', [showdown.prompt_category]);
  }

  const { data: prompts } = await query;
  
  if (!prompts || prompts.length === 0) {
    // Fallback: get any active prompt
    const { data: fallbackPrompts } = await supabase
      .from('showdown_prompts')
      .select('*')
      .eq('is_active', true)
      .limit(10);
    
    if (!fallbackPrompts || fallbackPrompts.length === 0) {
      throw new Error('No prompts available');
    }
    prompts = fallbackPrompts;
  }

  const prompt = prompts[Math.floor(Math.random() * prompts.length)];
  const bonusCategory = getBonusCategoryForRound(roundNumber);
  const now = new Date();
  const answersDue = new Date(now.getTime() + 60000); // 60 seconds

  // Create the round
  const { data: round, error } = await supabase
    .from('showdown_rounds')
    .insert({
      showdown_id: showdownId,
      round_number: roundNumber,
      prompt_id: prompt.id,
      prompt_text: prompt.text,
      bonus_category: bonusCategory.key,
      status: 'answering',
      started_at: now.toISOString(),
      answers_due_at: answersDue.toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Failed to start round: ' + error.message);
  }

  // Update showdown's current round
  await supabase
    .from('showdowns')
    .update({ 
      current_round: roundNumber,
      status: 'active'
    })
    .eq('id', showdownId);

  // Create empty answer records for all players
  const { data: players } = await supabase
    .from('showdown_players')
    .select('id')
    .eq('showdown_id', showdownId);

  if (players && players.length > 0) {
    const answerRecords = players.map(p => ({
      round_id: round.id,
      player_id: p.id
    }));

    await supabase
      .from('showdown_answers')
      .insert(answerRecords);
  }

  return round;
}

// Submit an answer
export async function submitAnswer(roundId, playerId, answerText) {
  const { error } = await supabase
    .from('showdown_answers')
    .update({
      answer_text: answerText || '[no answer]',
      submitted_at: new Date().toISOString()
    })
    .eq('round_id', roundId)
    .eq('player_id', playerId);

  if (error) {
    throw new Error('Failed to submit answer: ' + error.message);
  }
}

// Get current round with answers
export async function getCurrentRound(showdownId) {
  const { data: showdown } = await supabase
    .from('showdowns')
    .select('current_round')
    .eq('id', showdownId)
    .single();

  if (!showdown || !showdown.current_round) {
    return null;
  }

  const { data: round, error } = await supabase
    .from('showdown_rounds')
    .select(`
      *,
      answers:showdown_answers(
        *,
        player:showdown_players(id, guest_name, guest_avatar, profile_id)
      )
    `)
    .eq('showdown_id', showdownId)
    .eq('round_number', showdown.current_round)
    .single();

  if (error) {
    return null;
  }

  return round;
}

// Update round status
export async function updateRoundStatus(roundId, status) {
  const updates = { status };

  // If moving to guessing phase, set the guessing deadline
  if (status === 'guessing') {
    const now = new Date();
    updates.guessing_due_at = new Date(now.getTime() + 45000).toISOString(); // 45 seconds
  }

  // If moving to revealing, reset reveal_step
  if (status === 'revealing') {
    updates.reveal_step = 'authors';
  }

  const { error } = await supabase
    .from('showdown_rounds')
    .update(updates)
    .eq('id', roundId);

  if (error) {
    throw new Error('Failed to update round status: ' + error.message);
  }
}

// Update reveal step within revealing phase
export async function updateRevealStep(roundId, step) {
  const { error } = await supabase
    .from('showdown_rounds')
    .update({ reveal_step: step })
    .eq('id', roundId);

  if (error) {
    throw new Error('Failed to update reveal step: ' + error.message);
  }
}

// Submit guesses and vote
export async function submitGuessesAndVote(roundId, guesserId, guesses, votedAnswerId) {
  // Insert guesses
  const guessRecords = guesses.map(g => ({
    round_id: roundId,
    guesser_id: guesserId,
    answer_id: g.answerId,
    guessed_player_id: g.guessedPlayerId
  }));

  const { error: guessError } = await supabase
    .from('showdown_guesses')
    .insert(guessRecords);

  if (guessError) {
    throw new Error('Failed to submit guesses: ' + guessError.message);
  }

  // Insert vote
  const { error: voteError } = await supabase
    .from('showdown_votes')
    .insert({
      round_id: roundId,
      voter_id: guesserId,
      voted_answer_id: votedAnswerId,
      submitted_at: new Date().toISOString()
    });

  if (voteError) {
    throw new Error('Failed to submit vote: ' + voteError.message);
  }
}

// Calculate guess results (call after all guesses submitted)
export async function calculateGuessResults(roundId) {
  // Get all answers with their actual authors
  const { data: answers } = await supabase
    .from('showdown_answers')
    .select('id, player_id')
    .eq('round_id', roundId);

  // Get all guesses
  const { data: guesses } = await supabase
    .from('showdown_guesses')
    .select('*')
    .eq('round_id', roundId);

  // Mark each guess as correct or incorrect
  for (const guess of guesses) {
    const answer = answers.find(a => a.id === guess.answer_id);
    const isCorrect = answer && answer.player_id === guess.guessed_player_id;

    await supabase
      .from('showdown_guesses')
      .update({ is_correct: isCorrect })
      .eq('id', guess.id);
  }

  // Calculate best guesser
  const { data: players } = await supabase
    .from('showdown_players')
    .select('id')
    .eq('showdown_id', (await supabase.from('showdown_rounds').select('showdown_id').eq('id', roundId).single()).data.showdown_id);

  let bestGuesserId = null;
  let bestCorrectCount = 0;
  let bestSubmitTime = null;

  for (const player of players) {
    const playerGuesses = guesses.filter(g => g.guesser_id === player.id);
    const correctCount = playerGuesses.filter(g => {
      const answer = answers.find(a => a.id === g.answer_id);
      return answer && answer.player_id === g.guessed_player_id;
    }).length;

    // Get earliest guess submit time for this player
    const { data: voteData } = await supabase
      .from('showdown_votes')
      .select('submitted_at')
      .eq('round_id', roundId)
      .eq('voter_id', player.id)
      .single();

    const submitTime = voteData?.submitted_at;

    if (correctCount > bestCorrectCount || 
        (correctCount === bestCorrectCount && submitTime && (!bestSubmitTime || submitTime < bestSubmitTime))) {
      bestGuesserId = player.id;
      bestCorrectCount = correctCount;
      bestSubmitTime = submitTime;
    }
  }

  // Update round with best guesser
  if (bestGuesserId) {
    await supabase
      .from('showdown_rounds')
      .update({ best_guesser_id: bestGuesserId })
      .eq('id', roundId);
  }

  return { bestGuesserId, bestCorrectCount };
}

// Get which players have submitted guesses for a round
export async function getGuessSubmissions(roundId) {
  const { data, error } = await supabase
    .from('showdown_votes')
    .select('voter_id')
    .eq('round_id', roundId);

  if (error) {
    console.error('Failed to get guess submissions:', error);
    return [];
  }

  // Return array of player IDs who have submitted
  return data?.map(v => v.voter_id) || [];
}

// Call AI to judge the round
export async function judgeRound(roundId) {
  const response = await supabase.functions.invoke('judge-showdown-round', {
    body: { roundId }
  });

  if (response.error) {
    throw new Error('Failed to judge round: ' + response.error.message);
  }

  return response.data;
}

// Get player's display name
export function getPlayerName(player) {
  if (player.guest_name) return player.guest_name;
  // If linked to profile, we'd need to fetch it
  return 'Player';
}

// Get player's avatar
export function getPlayerAvatar(player) {
  return player.guest_avatar || '😎';
}

// Leave showdown (removes player from showdown)
export async function leaveShowdown(playerId, showdownId) {
  // Delete the player record
  const { error } = await supabase
    .from('showdown_players')
    .delete()
    .eq('id', playerId);

  if (error) {
    console.error('Failed to remove player:', error);
    throw new Error('Failed to leave showdown');
  }

  // Check if this was the host - need to promote someone else
  const { data: showdown } = await supabase
    .from('showdowns')
    .select('host_player_id')
    .eq('id', showdownId)
    .single();

  if (showdown?.host_player_id === playerId) {
    // Get remaining players
    const { data: remainingPlayers } = await supabase
      .from('showdown_players')
      .select('id, joined_at')
      .eq('showdown_id', showdownId)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (remainingPlayers && remainingPlayers.length > 0) {
      // Promote the earliest joined player to host
      const newHost = remainingPlayers[0];
      
      await supabase
        .from('showdowns')
        .update({ host_player_id: newHost.id })
        .eq('id', showdownId);

      await supabase
        .from('showdown_players')
        .update({ is_host: true })
        .eq('id', newHost.id);
    }
  }

  return;
}

// End showdown (host action)
export async function endShowdown(showdownId) {
  await updateShowdownStatus(showdownId, 'cancelled');
}

// Subscribe to showdown changes
export function subscribeToShowdown(showdownId, callback) {
  const channel = supabase
    .channel(`showdown:${showdownId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'showdowns',
        filter: `id=eq.${showdownId}`
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'showdown_players',
        filter: `showdown_id=eq.${showdownId}`
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'showdown_rounds',
        filter: `showdown_id=eq.${showdownId}`
      },
      callback
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'showdown_answers'
      },
      callback
    )
    .subscribe((status, err) => {
      console.log('📡 Subscription status:', status, err || '');
    });

  return channel;
}

// Unsubscribe from showdown
export function unsubscribeFromShowdown(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

// Prompt categories (same as rivalry)
export const PROMPT_CATEGORIES = [
  { key: 'mixed', label: 'Surprise Me', emoji: '🔀' },
  { key: 'classics', label: 'Classics', emoji: '🤭' },
  { key: 'pop_charts', label: 'Pop Charts', emoji: '🌟' },
  { key: 'bad_taste', label: 'Bad Taste', emoji: '👨‍🍳' },
  { key: 'nine_to_five', label: '9-5ish', emoji: '👔' },
  { key: 'love_bites', label: 'Love Bites', emoji: '💋' },
  { key: 'nerd_up', label: 'Nerd Up', emoji: '🚀' },
  { key: 'unfiltered', label: 'Unfiltered', emoji: '🙈' },
];

// Avatar options for guests
export const AVATARS = ['😎', '🤓', '😈', '🤡', '🎃', '🦄', '🐉', '🤖'];

// Update intro step (host controls progression)
export async function updateIntroStep(showdownId, step) {
  console.log('🎬 updateIntroStep called:', { showdownId, step });
  const { data, error } = await supabase
    .from('showdowns')
    .update({ intro_step: step })
    .eq('id', showdownId)
    .select()
    .single();

  if (error) {
    console.error('Error updating intro step:', error);
    throw error;
  }

  console.log('🎬 updateIntroStep success:', data);
  return data;
}

// Update finale step (host controls progression through champion -> standings)
export async function updateFinaleStep(showdownId, step) {
  console.log('🏆 updateFinaleStep called:', { showdownId, step });
  const { data, error } = await supabase
    .from('showdowns')
    .update({ finale_step: step })
    .eq('id', showdownId)
    .select()
    .single();

  if (error) {
    console.error('Error updating finale step:', error);
    throw error;
  }

  console.log('🏆 updateFinaleStep success:', data);
  return data;
}

// Generate AI recap for showdown highlights
export async function generateShowdownRecap(showdownId) {
  console.log('🎬 generateShowdownRecap called:', showdownId);
  
  const response = await supabase.functions.invoke('generate-showdown-recap', {
    body: { showdownId }
  });

  if (response.error) {
    console.error('Error generating recap:', response.error);
    throw new Error('Failed to generate recap: ' + response.error.message);
  }

  console.log('🎬 generateShowdownRecap success:', response.data);
  return response.data;
}

// Get all rounds for a showdown (for full results display)
export async function getShowdownRounds(showdownId) {
  const { data, error } = await supabase
    .from('showdown_rounds')
    .select(`
      *,
      answers:showdown_answers(*)
    `)
    .eq('showdown_id', showdownId)
    .order('round_number', { ascending: true });

  if (error) {
    console.error('Error fetching rounds:', error);
    throw error;
  }

  return data;
}