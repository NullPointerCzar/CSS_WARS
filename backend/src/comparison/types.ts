/**
 * Shared types for the pixel-comparison pipeline.
 *
 * These types are used by the comparator, diff generator, and scoring
 * modules. They define no logic — only data contracts.
 */

// ---------------------------------------------------------------------------
// Comparison options
// ---------------------------------------------------------------------------

/**
 * Options passed to the pixel-level comparator.
 *
 * All fields are optional — omitted fields fall through to pixelmatch's
 * built-in defaults (see the comparator module for the exact values).
 */
export interface PixelComparisonOptions {
  /**
   * Color-difference tolerance in OKLab perceptual space (0 to 1).
   * Smaller = more sensitive. Default 0.1.
   */
  threshold?: number;

  /**
   * If true, disable anti-aliased-pixel detection (AA pixels ARE compared
   * and counted as mismatches). If false (default), detect AA edges using
   * Vyšniauskas' intensity-slope detector and DO NOT count them.
   */
  includeAA?: boolean;

  /**
   * RGB colour for genuinely differing pixels. Default [255, 0, 0] (red).
   */
  diffColor?: [number, number, number];

  /**
   * RGB colour for detected anti-aliased pixels (only meaningful when
   * includeAA is false). Default [255, 255, 0] (yellow).
   */
  aaColor?: [number, number, number];

  /**
   * If true, matching pixels are fully transparent in the diff output;
   * only differing and anti-aliased pixels are visible. Default false.
   */
  diffMask?: boolean;

  /**
   * Blending factor for unchanged (matching) pixels in the diff output.
   * 0 = white, 1 = original brightness. Default 0.1.
   */
  alpha?: number;
}

// ---------------------------------------------------------------------------
// Comparison result
// ---------------------------------------------------------------------------

/**
 * The raw result of comparing two RGBA pixel buffers.
 */
export interface ComparisonResult {
  /** Number of pixels that differ between the two images. */
  mismatchedPixels: number;
  /** Total number of pixels compared (width × height). */
  totalPixels: number;
  /** Similarity ratio (0–1), where 1 = identical. */
  similarity: number;
  /** Similarity percentage (0–100), rounded to 2 decimal places. */
  score: number;
  /**
   * RGBA diff buffer (width × height × 4 bytes).
   * Matching pixels are transparent or blended (per options);
   * differing pixels use diffColor; anti-aliased pixels use aaColor.
   */
  diffBuffer: Buffer;
  /** Width of the compared images (pixels). */
  width: number;
  /** Height of the compared images (pixels). */
  height: number;
}

// ---------------------------------------------------------------------------
// Render result
// ---------------------------------------------------------------------------

/**
 * Configurable viewport for the Playwright renderer.
 * Defaults to 400×300 if not specified.
 */
export interface ViewportConfig {
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Scoring result (no code-length — pure visual similarity)
// ---------------------------------------------------------------------------

/**
 * The result of scoring a submission's screenshot against a target image.
 * This is purely visual — code-length tiebreaking is handled separately
 * by the tiebreak module.
 */
export interface ScoredResult {
  /** Similarity percentage (0–100). */
  score: number;
  /** Number of pixels that differ. */
  mismatchedPixels: number;
  /** Total pixels compared. */
  totalPixels: number;
  /** Comparison width (pixels). */
  width: number;
  /** Comparison height (pixels). */
  height: number;
}

// ---------------------------------------------------------------------------
// Diff result
// ---------------------------------------------------------------------------

/**
 * The result of generating a visual diff image.
 */
export interface DiffResult {
  /** Encoded PNG buffer of the diff image. */
  diffPng: Buffer;
  /** Similarity percentage (0–100). */
  score: number;
  /** Number of pixels that differ. */
  mismatchedPixels: number;
  /** Total pixels compared. */
  totalPixels: number;
  /** Comparison width (pixels). */
  width: number;
  /** Comparison height (pixels). */
  height: number;
}
