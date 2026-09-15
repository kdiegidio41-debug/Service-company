import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, configExists, blankConfig } from "../core/config.js";
import { loadAgents, getAgent } from "../core/registry.js";
import { readRuns, stats, readArtifact } from "../core/store.js";
import { runAgent } from "../core/runner.js";
import { makeClient } from "../core/client.js";
import { intervalMinutes, nextRunAt } from "../core/scheduler.js";

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return {};
  }
}

function buildState() {
  const config = configExists() ? loadConfig() : blankConfig();
  const agents = loadAgents().map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    description: a.description,
    tools: a.tools || [],
    schedule: a.schedule,
    inputs: a.inputs || [],
    enabled: config.enabled.includes(a.id),
    nextRunAt:
      config.enabled.includes(a.id) && intervalMinutes(a.schedule) != null
        ? nextRunAt(a.schedule)
        : null,
  }));
  return { configured: configExists(), business: config.business, agents, runs: readRuns({ limit: 60 }), stats: stats() };
}

export function startDashboard({ port = 4317, dryRun = false } = {}) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    try {
      if (url.pathname === "/api/state") return send(res, 200, buildState());

      if (url.pathname === "/api/run" && req.method === "POST") {
        const body = await readBody(req);
        const agent = getAgent(body.agentId);
        const config = loadConfig();
        // A dashboard-launched run may be forced to dry-run per request, which
        // lets someone inspect a prompt without spending anything.
        const dry = dryRun || body.dryRun === true;
        const client = dry ? null : makeClient();
        const result = await runAgent({
          agent,
          config,
          client,
          input: { ...(body.input || {}), __trigger: "dashboard" },
          dryRun: dry,
        });
        return send(res, 200, result);
      }

      if (url.pathname.startsWith("/api/artifact/")) {
        const name = decodeURIComponent(url.pathname.replace("/api/artifact/", ""));
        const contents = readArtifact(name);
        if (contents == null) return send(res, 404, { error: "not found" });
        return send(res, 200, { name, contents });
      }

      // Static files. path.basename keeps the served set flat, so a crafted
      // path cannot climb out of dashboard/public.
      const file = url.pathname === "/" ? "index.html" : path.basename(url.pathname);
      const full = path.join(PUBLIC, file);
      if (fs.existsSync(full)) {
        return send(res, 200, fs.readFileSync(full), TYPES[path.extname(file)] || "text/plain");
      }
      return send(res, 404, { error: "not found" });
    } catch (err) {
      return send(res, 500, { error: err.message });
    }
  });

  server.listen(port, () => {
    console.log(`\n  Mission control: \x1b[1mhttp://localhost:${port}\x1b[0m`);
    if (dryRun) console.log("  \x1b[2mdry-run mode: no API calls, nothing billed\x1b[0m");
    console.log("  \x1b[2mCtrl-C to stop.\x1b[0m\n");
  });
  return server;
}
