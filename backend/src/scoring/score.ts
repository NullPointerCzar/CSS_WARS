/**
 * Scoring service — orchestrates the full render → compare pipeline.
 *
 * Responsibilities:
 *   1. Load both images from disk
 *   2. Resize the target image to the reference canvas (nearest-neighbour)
 *   3. Call the pixel comparator
 *   4. Optionally encode the diff as a PNG
 *   5. Return structured results
 *
 * Code-length is NOT computed here. That is handled separately by the
 * submission service and tiebreak module. This module only computes
 * visual similarity.
 */

import sharp from 'sharp';
import fs from 'fs';
import { comparePixels } from '../comparison/comparator.js';
import { encodeDiffPng } from '../comparison/diffGenerator.js';
import type { ScoredResult, DiffResult } from '../comparison/types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default reference canvas used to normalize both images before comparing.
 * Matches the default render viewport (400×300, the CSS Battle standard).
 *
 * Can be overridden by passing explicit dimensions to the scoring functions.
 */
const DEFAULT_VIEWPORT_WIDTH = 400;
const DEFAULT_VIEWPORT_HEIGHT = 300;

// ---------------------------------------------------------------------------
// Image loading & resizing
// ---------------------------------------------------------------------------

/**
 * Load an image from disk and resize it to the reference canvas using
 * nearest-neighbour interpolation.
 *
 * Nearest-neighbour is critical for CSS pixel art: it preserves hard colour
 * edges exactly. A 1-pixel red line in the target stays a 1-pixel red line
 * after resize instead of bleeding into a blurry gradient.
 *
 * The alpha channel is added if missing (pixelmatch requires RGBA data).
 */
async function loadAndResize(
  imagePath: string,
  targetWidth: number,
  targetHeight: number,
): Promise<Buffer> {
  const buffer = await sharp(imagePath)
    .resize(targetWidth, targetHeight, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      kernel: 'nearest',
    })
    .ensureAlpha()
    .raw()
    .toBuffer();

  return buffer;
}

// ---------------------------------------------------------------------------
// Scoring (visual similarity only)
// ---------------------------------------------------------------------------

/**
 * Compute the visual similarity between a submission screenshot and a
 * challenge's target image.
 *
 * Both images are resized to the same reference canvas (default 400×300)
 * before comparison, so the result is independent of source resolution.
 *
 * @param screenshotPath  Path to the PNG screenshot (from Playwright render).
 * @param targetPath      Path to the challenge's target PNG.
 * @param viewportWidth   Optional reference canvas width (default 400).
 * @param viewportHeight  Optional reference canvas height (default 300).
 * @returns               ScoredResult with similarity percentage and pixel counts.
 */
export async function computeScore(
  screenshotPath: string,
  targetPath: string,
  viewportWidth: number = DEFAULT_VIEWPORT_WIDTH,
  viewportHeight: number = DEFAULT_VIEWPORT_HEIGHT,
): Promise<ScoredResult> {
  // Verify both files exist.
  if (!fs.existsSync(screenshotPath)) {
    throw new Error(`Screenshot not found: ${screenshotPath}`);
  }
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Target image not found: ${targetPath}`);
  }

  // 1. Resize both images to the common reference canvas.
  const [screenshotBuffer, targetBuffer] = await Promise.all([
    loadAndResize(screenshotPath, viewportWidth, viewportHeight),
    loadAndResize(targetPath, viewportWidth, viewportHeight),
  ]);

  // 2. Run pixel comparison.
  const result = comparePixels(
    screenshotBuffer,
    targetBuffer,
    viewportWidth,
    viewportHeight,
  );

  return {
    score: result.score,
    mismatchedPixels: result.mismatchedPixels,
    totalPixels: result.totalPixels,
    width: result.width,
    height: result.height,
  };
}

// ---------------------------------------------------------------------------
// Diff image generation
// ---------------------------------------------------------------------------

/**
 * Generate a visual diff PNG highlighting the differences between a
 * screenshot and a target image.
 *
 * This is equivalent to `computeScore` but also encodes the diff buffer
 * as a PNG suitable for serving to the frontend.
 *
 * @param screenshotPath  Path to the PNG screenshot.
 * @param targetPath      Path to the target PNG.
 * @param viewportWidth   Optional reference canvas width (default 400).
 * @param viewportHeight  Optional reference canvas height (default 300).
 * @returns               DiffResult with the diff PNG + similarity stats.
 */
export async function generateDiff(
  screenshotPath: string,
  targetPath: string,
  viewportWidth: number = DEFAULT_VIEWPORT_WIDTH,
  viewportHeight: number = DEFAULT_VIEWPORT_HEIGHT,
): Promise<DiffResult> {
  // Verify both files exist.
  if (!fs.existsSync(screenshotPath)) {
    throw new Error(`Screenshot not found: ${screenshotPath}`);
  }
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Target image not found: ${targetPath}`);
  }

  // 1. Resize both images to the common reference canvas.
  const [screenshotBuffer, targetBuffer] = await Promise.all([
    loadAndResize(screenshotPath, viewportWidth, viewportHeight),
    loadAndResize(targetPath, viewportWidth, viewportHeight),
  ]);

  // 2. Run pixel comparison.
  const result = comparePixels(
    screenshotBuffer,
    targetBuffer,
    viewportWidth,
    viewportHeight,
  );

  // 3. Encode the diff buffer as a PNG.
  const diffPng = await encodeDiffPng(
    result.diffBuffer,
    result.width,
    result.height,
  );

  return {
    diffPng,
    score: result.score,
    mismatchedPixels: result.mismatchedPixels,
    totalPixels: result.totalPixels,
    width: result.width,
    height: result.height,
  };
}
