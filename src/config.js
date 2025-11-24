// One-Upper Configuration
// Central configuration file for game constants

// ============================================================================
// RIVALRY SETTINGS
// ============================================================================

/**
 * Number of shows in a complete rivalry.
 * 
 * IMPORTANT: This is the single source of truth for rivalry length.
 * Changing this number will affect:
 * - UI displays (show numbering)
 * - Game logic (when to trigger summary)
 * - Database queries (completion checks)
 * - Emcee line selection (special lines for final shows)
 * 
 * Current: 11 shows (odd number prevents W/L ties, ~2 weeks to complete)
 * 
 * NOTE: Changing this mid-deployment affects IN-PROGRESS rivalries.
 * - Completed rivalries (status='complete') are not affected
 * - In-progress rivalries will extend/contract to new length
 * - Best practice: Wait for active rivalries to complete before changing
 */
export const RIVALRY_LENGTH = 11;

/**
 * Show numbers that trigger special emcee lines.
 * Automatically calculated based on RIVALRY_LENGTH.
 */
export const SPECIAL_SHOWS = {
  PENULTIMATE: RIVALRY_LENGTH - 1,  // Second-to-last show (e.g., show 10 if length is 11)
  FINALE: RIVALRY_LENGTH,            // Final show (e.g., show 11)
};

/**
 * Milestone shows that trigger special commentary.
 * Currently fixed at shows 5 and 10.
 */
export const MILESTONE_SHOWS = [5, 10];

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
 * - Variable match lengths (Quick: 7, Standard: 11, Marathon: 21)
 * - Concurrent rivalries (multiple active at once)
 * - Season structure (every N shows = season)
 */

export default {
  RIVALRY_LENGTH,
  SPECIAL_SHOWS,
  MILESTONE_SHOWS,
  MAX_SUMMARY_RETRIES,
};