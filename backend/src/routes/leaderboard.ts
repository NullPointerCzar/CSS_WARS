/**
 * Leaderboard API routes.
 *
 * - GET  /api/leaderboard?challengeId=        — Per-challenge rankings (tie-break ordered)
 * - GET  /api/leaderboard/overall              — Aggregate across all challenges (sum of best scores)
 * - PATCH /api/admin/leaderboard/freeze        — Admin: toggle freeze (creates snapshot)
 * - GET  /api/admin/leaderboard/export         — Admin: CSV export of full results
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '../db.js';
import { adminCheck } from '../middleware/adminCheck.js';
import { Prisma } from '@prisma/client';

export const leaderboardRouter = Router();
export const adminLeaderboardRouter = Router();

adminLeaderboardRouter.use(adminCheck);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  rollNumber: string | null;
  score: number;
  codeLength: number;
  submittedAt: string;
}

export interface OverallEntry {
  rank: number;
  userId: string;
  name: string;
  rollNumber: string | null;
  totalScore: number;
  challengesCompleted: number;
  perChallenge: Record<string, number>; // challengeId → best score
}

interface FrozenSnapshot {
  byChallenge: Record<string, LeaderboardEntry[]>;
  overall: OverallEntry[];
  frozenAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute live per-challenge leaderboard.
 */
async function computeChallengeLeaderboard(
  challengeId: string,
): Promise<LeaderboardEntry[]> {
  const submissions = await prisma.submission.findMany({
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
      user: {
        select: { name: true, rollNumber: true },
      },
    },
    orderBy: [
      { score: 'desc' },
      { codeLength: 'asc' },
      { submittedAt: 'asc' },
    ],
  });

  return submissions.map((s, i) => ({
    rank: i + 1,
    userId: s.userId,
    name: s.user.name,
    rollNumber: s.user.rollNumber,
    score: Number(s.score),
    codeLength: s.codeLength,
    submittedAt: s.submittedAt.toISOString(),
  }));
}

/**
 * Compute live overall leaderboard (sum of best scores across all challenges).
 */
async function computeOverallLeaderboard(): Promise<OverallEntry[]> {
  const users = await prisma.user.findMany({
    where: { role: 'PARTICIPANT' },
    select: {
      id: true,
      name: true,
      rollNumber: true,
      submissions: {
        where: { isBest: true, score: { not: null } },
        select: { score: true, challengeId: true },
      },
    },
  });

  const entries: { userId: string; name: string; rollNumber: string | null; totalScore: number; challengesCompleted: number; perChallenge: Record<string, number> }[] = [];

  for (const user of users) {
    const perChallenge: Record<string, number> = {};
    let totalScore = 0;

    for (const sub of user.submissions) {
      const score = Number(sub.score);
      perChallenge[sub.challengeId] = score;
      totalScore += score;
    }

    entries.push({
      userId: user.id,
      name: user.name,
      rollNumber: user.rollNumber,
      totalScore,
      challengesCompleted: user.submissions.length,
      perChallenge,
    });
  }

  // Sort: totalScore desc → name asc (tiebreaker for overall)
  entries.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.name.localeCompare(b.name);
  });

  return entries.map((e, i) => ({
    ...e,
    rank: i + 1,
  }));
}

/**
 * Compute the full set of leaderboard data for snapshotting.
 */
async function computeFullSnapshot(): Promise<FrozenSnapshot> {
  const challenges = await prisma.challenge.findMany({
    where: { published: true },
    select: { id: true },
  });

  const byChallenge: Record<string, LeaderboardEntry[]> = {};

  for (const challenge of challenges) {
    byChallenge[challenge.id] = await computeChallengeLeaderboard(challenge.id);
  }

  const overall = await computeOverallLeaderboard();

  return {
    byChallenge,
    overall,
    frozenAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// GET /api/leaderboard?challengeId= — per-challenge rankings
// ---------------------------------------------------------------------------

leaderboardRouter.get(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const challengeId = req.query.challengeId as string | undefined;

      if (!challengeId) {
        res.status(400).json({ error: 'Missing required query param: challengeId' });
        return;
      }

      // Check if frozen
      const state = await prisma.competitionState.findFirst();

      if (state?.leaderboardFrozen && state?.frozenLeaderboardData) {
        const snapshot = state.frozenLeaderboardData as unknown as FrozenSnapshot;

        if (snapshot.byChallenge[challengeId]) {
          res.json({
            frozen: true,
            frozenAt: snapshot.frozenAt,
            entries: snapshot.byChallenge[challengeId],
          });
          return;
        }

        // Challenge not in snapshot (maybe unpublished after freeze)
        res.json({ frozen: true, frozenAt: snapshot.frozenAt, entries: [] });
        return;
      }

      const entries = await computeChallengeLeaderboard(challengeId);
      res.json({ frozen: false, entries });
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/leaderboard/overall — aggregate across all challenges
// ---------------------------------------------------------------------------

leaderboardRouter.get(
  '/overall',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const state = await prisma.competitionState.findFirst();

      if (state?.leaderboardFrozen && state?.frozenLeaderboardData) {
        const snapshot = state.frozenLeaderboardData as unknown as FrozenSnapshot;
        res.json({
          frozen: true,
          frozenAt: snapshot.frozenAt,
          entries: snapshot.overall,
        });
        return;
      }

      const entries = await computeOverallLeaderboard();
      res.json({ frozen: false, entries });
    } catch (err) {
      console.error('Failed to fetch overall leaderboard', err);
      res.status(500).json({ error: 'Failed to fetch overall leaderboard' });
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /api/admin/leaderboard/freeze — toggle freeze (admin only)
// ---------------------------------------------------------------------------

adminLeaderboardRouter.patch(
  '/freeze',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const state = await prisma.competitionState.findFirst();
      if (!state) {
        res.status(500).json({ error: 'Competition state not initialized' });
        return;
      }

      const currentlyFrozen = state.leaderboardFrozen;

      if (currentlyFrozen) {
        // Unfreeze — clear snapshot
        await prisma.competitionState.update({
          where: { id: state.id },
          data: {
            leaderboardFrozen: false,
            frozenLeaderboardData: Prisma.DbNull,
          },
        });
        res.json({ frozen: false, message: 'Leaderboard unfrozen — now showing live data' });
      } else {
        // Freeze — compute and store snapshot
        const snapshot = await computeFullSnapshot();
        await prisma.competitionState.update({
          where: { id: state.id },
          data: {
            leaderboardFrozen: true,
            frozenLeaderboardData: snapshot as unknown as Prisma.InputJsonValue,
          },
        });
        res.json({
          frozen: true,
          frozenAt: snapshot.frozenAt,
          participants: snapshot.overall.length,
          message: 'Leaderboard frozen — snapshot captured',
        });
      }
    } catch (err) {
      console.error('Failed to toggle leaderboard freeze', err);
      res.status(500).json({ error: 'Failed to toggle leaderboard freeze' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /api/admin/leaderboard/export — CSV export (admin only)
// ---------------------------------------------------------------------------

adminLeaderboardRouter.get(
  '/export',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const state = await prisma.competitionState.findFirst();

      let entries: OverallEntry[];

      if (state?.leaderboardFrozen && state?.frozenLeaderboardData) {
        const snapshot = state.frozenLeaderboardData as unknown as FrozenSnapshot;
        entries = snapshot.overall;
      } else {
        entries = await computeOverallLeaderboard();
      }

      // Get all challenge titles for column headers
      const challenges = await prisma.challenge.findMany({
        where: { published: true },
        select: { id: true, title: true },
        orderBy: { roundNumber: 'asc' },
      });

      // Build CSV
      const headers = [
        'Rank',
        'Name',
        'Roll Number',
        ...challenges.map((c) => c.title),
        'Total Score',
        'Challenges Completed',
      ];

      const rows = entries.map((e) => {
        const challengeScores = challenges.map((c) =>
          e.perChallenge[c.id] !== undefined ? String(e.perChallenge[c.id]) : '',
        );
        return [
          String(e.rank),
          e.name,
          e.rollNumber ?? '',
          ...challengeScores,
          String(e.totalScore),
          String(e.challengesCompleted),
        ];
      });

      // BOM (\ufeff) helps Excel detect UTF-8 encoding
      const csvContent = '\ufeff' + [
        headers.join(','),
        ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="cssbattle-leaderboard-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (err) {
      console.error('Failed to export leaderboard', err);
      res.status(500).json({ error: 'Failed to export leaderboard' });
    }
  },
);
