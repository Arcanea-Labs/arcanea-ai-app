import type { JsonSchema } from './types.js';

/**
 * Strict validator for the JSON-schema subset in types.ts.
 *
 * Enforced keywords: type (including integer and type unions), properties,
 * required, additionalProperties (default false: unknown keys are errors),
 * items, enum, minimum, maximum, minLength. Anything else is ignored.
 * Returns a list of human-readable errors; an empty list means valid.
 */
export function validate(value: unknown, schema: JsonSchema, path = '$'): string[] {
  const errors: string[] = [];

  if (schema.type !== undefined) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!allowed.some((t) => matchesType(value, t))) {
      errors.push(`${path}: expected ${allowed.join(' | ')}, got ${describe(value)}`);
      return errors;
    }
  }

  if (schema.enum !== undefined && !schema.enum.includes(value as string | number | boolean | null)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: ${value} > maximum ${schema.maximum}`);
  }

  if (typeof value === 'string' && schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push(`${path}: string shorter than ${schema.minLength}`);
  }

  if (Array.isArray(value) && schema.items !== undefined) {
    value.forEach((item, i) => errors.push(...validate(item, schema.items as JsonSchema, `${path}[${i}]`)));
  }

  if (isPlainObject(value) && (schema.properties !== undefined || schema.required !== undefined)) {
    const props = schema.properties ?? {};
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: missing required property "${key}"`);
    }
    for (const [key, child] of Object.entries(value)) {
      const childSchema = props[key];
      if (childSchema === undefined) {
        if (schema.additionalProperties !== true) errors.push(`${path}: unexpected property "${key}"`);
        continue;
      }
      errors.push(...validate(child, childSchema, `${path}.${key}`));
    }
  }

  return errors;
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case 'object':
      return isPlainObject(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/* ---------- schema-building shorthands used by the diagnostic modules ---------- */

export const str: JsonSchema = { type: 'string', minLength: 1 };
export const optStr: JsonSchema = { type: 'string' };
export const bool: JsonSchema = { type: 'boolean' };
export const para: JsonSchema = { type: 'integer', minimum: 1, description: '1-indexed paragraph number' };
export const id: JsonSchema = { type: 'string', minLength: 1, description: 'stable id, unique within this output' };

export function obj(properties: Record<string, JsonSchema>, optional: string[] = []): JsonSchema {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties).filter((k) => !optional.includes(k)),
    additionalProperties: false,
  };
}

export function arr(items: JsonSchema): JsonSchema {
  return { type: 'array', items };
}

export function oneOf(values: readonly string[]): JsonSchema {
  return { type: 'string', enum: values };
}
