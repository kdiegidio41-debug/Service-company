import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const AGENTS_DIR = path.join(ROOT, "agents");
export const PACKS_DIR = path.join(AGENTS_DIR, "packs");
export const CONFIG_FILE = path.join(ROOT, "config", "ecosystem.json");
export const DATA_DIR = path.join(ROOT, "data");
export const RUNS_FILE = path.join(DATA_DIR, "runs.jsonl");
export const ARTIFACTS_DIR = path.join(DATA_DIR, "artifacts");

export function ensureDataDirs() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}
