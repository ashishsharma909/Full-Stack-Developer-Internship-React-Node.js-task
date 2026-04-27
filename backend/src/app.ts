import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './config/configLoader';
import { normalizeConfig } from './config/configNormalizer';
import { createRootRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();

  // ── Security headers ───────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    }),
  );

  // ── Rate limiting ──────────────────────────────────────────────────────────
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later' },
    }),
  );

  // ── Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Request logging ────────────────────────────────────────────────────────
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // ── Load & normalize config ────────────────────────────────────────────────
  const rawConfig = loadConfig();
  const config = normalizeConfig(rawConfig);

  logger.info(`App: ${config.app.name} | Entities: ${config.entities.length} | Views: ${config.views.length}`);

  // ── Routes ─────────────────────────────────────────────────────────────────
  app.use('/api', createRootRouter(config));

  // ── Error handling (must be last) ──────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
