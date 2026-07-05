import { Router, Request, Response } from 'express';
import { prisma } from '../db.js';
import { adminCheck } from '../middleware/adminCheck.js';
import { Prisma } from '@prisma/client';

export const adminRouter = Router();

adminRouter.use(adminCheck);

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

    if (!pinCode) {
      res.status(400).json({ error: 'pinCode is required' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { pinCode },
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
