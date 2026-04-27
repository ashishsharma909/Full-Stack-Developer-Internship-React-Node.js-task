/**
 * routes/index.ts
 *
 * Aggregates all routes and mounts them.
 * The entity and CSV routers are recreated when config is reloaded
 * (handled via the /api/config/reload endpoint triggering a server restart
 * in dev, or a graceful rebuild in production).
 */

import { Router, Request, Response } from 'express';
import type { NormalizedConfig } from '../../../shared/types/config';
import { NotificationService } from '../services/notification.service';
import authRouter from './auth.routes';
import configRouter from './config.routes';
import { createEntityRouter } from './entity.routes';
import { createCsvRouter } from './csv.routes';

export function createRootRouter(config: NormalizedConfig): Router {
  const router = Router();
  const notificationService = new NotificationService(config);

  // ── Static routes ─────────────────────────────────────────────────────────
  router.use('/auth', authRouter);
  router.use('/config', configRouter);

  // ── Dynamic routes (config-driven) ────────────────────────────────────────
  router.use('/entities', createEntityRouter(config, notificationService));
  router.use('/import', createCsvRouter(config, notificationService));

  // ── SSE endpoint for real-time notifications ───────────────────────────────
  router.get('/notifications/stream', (req: Request, res: Response) => {
    const userId = (req as Request & { user?: { id: string } }).user?.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Nginx: disable buffering
    res.flushHeaders();

    // Send a keepalive comment every 30s
    const keepalive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30_000);

    if (userId) {
      notificationService.addSseClient(userId, res);
    }

    req.on('close', () => {
      clearInterval(keepalive);
      if (userId) notificationService.removeSseClient(userId, res);
    });
  });

  // ── Health check ──────────────────────────────────────────────────────────
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
