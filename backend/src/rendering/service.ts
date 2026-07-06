/**
 * Standalone rendering service — a separate Express server that handles
 * render+score requests from the main API.
 *
 * This runs as an **isolated Node process** (spawned as a child process
 * from server.ts). A crash here must never take down the main API.
 *
 * Port: configurable via RENDER_PORT env var (default 4001)
 */

import express, { type Request, type Response } from 'express';
import { validatePayload } from './sanitize.js';
import { renderSubmission, closeBrowser, type RenderInput } from './renderer.js';
import { compareImages, type ScoreResult } from '../scoring/score.js';
import path from 'path';
import fs from 'fs';

// Resolve paths relative to the backend directory regardless of cwd.
// process.cwd() is the backend directory because the server is started from there
// and child processes inherit it via spawn({ cwd: process.cwd() }).
const BACKEND_DIR = process.cwd();
const UPLOADS_CHALLENGES_DIR = path.resolve(BACKEND_DIR, 'uploads', 'challenges');
const TARGETS_DIR = path.resolve(BACKEND_DIR, 'targets');

// ---------------------------------------------------------------------------
// Express server
// ---------------------------------------------------------------------------

const app = express();

app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// POST /render — full render + score pipeline
// ---------------------------------------------------------------------------

interface RenderRequestBody {
  html: string;
  css: string;
  targetImageUrl: string;
  submissionId: string;
}

app.post('/render', async (req: Request, res: Response): Promise<void> => {
  const { html, css, targetImageUrl, submissionId } = req.body as RenderRequestBody;

  // 1. Validate payload size before processing
  //    (Sanitization is done upstream in submission.ts — the rendering service
  //    also has Playwright-level protections: JS disabled, network blocked.)
  const validation = validatePayload(html, css);
  if (!validation.valid) {
    res.status(400).json({ success: false, error: validation.error });
    return;
  }

  // 2. Render the submission to a screenshot
  const renderInput: RenderInput = {
    html,
    css,
    submissionId,
  };

  const renderOutcome = await renderSubmission(renderInput);

  if (!renderOutcome.success) {
    res.status(422).json({
      success: false,
      error: renderOutcome.error,
    });
    return;
  }

  // 4. Resolve target image path from URL
  //    targetImageUrl is something like "/uploads/challenges/xxx.png"
  //    We need to find it on disk — resolve relative to project root
  const targetPath = resolveTargetPath(targetImageUrl);
  if (!targetPath || !fs.existsSync(targetPath)) {
    // Target image doesn't exist — we can still return the screenshot
    res.json({
      success: true,
      screenshotPath: renderOutcome.screenshotPath,
      screenshotUrl: renderOutcome.screenshotUrl,
      score: null,
      error: `Target image not found: ${targetImageUrl}`,
    });
    return;
  }

  // 5. Score by comparing screenshot vs target image
  const scoreOutcome = await compareImages(
    renderOutcome.screenshotPath,
    targetPath,
  );

  if (!scoreOutcome.success) {
    res.json({
      success: true,
      screenshotPath: renderOutcome.screenshotPath,
      screenshotUrl: renderOutcome.screenshotUrl,
      score: null,
      error: scoreOutcome.error,
    });
    return;
  }

  // 6. Return success with score
  res.json({
    success: true,
    screenshotPath: renderOutcome.screenshotPath,
    screenshotUrl: renderOutcome.screenshotUrl,
    score: scoreOutcome.score,
    mismatchedPixels: scoreOutcome.mismatchedPixels,
    totalPixels: scoreOutcome.totalPixels,
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'cssbattle-rendering' });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a URL path (e.g. `/uploads/challenges/xxx.png`) to an
 * absolute filesystem path. Tries multiple possible locations.
 */
function resolveTargetPath(targetImageUrl: string): string | null {
  const filename = path.basename(targetImageUrl);

  const candidates = [
    path.resolve(targetImageUrl.replace(/^\//, '')),
    path.resolve(BACKEND_DIR, targetImageUrl.replace(/^\//, '')),
    path.resolve(UPLOADS_CHALLENGES_DIR, filename),
    path.resolve(TARGETS_DIR, filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = Number(process.env.RENDER_PORT ?? 4001);

const server = app.listen(PORT, () => {
  console.log(`[rendering] service listening on port ${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[rendering] port ${PORT} is already in use — exiting`);
  } else {
    console.error(`[rendering] server error:`, err.message);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[rendering] unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[rendering] uncaught exception:', err);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(): Promise<void> {
  console.log('[rendering] shutting down...');
  await closeBrowser();
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
