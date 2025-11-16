import { supabase } from './supabase';

// Get all active judges
export async function getAllJudges() {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('is_active', true)
    .order('id');

  if (error) {
    console.error('Error fetching judges:', error);
    return [];
  }

  return data;
}

// Get judge by key
export async function getJudge(key) {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .eq('key', key)
    .single();

  if (error) {
    console.error('Error fetching judge:', error);
    return null;
  }

  return data;
}

// Get multiple judges by keys
export async function getJudgesByKeys(keys) {
  const { data, error } = await supabase
    .from('judges')
    .select('*')
    .in('key', keys);

  if (error) {
    console.error('Error fetching judges:', error);
    return [];
  }

  return data;
}

// Select N random judges
export async function selectRandomJudges(count = 3) {
  const judges = await getAllJudges();
  
  if (judges.length < count) {
    console.error('Not enough active judges');
    return judges;
  }

  // Shuffle and take first N
  const shuffled = [...judges].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Get random judge keys (for storing in shows table)
export async function selectRandomJudgeKeys(count = 3) {
  const judges = await selectRandomJudges(count);
  return judges.map(j => j.key);
}

// Convert judge data to format expected by judge prompt template
export function formatJudgeForPrompt(judge) {
  return {
    name: judge.name,
    emoji: judge.emoji,
    description: judge.description,
    examples: judge.examples
  };
}