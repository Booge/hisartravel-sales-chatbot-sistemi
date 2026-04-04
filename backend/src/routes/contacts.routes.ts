import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../config/database';
import { z } from 'zod';

const router = Router();

// ============================================
// CONTACTS
// ============================================

/**
 * GET /api/contacts
 */
router.get(
  '/',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: {
          leads: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { conversations: true } },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    res.json({
      contacts,
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
 * GET /api/contacts/:id
 */
router.get(
  '/:id',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        conversations: {
          orderBy: { updatedAt: 'desc' },
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        leads: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Kişi bulunamadı' });
    }

    res.json(contact);
  })
);

/**
 * PUT /api/contacts/:id
 */
router.put(
  '/:id',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const updateSchema = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      status: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'LOST']).optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    });

    const data = updateSchema.parse(req.body);
    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data,
    });

    res.json(contact);
  })
);

/**
 * DELETE /api/contacts/:id
 */
router.delete(
  '/:id',
  authMiddleware(['ADMIN']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await prisma.contact.delete({ where: { id: req.params.id } });
    res.json({ message: 'Kişi silindi' });
  })
);

export default router;
