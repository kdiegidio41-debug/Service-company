import fs from "node:fs";
import path from "node:path";
import { ARTIFACTS_DIR, RUNS_FILE, ensureDataDirs } from "./paths.js";

/** Appends one run record. JSONL so a crash mid-write costs one line, not the log. */
export function recordRun(run) {
  ensureDataDirs();
  fs.appendFileSync(RUNS_FILE, JSON.stringify(run) + "\n");
  return run;
}

/** Most recent runs first. Unparseable lines are skipped rather than fatal. */
export function readRuns({ limit = 100, agentId = null } = {}) {
  if (!fs.existsSync(RUNS_FILE)) return [];
  const runs = [];
  for (const line of fs.readFileSync(RUNS_FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      runs.push(JSON.parse(line));
    } catch {
      // skip a torn line
    }
  }
  return runs
    .filter((r) => !agentId || r.agentId === agentId)
    .reverse()
    .slice(0, limit);
}

export function saveArtifact(filename, contents) {
  ensureDataDirs();
  const safe = filename.replace(/[^\w.-]/g, "_");
  const file = path.join(ARTIFACTS_DIR, safe);
  fs.writeFileSync(file, contents);
  return file;
}

export function readArtifact(filename) {
  const safe = path.basename(filename);
  const file = path.join(ARTIFACTS_DIR, safe);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

/** Rolled-up numbers for the dashboard header. */
export function stats() {
  const runs = readRuns({ limit: 5000 });
  const ok = runs.filter((r) => r.status === "ok");
  return {
    total: runs.length,
    ok: ok.length,
    failed: runs.filter((r) => r.status === "error").length,
    inputTokens: runs.reduce((n, r) => n + (r.usage?.input_tokens || 0), 0),
    outputTokens: runs.reduce((n, r) => n + (r.usage?.output_tokens || 0), 0),
    costUsd: Number(runs.reduce((n, r) => n + (r.costUsd || 0), 0).toFixed(4)),
    lastRunAt: runs[0]?.finishedAt || null,
  };
}
