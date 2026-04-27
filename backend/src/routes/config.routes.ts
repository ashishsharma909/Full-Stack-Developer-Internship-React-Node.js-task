import { Router, Request, Response, NextFunction } from 'express';
import { loadConfig, reloadConfig, updateConfig } from '../config/configLoader';
import { validateConfig } from '../config/configValidator';
import { normalizeConfig } from '../config/configNormalizer';
import { requireAuth } from '../middleware/auth';

const router = Router();

/** GET /api/config — returns the normalized, validated config to the frontend */
router.get('/', (req: Request, res: Response) => {
  const raw = loadConfig();
  const { valid, errors } = validateConfig(raw);
  const normalized = normalizeConfig(raw);

  res.json({
    success: true,
    data: normalized,
    meta: { valid, validationErrors: errors },
  });
});

/** POST /api/config — upload a new config JSON */
router.post('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawConfig = req.body;
    const { valid, errors } = validateConfig(rawConfig);

    if (!valid && errors.length > 0) {
      // Return warnings but still accept — normalizer will heal what it can
      const normalized = normalizeConfig(rawConfig);
      updateConfig(rawConfig);
      return void res.json({
        success: true,
        data: normalized,
        meta: { valid: false, validationErrors: errors, message: 'Config accepted with warnings' },
      });
    }

    const normalized = normalizeConfig(rawConfig);
    updateConfig(rawConfig);
    res.json({ success: true, data: normalized, meta: { valid: true, validationErrors: [] } });
  } catch (err) {
    next(err);
  }
});

/** POST /api/config/reload — reload config from disk */
router.post('/reload', requireAuth, (req: Request, res: Response) => {
  const raw = reloadConfig();
  const normalized = normalizeConfig(raw);
  res.json({ success: true, data: normalized });
});

export default router;
