import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../config/database';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/leads
 */
router.get(
  '/',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { stage, assignedTo, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (stage) where.stage = stage;
    if (assignedTo) where.assignedTo = assignedTo;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          contact: true,
          assignee: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

/**
 * GET /api/leads/pipeline
 * Get leads grouped by stage (for Kanban board)
 */
router.get(
  '/pipeline',
  authMiddleware(),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const pipeline: Record<string, any[]> = {};

    for (const stage of stages) {
      pipeline[stage] = await prisma.lead.findMany({
        where: { stage: stage as any },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: {
          contact: { select: { id: true, name: true, phone: true, email: true } },
          assignee: { select: { id: true, name: true } },
        },
      });
    }

    res.json(pipeline);
  })
);

/**
 * PUT /api/leads/:id
 */
router.put(
  '/:id',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const updateSchema = z.object({
      stage: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
      score: z.number().min(0).max(100).optional(),
      value: z.number().optional(),
      currency: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      assignedTo: z.string().uuid().optional(),
      lostReason: z.string().optional(),
    });

    const data = updateSchema.parse(req.body);

    // Set won/lost timestamps
    const extra: any = {};
    if (data.stage === 'WON') extra.wonAt = new Date();
    if (data.stage === 'LOST') extra.lostAt = new Date();

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { ...data, ...extra },
      include: { contact: true, assignee: { select: { id: true, name: true } } },
    });

    // Update contact status if lead is won
    if (data.stage === 'WON') {
      await prisma.contact.update({
        where: { id: lead.contactId },
        data: { status: 'CUSTOMER' },
      });
    } else if (data.stage === 'LOST') {
      await prisma.contact.update({
        where: { id: lead.contactId },
        data: { status: 'LOST' },
      });
    }

    res.json(lead);
  })
);

export default router;
