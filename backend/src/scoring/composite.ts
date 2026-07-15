/**
 * Composite submission scoring.
 *
 * Final score = a weighted blend of three components, each normalised to 0–100:
 *
 *   - pixel  (weight 0.75): pixel-to-pixel render match vs. the target image
 *                           (the similarity % produced by the comparator).
 *   - byte   (weight 0.15): code efficiency — fewer bytes is better. Normalised
 *                           against SCORE_PAR_BYTES (a reference "par" size).
 *   - time   (weight 0.10): speed — faster is better. Normalised against
 *                           SCORE_PAR_TIME_MS (a reference "par" solve time).
 *
 * The pixel component is the raw similarity and needs no normalisation. The
 * byte and time components use a "par" ratio so that hitting (or beating) the
 * reference yields full marks, while going over it degrades the score. Both
 * "par" references are configurable via environment variables so organisers
 * can tune the difficulty of each axis without code changes.
 */

// ---------------------------------------------------------------------------
// Tunable references (env-overridable)
// ---------------------------------------------------------------------------

/** Reference byte count for full byte-score marks (default 600 bytes). */
const PAR_BYTES = Number(process.env.SCORE_PAR_BYTES ?? 600);

/** Reference solve time (ms) for full time-score marks (default 3 minutes). */
const PAR_TIME_MS = Number(process.env.SCORE_PAR_TIME_MS ?? 180_000);

/** Component weights — must sum to 1. */
const WEIGHT_PIXEL = 0.75;
const WEIGHT_BYTE = 0.15;
const WEIGHT_TIME = 0.1;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompositeInput {
  /** Pixel-to-pixel similarity, 0–100. */
  pixelScore: number;
  /** Total code size in bytes (server-computed from sanitized code). */
  codeLength: number;
  /** Solve time in milliseconds, from challenge start to submit. */
  solveTimeMs: number;
}

export interface CompositeScore {
  /** Final weighted score, 0–100 (rounded to 2 dp). */
  score: number;
  /** Per-component, each normalised to 0–100. */
  pixelComponent: number;
  byteComponent: number;
  timeComponent: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min = 0, max = 100): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalise a "lower is better" raw value against a par reference.
 *
 * value <= par  → 100 (full marks)
 * value >  par  → 100 * par / value (strictly decreasing, never negative)
 */
function parRatio(value: number, par: number): number {
  const safePar = par > 0 ? par : 1;
  const safeValue = Math.max(value, 1); // avoid divide-by-zero
  if (safeValue <= safePar) return 100;
  return (safePar / safeValue) * 100;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the composite submission score from its three raw inputs.
 *
 * @param input  pixelScore (0–100), codeLength (bytes), solveTimeMs (>= 0).
 * @returns      Weighted final score plus the individual normalised components.
 */
export function computeCompositeScore(input: CompositeInput): CompositeScore {
  const pixelComponent = clamp(input.pixelScore);
  const byteComponent = clamp(parRatio(input.codeLength, PAR_BYTES));
  const timeComponent = clamp(parRatio(input.solveTimeMs, PAR_TIME_MS));

  const score =
    WEIGHT_PIXEL * pixelComponent +
    WEIGHT_BYTE * byteComponent +
    WEIGHT_TIME * timeComponent;

  return {
    score: Math.round(score * 100) / 100,
    pixelComponent: Math.round(pixelComponent * 100) / 100,
    byteComponent: Math.round(byteComponent * 100) / 100,
    timeComponent: Math.round(timeComponent * 100) / 100,
  };
}
