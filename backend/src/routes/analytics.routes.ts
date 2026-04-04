import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import prisma from '../config/database';
import { whatsappService } from '../services/whatsapp.service';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/analytics/dashboard
 * Dashboard summary
 */
router.get(
  '/dashboard',
  authMiddleware(),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalContacts,
      totalConversations,
      activeConversations,
      totalMessages,
      todayMessages,
      leadsByStage,
      contactsByStatus,
      recentConversations,
      tokensUsed,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: 'ACTIVE' } }),
      prisma.message.count(),
      prisma.message.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.lead.groupBy({ by: ['stage'], _count: true }),
      prisma.contact.groupBy({ by: ['status'], _count: true }),
      prisma.conversation.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          contact: { select: { name: true, phone: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.message.aggregate({
        where: { aiTokens: { not: null }, createdAt: { gte: monthStart } },
        _sum: { aiTokens: true },
      }),
    ]);

    // WhatsApp status
    const whatsappStatus = whatsappService.getStatus();

    // Messages per day (last 7 days)
    const messagesPerDay = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM messages
      WHERE created_at >= ${weekStart}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    ` as any[];

    res.json({
      summary: {
        totalContacts,
        totalConversations,
        activeConversations,
        totalMessages,
        todayMessages,
        monthlyTokens: tokensUsed._sum.aiTokens || 0,
      },
      leadsByStage: Object.fromEntries(
        leadsByStage.map((l) => [l.stage, l._count])
      ),
      contactsByStatus: Object.fromEntries(
        contactsByStatus.map((c) => [c.status, c._count])
      ),
      messagesPerDay,
      recentConversations,
      whatsappStatus,
    });
  })
);

/**
 * GET /api/analytics/conversations
 * Conversation analytics
 */
router.get(
  '/conversations',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { from, to } = req.query;
    const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to as string) : new Date();

    const [
      byChannel,
      avgMessagesPerConversation,
      totalConversations,
    ] = await Promise.all([
      prisma.conversation.groupBy({
        by: ['channel'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: true,
      }),
      prisma.message.groupBy({
        by: ['conversationId'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: true,
      }),
      prisma.conversation.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const avgMessages = avgMessagesPerConversation.length > 0
      ? avgMessagesPerConversation.reduce((acc, c) => acc + c._count, 0) / avgMessagesPerConversation.length
      : 0;

    res.json({
      byChannel: Object.fromEntries(byChannel.map((c) => [c.channel, c._count])),
      totalConversations,
      avgMessagesPerConversation: Math.round(avgMessages * 10) / 10,
      period: { from: startDate, to: endDate },
    });
  })
);

/**
 * GET /api/analytics/whatsapp
 * WhatsApp connection status
 */
router.get(
  '/whatsapp',
  authMiddleware(),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json(whatsappService.getStatus());
  })
);

export default router;
