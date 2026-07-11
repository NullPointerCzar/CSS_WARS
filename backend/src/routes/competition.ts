/**
 * Competition state API routes.
 *
 * Provides read-only view of the global competition state for the frontend
 * to check before allowing submissions.
 *
 * Admin mutation endpoints are in routes/admin.ts.
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '../db.js';

export const competitionRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/competition/state — current competition state
// ---------------------------------------------------------------------------

competitionRouter.get(
  '/state',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const state = await prisma.competitionState.findFirst();

      if (!state) {
        // No state row yet — default to locked (no submissions allowed)
        res.json({ locked: true, status: 'NOT_STARTED', currentRound: 1, unlockedRound: null, leaderboardFrozen: false });
        return;
      }

      res.json({
        locked: state.locked,
        status: state.status,
        currentRound: state.currentRound,
        unlockedRound: state.unlockedRound,
        leaderboardFrozen: state.leaderboardFrozen,
      });
    } catch (err) {
      console.error('Failed to fetch competition state', err);
      res.status(500).json({ error: 'Failed to fetch competition state' });
    }
  },
);
