/**
 * Playwright-based rendering engine.
 *
 * Renders a participant's HTML + CSS inside an isolated, locked-down
 * Chromium instance and captures a deterministic PNG screenshot.
 *
 * Determinism guarantees:
 * - Same viewport dimensions (configurable, default 400×300)
 * - Device pixel ratio = 1 (no HiDPI variation)
 * - JavaScript disabled
 * - No external network requests (defense in depth)
 * - CSS reset (margin, padding, box-sizing, scroll, full-viewport body)
 * - Font normalisation (explicit font-family, font-size, no web fonts)
 * - All animations/transitions disabled
 * - No browser UI (headless)
 * - Hard execution timeout
 *
 * Each call gets a fresh browser context that is destroyed immediately
 * after the screenshot is taken. The shared browser process is reused
 * across calls (launching Chromium is expensive).
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default viewport dimensions (CSS Battle standard). */
const DEFAULT_VIEWPORT_WIDTH = 400;
const DEFAULT_VIEWPORT_HEIGHT = 300;

const RENDER_TIMEOUT_MS = 10_000;

const BACKEND_DIR = process.cwd();
const SUBMISSIONS_DIR = path.resolve(BACKEND_DIR, 'uploads', 'submissions');

// Ensure output directory exists
if (!fs.existsSync(SUBMISSIONS_DIR)) {
  fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RenderInput {
  /** Sanitized HTML string. */
  html: string;
  /** Sanitized CSS string. */
  css: string;
  /** Unique identifier for naming the screenshot file. */
  submissionId: string;
  /** Optional viewport width (default 400). */
  viewportWidth?: number;
  /** Optional viewport height (default 300). */
  viewportHeight?: number;
}

export interface RenderResult {
  success: true;
  /** Absolute filesystem path to the saved screenshot. */
  screenshotPath: string;
  /** URL-addressable path for the screenshot. */
  screenshotUrl: string;
  /** Render time in milliseconds (time to navigate + settle + capture). */
  renderTimeMs: number;
  /** Actual viewport used for this render. */
  viewportWidth: number;
  viewportHeight: number;
}

export interface RenderError {
  success: false;
  error: string;
  /** Partial render time if the error occurred after navigation started. */
  renderTimeMs?: number;
}

export type RenderOutcome = RenderResult | RenderError;

// ---------------------------------------------------------------------------
// Browser lifecycle
// ---------------------------------------------------------------------------

let _browser: Browser | null = null;

/**
 * Lazily get or launch the shared browser instance.
 * Only the browser process is shared — each render gets a fresh context.
 */
async function getBrowser(): Promise<Browser> {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ],
    });
  }
  return _browser;
}

/**
 * Create a fresh, locked-down browser context.
 *
 * Every render gets its own context — nothing is shared or reused.
 * The context has JavaScript disabled, network blocked, DPR=1,
 * and deterministic font/rendering settings.
 */
async function createLockedContext(
  browser: Browser,
  viewportWidth: number,
  viewportHeight: number,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    deviceScaleFactor: 1,
    viewport: { width: viewportWidth, height: viewportHeight },
    permissions: [],
    reducedMotion: 'reduce',
    colorScheme: 'light',
    userAgent: 'CSSWARS/1.0 RenderingService',
  });

  // Block all external network requests at the page level.
  // This is defense in depth — JS is already disabled.
  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const url = route.request().url();

    // Allow only data: URIs and about:blank (the initial page state).
    if (url.startsWith('data:') || url === 'about:blank') {
      route.continue().catch(() => {});
      return;
    }
    // Block everything else — no remote fonts, images, scripts, or stylesheets.
    route.abort('blockedbyclient').catch(() => {});
  });

  return context;
}

// ---------------------------------------------------------------------------
// HTML document builder
// ---------------------------------------------------------------------------

/**
 * Build a self-contained HTML document with a deterministic CSS reset
 * and the participant's code injected.
 *
 * The reset ensures:
 * - No default margins or padding
 * - box-sizing: border-box everywhere
 * - No scrollbars (overflow: hidden on html)
 * - Body fills the full viewport
 * - White background (can be overridden by the participant)
 * - Consistent font rendering (explicit sans-serif, no web fonts)
 * - All animations, transitions, and CSS motion disabled
 */
function buildHtmlDocument(
  html: string,
  css: string,
  viewportWidth: number,
  viewportHeight: number,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${viewportWidth}, initial-scale=1.0" />
  <style>
    /* ───── Deterministic reset ───── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      overflow: hidden;
      width: ${viewportWidth}px;
      height: ${viewportHeight}px;
    }

    body {
      width: ${viewportWidth}px;
      min-height: ${viewportHeight}px;
      overflow: hidden;
      background: #ffffff;
      font-family: "Arial", "Helvetica", sans-serif;
      font-size: 16px;
      line-height: 1.2;
    }

    /* ───── Disable animations and transitions ───── */
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      animation-iteration-count: 1 !important;
    }

    /* ───── Participant CSS ───── */
    ${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

/**
 * Render a submission's HTML/CSS to a deterministic PNG screenshot.
 *
 * @param input  Render input with html, css, submissionId, and optional viewport.
 * @returns      RenderOutcome — success with path and timing, or error.
 */
export async function renderSubmission(input: RenderInput): Promise<RenderOutcome> {
  const browser = await getBrowser();
  const viewportWidth = input.viewportWidth ?? DEFAULT_VIEWPORT_WIDTH;
  const viewportHeight = input.viewportHeight ?? DEFAULT_VIEWPORT_HEIGHT;

  let context: BrowserContext | null = null;
  const startTime = performance.now();

  try {
    context = await createLockedContext(browser, viewportWidth, viewportHeight);
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    // Build the full HTML document with the deterministic reset.
    const htmlContent = buildHtmlDocument(input.html, input.css, viewportWidth, viewportHeight);

    // Encode as a data: URI — no file system access needed.
    const dataUri = `data:text/html,${encodeURIComponent(htmlContent)}`;

    // Navigate with hard timeout.
    await page.goto(dataUri, {
      waitUntil: 'load',
      timeout: RENDER_TIMEOUT_MS,
    });

    // Small settle time for any deferred rendering to complete.
    await page.waitForTimeout(100);

    // Take screenshot — viewport only, lossless PNG.
    const filename = `submission-${input.submissionId}.png`;
    const screenshotPath = path.join(SUBMISSIONS_DIR, filename);

    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      type: 'png',
    });

    const elapsed = Math.round(performance.now() - startTime);
    const screenshotUrl = `/uploads/submissions/${filename}`;

    return {
      success: true,
      screenshotPath,
      screenshotUrl,
      renderTimeMs: elapsed,
      viewportWidth,
      viewportHeight,
    };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - startTime);

    if (
      err.message?.includes('Timeout') ||
      err.message?.includes('timeout')
    ) {
      return {
        success: false,
        error: `Render timed out after ${RENDER_TIMEOUT_MS}ms`,
        renderTimeMs: elapsed,
      };
    }

    return {
      success: false,
      error: err.message ?? 'Unknown render error',
      renderTimeMs: elapsed,
    };
  } finally {
    // ALWAYS destroy the context — even on error or timeout.
    // Playwright handles mid-navigation context close gracefully.
    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore close errors — we're cleaning up.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Close the shared browser instance. Call during graceful shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    try {
      await _browser.close();
    } catch {
      // Ignore close errors.
    }
    _browser = null;
  }
}
