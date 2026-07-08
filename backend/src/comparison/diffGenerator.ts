/**
 * Diff-image generator.
 *
 * Takes a raw RGBA diff buffer (produced by the comparator) and encodes it
 * as a PNG using Sharp. No pixel-level comparison logic here — that belongs
 * in the comparator module.
 */

import sharp from 'sharp';

/**
 * Maximum dimension for the diff PNG. If the source buffer exceeds these
 * dimensions it will be rejected (Sharp can handle large PNGs but the
 * frontend doesn't need them).
 */
const MAX_DIFF_DIMENSION = 4096;

/**
 * Encode a raw RGBA diff buffer into a PNG image.
 *
 * @param diffBuffer   Raw RGBA pixel data (width × height × 4 bytes).
 * @param width        Image width in pixels.
 * @param height       Image height in pixels.
 * @returns            A Buffer containing the encoded PNG bytes.
 */
export async function encodeDiffPng(
  diffBuffer: Buffer,
  width: number,
  height: number,
): Promise<Buffer> {
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid diff dimensions: ${width}×${height}`);
  }

  if (width > MAX_DIFF_DIMENSION || height > MAX_DIFF_DIMENSION) {
    throw new Error(
      `Diff dimensions ${width}×${height} exceed maximum ${MAX_DIFF_DIMENSION}×${MAX_DIFF_DIMENSION}`,
    );
  }

  const expectedBytes = width * height * 4;
  if (diffBuffer.length !== expectedBytes) {
    throw new Error(
      `Diff buffer size mismatch: expected ${expectedBytes} bytes ` +
        `for ${width}×${height} RGBA, got ${diffBuffer.length}`,
    );
  }

  const png = await sharp(diffBuffer, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  return png;
}
