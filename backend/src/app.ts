import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import path from 'path';
import { identityRouter } from './routes/identity.js';
import { adminRouter } from './routes/admin.js';
import { challengesRouter, adminChallengesRouter } from './routes/challenges.js';
import { submissionsRouter } from './routes/submissions.js';
import { competitionRouter } from './routes/competition.js';
import { leaderboardRouter, adminLeaderboardRouter } from './routes/leaderboard.js';
import { getRenderServiceStatus } from './renderStatus.js';

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
  // Serve target images (from seed data)
  app.use('/targets', express.static(path.resolve('targets')));

  app.use('/api', identityRouter);
  app.use('/api/challenges', challengesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/challenges', adminChallengesRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/competition', competitionRouter);
  app.use('/api/admin/leaderboard', adminLeaderboardRouter);
  app.use('/api/submissions', submissionsRouter);

  app.get('/api/health', (_req: Request, res: Response) => {
    const renderStatus = getRenderServiceStatus();
    res.json({
      status: 'ok',
      service: 'cssbattle-backend',
      uptime: process.uptime(),
      renderService: {
        status: renderStatus.status,
        port: renderStatus.port,
        pid: renderStatus.pid,
      },
    });
  });

  return app;
}
