import fs from "node:fs";
import path from "node:path";
import { AGENTS_DIR, PACKS_DIR } from "./paths.js";

const REQUIRED = ["id", "name", "description", "prompt"];

function validate(spec, file) {
  for (const field of REQUIRED) {
    if (!spec[field]) throw new Error(`${path.basename(file)}: missing required field "${field}"`);
  }
  if (!/^[a-z0-9-]+$/.test(spec.id)) {
    throw new Error(`${path.basename(file)}: id must be lowercase letters, numbers and dashes`);
  }
  return spec;
}

/** Every agent shipped in agents/, sorted by category then name. */
export function loadAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  const agents = fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith(".agent.json"))
    .map((f) => {
      const file = path.join(AGENTS_DIR, f);
      return validate(JSON.parse(fs.readFileSync(file, "utf8")), file);
    });

  const seen = new Map();
  for (const a of agents) {
    if (seen.has(a.id)) throw new Error(`Duplicate agent id "${a.id}"`);
    seen.set(a.id, a);
  }
  return agents.sort(
    (a, b) =>
      (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name)
  );
}

export function getAgent(id) {
  const agent = loadAgents().find((a) => a.id === id);
  if (!agent) throw new Error(`No agent with id "${id}". Run: node cli.js list`);
  return agent;
}

/**
 * Packs are agent sets that ship inactive. loadAgents() reads only the top
 * level of agents/, so anything under agents/packs/<name>/ stays switched off
 * until it is installed -- which is also how a pack is sold as an add-on.
 */
export function listPacks() {
  if (!fs.existsSync(PACKS_DIR)) return [];
  return fs
    .readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, agents: loadPackAgents(entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function loadPackAgents(pack) {
  const dir = path.join(PACKS_DIR, path.basename(pack));
  if (!fs.existsSync(dir)) throw new Error(`No pack named "${pack}". Run: node cli.js packs`);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".agent.json"))
    .map((f) => validate(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), f))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Copies a pack's specs into agents/ so they load. Existing ids are left
 * alone rather than overwritten -- a buyer may have edited a prompt, and
 * silently replacing their work would be worse than skipping.
 */
export function installPack(pack) {
  const dir = path.join(PACKS_DIR, path.basename(pack));
  const agents = loadPackAgents(pack);
  const installed = [];
  const skipped = [];
  for (const agent of agents) {
    const target = path.join(AGENTS_DIR, `${agent.id}.agent.json`);
    if (fs.existsSync(target)) {
      skipped.push(agent.id);
      continue;
    }
    fs.copyFileSync(path.join(dir, `${agent.id}.agent.json`), target);
    installed.push(agent.id);
  }
  return { installed, skipped };
}
