import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Extracts and verifies the JWT from the Authorization header or cookie.
 * Attaches { id, email } to req.user on success.
 * Returns 401 on failure — never 500.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Support both Bearer token and httpOnly cookie
    const authHeader = req.headers.authorization;
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null) ??
      (req.cookies as Record<string, string>)?.token ??
      null;

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_TOKEN' });
      return;
    }

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Session expired', code: 'TOKEN_EXPIRED' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' });
    } else {
      res.status(401).json({ success: false, error: 'Authentication failed', code: 'AUTH_FAILED' });
    }
  }
}

export function signToken(userId: string, email: string): string {
  return jwt.sign({ email }, JWT_SECRET, {
    subject: userId,
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}
