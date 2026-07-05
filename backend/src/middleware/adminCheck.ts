import { Request, Response, NextFunction } from 'express';

export function adminCheck(req: Request, res: Response, next: NextFunction): void {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) {
    console.error('ADMIN_PIN is not set in environment variables');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const providedPin = req.headers['x-admin-pin'];
  if (!providedPin || providedPin !== adminPin) {
    res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
    return;
  }

  next();
}
