import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';

export const identityRouter = Router();

// GET /api/participants
// Returns list of pre-registered participant names (id + name + hasPin + submissionCount)
identityRouter.get('/participants', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        pinCode: true,
        _count: { select: { submissions: true } },
      },
      orderBy: { name: 'asc' },
    });

    const participants = users.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      hasPin: !!u.pinCode,
      submissionCount: u._count.submissions,
    }));

    res.json(participants);
  } catch (err) {
    console.error('Failed to fetch participants', err);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

// POST /api/identity/select
// Validates userId and PIN (if required)
identityRouter.post('/identity/select', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, pinCode } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.pinCode) {
      if (!pinCode) {
        res.status(400).json({ error: 'PIN code is required for this user' });
        return;
      }
      if (user.pinCode !== pinCode) {
        res.status(401).json({ error: 'Incorrect PIN code' });
        return;
      }
    }

    // Success
    res.json({
      id: user.id,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    console.error('Failed to select identity', err);
    res.status(500).json({ error: 'Failed to select identity' });
  }
});
