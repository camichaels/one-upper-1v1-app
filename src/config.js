// One-Upper Configuration
// Central configuration file for game constants

// ============================================================================
// RIVALRY SETTINGS
// ============================================================================

/**
 * Number of rounds in a complete rivalry.
 * 
 * IMPORTANT: This is the single source of truth for rivalry length.
 * Changing this number will affect:
 * - UI displays (round numbering)
 * - Game logic (when to trigger summary)
 * - Database queries (completion checks)
 * - Emcee line selection (special lines for final rounds)
 * 
 * Current: 5 rounds (odd number prevents W/L ties, completable in one session)
 * 
 * NOTE ON INTERNAL NAMING:
 * - Database uses "shows" table and "show_number" column (legacy naming)
 * - UI displays "Round" to users
 * - This is intentional - DB rename was deemed too risky
 * 
 * NOTE: Changing this mid-deployment affects IN-PROGRESS rivalries.
 * - Completed rivalries (status='complete') are not affected
 * - In-progress rivalries will extend/contract to new length
 * - Best practice: Wait for active rivalries to complete before changing
 */
export const RIVALRY_LENGTH = 5;

/**
 * Round numbers that trigger special emcee lines.
 * Automatically calculated based on RIVALRY_LENGTH.
 */
export const SPECIAL_SHOWS = {
  PENULTIMATE: RIVALRY_LENGTH - 1,  // Second-to-last round (e.g., round 4 if length is 5)
  FINALE: RIVALRY_LENGTH,            // Final round (e.g., round 5)
};

/**
 * Milestone rounds that trigger special commentary.
 * For 5-round rivalries, round 3 is the midpoint.
 */
export const MILESTONE_SHOWS = [3];

// ============================================================================
// AI COST LIMITS
// ============================================================================

/**
 * Maximum retry attempts for AI summary generation.
 * Prevents runaway costs if API repeatedly fails.
 */
export const MAX_SUMMARY_RETRIES = 3;

// ============================================================================
// FUTURE CONFIGURATION
// ============================================================================

/**
 * Reserved for future features:
 * - Variable match lengths (Quick: 5, Extended: 11)
 * - Concurrent rivalries (multiple active at once)
 * - Season structure
 */

export default {
  RIVALRY_LENGTH,
  SPECIAL_SHOWS,
  MILESTONE_SHOWS,
  MAX_SUMMARY_RETRIES,
};