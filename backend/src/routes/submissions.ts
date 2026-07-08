/**
 * Submission API routes.
 *
 * - POST /api/submissions — Submit HTML/CSS, triggers the full pipeline
 *   (checks competition lock, challenge published, sanitizes, renders, scores)
 * - GET /api/submissions/mine — Get user's submissions for a challenge
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '../db.js';
import { processSubmission, getUserSubmissionsForChallenge } from '../services/submission.js';

export const submissionsRouter = Router();

// ---------------------------------------------------------------------------
// Rate limiter — prevents rapid-fire submissions
// ---------------------------------------------------------------------------

/**
 * Simple in-memory rate limiter per userId.
 * Limits to 1 submission per `windowMs` milliseconds.
 */
const submissionTimestamps = new Map<string, number>();

const RATE_LIMIT_WINDOW_MS = 3_000; // 3 seconds between submissions per user

// Clean up stale entries every 60 seconds to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of submissionTimestamps) {
    if (now - ts > RATE_LIMIT_WINDOW_MS) {
      submissionTimestamps.delete(key);
    }
  }
}, 60_000);

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const lastSubmission = submissionTimestamps.get(userId);

  if (lastSubmission && now - lastSubmission < RATE_LIMIT_WINDOW_MS) {
    return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - lastSubmission) };
  }

  submissionTimestamps.set(userId, now);
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// POST /api/submissions — create & process a submission
// ---------------------------------------------------------------------------

submissionsRouter.post(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { htmlCode, cssCode, userId, challengeId } = req.body;

      // Check rate limit before processing
      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const rateCheck = checkRateLimit(userId);
      if (!rateCheck.allowed) {
        res.status(429).json({
          error: 'Please wait before submitting again.',
          retryAfterMs: rateCheck.retryAfterMs,
        });
        return;
      }

      // Validate required fields
      if (!htmlCode || !cssCode || !challengeId) {
        res.status(400).json({
          error: 'Missing required fields: htmlCode, cssCode, userId, challengeId',
        });
        return;
      }

      if (typeof htmlCode !== 'string' || typeof cssCode !== 'string') {
        res.status(400).json({ error: 'htmlCode and cssCode must be strings' });
        return;
      }

      // Check user exists
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Process through the full pipeline (includes lock check, published check, sanitize, render, score)
      const result = await processSubmission({
        htmlCode,
        cssCode,
        userId,
        challengeId,
      });

      res.status(201).json(result);
    } catch (err: any) {
      console.error('Failed to process submission', err);

      const msg = err.message ?? '';

      if (
        msg.includes('too large') ||
        msg.includes('too small') ||
        msg.includes('Sanitization failed')
      ) {
        res.status(400).json({ error: msg });
        return;
      }

      if (msg.includes('Submissions are closed') || msg.includes('competition is locked')) {
        res.status(423).json({ error: msg });
        return;
      }

      if (msg.includes('not published yet')) {
        res.status(403).json({ error: msg });
        return;
      }

      if (msg.includes('no target image yet') || msg.includes('Target image file is missing')) {
        res.status(409).json({ error: msg });
        return;
      }

      if (msg.includes('not found')) {
        res.status(404).json({ error: msg });
        return;
      }

      res.status(500).json({ error: 'Failed to process submission' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/submissions/mine — get user's submissions for a challenge
// ---------------------------------------------------------------------------

submissionsRouter.get(
  '/mine',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, challengeId } = req.query;

      if (!userId || !challengeId) {
        res.status(400).json({
          error: 'Missing required query params: userId, challengeId',
        });
        return;
      }

      const submissions = await getUserSubmissionsForChallenge(
        userId as string,
        challengeId as string,
      );

      res.json(submissions);
    } catch (err) {
      console.error('Failed to fetch submissions', err);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  },
);
