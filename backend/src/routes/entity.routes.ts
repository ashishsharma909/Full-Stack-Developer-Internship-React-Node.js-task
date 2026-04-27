/**
 * entity.routes.ts — THE CORE OF THE SYSTEM
 *
 * Dynamically generates CRUD routes for every entity defined in the config.
 * Zero hardcoded entity names or routes. Adding a new entity to the config
 * automatically creates all its endpoints on the next server start.
 *
 * Route pattern: /api/entities/:entityName/*
 * Generated per entity:
 *   GET    /api/entities/:entity          → list (paginated)
 *   GET    /api/entities/:entity/:id      → single record
 *   POST   /api/entities/:entity          → create
 *   PUT    /api/entities/:entity/:id      → update (partial merge)
 *   DELETE /api/entities/:entity/:id      → delete
 */

import { Router, Request, Response, NextFunction } from 'express';
import type { NormalizedConfig } from '../../../shared/types/config';
import { EntityService } from '../services/entity.service';
import { NotificationService } from '../services/notification.service';
import { buildZodSchema } from '../utils/zodSchemaBuilder';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export function createEntityRouter(
  config: NormalizedConfig,
  notificationService: NotificationService,
): Router {
  const router = Router();
  const entityService = new EntityService();

  // Build a lookup map for O(1) entity validation
  const entityMap = new Map(config.entities.map((e) => [e.name, e]));

  // ── Guard middleware: rejects requests for entities not in config ──────────
  router.use('/:entityName', (req: Request, res: Response, next: NextFunction) => {
    if (!entityMap.has(req.params.entityName)) {
      return void res.status(404).json({
        success: false,
        error: `Entity "${req.params.entityName}" is not defined in the current config`,
        code: 'ENTITY_NOT_FOUND',
      });
    }
    next();
  });

  // ── LIST ──────────────────────────────────────────────────────────────────
  router.get('/:entityName', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityName } = req.params;
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10)));

      const result = await entityService.findAll(req.user!.id, entityName, { page, limit });
      res.json({ success: true, data: result.records, meta: result.meta });
    } catch (err) {
      next(err);
    }
  });

  // ── GET ONE ───────────────────────────────────────────────────────────────
  router.get('/:entityName/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await entityService.findOne(req.user!.id, req.params.entityName, req.params.id);
      if (!record) {
        return void res.status(404).json({ success: false, error: 'Record not found', code: 'NOT_FOUND' });
      }
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  });

  // ── CREATE ────────────────────────────────────────────────────────────────
  router.post('/:entityName', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityName } = req.params;
      const entity = entityMap.get(entityName)!;
      const schema = buildZodSchema(entity);

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return void res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        });
      }

      const record = await entityService.create(req.user!.id, entityName, parsed.data as Record<string, unknown>);
      notificationService.fire('record.created', { entity: entityName, record });

      res.status(201).json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────
  router.put('/:entityName/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityName, id } = req.params;
      const entity = entityMap.get(entityName)!;

      // Partial validation — all fields optional for updates
      const partialSchema = buildZodSchema(entity).partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return void res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten(),
        });
      }

      const record = await entityService.update(req.user!.id, entityName, id, parsed.data as Record<string, unknown>);
      if (!record) {
        return void res.status(404).json({ success: false, error: 'Record not found', code: 'NOT_FOUND' });
      }

      notificationService.fire('record.updated', { entity: entityName, record });
      res.json({ success: true, data: record });
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE ────────────────────────────────────────────────────────────────
  router.delete('/:entityName/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityName, id } = req.params;
      const deleted = await entityService.delete(req.user!.id, entityName, id);
      if (!deleted) {
        return void res.status(404).json({ success: false, error: 'Record not found', code: 'NOT_FOUND' });
      }
      notificationService.fire('record.deleted', { entity: entityName, id });
      res.json({ success: true, message: 'Record deleted' });
    } catch (err) {
      next(err);
    }
  });

  logger.info(`Entity routes registered for: ${config.entities.map((e) => e.name).join(', ') || '(none)'}`);

  return router;
}
