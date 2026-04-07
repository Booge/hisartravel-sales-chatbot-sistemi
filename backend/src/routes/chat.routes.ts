import { Router, Response } from 'express';
import { chatService } from '../services/chat.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import fs from 'fs';

const router = Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(env.UPLOAD_DIR, 'chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|mp3|mp4|ogg|wav/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext || mime) {
      return cb(null, true);
    }
    cb(new Error('Desteklenmeyen dosya tipi'));
  },
});

// Validation schemas
const sendMessageSchema = z.object({
  content: z.string().optional(),
  sender: z.enum(['CONTACT', 'BOT', 'AGENT', 'SYSTEM']).default('CONTACT'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'LOCATION', 'CONTACT_CARD', 'SYSTEM']).default('TEXT'),
});

const startConversationSchema = z.object({
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  webSessionId: z.string().optional(),
  channel: z.enum(['WHATSAPP', 'WEB']).default('WEB'),
});

/**
 * GET /api/chat/conversations
 * List all conversations (dashboard)
 */
router.get(
  '/conversations',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { channel, status, search, page, limit } = req.query;
    const result = await chatService.getConversations({
      channel: channel as any,
      status: status as any,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  })
);

/**
 * POST /api/chat/conversations
 * Start a new conversation
 */
router.post(
  '/conversations',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = startConversationSchema.parse(req.body);
    const result = await chatService.getOrCreateConversation(data);
    res.status(201).json(result);
  })
);

/**
 * GET /api/chat/conversations/:id/messages
 * Get messages for a conversation
 */
router.get(
  '/conversations/:id/messages',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const { page, limit } = req.query;
    const result = await chatService.getMessages(
      id,
      page ? parseInt(page as string) : undefined,
      limit ? parseInt(limit as string) : undefined
    );
    res.json(result);
  })
);

/**
 * POST /api/chat/conversations/:id/messages
 * Send a message (from web chat widget or agent)
 */
router.post(
  '/conversations/:id/messages',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const data = sendMessageSchema.parse(req.body);

    const result = await chatService.sendMessage({
      conversationId: id,
      content: data.content || '',
      sender: data.sender as any,
      type: data.type as any,
      agentId: req.user?.id,
    });

    res.status(201).json(result);
  })
);

/**
 * POST /api/chat/conversations/:id/upload
 * Upload file/image in conversation
 */
router.post(
  '/conversations/:id/upload',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const mediaUrl = `/uploads/chat/${req.file.filename}`;
    const mediaType = req.file.mimetype;
    const isImage = mediaType.startsWith('image/');

    const result = await chatService.sendMessage({
      conversationId: id,
      content: req.body.content || '',
      sender: req.body.sender || 'CONTACT',
      type: isImage ? 'IMAGE' : 'FILE',
      mediaUrl,
      mediaType,
      fileName: req.file.originalname,
    });

    res.status(201).json(result);
  })
);

/**
 * POST /api/chat/web
 * Public endpoint for web chat widget (no auth required)
 */
router.post(
  '/web',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId, message, name, email, phone } = req.body;

    // Get or create conversation
    const { contact, conversation } = await chatService.getOrCreateConversation({
      contactName: name,
      contactEmail: email,
      contactPhone: phone,
      webSessionId: sessionId,
      channel: 'WEB',
    });

    // Send message and get AI response
    const { message: savedMsg, aiMessage } = await chatService.sendMessage({
      conversationId: conversation.id,
      content: message,
      sender: 'CONTACT',
    });

    res.json({
      conversationId: conversation.id,
      contactId: contact.id,
      message: savedMsg,
      reply: aiMessage,
    });
  })
);

export default router;
