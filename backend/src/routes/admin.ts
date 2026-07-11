import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { adminCheck } from '../middleware/adminCheck.js';
import { Prisma } from '@prisma/client';
import { sanitizeSubmission } from '../rendering/sanitize.js';
import { findBestSubmission } from '../scoring/tiebreak.js';
import type { RenderServiceResponse } from '../services/submission.js';

const renderPort = process.env.RENDER_PORT ?? '4001';
const RENDER_SERVICE_URL =
  process.env.RENDER_SERVICE_URL ?? `http://localhost:${renderPort}`;

export const adminRouter = Router();

adminRouter.use(adminCheck);

// ---------------------------------------------------------------------------
// Competition Status
// ---------------------------------------------------------------------------

// PATCH /api/admin/competition/status — update status
adminRouter.patch('/competition/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    const validStatuses = ['NOT_STARTED', 'RUNNING', 'PAUSED', 'ENDED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    let state = await prisma.competitionState.findFirst();
    if (!state) {
      state = await prisma.competitionState.create({
        data: {
          status,
          currentRound: 1,
          locked: false,
          leaderboardFrozen: false,
        },
      });
    } else {
      state = await prisma.competitionState.update({
        where: { id: state.id },
        data: { status },
      });
    }

    res.json({ status: state.status });
  } catch (err) {
    console.error('Failed to update competition status', err);
    res.status(500).json({ error: 'Failed to update competition status' });
  }
});

// PATCH /api/admin/competition/lock — toggle submissions lock
adminRouter.patch('/competition/lock', async (req: Request, res: Response): Promise<void> => {
  try {
    const { locked } = req.body;

    if (typeof locked !== 'boolean') {
      res.status(400).json({ error: 'locked must be a boolean' });
      return;
    }

    let state = await prisma.competitionState.findFirst();
    if (!state) {
      state = await prisma.competitionState.create({
        data: {
          status: 'NOT_STARTED',
          currentRound: 1,
          locked,
          leaderboardFrozen: false,
        },
      });
    } else {
      state = await prisma.competitionState.update({
        where: { id: state.id },
        data: { locked },
      });
    }

    res.json({ locked: state.locked });
  } catch (err) {
    console.error('Failed to update competition lock', err);
    res.status(500).json({ error: 'Failed to update competition lock' });
  }
});

// PATCH /api/admin/competition/round/unlock — unlock a specific round (1, 2, or 3)
adminRouter.patch('/competition/round/unlock', async (req: Request, res: Response): Promise<void> => {
  try {
    const { round } = req.body;

    if (typeof round !== 'number' || round < 1 || round > 10 || !Number.isInteger(round)) {
      res.status(400).json({ error: 'round must be a positive integer' });
      return;
    }

    let state = await prisma.competitionState.findFirst();
    if (!state) {
      state = await prisma.competitionState.create({
        data: {
          status: 'NOT_STARTED',
          currentRound: round,
          unlockedRound: round,
          locked: false,
          leaderboardFrozen: false,
        },
      });
    } else {
      state = await prisma.competitionState.update({
        where: { id: state.id },
        data: {
          currentRound: round,
          unlockedRound: round,
        },
      });
    }

    res.json({ currentRound: state.currentRound, unlockedRound: state.unlockedRound });
  } catch (err) {
    console.error('Failed to unlock round', err);
    res.status(500).json({ error: 'Failed to unlock round' });
  }
});

// PATCH /api/admin/competition/round/lock — lock all rounds (clear unlockedRound)
adminRouter.patch('/competition/round/lock', async (req: Request, res: Response): Promise<void> => {
  try {
    let state = await prisma.competitionState.findFirst();
    if (!state) {
      state = await prisma.competitionState.create({
        data: {
          status: 'NOT_STARTED',
          currentRound: 1,
          unlockedRound: null,
          locked: true,
          leaderboardFrozen: false,
        },
      });
    } else {
      state = await prisma.competitionState.update({
        where: { id: state.id },
        data: {
          unlockedRound: null,
        },
      });
    }

    res.json({ currentRound: state.currentRound, unlockedRound: state.unlockedRound });
  } catch (err) {
    console.error('Failed to lock rounds', err);
    res.status(500).json({ error: 'Failed to lock rounds' });
  }
});

// ---------------------------------------------------------------------------
// Submission Review & Rejudge
// ---------------------------------------------------------------------------

// GET /api/admin/submissions — list all submissions (optionally filtered by challengeId)
adminRouter.get('/submissions', async (req: Request, res: Response): Promise<void> => {
  try {
    const challengeId = req.query.challengeId as string | undefined;

    const where = challengeId ? { challengeId } : {};

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: [{ isBest: 'desc' }, { score: 'desc' }, { submittedAt: 'desc' }],
      select: {
        id: true,
        userId: true,
        htmlCode: true,
        cssCode: true,
        codeLength: true,
        score: true,
        screenshotUrl: true,
        isBest: true,
        submittedAt: true,
        rejudgedAt: true,
        reviewStatus: true,
        overrideScore: true,
        flaggedForReview: true,
        reviewedAt: true,
        user: {
          select: { name: true, rollNumber: true },
        },
        challenge: {
          select: { id: true, title: true, roundNumber: true },
        },
      },
    });

    res.json(
      submissions.map((s) => ({
        ...s,
        score: s.score ? Number(s.score) : null,
        overrideScore: s.overrideScore ? Number(s.overrideScore) : null,
      })),
    );
  } catch (err) {
    console.error('Failed to fetch submissions', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/admin/submissions/:id — single submission with full details
adminRouter.get('/submissions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        htmlCode: true,
        cssCode: true,
        codeLength: true,
        score: true,
        screenshotUrl: true,
        isBest: true,
        submittedAt: true,
        rejudgedAt: true,
        reviewStatus: true,
        overrideScore: true,
        reviewNotes: true,
        reviewedAt: true,
        flaggedForReview: true,
        user: {
          select: { id: true, name: true, rollNumber: true },
        },
        challenge: {
          select: { id: true, title: true, description: true, difficulty: true, roundNumber: true, targetImageUrl: true },
        },
      },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json({
      ...submission,
      score: submission.score ? Number(submission.score) : null,
      overrideScore: submission.overrideScore ? Number(submission.overrideScore) : null,
    });
  } catch (err) {
    console.error('Failed to fetch submission', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// POST /api/admin/submissions/:id/rejudge — re-run rendering/scoring for a submission
adminRouter.post('/submissions/:id/rejudge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { challenge: true },
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    // Re-sanitize (defense in depth)
    const sanitized = sanitizeSubmission(submission.htmlCode, submission.cssCode);

    // Call the rendering service
    const renderRes = await fetch(`${RENDER_SERVICE_URL}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: sanitized.html,
        css: sanitized.css,
        targetImageUrl: submission.challenge.targetImageUrl,
        submissionId: submission.id,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!renderRes.ok) {
      const body = await renderRes.json().catch(() => ({}));
      res.status(502).json({
        error: body.error ?? `Render service returned ${renderRes.status}`,
      });
      return;
    }

    let renderResult: RenderServiceResponse;
    try {
      renderResult = await renderRes.json();
    } catch {
      res.status(502).json({ error: 'Render service returned invalid JSON' });
      return;
    }

    // Update the submission in-place (properly typed inline)
    const updated = await prisma.submission.update({
      where: { id },
      data: {
        rejudgedAt: new Date(),
        ...(renderResult.success && renderResult.score !== undefined && renderResult.score !== null
          ? { score: renderResult.score }
          : {}),
        ...(renderResult.success && renderResult.screenshotUrl
          ? { screenshotUrl: renderResult.screenshotUrl }
          : {}),
      },
    });

    // Recalculate isBest inside a Prisma transaction to prevent race conditions
    let bestId: string | null = null;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const allUserScored = await tx.submission.findMany({
        where: {
          userId: submission.userId,
          challengeId: submission.challengeId,
          score: { not: null },
        },
        select: { id: true, score: true, codeLength: true, submittedAt: true },
      });

      const scoredEntries = allUserScored.map((s) => ({
        id: s.id,
        score: s.score ? Number(s.score) : null,
        codeLength: s.codeLength,
        submittedAt: s.submittedAt,
      }));

      bestId = findBestSubmission(scoredEntries);

      if (bestId) {
        await tx.submission.updateMany({
          where: {
            userId: submission.userId,
            challengeId: submission.challengeId,
            isBest: true,
          },
          data: { isBest: false },
        });
        await tx.submission.update({
          where: { id: bestId },
          data: { isBest: true },
        });
      }
    });

    res.json({
      message: 'Rejudge complete',
      id: updated.id,
      score: updated.score ? Number(updated.score) : null,
      screenshotUrl: updated.screenshotUrl,
      isBest: bestId === updated.id,
      rejudged: true,
    });
  } catch (err: any) {
    console.error('Failed to rejudge submission', err);
    if (err.message?.includes('Render service')) {
      res.status(502).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to rejudge submission' });
  }
});

// DELETE /api/admin/submissions/:id — delete a submission
adminRouter.delete('/submissions/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    await prisma.submission.delete({ where: { id } });
    res.json({ message: 'Submission deleted successfully' });
  } catch (err) {
    console.error('Failed to delete submission', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});

// PATCH /api/admin/submissions/:id/review — update review fields
adminRouter.patch('/submissions/:id/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reviewStatus, overrideScore, reviewNotes, flaggedForReview } = req.body;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'];
    if (reviewStatus && !validStatuses.includes(reviewStatus)) {
      res.status(400).json({ error: `reviewStatus must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (reviewStatus !== undefined) data.reviewStatus = reviewStatus;
    if (flaggedForReview !== undefined) data.flaggedForReview = Boolean(flaggedForReview);
    if (reviewNotes !== undefined) data.reviewNotes = reviewNotes || null;
    if (overrideScore !== undefined) {
      if (overrideScore === null || overrideScore === '') {
        data.overrideScore = null;
      } else {
        const num = Number(overrideScore);
        if (Number.isNaN(num) || num < 0 || num > 100) {
          res.status(400).json({ error: 'overrideScore must be a number between 0 and 100' });
          return;
        }
        data.overrideScore = num;
      }
    }

    // Set reviewedAt when a final decision is made
    if (reviewStatus && reviewStatus !== 'PENDING') {
      data.reviewedAt = new Date();
    } else if (reviewStatus === 'PENDING') {
      data.reviewedAt = null;
    }

    const updated = await prisma.submission.update({
      where: { id },
      data,
      select: {
        id: true,
        reviewStatus: true,
        overrideScore: true,
        reviewNotes: true,
        reviewedAt: true,
        flaggedForReview: true,
      },
    });

    res.json({
      ...updated,
      overrideScore: updated.overrideScore ? Number(updated.overrideScore) : null,
    });
  } catch (err) {
    console.error('Failed to update review', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// ---------------------------------------------------------------------------
// Participant Management
// ---------------------------------------------------------------------------

// POST /api/admin/participants
// Bulk creates participants
adminRouter.post('/participants', async (req: Request, res: Response): Promise<void> => {
  try {
    const { participants } = req.body; // Expects an array of { name, rollNumber?, pinCode?, role? }

    if (!Array.isArray(participants)) {
      res.status(400).json({ error: 'participants must be an array' });
      return;
    }

    // Let's do a bulk insert with createMany. If there are duplicates, Prisma will throw.
    // We catch the P2002 unique constraint error.
    await prisma.user.createMany({
      data: participants.map((p: any) => ({
        name: p.name,
        rollNumber: p.rollNumber || null,
        pinCode: p.pinCode || null,
        role: p.role || 'PARTICIPANT',
      })),
      skipDuplicates: false, // We want to know if there's a duplicate to return a clear error
    });

    res.status(201).json({ message: 'Participants created successfully' });
  } catch (err) {
    console.error('Failed to create participants', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        res.status(400).json({ error: 'A user with one of these names already exists' });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to create participants' });
  }
});

// POST /api/admin/participants/:id/pin
// Sets or regenerates a PIN for a specific participant
adminRouter.post('/participants/:id/pin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { pinCode } = req.body;

    if (pinCode === undefined || pinCode === null) {
      res.status(400).json({ error: 'pinCode is required' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { pinCode: pinCode || null }, // empty string clears the PIN
    });

    res.json({
      message: 'PIN updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        hasPin: !!updatedUser.pinCode,
      },
    });
  } catch (err) {
    console.error('Failed to update PIN', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to update PIN' });
  }
});

// PUT /api/admin/participants/:id
// Edits a participant's name (and optionally rollNumber)
adminRouter.put('/participants/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, rollNumber } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(rollNumber !== undefined ? { rollNumber: rollNumber || null } : {}),
      },
      select: { id: true, name: true, rollNumber: true, pinCode: true, role: true },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      rollNumber: updated.rollNumber,
      role: updated.role,
      hasPin: !!updated.pinCode,
    });
  } catch (err) {
    console.error('Failed to update participant', err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        res.status(400).json({ error: 'A participant with this name already exists' });
        return;
      }
    }
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// DELETE /api/admin/participants/:id
// Deletes a participant — only allowed if they have no submissions
adminRouter.delete('/participants/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    // Check for existing submissions
    const submissionCount = await prisma.submission.count({ where: { userId: id } });
    if (submissionCount > 0) {
      res.status(409).json({
        error: `Cannot delete participant with ${submissionCount} submission(s). Remove their submissions first.`,
      });
      return;
    }

    // Check if they created any challenges
    const challengeCount = await prisma.challenge.count({ where: { createdBy: id } });
    if (challengeCount > 0) {
      res.status(409).json({
        error: `Cannot delete this admin user — they created ${challengeCount} challenge(s).`,
      });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Participant deleted successfully' });
  } catch (err) {
    console.error('Failed to delete participant', err);
    res.status(500).json({ error: 'Failed to delete participant' });
  }
});
