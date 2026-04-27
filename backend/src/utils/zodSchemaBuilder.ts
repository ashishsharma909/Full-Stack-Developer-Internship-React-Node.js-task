/**
 * zodSchemaBuilder.ts
 *
 * Converts config FieldDefinition[] into a Zod object schema at runtime.
 * This is the validation backbone of the dynamic API layer —
 * no entity schemas are hardcoded anywhere.
 *
 * Unknown field types fall back to z.unknown() so the system
 * never crashes on new or misspelled types.
 */

import { z, ZodTypeAny } from 'zod';
import type { EntityDefinition, FieldDefinition } from '../../../shared/types/config';

function buildFieldSchema(field: FieldDefinition): ZodTypeAny {
  let schema: ZodTypeAny;

  try {
    switch (field.type) {
      case 'string':
      case 'text':
      case 'url': {
        let s = z.string();
        if (field.type === 'url') s = s.url('Must be a valid URL');
        if (field.validation?.min) s = s.min(field.validation.min);
        if (field.validation?.max) s = s.max(field.validation.max);
        if (field.validation?.pattern) s = s.regex(new RegExp(field.validation.pattern));
        schema = s;
        break;
      }

      case 'email':
        schema = z.string().email('Must be a valid email address');
        break;

      case 'number': {
        let n = z.number();
        if (field.validation?.min !== undefined) n = n.min(field.validation.min);
        if (field.validation?.max !== undefined) n = n.max(field.validation.max);
        schema = n;
        break;
      }

      case 'boolean':
        schema = z.boolean();
        break;

      case 'date':
        // Accept ISO date strings from the frontend
        schema = z.string().refine(
          (v) => !isNaN(Date.parse(v)),
          { message: 'Must be a valid date string' },
        );
        break;

      case 'enum':
        if (field.options && field.options.length > 0) {
          schema = z.enum(field.options as [string, ...string[]]);
        } else {
          // Misconfigured enum — accept any string as fallback
          schema = z.string();
        }
        break;

      default:
        // Unknown field type — accept anything. System must not crash.
        schema = z.unknown();
    }
  } catch {
    // If anything goes wrong building the schema, fall back safely
    schema = z.unknown();
  }

  // Make optional unless explicitly required
  return field.required ? schema : schema.optional().nullable();
}

/**
 * Returns a Zod object schema for the given entity.
 * Safe to call even if entity.fields is missing/empty.
 */
export function buildZodSchema(
  entity: EntityDefinition,
): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of entity.fields ?? []) {
    if (!field.name) continue; // skip malformed field definitions
    shape[field.name] = buildFieldSchema(field);
  }

  return z.object(shape);
}
