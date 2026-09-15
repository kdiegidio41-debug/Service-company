#!/usr/bin/env node
import { createPrompter } from "./core/prompt.js";
import { loadEnv, loadConfig, saveConfig, blankConfig, configExists } from "./core/config.js";
import { loadAgents, getAgent } from "./core/registry.js";
import { runAgent } from "./core/runner.js";
import { makeClient } from "./core/client.js";
import { startScheduler, intervalMinutes } from "./core/scheduler.js";
import { readRuns, stats } from "./core/store.js";
import { startDashboard } from "./dashboard/server.js";

loadEnv();

const argv = process.argv.slice(2);
const command = argv[0] || "help";
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.slice(1).filter((a) => !a.startsWith("--"));
const dryRun = flags.has("--dry-run");

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

function describeSchedule(schedule) {
  if (!schedule) return "manual";
  if (schedule.dailyAt) return `daily ${schedule.dailyAt}`;
  if (schedule.everyHours) return schedule.everyHours === 168 ? "weekly" : `every ${schedule.everyHours}h`;
  if (schedule.everyMinutes) return `every ${schedule.everyMinutes}m`;
  return "manual";
}

async function setup() {
  const prompter = createPrompter();
  const ask = (q, fallback = "") =>
    prompter.ask(fallback ? `${q} ${dim(`(${fallback})`)}` : q, fallback);

  const config = configExists() ? loadConfig() : blankConfig();

  console.log(bold("\n  Set up your agent ecosystem\n"));
  console.log(dim("  Answers go into every agent's prompt. Be specific -- vague answers here\n  produce vague output everywhere.\n"));

  config.business.name = await ask("  Business name:", config.business.name);
  config.business.what = await ask("  What does it do?", config.business.what);
  config.business.audience = await ask("  Who are the customers?", config.business.audience);
  config.business.url = await ask("  Website (optional):", config.business.url);
  config.business.voice = await ask("  Writing voice:", config.business.voice);

  const agents = loadAgents();
  console.log(bold("\n  Pick your agents\n"));
  agents.forEach((a, i) => {
    const on = config.enabled.includes(a.id) ? green("on") : dim("off");
    console.log(`  ${String(i + 1).padStart(2)}. ${bold(a.name.padEnd(22))} ${dim(describeSchedule(a.schedule).padEnd(12))} ${on}`);
    console.log(`      ${dim(a.description)}`);
  });

  const picked = await ask(
    `\n  Numbers to enable, comma separated, or ${bold("all")}:`,
    config.enabled.length ? "keep" : "all"
  );
  if (picked === "all") {
    config.enabled = agents.map((a) => a.id);
  } else if (picked !== "keep") {
    config.enabled = picked
      .split(",")
      .map((n) => agents[Number(n.trim()) - 1])
      .filter(Boolean)
      .map((a) => a.id);
  }

  // Scheduled agents run unattended, so their required inputs must be answered
  // now -- there is nobody at the keyboard at 7am to supply them.
  const needsVars = agents.filter(
    (a) => config.enabled.includes(a.id) && intervalMinutes(a.schedule) != null
  );
  const asked = new Set();
  const pending = needsVars.flatMap((a) => (a.inputs || []).filter((i) => i.required));
  if (pending.length) {
    console.log(bold("\n  Standing answers for scheduled agents\n"));
    for (const field of pending) {
      if (asked.has(field.key)) continue;
      asked.add(field.key);
      config.vars[field.key] = await ask(`  ${field.label}:`, config.vars[field.key] || "");
    }
  }

  prompter.close();
  const file = saveConfig(config);
  console.log(green(`\n  Saved ${file}`));
  console.log(`  ${config.enabled.length} agents enabled.\n`);
  console.log("  Next:");
  console.log(`    node cli.js run lead-finder --dry-run   ${dim("# see a prompt, no API call")}`);
  console.log(`    node cli.js dash                        ${dim("# mission control")}`);
  console.log(`    node cli.js start                       ${dim("# run the schedule")}\n`);
}

function list() {
  const config = configExists() ? loadConfig() : blankConfig();
  const agents = loadAgents();
  let category = null;
  console.log("");
  for (const a of agents) {
    if (a.category !== category) {
      category = a.category;
      console.log(bold(`  ${category}`));
    }
    const on = config.enabled.includes(a.id) ? green("on ") : dim("off");
    console.log(`    ${on} ${a.id.padEnd(20)} ${dim(describeSchedule(a.schedule).padEnd(12))} ${a.name}`);
  }
  console.log(dim(`\n  ${agents.length} agents. Enable them with: node cli.js setup\n`));
}

async function run() {
  const id = positional[0];
  if (!id) {
    console.error("Usage: node cli.js run <agent-id> [--dry-run]");
    process.exit(1);
  }
  const config = loadConfig();
  const agent = getAgent(id);

  // Collect any required input the config does not already answer.
  const input_ = {};
  const missing = (agent.inputs || []).filter((f) => f.required && !config.vars[f.key]);
  if (missing.length) {
    const prompter = createPrompter();
    for (const field of missing) {
      input_[field.key] = await prompter.ask(`  ${field.label}:`);
    }
    prompter.close();
  }

  const client = dryRun ? null : makeClient();
  console.log(dim(`\n  running ${agent.name}${dryRun ? " (dry run)" : ""}...`));
  const result = await runAgent({ agent, config, client, input: input_, dryRun });

  if (result.status === "ok") {
    console.log(green(`  done in ${(result.durationMs / 1000).toFixed(1)}s`));
    console.log(`  saved to data/artifacts/${result.artifact}`);
    if (result.costUsd) console.log(dim(`  cost ~$${result.costUsd}`));
    console.log(`\n${result.preview}${result.preview.length >= 400 ? "..." : ""}\n`);
  } else {
    console.log(red(`  failed: ${result.error}\n`));
    process.exitCode = 1;
  }
}

async function start() {
  const config = loadConfig();
  const agents = loadAgents().filter((a) => config.enabled.includes(a.id));
  const client = dryRun ? null : makeClient();
  console.log(bold(`\n  ${config.business.name} -- agent operation running\n`));
  const handle = startScheduler({ agents, config, client, dryRun });
  console.log(dim("\n  Ctrl-C to stop.\n"));
  process.on("SIGINT", () => {
    handle.stop();
    console.log("\n  stopped.\n");
    process.exit(0);
  });
}

function dash() {
  const port = Number(process.env.AGENTOPS_PORT) || 4317;
  startDashboard({ port, dryRun });
}

function recent() {
  const runs = readRuns({ limit: 20 });
  const s = stats();
  console.log(bold(`\n  ${s.total} runs  ${green(`${s.ok} ok`)}  ${s.failed ? red(`${s.failed} failed`) : "0 failed"}  ~$${s.costUsd}\n`));
  for (const r of runs) {
    const mark = r.status === "ok" ? green("ok ") : red("err");
    console.log(`  ${mark} ${r.startedAt.slice(0, 16).replace("T", " ")}  ${r.agentName.padEnd(22)} ${dim(r.error || r.artifact || "")}`);
  }
  console.log("");
}

function help() {
  console.log(`
  ${bold("agentops")} -- your AI agent operation

    node cli.js setup              Configure your ecosystem
    node cli.js list               Show every agent and whether it's on
    node cli.js run <id>           Run one agent now
    node cli.js runs               Recent run history
    node cli.js start              Run the schedule until you stop it
    node cli.js dash               Open mission control in a browser

  ${bold("Flags")}
    --dry-run                      Render the prompt, make no API call, spend nothing
`);
}

const commands = { setup, list, agents: list, run, runs: recent, start, dash, help };
const handler = commands[command];
if (!handler) {
  console.error(`Unknown command "${command}"`);
  help();
  process.exit(1);
}
try {
  await handler();
} catch (err) {
  console.error(red(`\n  ${err.message}\n`));
  process.exit(1);
}
