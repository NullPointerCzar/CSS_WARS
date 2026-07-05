/**
 * Image comparison using Pixelmatch.
 *
 * Takes a screenshot image and a target image, resizes the target to match
 * the screenshot dimensions, then runs pixelmatch to compute a diff and
 * similarity percentage.
 */

import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreResult {
  success: true;
  /** Similarity percentage (0–100), rounded to 2 decimal places. */
  score: number;
  /** Number of pixels that differ between the two images. */
  mismatchedPixels: number;
  /** Total pixels compared. */
  totalPixels: number;
}

export interface ScoreError {
  success: false;
  error: string;
}

export type ScoreOutcome = ScoreResult | ScoreError;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Compare a submission screenshot against the challenge's target image.
 *
 * The target image is resized to match the screenshot's dimensions before
 * comparison, so viewport size mismatches don't penalize the score.
 */
export async function compareImages(
  screenshotPath: string,
  targetImagePath: string,
): Promise<ScoreOutcome> {
  try {
    // Verify both files exist
    if (!fs.existsSync(screenshotPath)) {
      return { success: false, error: `Screenshot not found: ${screenshotPath}` };
    }
    if (!fs.existsSync(targetImagePath)) {
      return { success: false, error: `Target image not found: ${targetImagePath}` };
    }

    // Load screenshot metadata
    const screenshotMeta = await sharp(screenshotPath).metadata();
    const width = screenshotMeta.width ?? 0;
    const height = screenshotMeta.height ?? 0;

    if (width === 0 || height === 0) {
      return { success: false, error: 'Screenshot has zero dimensions' };
    }

    // Load both images as RGBA raw buffers
    // Resize target to match screenshot dimensions
    const [screenshotBuffer, targetBuffer] = await Promise.all([
      sharp(screenshotPath).ensureAlpha().raw().toBuffer(),
      sharp(targetImagePath)
        .resize(width, height, {
          fit: 'fill', // Stretch target to match screenshot exactly
          kernel: 'nearest', // Pixel-perfect for CSS Battle's precise designs
        })
        .ensureAlpha()
        .raw()
        .toBuffer(),
    ]);

    // The buffers should be the same length (width * height * 4 channels)
    if (screenshotBuffer.length !== targetBuffer.length) {
      // This shouldn't happen since we resized, but just in case:
      const minLen = Math.min(screenshotBuffer.length, targetBuffer.length);
      return {
        success: false,
        error: `Dimension mismatch: screenshot ${screenshotBuffer.length}B vs target ${targetBuffer.length}B`,
      };
    }

    // Allocate diff buffer
    const diffBuffer = Buffer.alloc(screenshotBuffer.length);

    // Run pixelmatch
    const mismatchedPixels = pixelmatch(
      screenshotBuffer,
      targetBuffer,
      diffBuffer,
      width,
      height,
      {
        threshold: 0.1, // 10% — small color differences are acceptable
        alpha: 0.5,     // Semi-transparent diff overlay
        includeAA: true, // Include anti-aliasing pixels in diff
      },
    );

    const totalPixels = width * height;
    const matchRatio = (totalPixels - mismatchedPixels) / totalPixels;
    const score = Math.round(matchRatio * 100 * 100) / 100; // Round to 2 decimal places

    return {
      success: true,
      score,
      mismatchedPixels,
      totalPixels,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Image comparison failed: ${err.message ?? 'Unknown error'}`,
    };
  }
}
