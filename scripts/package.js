#!/usr/bin/env node
/**
 * Builds a clean zip to hand a buyer. Deliberately excludes anything that is
 * yours rather than theirs: your API key, your config, your run history, and
 * the git history of how this was built.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT } from "../core/paths.js";

const EXCLUDE = [
  ".git/*", ".git", "node_modules/*", "data/*", ".env",
  "config/ecosystem.json", "dist/*", "archive/*", "scratch/*",
];

const version = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
const dist = path.join(ROOT, "dist");
const name = `agent-ops-v${version}.zip`;
const out = path.join(dist, name);

fs.mkdirSync(dist, { recursive: true });
fs.rmSync(out, { force: true });

try {
  execFileSync("zip", ["-r", "-q", out, ".", "-x", ...EXCLUDE], { cwd: ROOT });
} catch (err) {
  console.error("Packaging needs the `zip` command. Install it, or zip the folder by hand,\nexcluding: " + EXCLUDE.join(", "));
  process.exit(1);
}

// Verify nothing private rode along, because shipping a key is unrecoverable.
const listing = execFileSync("unzip", ["-Z1", out], { encoding: "utf8" }).split("\n");
const leaked = listing.filter(
  (f) => f === ".env" || f.startsWith("data/") || f === "config/ecosystem.json" || f.startsWith("archive/")
);
if (leaked.length) {
  console.error("Refusing to ship. These private files got into the zip:\n  " + leaked.join("\n  "));
  fs.rmSync(out);
  process.exit(1);
}

const size = (fs.statSync(out).size / 1024).toFixed(0);
console.log(`\n  Built dist/${name} (${size} KB, ${listing.filter(Boolean).length} files)`);
console.log(`  Verified: no .env, no config, no run data.\n`);
