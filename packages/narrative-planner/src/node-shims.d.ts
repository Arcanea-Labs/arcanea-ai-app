/**
 * Minimal ambient declarations for the few Node built-ins this package uses.
 * The package deliberately has no dependencies (not even @types/node), so the
 * surface is declared here and kept to exactly what the source calls.
 */

declare module "node:fs/promises" {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  export function appendFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare const process: { env: Record<string, string | undefined> };
