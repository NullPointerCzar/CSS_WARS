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

const MAX_SAMPLE_DIM = 100;

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
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

function deltaE(a: Cluster, b: Cluster): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.bb - b.bb;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Extracts the dominant, visually distinct colors from an image URL.
 *
 * Pipeline:
 *  1. Downsample the image to at most MAX_SAMPLE_DIM on the longest side.
 *  2. Quantize colors to a coarse grid (median-cut-like binning) to collapse
 *     anti-aliasing / gradient / compression noise into representative bins.
 *  3. Merge bins that are perceptually close in LAB space (ΔE tolerance).
 *  4. Drop clusters below a minimum area percentage (rendering artifacts).
 *  5. Sort by occupied area (largest first) and return the top colors.
 */
export async function extractPalette(
  imageUrl: string,
  options: {
    maxColors?: number;
    deltaEThreshold?: number;
    minAreaRatio?: number;
  } = {},
): Promise<PaletteColor[]> {
  const { maxColors = 8, deltaEThreshold = 10, minAreaRatio = 0.004 } = options;

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

  // Step 2: quantize into a coarse color grid to eliminate noise.
  const STEP = 24;
  const bins = new Map<number, { r: number; g: number; b: number; count: number }>();
  let opaqueTotal = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 200) continue; // ignore transparent / edge-blended pixels
    opaqueTotal++;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const qr = Math.min(255, Math.round(r / STEP) * STEP);
    const qg = Math.min(255, Math.round(g / STEP) * STEP);
    const qb = Math.min(255, Math.round(b / STEP) * STEP);
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

  // Convert bins to clusters with averaged RGB + LAB.
  let clusters: Cluster[] = [];
  for (const bin of bins.values()) {
    const r = Math.round(bin.r / bin.count);
    const g = Math.round(bin.g / bin.count);
    const b = Math.round(bin.b / bin.count);
    const [L, a, bb] = rgbToLab(r, g, b);
    clusters.push({ r, g, b, L, a, bb, count: bin.count });
  }

  // Sort by count so the largest cluster absorbs nearby ones.
  clusters.sort((x, y) => y.count - x.count);

  // Step 3: merge perceptually similar clusters (ΔE in LAB space).
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
      target.r = Math.round((target.r * target.count + c.r * c.count) / total);
      target.g = Math.round((target.g * target.count + c.g * c.count) / total);
      target.b = Math.round((target.b * target.count + c.b * c.count) / total);
      const [L, a, bb] = rgbToLab(target.r, target.g, target.b);
      target.L = L;
      target.a = a;
      target.bb = bb;
      target.count = total;
    } else {
      merged.push({ ...c });
    }
  }

  // Step 4: drop insignificant clusters (rendering artifacts).
  let result = merged.filter((c) => c.count / opaqueTotal >= minAreaRatio);

  // Fallback: if filtering removed everything, keep the largest cluster.
  if (result.length === 0 && merged.length > 0) {
    result = [merged[0]];
  }

  // Step 5: sort by area (largest first) and cap the count.
  result.sort((x, y) => y.count - x.count);

  return result.slice(0, maxColors).map((c) => ({
    hex: toHex(c.r, c.g, c.b),
    rgb: [c.r, c.g, c.b] as [number, number, number],
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
