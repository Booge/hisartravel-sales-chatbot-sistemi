import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function authMiddleware(requiredRoles?: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Get token from header or cookie
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : req.cookies?.token;

      if (!token) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
      }

      // Verify token
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Geçersiz veya devre dışı kullanıcı' });
      }

      // Check role
      if (requiredRoles && !requiredRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Oturum süresi doldu' });
      }
      return res.status(401).json({ error: 'Geçersiz token' });
    }
  };
}
