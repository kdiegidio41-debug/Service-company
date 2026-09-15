import fs from "node:fs";
import path from "node:path";
import { AGENTS_DIR } from "./paths.js";

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
