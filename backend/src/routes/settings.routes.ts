import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../config/database';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/settings/bot
 * Get active bot configuration
 */
router.get(
  '/bot',
  authMiddleware(),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const config = await prisma.botConfig.findFirst({
      where: { isActive: true },
      include: { knowledgeBase: true },
    });

    res.json(config);
  })
);

/**
 * PUT /api/settings/bot
 * Update bot configuration
 */
router.put(
  '/bot',
  authMiddleware(['ADMIN', 'MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const schema = z.object({
      name: z.string().optional(),
      systemPrompt: z.string().optional(),
      welcomeMessage: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(100).max(4096).optional(),
      settings: z.record(z.any()).optional(),
    });

    const data = schema.parse(req.body);

    // Find or create active config
    let config = await prisma.botConfig.findFirst({ where: { isActive: true } });

    if (config) {
      config = await prisma.botConfig.update({
        where: { id: config.id },
        data,
        include: { knowledgeBase: true },
      });
    } else {
      config = await prisma.botConfig.create({
        data: {
          name: data.name || 'Default Bot',
          systemPrompt: data.systemPrompt || '',
          ...data,
        },
        include: { knowledgeBase: true },
      });
    }

    res.json(config);
  })
);

/**
 * POST /api/settings/knowledge
 * Add knowledge base entry
 */
router.post(
  '/knowledge',
  authMiddleware(['ADMIN', 'MANAGER']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const schema = z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Get active bot config
    let botConfig = await prisma.botConfig.findFirst({ where: { isActive: true } });
    if (!botConfig) {
      botConfig = await prisma.botConfig.create({
        data: {
          name: 'Default Bot',
          systemPrompt: '',
        },
      });
    }

    const entry = await prisma.knowledgeBase.create({
      data: {
        ...data,
        botConfigId: botConfig.id,
      },
    });

    res.status(201).json(entry);
  })
);

/**
 * DELETE /api/settings/knowledge/:id
 */
router.delete(
  '/knowledge/:id',
  authMiddleware(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await prisma.knowledgeBase.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Bilgi tabanı kaydı silindi' });
  })
);

/**
 * GET /api/settings/users
 * List all users (Admin only)
 */
router.get(
  '/users',
  authMiddleware(['ADMIN']),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  })
);

export default router;
