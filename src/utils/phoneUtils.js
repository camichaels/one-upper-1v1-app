// Phone number utilities for US phone numbers

/**
 * Normalize phone number by removing all formatting and keeping only digits
 * Handles formats like: (415) 516-9044, 415-516-9044, +14155169044, etc.
 * Returns 10-digit string or null if invalid
 */
export function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 1 and has 11 digits, remove the 1 (US country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  
  // Return 10 digits or null if invalid length
  return digits.length === 10 ? digits : null;
}

/**
 * Validate US phone number format
 * Returns { valid: boolean, error: string }
 */
export function validatePhone(phone) {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  const normalized = normalizePhone(phone);
  
  if (!normalized) {
    return { valid: false, error: 'Please enter a valid 10-digit US phone number' };
  }
  
  return { valid: true, error: null };
}