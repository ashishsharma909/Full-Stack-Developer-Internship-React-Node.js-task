/**
 * configValidator.ts
 *
 * Validates a raw config object against the JSON Schema definition.
 * Returns structured validation errors instead of throwing,
 * so callers can decide how to handle partial/invalid configs.
 *
 * Uses AJV (Another JSON Validator) for fast, spec-compliant validation.
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { AppConfig } from '../../../shared/types/config';

// ─── JSON Schema for AppConfig ────────────────────────────────────────────────
// We use a permissive schema — additional properties are allowed at every level.
// The goal is to catch genuinely wrong structures, not enforce strict compliance.

const CONFIG_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    app: {
      type: 'object',
      additionalProperties: true,
      properties: {
        name: { type: 'string' },
        language: { type: 'string' },
        description: { type: 'string' },
        theme: { type: 'string', enum: ['light', 'dark'] },
        version: { type: 'string' },
      },
    },
    entities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          label: { type: 'string' },
          description: { type: 'string' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
              required: ['name', 'type'],
              properties: {
                name: { type: 'string', minLength: 1 },
                type: { type: 'string' },
                label: { type: 'string' },
                required: { type: 'boolean' },
                options: { type: 'array', items: { type: 'string' } },
                placeholder: { type: 'string' },
              },
            },
          },
        },
      },
    },
    views: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        required: ['entity', 'type'],
        properties: {
          entity: { type: 'string' },
          type: { type: 'string' },
          label: { type: 'string' },
          columns: { type: 'array', items: { type: 'string' } },
          fields: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    labels: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    },
    events: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        required: ['trigger', 'action'],
        properties: {
          trigger: { type: 'string' },
          action: { type: 'string' },
          message: { type: 'string' },
          template: { type: 'string' },
        },
      },
    },
  },
};

// ─── Singleton validator ───────────────────────────────────────────────────────

let _validate: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!_validate) {
    const ajv = new Ajv({ allErrors: true, coerceTypes: false });
    addFormats(ajv);
    _validate = ajv.compile(CONFIG_SCHEMA);
  }
  return _validate;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateConfig(raw: unknown): ValidationResult {
  // Not even an object
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ['Config must be a JSON object'] };
  }

  const validate = getValidator();
  const ok = validate(raw) as boolean;

  if (ok) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || '(root)'} ${e.message}`,
  );

  return { valid: false, errors };
}
