/**
 * Checkpoints: the full state of a job after each completed unit, so a run can
 * resume without repeating (or re-paying for) finished work.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { CostReceipt } from "./receipts.js";
import type { StageResult } from "./runner-types.js";

export interface Checkpoint {
  version: 1;
  jobId: string;
  premise: string;
  chapterCount: number;
  /** Unit key ("<stage>:<unit>") -> result. */
  completed: Record<string, StageResult>;
  receipts: CostReceipt[];
  updatedAt: string;
}

export interface CheckpointStore {
  load(jobId: string): Promise<Checkpoint | null>;
  save(checkpoint: Checkpoint): Promise<void>;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class MemoryCheckpointStore implements CheckpointStore {
  private readonly map = new Map<string, string>();
  saves = 0;

  async load(jobId: string): Promise<Checkpoint | null> {
    const s = this.map.get(jobId);
    return s ? (JSON.parse(s) as Checkpoint) : null;
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    this.saves++;
    this.map.set(checkpoint.jobId, JSON.stringify(clone(checkpoint)));
  }
}

const JOB_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function assertSafeJobId(jobId: string): void {
  if (!JOB_ID.test(jobId) || jobId.includes("..")) {
    throw new Error(`invalid jobId "${jobId}": use 1-128 chars of [A-Za-z0-9._-], no "..", not starting with a dot`);
  }
}

/**
 * One JSON file per job, `<dir>/<jobId>.checkpoint.json`. The caller chooses
 * the directory. Writes go to a temp file first and are renamed into place, so
 * an interrupted write never leaves a truncated checkpoint.
 */
export class FileCheckpointStore implements CheckpointStore {
  readonly dir: string;

  constructor(dir: string) {
    if (!dir) throw new TypeError("FileCheckpointStore needs a directory");
    this.dir = resolve(dir);
  }

  pathFor(jobId: string): string {
    assertSafeJobId(jobId);
    return join(this.dir, `${jobId}.checkpoint.json`);
  }

  async load(jobId: string): Promise<Checkpoint | null> {
    const p = this.pathFor(jobId);
    let raw: string;
    try {
      raw = await readFile(p, "utf8");
    } catch (e) {
      if ((e as { code?: string }).code === "ENOENT") return null;
      throw e;
    }
    const cp = JSON.parse(raw) as Checkpoint;
    if (cp.version !== 1 || cp.jobId !== jobId) throw new Error(`checkpoint at ${p} is not a v1 checkpoint for ${jobId}`);
    return cp;
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const p = this.pathFor(checkpoint.jobId);
    await mkdir(this.dir, { recursive: true });
    const tmp = `${p}.tmp`;
    await writeFile(tmp, JSON.stringify(checkpoint, null, 2), "utf8");
    await rename(tmp, p);
  }
}
