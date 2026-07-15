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

// Loopback hosts are always safe to allow (local dev / event machine).
function isLoopback(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '::1' || hostname === '[::1]')
    return true;
  // IPv4 loopback range 127.0.0.0/8 (covers 127.0.0.1, 127.0.2.3, etc.)
  return /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

function originAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
  try {
    return isLoopback(new URL(origin).hostname);
  } catch {
    return false;
  }
}

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
        if (originAllowed(origin, allowedOrigins)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS: origin ${origin} not allowed`));
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  // Serve uploaded images statically.
  // We pass the same CORS origin list to express.static so the
  // browser can load these images into a canvas (needed by the
  // DiffMode client). Without these headers, the canvas would be
  // marked cross-origin and pixel reads would throw.
  app.use(
    '/uploads',
    (req, res, next) => {
      const origin = req.headers.origin;
      if (origin && originAllowed(origin, allowedOrigins)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
      next();
    },
    express.static(path.resolve('uploads')),
  );
  app.use(
    '/targets',
    (req, res, next) => {
      const origin = req.headers.origin;
      if (origin && originAllowed(origin, allowedOrigins)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
      next();
    },
    express.static(path.resolve('targets')),
  );

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
      service: 'csswars-backend',
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
