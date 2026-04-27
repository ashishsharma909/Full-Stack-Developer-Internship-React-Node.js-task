/**
 * configLoader.ts
 *
 * Loads the JSON config from disk. On any error (file missing, invalid JSON,
 * etc.) it returns a safe empty config so the system keeps running.
 *
 * The loaded config is cached in memory. Call `reloadConfig()` to hot-reload.
 */

import fs from 'fs';
import path from 'path';
import type { AppConfig } from '../../../shared/types/config';
import { logger } from '../utils/logger';

const CONFIG_PATH = process.env.CONFIG_PATH
  ? path.resolve(process.env.CONFIG_PATH)
  : path.resolve(__dirname, '../../../config/app.config.json');

// In-memory config cache
let cachedConfig: AppConfig | null = null;

function readConfigFromDisk(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      logger.warn(`Config file not found at ${CONFIG_PATH}. Using empty config.`);
      return {};
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');

    try {
      const parsed = JSON.parse(raw) as AppConfig;
      logger.info(`Config loaded from ${CONFIG_PATH}`);
      return parsed;
    } catch (parseErr) {
      logger.error('Config file contains invalid JSON. Using empty config.', { error: parseErr });
      return {};
    }
  } catch (err) {
    logger.error('Failed to read config file. Using empty config.', { error: err });
    return {};
  }
}

export function loadConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = readConfigFromDisk();
  }
  return cachedConfig;
}

export function reloadConfig(): AppConfig {
  cachedConfig = readConfigFromDisk();
  return cachedConfig;
}

export function updateConfig(newConfig: AppConfig): void {
  cachedConfig = newConfig;
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    logger.info('Config written to disk');
  } catch (err) {
    logger.error('Failed to persist config to disk', { error: err });
  }
}
