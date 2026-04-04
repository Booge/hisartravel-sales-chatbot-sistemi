import { Client, LocalAuth, Message, MessageMedia } from 'whatsapp-web.js';
import { env } from '../config/env';
import { chatService } from './chat.service';
import { logger } from '../utils/logger';
import { Server as SocketServer } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class WhatsAppService {
  private client: Client | null = null;
  private io: SocketServer | null = null;
  private isReady = false;
  private qrCode: string | null = null;

  /**
   * Initialize WhatsApp client
   */
  async initialize(io: SocketServer) {
    if (!env.WHATSAPP_ENABLED) {
      logger.info('WhatsApp is disabled');
      return;
    }

    this.io = io;

    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: env.WHATSAPP_SESSION_PATH,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      },
    });

    // QR Code event
    this.client.on('qr', (qr: string) => {
      this.qrCode = qr;
      this.isReady = false;
      logger.info('WhatsApp QR code generated - scan to connect');

      // Send QR code to dashboard via Socket.IO
      if (this.io) {
        this.io.emit('whatsapp:qr', { qr });
      }
    });

    // Ready event
    this.client.on('ready', () => {
      this.isReady = true;
      this.qrCode = null;
      logger.info('✅ WhatsApp client is ready');

      if (this.io) {
        this.io.emit('whatsapp:ready', { status: 'connected' });
      }
    });

    // Disconnected event
    this.client.on('disconnected', (reason: string) => {
      this.isReady = false;
      logger.warn(`WhatsApp disconnected: ${reason}`);

      if (this.io) {
        this.io.emit('whatsapp:disconnected', { reason });
      }
    });

    // Authentication failure
    this.client.on('auth_failure', (msg: string) => {
      this.isReady = false;
      logger.error(`WhatsApp auth failure: ${msg}`);

      if (this.io) {
        this.io.emit('whatsapp:auth_failure', { message: msg });
      }
    });

    // Handle incoming messages
    this.client.on('message', async (msg: Message) => {
      await this.handleIncomingMessage(msg);
    });

    // Start client
    try {
      await this.client.initialize();
      logger.info('WhatsApp client initializing...');
    } catch (error: any) {
      logger.error('WhatsApp initialization error:', error);
    }
  }

  /**
   * Handle incoming WhatsApp message
   */
  private async handleIncomingMessage(msg: Message) {
    try {
      // Skip group messages and status updates
      if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') {
        return;
      }

      const contactPhone = msg.from.replace('@c.us', '');
      const whatsappId = msg.from;

      logger.info(`📩 WhatsApp message from ${contactPhone}: ${msg.body?.substring(0, 50)}`);

      // Get or create conversation
      const { contact, conversation } = await chatService.getOrCreateConversation({
        contactPhone,
        contactName: (await msg.getContact())?.pushname || undefined,
        whatsappId,
        channel: 'WHATSAPP',
      });

      // Handle media messages
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let fileName: string | undefined;
      let messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' = 'TEXT';

      if (msg.hasMedia) {
        const media = await msg.downloadMedia();
        if (media) {
          const ext = media.mimetype.split('/')[1]?.split(';')[0] || 'bin';
          fileName = `${uuidv4()}.${ext}`;
          const uploadDir = path.join(env.UPLOAD_DIR, 'whatsapp');

          // Ensure directory exists
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));

          mediaUrl = `/uploads/whatsapp/${fileName}`;
          mediaType = media.mimetype;

          // Determine message type
          if (media.mimetype.startsWith('image/')) messageType = 'IMAGE';
          else if (media.mimetype.startsWith('audio/')) messageType = 'AUDIO';
          else if (media.mimetype.startsWith('video/')) messageType = 'VIDEO';
          else messageType = 'FILE';
        }
      }

      // Send message to chat service and get AI response
      const { message, aiMessage } = await chatService.sendMessage({
        conversationId: conversation.id,
        content: msg.body || '',
        sender: 'CONTACT',
        type: messageType,
        mediaUrl,
        mediaType,
        fileName,
      });

      // Send AI response back via WhatsApp
      if (aiMessage?.content) {
        // Add natural delay (1-3 seconds)
        const delay = 1000 + Math.random() * 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        await msg.reply(aiMessage.content);
      }

      // Notify dashboard via Socket.IO
      if (this.io) {
        this.io.emit('message:new', {
          conversationId: conversation.id,
          contactId: contact.id,
          message,
          aiMessage,
          channel: 'WHATSAPP',
        });
      }
    } catch (error: any) {
      logger.error('Error handling WhatsApp message:', error);
    }
  }

  /**
   * Send a message via WhatsApp
   */
  async sendMessage(phone: string, content: string) {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp bağlı değil');
    }

    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;

    try {
      await this.client.sendMessage(chatId, content);
      logger.info(`📤 WhatsApp message sent to ${phone}`);
    } catch (error: any) {
      logger.error(`Failed to send WhatsApp message to ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Send media via WhatsApp
   */
  async sendMedia(phone: string, filePath: string, caption?: string) {
    if (!this.client || !this.isReady) {
      throw new Error('WhatsApp bağlı değil');
    }

    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    const media = MessageMedia.fromFilePath(filePath);

    await this.client.sendMessage(chatId, media, { caption });
  }

  /**
   * Get WhatsApp status
   */
  getStatus() {
    return {
      enabled: env.WHATSAPP_ENABLED,
      connected: this.isReady,
      qrCode: this.qrCode,
    };
  }

  /**
   * Get QR code for scanning
   */
  getQRCode() {
    return this.qrCode;
  }

  /**
   * Disconnect WhatsApp
   */
  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      this.qrCode = null;
      logger.info('WhatsApp disconnected');
    }
  }
}

export const whatsappService = new WhatsAppService();
