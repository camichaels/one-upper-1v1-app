import { supabase } from '../lib/supabase';

/**
 * Get a random prompt from the database
 * Excludes recently used prompts if IDs provided
 * @param {number[]} usedPromptIds - Array of recently used prompt IDs
 * @returns {Promise<Object>} Random prompt object
 */
export async function getRandomPrompt(usedPromptIds = []) {
  try {
    // Build query for active prompts
    let query = supabase
      .from('prompts')
      .select('*')
      .eq('is_active', true);
    
    // Exclude recently used prompts if any
    if (usedPromptIds.length > 0) {
      query = query.not('id', 'in', `(${usedPromptIds.join(',')})`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // If no prompts available (all used), get any active prompt
    if (!data || data.length === 0) {
      const { data: allPrompts, error: allError } = await supabase
        .from('prompts')
        .select('*')
        .eq('is_active', true);
      
      if (allError) throw allError;
      if (!allPrompts || allPrompts.length === 0) {
        throw new Error('No active prompts found');
      }
      
      return allPrompts[Math.floor(Math.random() * allPrompts.length)];
    }
    
    // Return random prompt from available
    return data[Math.floor(Math.random() * data.length)];
  } catch (error) {
    console.error('Error getting random prompt:', error);
    // Fallback to basic prompt
    return {
      id: null,
      text: 'Tell me something interesting.',
      category: 'general'
    };
  }
}

/**
 * Select 3 random judges from the database
 * @returns {Promise<Array>} Array of 3 judge objects
 */
export async function selectJudges() {
  try {
    const { data, error } = await supabase
      .from('judges')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    
    if (!data || data.length < 3) {
      throw new Error('Not enough active judges');
    }
    
    // Shuffle and take first 3
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  } catch (error) {
    console.error('Error selecting judges:', error);
    // Fallback to basic judge data
    return [
      { id: 1, key: 'savage', name: 'Savage', emoji: '🔥', description: 'Rewards boldness' },
      { id: 2, key: 'riley', name: 'Riley', emoji: '💙', description: 'Values sincerity' },
      { id: 3, key: 'coach', name: 'Coach', emoji: '🎓', description: 'Loves dry wit' }
    ];
  }
}