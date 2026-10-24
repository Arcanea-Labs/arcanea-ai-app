import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load all schemas
const SCHEMA_V1_PATH = path.join(
  ROOT,
  "schemas/release-manifest/arcanea.release_manifest.v1.schema.json",
);
const SCHEMA_V2_PATH = path.join(
  ROOT,
  "schemas/release-manifest/arcanea.release_manifest.v2.schema.json",
);

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

const schemas = {
  "arcanea.release_manifest.v1": readJson(SCHEMA_V1_PATH),
  "arcanea.release_manifest.v2": readJson(SCHEMA_V2_PATH)
};

function typeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object")
    return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function inspect(value, schemaNode, path) {
  const errors = [];
  if (Object.hasOwn(schemaNode, "const")) {
    if (JSON.stringify(value) !== JSON.stringify(schemaNode.const)) {
      errors.push(`${path}: must equal ${JSON.stringify(schemaNode.const)}`);
    }
  }
  if (schemaNode.enum && !schemaNode.enum.some((item) => item === value)) {
    errors.push(`${path}: must be one of ${schemaNode.enum.join(", ")}`);
  }
  if (schemaNode.type) {
    const types = Array.isArray(schemaNode.type)
      ? schemaNode.type
      : [schemaNode.type];
    if (!types.some((type) => typeMatches(value, type))) {
      errors.push(`${path}: expected ${types.join(" or ")}`);
      return errors;
    }
  }
  if (typeof value === "string") {
    if (
      schemaNode.minLength !== undefined &&
      value.length < schemaNode.minLength
    ) {
      errors.push(`${path}: shorter than ${schemaNode.minLength}`);
    }
  }
  if (Array.isArray(value)) {
    if (schemaNode.items) {
      for (let i = 0; i < value.length; i++) {
        errors.push(...inspect(value[i], schemaNode.items, `${path}[${i}]`));
      }
    }
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schemaNode.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: required`);
    }
    if (schemaNode.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(schemaNode.properties ?? {}, key)) {
          errors.push(`${path}.${key}: additional property`);
        }
      }
    }
    for (const [key, childSchema] of Object.entries(
      schemaNode.properties ?? {},
    )) {
      if (Object.hasOwn(value, key)) {
        errors.push(...inspect(value[key], childSchema, `${path}.${key}`));
      }
    }
  }
  return errors;
}

export function validateReleaseManifest(value, label = "manifest") {
  if (!value || typeof value !== 'object') {
    throw new Error(`Validation failed for ${label}:\n- manifest must be an object`);
  }

  const schemaVersion = value.schema;
  const schema = schemas[schemaVersion];

  if (!schema) {
    throw new Error(`Validation failed for ${label}:\n- unsupported schema version: ${schemaVersion}`);
  }

  const errors = inspect(value, schema, label);
  if (errors.length > 0) {
    throw new Error(
      `Validation failed for ${label}:\n- ${errors.join("\n- ")}`,
    );
  }
  return {
    valid: true,
    timestamp: new Date().toISOString(),
    data: value
  };
}

// Ensure the schemas are superficially valid json schema
for (const schema of Object.values(schemas)) {
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error(`Schema declaration is incomplete`);
  }
}
