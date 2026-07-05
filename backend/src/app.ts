import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import path from 'path';
import { identityRouter } from './routes/identity.js';
import { adminRouter } from './routes/admin.js';
import { challengesRouter, adminChallengesRouter } from './routes/challenges.js';

export function createApp(): Express {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Same-origin / curl / no Origin header → allow.
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS: origin ${origin} not allowed`));
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // Serve uploaded images statically
  app.use('/uploads', express.static(path.resolve('uploads')));

  app.use('/api', identityRouter);
  app.use('/api/challenges', challengesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/challenges', adminChallengesRouter);

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'cssbattle-backend', uptime: process.uptime() });
  });

  return app;
}
