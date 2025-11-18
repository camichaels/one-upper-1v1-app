/**
 * Generates unique profile codes in format: NAME-X7K9
 * Examples: CRAIG-X7K9, SAM-P3M1, ALEX-B8N2
 */

const ADJECTIVES = [
  'HAPPY', 'SILLY', 'WILD', 'MEGA', 'SUPER', 'EPIC', 'BRAVE', 'QUICK',
  'SMART', 'WITTY', 'BOLD', 'COOL', 'SWIFT', 'SHARP', 'BRIGHT', 'LUCKY'
];

const NOUNS = [
  'TIGER', 'EAGLE', 'NINJA', 'WIZARD', 'ROBOT', 'DRAGON', 'PHOENIX', 'SHARK',
  'WOLF', 'LION', 'HAWK', 'FOX', 'BEAR', 'PANDA', 'COBRA', 'FALCON'
];

/**
 * Generates a random profile code
 * @returns {string} Format: ADJECTIVE-NOUN-#### (e.g., "HAPPY-TIGER-1234")
 */
export function generateCode() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${adjective}-${noun}-${number}`;
}

/**
 * Validates a profile code format
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid format
 */
export function isValidCodeFormat(code) {
  if (!code || typeof code !== 'string') return false;
  
  // Should match: WORD-WORD-####
  const pattern = /^[A-Z]+-[A-Z]+-\d{4}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * Formats a code input (uppercase, trim)
 * @param {string} input - Raw input
 * @returns {string} Formatted code
 */
export function formatCodeInput(input) {
  if (!input) return '';
  return input.toUpperCase().trim();
}