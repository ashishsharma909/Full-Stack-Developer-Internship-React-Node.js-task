/**
 * configEngine.ts — Client-side config helpers
 *
 * These are pure utility functions that operate on a NormalizedConfig object.
 * They are used by hooks and components to extract derived data from the config
 * without coupling components to the raw config shape.
 */

import type {
  NormalizedConfig,
  EntityDefinition,
  ViewDefinition,
  FieldDefinition,
} from '../types';

/** Find entity by name. Returns undefined gracefully. */
export function getEntity(config: NormalizedConfig, name: string): EntityDefinition | undefined {
  return config.entities.find((e) => e.name === name);
}

/** Find views for an entity */
export function getViewsForEntity(config: NormalizedConfig, entityName: string): ViewDefinition[] {
  return config.views.filter((v) => v.entity === entityName);
}

/** Get all views of a specific type (e.g., all 'table' views) */
export function getViewsByType(config: NormalizedConfig, type: string): ViewDefinition[] {
  return config.views.filter((v) => v.type === type);
}

/** Get a specific view for an entity+type combo */
export function getView(
  config: NormalizedConfig,
  entityName: string,
  viewType: string,
): ViewDefinition | undefined {
  return config.views.find((v) => v.entity === entityName && v.type === viewType);
}

/**
 * Get the field definitions to render for a view.
 * If the view specifies a `fields` subset, return only those fields in order.
 * Otherwise return all entity fields.
 */
export function getViewFields(
  config: NormalizedConfig,
  entityName: string,
  viewType: string,
): FieldDefinition[] {
  const entity = getEntity(config, entityName);
  const view = getView(config, entityName, viewType);

  if (!entity) return [];

  const fieldNames = view?.fields ?? view?.columns;
  if (!fieldNames || fieldNames.length === 0) return entity.fields;

  return fieldNames
    .map((name) => entity.fields.find((f) => f.name === name))
    .filter((f): f is FieldDefinition => f !== undefined);
}

/** Resolve a label from the labels map, falling back to the key itself */
export function resolveLabel(
  config: NormalizedConfig,
  locale: string,
  key: string,
): string {
  return config.labels[locale]?.[key] ?? config.labels['en']?.[key] ?? key;
}

/** Check whether an entity exists in the config */
export function entityExists(config: NormalizedConfig, name: string): boolean {
  return config.entities.some((e) => e.name === name);
}
