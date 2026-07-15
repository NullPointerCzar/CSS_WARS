export interface PaletteColor {
  hex: string;
  rgb: [number, number, number];
  ratio: number;
}

interface Cluster {
  r: number;
  g: number;
  b: number;
  L: number;
  a: number;
  bb: number;
  count: number;
}

const MAX_SAMPLE_DIM = 120;

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  let x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  let y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  let z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x);
  y = f(y);
  z = f(z);

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE76 ΔE — perceptually weighted Euclidean distance in LAB space. */
function deltaE(a: Cluster, b: Cluster): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.bb - b.bb;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Extracts the dominant, visually distinct colors from an image URL.
 *
 * Pipeline (deterministic — no randomness, stable input ordering):
 *  1. Downsample the image to at most MAX_SAMPLE_DIM on the longest side.
 *  2. Quantize opaque pixels onto a coarse RGB grid to collapse
 *     anti-aliasing / compression / edge-smoothing noise into stable bins.
 *  3. Build clusters (averaged RGB + LAB) from the surviving bins.
 *  4. Greedy perceptual merge: fold bins that are within ΔE of an existing
 *     cluster so near-identical tints become one color.
 *  5. Transitional-color absorption: repeatedly fold the smallest remaining
 *     cluster into its nearest dominant color whenever they are perceptually
 *     close. This collapses gradient ramps and interpolation fringes toward
 *     the actual endpoint colors a human perceives.
 *  6. Drop clusters below a minimum area ratio (rendering / artifact noise).
 *  7. Sort by occupied area and return the top `maxColors`.
 *
 * Solid-color CSS Battle targets produce byte-exact palettes because every
 * pixel of a solid region quantizes to the same bin and averages to itself.
 */
export async function extractPalette(
  imageUrl: string,
  options: {
    maxColors?: number;
    deltaEThreshold?: number;
    minAreaRatio?: number;
    quantizeStep?: number;
  } = {},
): Promise<PaletteColor[]> {
  const {
    maxColors = 8,
    deltaEThreshold = 12,
    minAreaRatio = 0.005,
    quantizeStep = 16,
  } = options;

  const img = await loadImage(imageUrl);

  const scale = Math.min(1, MAX_SAMPLE_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return [];
  }

  // Step 2: quantize opaque pixels onto a coarse grid to eliminate noise.
  // Pixels with alpha below the threshold are edge/transparency fringe and
  // are ignored entirely so anti-aliased borders don't leak grey tints.
  const ALPHA_THRESHOLD = 200;
  const step = Math.max(1, quantizeStep);
  const bins = new Map<number, { r: number; g: number; b: number; count: number }>();
  let opaqueTotal = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < ALPHA_THRESHOLD) continue;
    opaqueTotal++;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const qr = Math.min(255, Math.round(r / step) * step);
    const qg = Math.min(255, Math.round(g / step) * step);
    const qb = Math.min(255, Math.round(b / step) * step);
    const key = (qr << 16) | (qg << 8) | qb;

    const bin = bins.get(key);
    if (bin) {
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bin.count++;
    } else {
      bins.set(key, { r, g, b, count: 1 });
    }
  }

  if (opaqueTotal === 0) return [];

  // Step 3: convert bins → averaged clusters with LAB coordinates.
  let clusters: Cluster[] = [];
  for (const bin of bins.values()) {
    const r = bin.r / bin.count;
    const g = bin.g / bin.count;
    const b = bin.b / bin.count;
    const [L, a, bb] = rgbToLab(r, g, b);
    clusters.push({ r, g, b, L, a, bb, count: bin.count });
  }

  // Step 4: greedy perceptual merge (largest first absorbs near matches).
  clusters.sort((x, y) => y.count - x.count);
  const merged: Cluster[] = [];
  for (const c of clusters) {
    let target: Cluster | null = null;
    for (const m of merged) {
      if (deltaE(c, m) < deltaEThreshold) {
        target = m;
        break;
      }
    }
    if (target) {
      const total = target.count + c.count;
      target.r = (target.r * target.count + c.r * c.count) / total;
      target.g = (target.g * target.count + c.g * c.count) / total;
      target.b = (target.b * target.count + c.b * c.count) / total;
      const [L, a, bb] = rgbToLab(target.r, target.g, target.b);
      target.L = L;
      target.a = a;
      target.bb = bb;
      target.count = total;
    } else {
      merged.push({ ...c });
    }
  }

  // Step 5: transitional-color absorption.
  // Repeatedly fold the smallest surviving cluster into its nearest cluster if
  // they are perceptually close (slightly looser than the initial merge). This
  // removes the ramp of intermediate colors a gradient or interpolation produces
  // while leaving genuinely distinct colors untouched.
  const absorbThreshold = deltaEThreshold * 1.25;
  let absorbable = merged.sort((x, y) => y.count - x.count);
  // Bound iterations so the loop is always finite.
  for (let iter = 0; iter < absorbable.length && absorbable.length > 1; iter++) {
    absorbable.sort((x, y) => x.count - y.count);
    const smallest = absorbable[0];
    let nearest: Cluster | null = null;
    let nearestDist = Infinity;
    for (let j = 1; j < absorbable.length; j++) {
      const d = deltaE(smallest, absorbable[j]);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = absorbable[j];
      }
    }
    if (nearest && nearestDist < absorbThreshold) {
      const total = nearest.count + smallest.count;
      nearest.r = (nearest.r * nearest.count + smallest.r * smallest.count) / total;
      nearest.g = (nearest.g * nearest.count + smallest.g * smallest.count) / total;
      nearest.b = (nearest.b * nearest.count + smallest.b * smallest.count) / total;
      const [L, a, bb] = rgbToLab(nearest.r, nearest.g, nearest.b);
      nearest.L = L;
      nearest.a = a;
      nearest.bb = bb;
      nearest.count = total;
      absorbable.splice(0, 1);
    } else {
      // Smallest cluster has no perceptually-close neighbor — stop early.
      break;
    }
  }

  // Step 6: drop insignificant clusters (artifacts / residual noise).
  let result = absorbable.filter((c) => c.count / opaqueTotal >= minAreaRatio);

  // Fallback: if filtering removed everything, keep the single largest cluster
  // so the UI always has at least one meaningful swatch.
  if (result.length === 0 && absorbable.length > 0) {
    result = [absorbable[0]];
  }

  // Step 7: sort by area (largest first) and cap the count.
  result.sort((x, y) => y.count - x.count);

  return result.slice(0, maxColors).map((c) => ({
    hex: toHex(c.r, c.g, c.b),
    rgb: [
      Math.round(c.r),
      Math.round(c.g),
      Math.round(c.b),
    ] as [number, number, number],
    ratio: c.count / opaqueTotal,
  }));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
