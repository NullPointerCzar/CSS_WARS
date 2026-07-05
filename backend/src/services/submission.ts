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

interface RenderServiceResponse {
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
 * Process a submission through the full pipeline.
 *
 * Steps:
 * 1. Validate payload size
 * 2. Sanitize HTML/CSS (strip scripts, block external URLs)
 * 3. Create initial DB record (before rendering, so the submission exists)
 * 4. Call the rendering service to get screenshot + score
 * 5. Update DB record with results
 * 6. Recalculate isBest for this user + challenge
 * 7. Return the submission result
 */
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
 * 4. Create initial DB record (before rendering, so the submission exists)
 * 5. Call the rendering service to get screenshot + score
 * 6. Update DB record with results
 * 7. In a Prisma transaction: recalculate isBest for this user + challenge
 * 8. Compute rank and return the result
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
    select: { published: true, targetImageUrl: true },
  });

  if (!challenge) {
    throw new Error('Challenge not found');
  }

  if (!challenge.published) {
    throw new Error('Challenge is not published yet');
  }

  // 2. Validate payload
  const validation = validatePayload(input.htmlCode, input.cssCode);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 3. Sanitize (defense in depth — runs again in the rendering service too)
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

  // 4. Create initial DB record (score null until rendering completes)
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

  // 5. Call the rendering service
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
      renderResult = await res.json();
    }
  } catch (err: any) {
    renderResult = {
      success: false,
      error: `Failed to reach render service: ${err.message ?? 'Connection error'}`,
    };
  }

  // 6. Update DB record with render results
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

  // 7. In a Prisma transaction: recalculate isBest for this user + challenge
  //    Using a transaction prevents race conditions from rapid double-submission
  const allUserScoredSubmissions = await prisma.submission.findMany({
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
  const submissionsForTiebreak = allUserScoredSubmissions.map((s) => ({
    id: s.id,
    score: s.score ? Number(s.score) : null,
    codeLength: s.codeLength,
    submittedAt: s.submittedAt,
  }));

  const bestId = findBestSubmission(submissionsForTiebreak);

  if (bestId) {
    // Use a transaction for the isBest update to prevent race conditions
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    });
  }

  // 8. Compute rank and return the result
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
