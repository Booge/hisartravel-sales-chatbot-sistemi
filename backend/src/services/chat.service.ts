import prisma from '../config/database';
import { aiService } from './ai.service';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { Channel, MessageSender, MessageType, ConversationStatus, ContactStatus, LeadStage } from '@prisma/client';

interface SendMessageInput {
  conversationId: string;
  content: string;
  sender: MessageSender;
  type?: MessageType;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  agentId?: string;
}

interface CreateConversationInput {
  contactPhone?: string;
  contactName?: string;
  contactEmail?: string;
  whatsappId?: string;
  webSessionId?: string;
  channel: Channel;
}

export class ChatService {
  /**
   * Create or get existing conversation for a contact
   */
  async getOrCreateConversation(input: CreateConversationInput) {
    const { contactPhone, contactName, contactEmail, whatsappId, webSessionId, channel } = input;

    // Find or create contact
    let contact = null;

    if (whatsappId) {
      contact = await prisma.contact.findUnique({ where: { whatsappId } });
    } else if (contactPhone) {
      contact = await prisma.contact.findUnique({ where: { phone: contactPhone } });
    }

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
          whatsappId,
          webSessionId,
          source: channel.toLowerCase(),
          status: ContactStatus.LEAD,
        },
      });

      // Auto-create lead for new contacts
      await prisma.lead.create({
        data: {
          contactId: contact.id,
          stage: LeadStage.NEW,
          score: 0,
          title: `Yeni Lead - ${contactName || contactPhone || 'Bilinmeyen'}`,
        },
      });

      // Track event
      await this.trackEvent('contact_created', contact.id, undefined, {
        channel,
        source: channel.toLowerCase(),
      });

      logger.info(`New contact created: ${contact.id} (${channel})`);
    }

    // Find active conversation or create new one
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        channel,
        status: { in: [ConversationStatus.ACTIVE, ConversationStatus.WAITING] },
      },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          channel,
          status: ConversationStatus.ACTIVE,
          sessionId: webSessionId,
        },
        include: {
          contact: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      // Track event
      await this.trackEvent('conversation_started', contact.id, conversation.id, {
        channel,
      });

      logger.info(`New conversation: ${conversation.id} (${channel})`);
    }

    return { contact, conversation };
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(input: SendMessageInput) {
    const { conversationId, content, sender, type = MessageType.TEXT, mediaUrl, mediaType, fileName, agentId } = input;

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw createError('Konuşma bulunamadı', 404);
    }

    // Save the incoming message
    const message = await prisma.message.create({
      data: {
        conversationId,
        sender,
        type,
        content,
        mediaUrl,
        mediaType,
        fileName,
        agentId,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date(), status: ConversationStatus.ACTIVE },
    });

    // If message is from contact, generate AI response
    let aiMessage = null;
    if (sender === MessageSender.CONTACT) {
      try {
        // Build image URL for vision analysis
        let imageUrl: string | undefined;
        if (type === MessageType.IMAGE && mediaUrl) {
          imageUrl = mediaUrl;
        }

        const aiResponse = await aiService.chat(conversationId, content || '', imageUrl);

        // Save AI response
        aiMessage = await prisma.message.create({
          data: {
            conversationId,
            sender: MessageSender.BOT,
            type: MessageType.TEXT,
            content: aiResponse.content,
            aiModel: aiResponse.model,
            aiTokens: aiResponse.tokens.total,
            aiMetadata: aiResponse.metadata as any,
          },
        });

        // Update lead score based on AI analysis
        if (aiResponse.metadata.leadScore) {
          await this.updateLeadScore(
            conversation.contactId,
            aiResponse.metadata.leadScore,
            aiResponse.metadata.intentDetected
          );
        }

        // Track AI usage
        await this.trackEvent('ai_response', conversation.contactId, conversationId, {
          model: aiResponse.model,
          tokens: aiResponse.tokens,
          intent: aiResponse.metadata.intentDetected,
          sentiment: aiResponse.metadata.sentiment,
        });
      } catch (error: any) {
        logger.error(`AI response error for conversation ${conversationId}:`, error);

        // Send error message
        aiMessage = await prisma.message.create({
          data: {
            conversationId,
            sender: MessageSender.SYSTEM,
            type: MessageType.SYSTEM,
            content: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen biraz sonra tekrar deneyin.',
          },
        });
      }
    }

    return { message, aiMessage };
  }

  /**
   * Get conversation messages with pagination
   */
  async getMessages(conversationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          agent: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all conversations with last message
   */
  async getConversations(filters?: {
    channel?: Channel;
    status?: ConversationStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { channel, status, search, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (search) {
      where.contact = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          contact: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              messages: { where: { isRead: false, sender: MessageSender.CONTACT } },
            },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    return {
      conversations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update lead score
   */
  private async updateLeadScore(contactId: string, score: number, intent?: string) {
    const lead = await prisma.lead.findFirst({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
    });

    if (lead) {
      // Average score with existing
      const newScore = Math.min(100, (lead.score + score) / 2);

      // Auto-advance stage based on intent
      let newStage = lead.stage;
      if (intent === 'purchase' && lead.stage === LeadStage.NEW) {
        newStage = LeadStage.QUALIFIED;
      } else if (intent === 'info' && lead.stage === LeadStage.NEW) {
        newStage = LeadStage.CONTACTED;
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: { score: newScore, stage: newStage },
      });
    }
  }

  /**
   * Track analytics event
   */
  private async trackEvent(
    eventType: string,
    contactId?: string,
    conversationId?: string,
    data?: any
  ) {
    await prisma.analyticsEvent.create({
      data: { eventType, contactId, conversationId, data },
    });
  }
}

export const chatService = new ChatService();
