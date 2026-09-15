import fs from "node:fs";
import path from "node:path";
import { CONFIG_FILE, ROOT } from "./paths.js";

const DEFAULTS = {
  business: { name: "", what: "", audience: "", url: "", voice: "direct, plain, no hype" },
  defaults: { model: "claude-opus-5", effort: "high" },
  enabled: [],
  vars: {},
};

/**
 * Loads .env into process.env without a dependency. Existing env vars win, so a
 * real shell export always beats the file.
 */
export function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function configExists() {
  return fs.existsSync(CONFIG_FILE);
}

export function loadConfig() {
  if (!configExists()) {
    throw new Error("No ecosystem configured yet. Run: node cli.js setup");
  }
  const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  return {
    ...DEFAULTS,
    ...parsed,
    business: { ...DEFAULTS.business, ...(parsed.business || {}) },
    defaults: { ...DEFAULTS.defaults, ...(parsed.defaults || {}) },
  };
}

export function saveConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
  return CONFIG_FILE;
}

export function blankConfig() {
  return structuredClone(DEFAULTS);
}
