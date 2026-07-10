/**
 * Pure pixel-level image comparison.
 *
 * This module has NO file I/O and NO side-effects. It takes two equal-sized
 * RGBA raw pixel buffers and compares them pixel-by-pixel using pixelmatch.
 *
 * All resize operations, image loading, and PNG encoding are handled by
 * callers (the scoring service and diff generator).
 */

import pixelmatch from 'pixelmatch';
import type { PixelComparisonOptions, ComparisonResult } from './types.js';

// ---------------------------------------------------------------------------
// Default options tuned for CSS pixel-art comparison
// ---------------------------------------------------------------------------

/**
 * Default pixelmatch options for CSS WARS.
 *
 * Designed for comparing Playwright screenshots (browser-rendered CSS with
 * 1-2px of anti-aliasing at shape edges) against sharp pixel-art target
 * images upscaled with nearest-neighbour.
 *
 * - `includeAA: false` — detect AA edges and do NOT count them as mismatches
 * - `diffMask: true` — matching pixels are transparent in the diff
 * - `diffColor` — magenta for genuine mismatches
 * - `aaColor` — yellow for detected AA pixels
 * - `threshold: 0.1` — tolerates very small colour differences (OKLab space)
 */
export const DEFAULT_COMPARISON_OPTIONS: Required<PixelComparisonOptions> = {
  threshold: 0.1,
  includeAA: false,
  diffColor: [255, 0, 255] as [number, number, number],
  aaColor: [255, 255, 0] as [number, number, number],
  diffMask: true,
  alpha: 0.1,
} as const;

// ---------------------------------------------------------------------------
// Comparator
// ---------------------------------------------------------------------------

/**
 * Compare two raw RGBA pixel buffers and return mismatch statistics + a
 * diff buffer.
 *
 * Both buffers must have exactly `width * height * 4` bytes. The result's
 * `diffBuffer` is a copy — the original input buffers are never mutated.
 *
 * @param img1  First image's RGBA pixel data (typically the screenshot).
 * @param img2  Second image's RGBA pixel data (typically the target).
 * @param width  Image width in pixels.
 * @param height Image height in pixels.
 * @param options  Optional overrides for pixelmatch settings.
 * @returns A ComparisonResult with mismatch stats and a diff buffer.
 */
export function comparePixels(
  img1: Buffer,
  img2: Buffer,
  width: number,
  height: number,
  options?: PixelComparisonOptions,
): ComparisonResult {
  const opts = { ...DEFAULT_COMPARISON_OPTIONS, ...options };
  const totalPixels = width * height;
  const expectedBytes = totalPixels * 4;

  if (img1.length !== expectedBytes || img2.length !== expectedBytes) {
    throw new Error(
      `Buffer size mismatch: expected ${expectedBytes} bytes ` +
        `(width=${width}, height=${height}, channels=4), ` +
        `got img1=${img1.length}, img2=${img2.length}`,
    );
  }

  // Allocate output diff buffer.
  const diffBuffer = Buffer.alloc(expectedBytes);

  const mismatchedPixels = pixelmatch(img1, img2, diffBuffer, width, height, {
    threshold: opts.threshold,
    includeAA: opts.includeAA,
    alpha: opts.alpha,
    diffColor: opts.diffColor,
    aaColor: opts.aaColor,
    diffMask: opts.diffMask,
  });

  const similarity = (totalPixels - mismatchedPixels) / totalPixels;
  const score = Math.round(similarity * 100 * 100) / 100;

  return {
    mismatchedPixels,
    totalPixels,
    similarity,
    score,
    diffBuffer,
    width,
    height,
  };
}
