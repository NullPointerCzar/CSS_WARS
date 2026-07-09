import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { adminCheck } from '../middleware/adminCheck.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

export const challengesRouter = Router();
export const adminChallengesRouter = Router();

adminChallengesRouter.use(adminCheck);

// ---------------------------------------------------------------------------
// Multer config for target image upload
// ---------------------------------------------------------------------------
const UPLOADS_DIR = path.resolve('uploads/challenges');

// Ensure upload dir exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    // challenge-{id}{ext}
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `challenge-${req.params.id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cap
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      cb(new Error('Only image files are allowed (PNG, JPG, GIF, WebP, SVG)'));
      return;
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Public: GET /api/challenges — only published AND in the unlocked round
// ---------------------------------------------------------------------------
challengesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const state = await prisma.competitionState.findFirst();
    const unlockedRound = state?.unlockedRound ?? null;

    const where: Record<string, unknown> = { published: true };
    if (unlockedRound !== null) {
      where.roundNumber = unlockedRound;
    }

    const challenges = await prisma.challenge.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        targetImageUrl: true,
        roundNumber: true,
        createdAt: true,
      },
      orderBy: [{ roundNumber: 'asc' }, { title: 'asc' }],
    });

    res.json(challenges);
  } catch (err) {
    console.error('Failed to fetch challenges', err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// ---------------------------------------------------------------------------
// Public: GET /api/challenges/:id — single published challenge (must be in unlocked round)
// ---------------------------------------------------------------------------
challengesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const state = await prisma.competitionState.findFirst();
    const unlockedRound = state?.unlockedRound ?? null;

    const where: Record<string, unknown> = { id, published: true };
    if (unlockedRound !== null) {
      where.roundNumber = unlockedRound;
    }

    const challenge = await prisma.challenge.findFirst({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        targetImageUrl: true,
        roundNumber: true,
        createdAt: true,
      },
    });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    res.json(challenge);
  } catch (err) {
    console.error('Failed to fetch challenge', err);
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

// ---------------------------------------------------------------------------
// Admin: GET /api/admin/challenges — all challenges (including unpublished)
// ---------------------------------------------------------------------------
adminChallengesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const challenges = await prisma.challenge.findMany({
      orderBy: [{ roundNumber: 'asc' }, { title: 'asc' }],
    });
    res.json(challenges);
  } catch (err) {
    console.error('Failed to fetch admin challenges', err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// ---------------------------------------------------------------------------
// Admin: POST /api/admin/challenges — create a challenge
// ---------------------------------------------------------------------------
adminChallengesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, difficulty, roundNumber, targetImageUrl } = req.body;

    if (!title || !difficulty || roundNumber === undefined || !targetImageUrl) {
      res.status(400).json({ error: 'Missing required fields: title, difficulty, roundNumber, targetImageUrl' });
      return;
    }

    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      res.status(400).json({ error: 'difficulty must be EASY, MEDIUM, or HARD' });
      return;
    }

    // The admin must be identified via x-admin-pin; we don't have a user ID in the
    // header directly. We'll use the first admin user from the DB as "createdBy".
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      res.status(500).json({ error: 'No admin user found in database' });
      return;
    }

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description: description || null,
        difficulty,
        roundNumber: Number(roundNumber),
        targetImageUrl,
        published: false,
        createdBy: adminUser.id,
      },
    });

    res.status(201).json(challenge);
  } catch (err) {
    console.error('Failed to create challenge', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// ---------------------------------------------------------------------------
// Admin: PUT /api/admin/challenges/:id — edit a challenge
// ---------------------------------------------------------------------------
adminChallengesRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check challenge exists first
    const existing = await prisma.challenge.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    const { title, description, difficulty, roundNumber, targetImageUrl } = req.body;

    // Build update payload with only provided fields
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (difficulty !== undefined) {
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        res.status(400).json({ error: 'difficulty must be EASY, MEDIUM, or HARD' });
        return;
      }
      data.difficulty = difficulty;
    }
    if (roundNumber !== undefined) data.roundNumber = Number(roundNumber);
    if (targetImageUrl !== undefined) data.targetImageUrl = targetImageUrl;

    const challenge = await prisma.challenge.update({
      where: { id },
      data,
    });

    res.json(challenge);
  } catch (err) {
    console.error('Failed to update challenge', err);
    res.status(500).json({ error: 'Failed to update challenge' });
  }
});

// ---------------------------------------------------------------------------
// Admin: PATCH /api/admin/challenges/:id/publish — toggle published
// ---------------------------------------------------------------------------
adminChallengesRouter.patch('/:id/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const challenge = await prisma.challenge.findUnique({ where: { id } });

    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    const updated = await prisma.challenge.update({
      where: { id },
      data: { published: !challenge.published },
    });

    res.json(updated);
  } catch (err) {
    console.error('Failed to toggle publish state', err);
    res.status(500).json({ error: 'Failed to toggle publish state' });
  }
});

// ---------------------------------------------------------------------------
// Admin: DELETE /api/admin/challenges/:id — delete (only if no submissions)
// ---------------------------------------------------------------------------
adminChallengesRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check for existing submissions
    const submissionCount = await prisma.submission.count({ where: { challengeId: id } });
    if (submissionCount > 0) {
      res.status(409).json({
        error: `Cannot delete challenge with ${submissionCount} existing submission(s). Unpublish it instead.`,
      });
      return;
    }

    await prisma.challenge.delete({ where: { id } });
    res.json({ message: 'Challenge deleted successfully' });
  } catch (err) {
    console.error('Failed to delete challenge', err);
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

// ---------------------------------------------------------------------------
// Admin: POST /api/admin/challenges/:id/image — upload target image
// ---------------------------------------------------------------------------
adminChallengesRouter.post(
  '/:id/image',
  (req: Request, res: Response, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
            return;
          }
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const challenge = await prisma.challenge.findUnique({ where: { id } });
      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      const imageUrl = `/uploads/challenges/${req.file.filename}`;

      // Update the challenge's targetImageUrl
      const updated = await prisma.challenge.update({
        where: { id },
        data: { targetImageUrl: imageUrl },
      });

      res.json({
        message: 'Image uploaded successfully',
        targetImageUrl: imageUrl,
        challenge: updated,
      });
    } catch (err) {
      console.error('Failed to upload image', err);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  },
);
