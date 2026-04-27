/**
 * configNormalizer.ts
 *
 * Applies defaults to a raw (possibly partial/invalid) AppConfig and returns
 * a NormalizedConfig where all required fields are guaranteed to be present.
 *
 * The normalizer never throws — it heals as much of the config as possible.
 */

import type { AppConfig, NormalizedConfig, EntityDefinition } from '../../../shared/types/config';
import { logger } from '../utils/logger';

const DEFAULT_APP_META = {
  name: 'My App',
  language: 'en',
  description: '',
  theme: 'dark' as const,
  version: '1.0.0',
};

function normalizeEntity(raw: unknown): EntityDefinition | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const e = raw as Record<string, unknown>;

  // An entity without a name is unusable — skip it with a warning
  if (typeof e.name !== 'string' || e.name.trim() === '') {
    logger.warn('Skipping entity with missing or empty name', { entity: e });
    return null;
  }

  const fields = Array.isArray(e.fields)
    ? e.fields
        .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
        .filter((f) => typeof f.name === 'string' && f.name.trim() !== '')
        .map((f) => ({
          name: f.name as string,
          type: typeof f.type === 'string' ? (f.type as EntityDefinition['fields'][number]['type']) : 'string',
          label: typeof f.label === 'string' ? f.label : undefined,
          required: typeof f.required === 'boolean' ? f.required : false,
          options: Array.isArray(f.options) ? f.options.filter((o) => typeof o === 'string') : undefined,
          defaultValue: f.defaultValue,
          placeholder: typeof f.placeholder === 'string' ? f.placeholder : undefined,
          validation: typeof f.validation === 'object' && f.validation !== null
            ? (f.validation as EntityDefinition['fields'][number]['validation'])
            : undefined,
        }))
    : [];

  return {
    name: e.name.trim(),
    label: typeof e.label === 'string' ? e.label : e.name as string,
    description: typeof e.description === 'string' ? e.description : undefined,
    fields,
  };
}

export function normalizeConfig(raw: AppConfig): NormalizedConfig {
  // ── app meta ──
  const rawApp = typeof raw.app === 'object' && raw.app !== null ? raw.app : {};
  const app = {
    name: typeof rawApp.name === 'string' && rawApp.name.trim() ? rawApp.name.trim() : DEFAULT_APP_META.name,
    language: typeof rawApp.language === 'string' ? rawApp.language : DEFAULT_APP_META.language,
    description: typeof rawApp.description === 'string' ? rawApp.description : DEFAULT_APP_META.description,
    theme: rawApp.theme === 'light' || rawApp.theme === 'dark' ? rawApp.theme : DEFAULT_APP_META.theme,
    version: typeof rawApp.version === 'string' ? rawApp.version : DEFAULT_APP_META.version,
  };

  // ── entities ──
  const entities: NormalizedConfig['entities'] = Array.isArray(raw.entities)
    ? raw.entities.map(normalizeEntity).filter((e): e is EntityDefinition => e !== null)
    : [];

  // ── views — drop views that reference non-existent entities ──
  const entityNames = new Set(entities.map((e) => e.name));
  const viewsRaw: unknown[] = Array.isArray(raw.views) ? raw.views : [];
  const views: NormalizedConfig['views'] = viewsRaw
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .filter((v) => {
      if (typeof v.entity !== 'string' || !entityNames.has(v.entity)) {
        logger.warn(`View references unknown entity "${String(v.entity)}" — skipping`);
        return false;
      }
      if (typeof v.type !== 'string') {
        logger.warn(`View missing type field — skipping`);
        return false;
      }
      return true;
    })
    .map((v) => ({
      id: typeof v.id === 'string' ? v.id : `${String(v.entity)}_${String(v.type)}`,
      entity: v.entity as string,
      type: v.type as string,
      label: typeof v.label === 'string' ? v.label : `${String(v.entity)} ${String(v.type)}`,
      columns: Array.isArray(v.columns) ? v.columns.filter((c): c is string => typeof c === 'string') : undefined,
      fields: Array.isArray(v.fields) ? v.fields.filter((f): f is string => typeof f === 'string') : undefined,
    }));

  // ── labels ──
  const labels: NormalizedConfig['labels'] =
    typeof raw.labels === 'object' && raw.labels !== null
      ? (raw.labels as NormalizedConfig['labels'])
      : {};

  // ── events ──
  const eventsRaw: unknown[] = Array.isArray(raw.events) ? raw.events : [];
  const events: NormalizedConfig['events'] = eventsRaw
    .filter((ev): ev is Record<string, unknown> => typeof ev === 'object' && ev !== null)
    .filter((ev) => typeof ev.trigger === 'string' && typeof ev.action === 'string')
    .map((ev) => ({
      trigger: ev.trigger as string,
      action: ev.action as string,
      message: typeof ev.message === 'string' ? ev.message : undefined,
      template: typeof ev.template === 'string' ? ev.template : undefined,
    }));

  return { app, entities, views, labels, events };
}
