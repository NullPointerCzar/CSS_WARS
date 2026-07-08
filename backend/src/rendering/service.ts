/**
 * Standalone rendering service — a separate Express server that handles
 * render+score requests from the main API and diff requests from the
 * frontend's "Difference Mode".
 *
 * This runs as an **isolated Node process** (spawned as a child process
 * from server.ts). A crash here must never take down the main API.
 *
 * Port: configurable via RENDER_PORT env var (default 4001)
 *
 * Endpoints:
 *   POST /render  — render + score a submission
 *   POST /diff    — given a screenshot + target URL, return a diff PNG
 *   GET  /health  — health check
 */

import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { validatePayload } from './sanitize.js';
import { renderSubmission, closeBrowser, type RenderInput } from './renderer.js';
import { computeScore, generateDiff } from '../scoring/score.js';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const BACKEND_DIR = process.cwd();
const UPLOADS_CHALLENGES_DIR = path.resolve(BACKEND_DIR, 'uploads', 'challenges');
const UPLOADS_SUBMISSIONS_DIR = path.resolve(BACKEND_DIR, 'uploads', 'submissions');
const TARGETS_DIR = path.resolve(BACKEND_DIR, 'targets');

// ---------------------------------------------------------------------------
// Express server
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// POST /render — full render + score pipeline
//
// Request body:
//   { html, css, targetImageUrl, submissionId,
//     viewportWidth?: number, viewportHeight?: number }
//
// Response (success):
//   { success: true, screenshotUrl, score, mismatchedPixels, totalPixels,
//     renderTimeMs, viewportWidth, viewportHeight }
// ---------------------------------------------------------------------------

interface RenderRequestBody {
  html: string;
  css: string;
  targetImageUrl: string;
  submissionId: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

app.post('/render', async (req: Request, res: Response): Promise<void> => {
  const {
    html,
    css,
    targetImageUrl,
    submissionId,
    viewportWidth,
    viewportHeight,
  } = req.body as RenderRequestBody;

  // 1. Validate payload.
  const validation = validatePayload(html, css);
  if (!validation.valid) {
    res.status(400).json({ success: false, error: validation.error });
    return;
  }

  // 2. Render the submission to a deterministic PNG screenshot.
  const renderInput: RenderInput = {
    html,
    css,
    submissionId,
    viewportWidth,
    viewportHeight,
  };

  const renderOutcome = await renderSubmission(renderInput);

  if (!renderOutcome.success) {
    res.status(422).json({
      success: false,
      error: renderOutcome.error,
    });
    return;
  }

  const baseResponse = {
    screenshotPath: renderOutcome.screenshotPath,
    screenshotUrl: renderOutcome.screenshotUrl,
    renderTimeMs: renderOutcome.renderTimeMs,
    viewportWidth: renderOutcome.viewportWidth,
    viewportHeight: renderOutcome.viewportHeight,
  };

  // 3. Resolve target image path from URL.
  const targetPath = resolveTargetPath(targetImageUrl);
  if (!targetPath) {
    res.json({
      success: true,
      ...baseResponse,
      score: null,
      mismatchedPixels: null,
      totalPixels: null,
      error: `Target image not found on disk: ${targetImageUrl}`,
    });
    return;
  }

  // 4. Score by comparing screenshot vs target image.
  try {
    const scoreResult = await computeScore(
      renderOutcome.screenshotPath,
      targetPath,
      renderOutcome.viewportWidth,
      renderOutcome.viewportHeight,
    );

    res.json({
      success: true,
      ...baseResponse,
      score: scoreResult.score,
      mismatchedPixels: scoreResult.mismatchedPixels,
      totalPixels: scoreResult.totalPixels,
    });
  } catch (err: any) {
    res.json({
      success: true,
      ...baseResponse,
      score: null,
      mismatchedPixels: null,
      totalPixels: null,
      error: err.message ?? 'Scoring failed',
    });
  }
});

// ---------------------------------------------------------------------------
// POST /diff — compute a pixel diff between an existing screenshot and target
//
// Unlike /render, this does NOT run Playwright. It loads two existing PNGs
// from disk, compares them, and returns a diff image as a PNG response.
//
// Request body:
//   { screenshotUrl, targetImageUrl, viewportWidth?, viewportHeight? }
//
// On success: PNG bytes (image/png) with score in X-Diff-Score header.
// On failure: JSON { success: false, error: string }
// ---------------------------------------------------------------------------

interface DiffRequestBody {
  screenshotUrl: string;
  targetImageUrl: string;
  viewportWidth?: number;
  viewportHeight?: number;
}

app.post('/diff', async (req: Request, res: Response): Promise<void> => {
  const { screenshotUrl, targetImageUrl, viewportWidth, viewportHeight } =
    req.body as DiffRequestBody;

  if (!screenshotUrl || !targetImageUrl) {
    res.status(400).json({
      success: false,
      error: 'screenshotUrl and targetImageUrl are required',
    });
    return;
  }

  const screenshotPath = resolveScreenshotPath(screenshotUrl);
  const targetPath = resolveTargetPath(targetImageUrl);

  if (!screenshotPath) {
    res.status(404).json({
      success: false,
      error: `Screenshot not found on disk: ${screenshotUrl}`,
    });
    return;
  }
  if (!targetPath) {
    res.status(404).json({
      success: false,
      error: `Target image not found on disk: ${targetImageUrl}`,
    });
    return;
  }

  try {
    const diffResult = await generateDiff(
      screenshotPath,
      targetPath,
      viewportWidth,
      viewportHeight,
    );

    // Attach the score in custom response headers so the client can
    // display the match % without re-running pixelmatch itself.
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('X-Diff-Score', String(diffResult.score));
    res.setHeader('X-Diff-Mismatched', String(diffResult.mismatchedPixels));
    res.setHeader('X-Diff-Total', String(diffResult.totalPixels));
    res.setHeader('X-Diff-Width', String(diffResult.width));
    res.setHeader('X-Diff-Height', String(diffResult.height));
    res.setHeader('Cache-Control', 'no-store');
    res.send(diffResult.diffPng);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Image diff failed: ${err.message ?? 'Unknown error'}`,
    });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'cssbattle-rendering' });
});

// ---------------------------------------------------------------------------
// Path resolvers
// ---------------------------------------------------------------------------

function resolveScreenshotPath(screenshotUrl: string): string | null {
  const filename = path.basename(screenshotUrl);
  const relative = screenshotUrl.replace(/^\//, '');

  const candidates = [
    path.resolve(BACKEND_DIR, relative),
    path.resolve(BACKEND_DIR, 'uploads', 'submissions', filename),
    path.resolve(UPLOADS_SUBMISSIONS_DIR, filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveTargetPath(targetImageUrl: string): string | null {
  const filename = path.basename(targetImageUrl);
  const relative = targetImageUrl.replace(/^\//, '');

  const candidates = [
    path.resolve(BACKEND_DIR, relative),
    path.resolve(BACKEND_DIR, '..', relative),
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
