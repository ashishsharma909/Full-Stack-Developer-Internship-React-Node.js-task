import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { signToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import type { AuthResponse } from '../../../shared/types/api';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
    }

    if (password.length < 8) {
      throw new AppError(400, 'Password must be at least 8 characters', 'WEAK_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name ?? null },
    });

    const token = signToken(user.id, user.email);
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Constant-time comparison to prevent user enumeration
    const hash = user?.passwordHash ?? '$2a$12$invalidhashpadding000000000000000000000000000000000000000';
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const token = signToken(user.id, user.email);
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    return user;
  }
}
