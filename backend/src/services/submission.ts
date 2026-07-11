/**
 * Submission orchestrator.
 *
 * Coordinates the full submission pipeline:
 *   1. Validate & sanitize submitted HTML/CSS
 *   2. Call the rendering service (separate process)
 *   3. Score the screenshot against the target image
 *   4. Store results in the database
 *   5. Determine if this is the user's best submission for the challenge
 */

import { prisma } from '../db.js';
import { validatePayload, sanitizeSubmission } from '../rendering/sanitize.js';
import { findBestSubmission } from '../scoring/tiebreak.js';
import { Prisma } from '@prisma/client';
import { getRenderServiceStatus } from '../renderStatus.js';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const renderPort = process.env.RENDER_PORT ?? '4001';
const RENDER_SERVICE_URL =
  process.env.RENDER_SERVICE_URL ?? `http://localhost:${renderPort}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionInput {
  htmlCode: string;
  cssCode: string;
  userId: string;
  challengeId: string;
}

export interface SubmissionResult {
  id: string;
  score: number | null;
  screenshotUrl: string | null;
  codeLength: number;
  isBest: boolean;
  rank: number | null;
  error?: string;
}

export interface RenderServiceResponse {
  success: boolean;
  screenshotPath?: string;
  screenshotUrl?: string;
  score?: number | null;
  error?: string;
  warnings?: string[];
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

/**
 * Check if the rendering service is available before attempting a submission.
 */
function checkRenderServiceAvailable(): void {
  const status = getRenderServiceStatus();

  if (status.status === 'error' || status.status === 'stopped') {
    throw new Error(
      'The scoring engine is not available. Please notify an organizer to restart the server.',
    );
  }

  if (status.status === 'starting') {
    throw new Error(
      'The scoring engine is still starting up. Please wait a moment and try again.',
    );
  }
}

/**
 * Compute the user's rank among all participants for a given challenge.
 * The user's best submission is compared against others' best.
 */
async function computeRank(userId: string, challengeId: string): Promise<number | null> {
  // Get all best submissions for this challenge, ordered by tie-break rules
  const bestSubmissions = await prisma.submission.findMany({
    where: {
      challengeId,
      isBest: true,
      score: { not: null },
    },
    select: {
      userId: true,
      score: true,
      codeLength: true,
      submittedAt: true,
    },
    orderBy: [
      { score: 'desc' },
      { codeLength: 'asc' },
      { submittedAt: 'asc' },
    ],
  });

  const userIndex = bestSubmissions.findIndex((s) => s.userId === userId);
  if (userIndex === -1) return null;
  return userIndex + 1; // 1-based rank
}

/**
 * Process a submission through the full pipeline.
 *
 * Steps:
 * 1. Pre-checks: competition not locked, challenge exists + is published
 * 2. Validate payload size
 * 3. Sanitize HTML/CSS (strip scripts, block external URLs)
 * 4. Check render service availability
 * 5. Create initial DB record (before rendering, so the submission exists)
 * 6. Call the rendering service to get screenshot + score
 * 7. Update DB record with results
 * 8. In a Prisma transaction: recalculate isBest for this user + challenge
 * 9. Compute rank and return the result
 */
export async function processSubmission(
  input: SubmissionInput,
): Promise<SubmissionResult> {
  // 1. Pre-checks — competition locked & challenge published
  const competitionState = await prisma.competitionState.findFirst();
  if (competitionState?.locked) {
    throw new Error('Submissions are closed — the competition is locked');
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: input.challengeId },
    select: { published: true, targetImageUrl: true, roundNumber: true },
  });

  if (!challenge) {
    throw new Error('Challenge not found');
  }

  if (!challenge.published) {
    throw new Error('Challenge is not published yet');
  }

  const unlockedRound = competitionState?.unlockedRound ?? null;
  if (unlockedRound === null) {
    throw new Error('No round is currently unlocked — submissions are not open for any round');
  }

  if (challenge.roundNumber !== unlockedRound) {
    throw new Error(`Submissions are only open for round ${unlockedRound}. This challenge belongs to round ${challenge.roundNumber}`);
  }

  if (!challenge.targetImageUrl) {
    throw new Error(
      'This challenge has no target image yet — the admin must upload one before submissions can be scored',
    );
  }

  // Reject early if the target image is missing on disk. Without this
  // check, the submission proceeds to a render call that silently
  // returns score=null and the participant wastes a submission.
  if (!targetImageExistsOnDisk(challenge.targetImageUrl)) {
    throw new Error(
      `Target image file is missing on the server — the admin must re-upload it before submissions can be scored`,
    );
  }

  // 2. Check for existing submission — strictly one submission per challenge per user
  const existingSubmission = await prisma.submission.findFirst({
    where: {
      userId: input.userId,
      challengeId: input.challengeId,
    },
  });

  if (existingSubmission) {
    throw new Error(
      'You have already submitted to this challenge. Resubmissions are not allowed.',
    );
  }

  // 3. Validate payload
  const validation = validatePayload(input.htmlCode, input.cssCode);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 4. Sanitize (defense in depth — runs again in the rendering service too)
  let sanitizedHtml: string;
  let sanitizedCss: string;
  try {
    const result = sanitizeSubmission(input.htmlCode, input.cssCode);
    sanitizedHtml = result.html;
    sanitizedCss = result.css;
  } catch (err: any) {
    throw new Error(`Sanitization failed: ${err.message}`);
  }

  // Calculate code length
  const codeLength = Buffer.byteLength(sanitizedHtml + sanitizedCss, 'utf8');

  // 5. Check render service availability BEFORE creating a DB record
  checkRenderServiceAvailable();

  // 6. Create initial DB record (score null until rendering completes)
  const submission = await prisma.submission.create({
    data: {
      userId: input.userId,
      challengeId: input.challengeId,
      htmlCode: sanitizedHtml,
      cssCode: sanitizedCss,
      codeLength,
      score: null,
      screenshotUrl: null,
      isBest: false,
    },
  });

  // 7. Call the rendering service
  let renderResult: RenderServiceResponse;
  try {
    const res = await fetch(`${RENDER_SERVICE_URL}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: sanitizedHtml,
        css: sanitizedCss,
        targetImageUrl: challenge.targetImageUrl,
        submissionId: submission.id,
      }),
      signal: AbortSignal.timeout(30_000), // 30s total timeout for the render call
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      renderResult = {
        success: false,
        error: body.error ?? `Render service returned ${res.status}`,
      };
    } else {
      try {
        renderResult = await res.json();
      } catch {
        renderResult = {
          success: false,
          error: 'Render service returned invalid JSON',
        };
      }
    }
  } catch (err: any) {
    // Check if the render service is in a known failure state
    const renderStatus = getRenderServiceStatus();
    if (renderStatus.status === 'error' || renderStatus.status === 'stopped') {
      renderResult = {
        success: false,
        error: 'The scoring engine is not available. Please notify an organizer to restart the server.',
      };
    } else {
      renderResult = {
        success: false,
        error: `Failed to reach render service: ${err.message ?? 'Connection error'}. If this persists, notify an organizer.`,
      };
    }
  }

  // 8. Update DB record with render results
  const updateData: {
    score?: number;
    screenshotUrl?: string;
  } = {};

  if (renderResult.success && renderResult.score !== undefined && renderResult.score !== null) {
    updateData.score = renderResult.score;
  }
  if (renderResult.success && renderResult.screenshotUrl) {
    updateData.screenshotUrl = renderResult.screenshotUrl;
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.submission.update({
      where: { id: submission.id },
      data: updateData,
    });
  }

  // 9. In a Prisma transaction: fetch, compute best, and update atomically
  //    This prevents race conditions from rapid double-submission where two
  //    requests could read stale data and both choose the same best submission.
  let bestId: string | null = null;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Fetch current scored submissions inside the transaction for consistency
    const allUserScored = await tx.submission.findMany({
      where: {
        userId: input.userId,
        challengeId: input.challengeId,
        score: { not: null },
      },
      select: {
        id: true,
        score: true,
        codeLength: true,
        submittedAt: true,
      },
    });

    // Cast score from Decimal to number for comparison
    const submissionsForTiebreak = allUserScored.map((s) => ({
      id: s.id,
      score: s.score ? Number(s.score) : null,
      codeLength: s.codeLength,
      submittedAt: s.submittedAt,
    }));

    bestId = findBestSubmission(submissionsForTiebreak);

    if (bestId) {
      // Reset all isBest flags for this user+challenge
      await tx.submission.updateMany({
        where: {
          userId: input.userId,
          challengeId: input.challengeId,
          isBest: true,
        },
        data: { isBest: false },
      });

      // Set the new best
      await tx.submission.update({
        where: { id: bestId },
        data: { isBest: true },
      });
    }
  });

  // 10. Compute rank and return the result
  const rank = await computeRank(input.userId, input.challengeId);

  return {
    id: submission.id,
    score: updateData.score ?? null,
    screenshotUrl: updateData.screenshotUrl ?? null,
    codeLength,
    isBest: bestId === submission.id,
    rank,
    error: renderResult.success ? undefined : renderResult.error,
  };
}

/**
 * Get a user's submission status for a challenge.
 * Used by the ChallengeList to show submission state.
 */
export async function getUserSubmissionsForChallenge(
  userId: string,
  challengeId: string,
) {
  const submissions = await prisma.submission.findMany({
    where: { userId, challengeId },
    orderBy: { submittedAt: 'desc' },
    select: {
      id: true,
      score: true,
      codeLength: true,
      isBest: true,
      submittedAt: true,
      screenshotUrl: true,
    },
  });

  return submissions.map((s) => ({
    ...s,
    score: s.score ? Number(s.score) : null,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that the URL stored on a challenge actually points to a file
 * on disk. We check a few candidate locations because both the main
 * API and the render service can be started with slightly different cwds
 * (they both default to the backend dir, but we don't want to depend
 * on that).
 */
function targetImageExistsOnDisk(targetImageUrl: string): boolean {
  const filename = path.basename(targetImageUrl);
  const relative = targetImageUrl.replace(/^\//, '');
  const backendDir = process.cwd();

  const candidates = [
    path.resolve(backendDir, relative),
    path.resolve(backendDir, 'uploads', 'challenges', filename),
    path.resolve(backendDir, 'targets', filename),
  ];

  return candidates.some((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
}
