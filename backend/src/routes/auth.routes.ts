import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır'),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Geçerli bir email adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

/**
 * POST /api/auth/register
 * Register a new user (Admin only)
 */
router.post(
  '/register',
  authMiddleware(['ADMIN']),
  asyncHandler(async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json(result);
  })
);

/**
 * POST /api/auth/setup
 * Create first admin user (only if no users exist)
 */
router.post(
  '/setup',
  asyncHandler(async (req: Request, res: Response) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const userCount = await prisma.user.count();
    await prisma.$disconnect();

    if (userCount > 0) {
      return res.status(403).json({ error: 'Kurulum zaten tamamlanmış' });
    }

    const data = registerSchema.parse(req.body);
    const result = await authService.register({ ...data, role: 'ADMIN' });
    res.status(201).json(result);
  })
);

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);

    // Set cookie for web clients
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json(result);
  })
);

/**
 * POST /api/auth/logout
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Çıkış yapıldı' });
});

/**
 * GET /api/auth/me
 */
router.get(
  '/me',
  authMiddleware(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await authService.getProfile(req.user!.id);
    res.json(profile);
  })
);

export default router;
