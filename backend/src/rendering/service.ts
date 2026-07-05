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
import { validatePayload, sanitizeSubmission } from './sanitize.js';
import { renderSubmission, closeBrowser, type RenderInput } from './renderer.js';
import { compareImages, type ScoreResult } from '../scoring/score.js';
import path from 'path';
import fs from 'fs';

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

  // 1. Validate payload before anything else
  const validation = validatePayload(html, css);
  if (!validation.valid) {
    res.status(400).json({ success: false, error: validation.error });
    return;
  }

  // 2. Sanitize (defense in depth)
  let sanitizedHtml: string;
  let sanitizedCss: string;
  let warnings: string[];

  try {
    const result = sanitizeSubmission(html, css);
    sanitizedHtml = result.html;
    sanitizedCss = result.css;
    warnings = result.warnings;
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Sanitization failed: ${err.message ?? 'Unknown error'}`,
    });
    return;
  }

  // 3. Render the submission to a screenshot
  const renderInput: RenderInput = {
    html: sanitizedHtml,
    css: sanitizedCss,
    submissionId,
  };

  const renderOutcome = await renderSubmission(renderInput);

  if (!renderOutcome.success) {
    res.status(422).json({
      success: false,
      error: renderOutcome.error,
      warnings,
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
      warnings,
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
      warnings,
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
    warnings,
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
  // Remove leading /
  const relativePath = targetImageUrl.replace(/^\//, '');

  // Try relative to project root (where the process is running)
  const projectPath = path.resolve(relativePath);
  if (fs.existsSync(projectPath)) return projectPath;

  // Try in backend/ subdirectory
  const backendPath = path.resolve('backend', relativePath);
  if (fs.existsSync(backendPath)) return backendPath;

  // Try just the filename in uploads/challenges
  const filename = path.basename(targetImageUrl);
  const uploadsPath = path.resolve('uploads/challenges', filename);
  if (fs.existsSync(uploadsPath)) return uploadsPath;

  return null;
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = Number(process.env.RENDER_PORT ?? 4001);

const server = app.listen(PORT, () => {
  // Print to stdout so the parent process can detect readiness
  console.log(`[rendering] service listening on port ${PORT}`);
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
