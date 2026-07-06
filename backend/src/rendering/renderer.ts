/**
 * Playwright-based rendering engine.
 *
 * Every call gets a **fresh, disposable** browser context with:
 * - JavaScript execution disabled
 * - All external network requests blocked
 * - A hard execution timeout
 *
 * The context is destroyed immediately after the screenshot is taken.
 */

import { chromium, type Browser, type BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

const BACKEND_DIR = process.cwd();
const SUBMISSIONS_DIR = path.resolve(BACKEND_DIR, 'uploads', 'submissions');

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const RENDER_TIMEOUT_MS = 10_000;

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
}

export interface RenderResult {
  success: true;
  /** Absolute filesystem path to the saved screenshot. */
  screenshotPath: string;
  /** URL-addressable path for the screenshot. */
  screenshotUrl: string;
}

export interface RenderError {
  success: false;
  error: string;
}

export type RenderOutcome = RenderResult | RenderError;

// ---------------------------------------------------------------------------
// Browser lifecycle helpers
// ---------------------------------------------------------------------------

let _browser: Browser | null = null;

/**
 * Lazily get or launch the shared browser instance.
 * Pages/contexts are still fresh per render — only the browser process
 * is shared (launching Chromium is expensive).
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
      ],
    });
  }
  return _browser;
}

/**
 * Create a fresh, locked-down browser context with:
 * - JavaScript disabled
 * - Network requests blocked (only data: URIs allowed)
 */
async function createLockedContext(
  browser: Browser,
): Promise<BrowserContext> {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    // Disable permissions that could be abused
    permissions: [],
    userAgent:
      'CSSBattle/1.0 RenderingService (+https://cssbattle.yatra.nce)',
  });

  // Block all external network requests at the page level
  // This is defense in depth — JS is already disabled.
  const page = await context.newPage();

  await page.route('**/*', (route) => {
    const url = route.request().url();

    // Allow only data: URIs and about:blank (the initial page state)
    if (url.startsWith('data:') || url === 'about:blank') {
      route.continue().catch(() => {});
      return;
    }
    // Block everything else — no remote fonts, images, scripts, or stylesheets
    route.abort('blockedbyclient').catch(() => {});
  });

  return context;
}

// ---------------------------------------------------------------------------
// Build the combined HTML document
// ---------------------------------------------------------------------------

function buildHtmlDocument(html: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; }
    body { background: #ffffff; }
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
 * Render the submission HTML/CSS to a PNG screenshot.
 *
 * Each call creates a NEW browser context — nothing is shared or reused
 * between renders. The context is destroyed after the screenshot is taken.
 */
export async function renderSubmission(input: RenderInput): Promise<RenderOutcome> {
  const browser = await getBrowser();

  // Each render gets its own fresh context
  let context: BrowserContext | null = null;

  try {
    context = await createLockedContext(browser);
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    const htmlContent = buildHtmlDocument(input.html, input.css);

    // Encode the HTML as a data: URI so no file system access is needed
    const dataUri = `data:text/html,${encodeURIComponent(htmlContent)}`;

    // Navigate with hard timeout
    // 'load' is equivalent to 'networkidle' on data: URIs (no network requests)
    // but resolves immediately instead of waiting 500ms for network idle
    await page.goto(dataUri, {
      waitUntil: 'load',
      timeout: RENDER_TIMEOUT_MS,
    });

    // Small additional settle time for CSS animations to start
    await page.waitForTimeout(200);

    // Take screenshot
    const filename = `submission-${input.submissionId}.png`;
    const screenshotPath = path.join(SUBMISSIONS_DIR, filename);

    await page.screenshot({
      path: screenshotPath,
      fullPage: false, // Only capture the viewport (matches target image size)
      type: 'png',
    });

    const screenshotUrl = `/uploads/submissions/${filename}`;

    return {
      success: true,
      screenshotPath,
      screenshotUrl,
    };
  } catch (err: any) {
    // Determine if the error is a timeout
    if (
      err.message?.includes('Timeout') ||
      err.message?.includes('timeout')
    ) {
      return {
        success: false,
        error: `Render timed out after ${RENDER_TIMEOUT_MS}ms`,
      };
    }

    return {
      success: false,
      error: err.message ?? 'Unknown render error',
    };
  } finally {
    // ALWAYS destroy the context — even on error
    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore close errors — we're cleaning up
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Close the shared browser instance. Call this during graceful shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    try {
      await _browser.close();
    } catch {
      // Ignore close errors
    }
    _browser = null;
  }
}
