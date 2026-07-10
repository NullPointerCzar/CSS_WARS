import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db.js';

/**
 * Admin authentication middleware.
 *
 * Uses the x-user-id header to look up the user in the database and
 * verify they have the ADMIN role. This replaces the old shared-PIN
 * approach with proper role-based authorization.
 */
export async function adminCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized: Missing x-user-id header' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User not found' });
      return;
    }

    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: Admin role required' });
      return;
    }

    // Attach user info to request for downstream handlers
    (req as any).adminUser = user;
    next();
  } catch (err) {
    console.error('Failed to verify admin access', err);
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
}
