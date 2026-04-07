import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketServer } from 'socket.io';
import path from 'path';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import prisma from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { whatsappService } from './services/whatsapp.service';

// Routes
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import contactsRoutes from './routes/contacts.routes';
import leadsRoutes from './routes/leads.routes';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';

async function main() {
  // ============================================
  // Express App Setup
  // ============================================
  const app = express();
  const server = http.createServer(app);

  // Socket.IO
  const io = new SocketServer(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  // ============================================
  // Middleware
  // ============================================
  app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting (trust proxy required when behind Traefik/Cloudflare)
  app.set('trust proxy', 1);
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: { error: 'Çok fazla istek gönderdiniz, lütfen bekleyin.' },
  });
  app.use('/api/', limiter);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ============================================
  // API Routes
  // ============================================
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/leads', leadsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/settings', settingsRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      whatsapp: whatsappService.getStatus(),
    });
  });

  // ============================================
  // Socket.IO Events
  // ============================================
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join conversation rooms
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.debug(`Socket ${socket.id} joined conversation:${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Join dashboard room for real-time updates
    socket.on('join:dashboard', () => {
      socket.join('dashboard');
      logger.debug(`Socket ${socket.id} joined dashboard`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // Make io accessible to routes
  app.set('io', io);

  // ============================================
  // Error Handler (must be last)
  // ============================================
  app.use(errorHandler);

  // ============================================
  // Connect Services & Start Server
  // ============================================
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Connect to Redis
    await connectRedis();

    // Initialize WhatsApp
    if (env.WHATSAPP_ENABLED) {
      await whatsappService.initialize(io);
    }

    // Start server
    server.listen(env.PORT, () => {
      logger.info(`
╔══════════════════════════════════════════╗
║   🤖 Hisar Travel ChatBot Backend       ║
║   🌐 http://localhost:${env.PORT}              ║
║   📊 Environment: ${env.NODE_ENV.padEnd(20)}║
║   💬 WhatsApp: ${env.WHATSAPP_ENABLED ? '✅ Enabled ' : '❌ Disabled'}              ║
╚══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await whatsappService.disconnect();
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
