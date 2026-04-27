import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { CsvService } from '../services/csv.service';
import { NotificationService } from '../services/notification.service';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import type { NormalizedConfig } from '../../../shared/types/config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'Only CSV files are allowed', 'INVALID_FILE_TYPE'));
    }
  },
});

export function createCsvRouter(config: NormalizedConfig, notificationService: NotificationService): Router {
  const router = Router();
  const csvService = new CsvService();
  const entityNames = new Set(config.entities.map((e) => e.name));

  function validateEntity(req: Request, res: Response, next: NextFunction): void {
    const { entityName } = req.params;
    if (!entityNames.has(entityName)) {
      res.status(404).json({ success: false, error: `Entity "${entityName}" not found in config`, code: 'ENTITY_NOT_FOUND' });
      return;
    }
    next();
  }

  // Step 1 — Upload CSV
  router.post(
    '/:entityName/upload',
    requireAuth,
    validateEntity,
    upload.single('file'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          return void res.status(400).json({ success: false, error: 'No file uploaded', code: 'NO_FILE' });
        }
        const result = await csvService.upload(
          req.user!.id,
          req.params.entityName,
          req.file.buffer,
          req.file.originalname,
        );
        res.status(201).json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    },
  );

  // Step 2 — Set mapping
  router.post('/:entityName/map', requireAuth, validateEntity, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { importId, mapping } = req.body as { importId: string; mapping: Record<string, string> };
      if (!importId || typeof mapping !== 'object') {
        return void res.status(400).json({ success: false, error: 'importId and mapping are required' });
      }
      await csvService.setMapping(req.user!.id, importId, mapping);
      res.json({ success: true, message: 'Mapping saved' });
    } catch (err) {
      next(err);
    }
  });

  // Step 3 — Confirm import
  router.post('/:entityName/confirm', requireAuth, validateEntity, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { importId } = req.body as { importId: string };
      if (!importId) {
        return void res.status(400).json({ success: false, error: 'importId is required' });
      }
      const result = await csvService.confirm(req.user!.id, importId, config);
      notificationService.fire('csv.imported', { entity: req.params.entityName, ...result });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
