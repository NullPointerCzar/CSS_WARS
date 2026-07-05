/**
 * Tie-break logic for the CSS Battle leaderboard.
 *
 * Rules (from project plan Section 8):
 * 1. Highest score wins
 * 2. Tie → shortest codeLength wins
 * 3. Still tied → earliest submittedAt wins
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields used by the tie-break comparison. */
export interface ScorableFields {
  score: number;
  codeLength: number;
  submittedAt: Date | string;
}

export interface ScoredEntry extends ScorableFields {
  userId: string;
  userName: string;
  submissionId: string;
}

// ---------------------------------------------------------------------------
// Comparator
// ---------------------------------------------------------------------------

/**
 * Compare two scored entries to determine ranking order.
 *
 * Returns a negative number if `a` should rank higher (better) than `b`.
 * - Higher score → better
 * - Same score → shorter code → better
 * - Same score & code → earlier submission → better
 *
 * Accepts any object with the scorable fields (score, codeLength, submittedAt),
 * making it usable for both full `ScoredEntry` objects and leaner submission records.
 */
export function compareEntries(a: ScorableFields, b: ScorableFields): number {
  // 1. Highest score wins
  if (a.score !== b.score) {
    return b.score - a.score;
  }

  // 2. Tie → shortest code length wins
  if (a.codeLength !== b.codeLength) {
    return a.codeLength - b.codeLength;
  }

  // 3. Still tied → earliest submission time wins
  const aTime = new Date(a.submittedAt).getTime();
  const bTime = new Date(b.submittedAt).getTime();
  return aTime - bTime;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * Sort an array of scored entries by the tie-break rules.
 * The array is sorted in-place and returned (highest rank first).
 */
export function rankEntries(entries: ScoredEntry[]): ScoredEntry[] {
  return entries.sort(compareEntries);
}

// ---------------------------------------------------------------------------
// Best submission helper
// ---------------------------------------------------------------------------

/**
 * Given a list of a single user's submissions for a single challenge,
 * find the "best" one according to tie-break rules.
 */
export function findBestSubmission(
  submissions: { score: number | null; codeLength: number; submittedAt: Date | string; id: string }[],
): string | null {
  if (submissions.length === 0) return null;

  // Filter to only scored submissions
  const scored = submissions.filter((s) => s.score !== null) as {
    score: number;
    codeLength: number;
    submittedAt: Date | string;
    id: string;
  }[];

  if (scored.length === 0) return null;

  // Use the same tie-break logic
  scored.sort(compareEntries);
  return scored[0].id;
}
