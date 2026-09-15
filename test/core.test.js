import { test } from "node:test";
import assert from "node:assert/strict";
import { render, placeholdersIn } from "../core/template.js";
import { loadAgents } from "../core/registry.js";
import { intervalMinutes, nextRunAt } from "../core/scheduler.js";
import { estimateCost } from "../core/pricing.js";

test("render fills nested placeholders", () => {
  const out = render("Hi {{business.name}} in {{territory}}", {
    business: { name: "Acme" },
    territory: "Philly",
  });
  assert.equal(out, "Hi Acme in Philly");
});

test("render blanks unknown placeholders instead of leaking braces", () => {
  assert.equal(render("a {{nope}} b", {}), "a  b");
  assert.equal(render("{{a.b.c}}", { a: null }), "");
});

test("placeholdersIn finds every key once", () => {
  assert.deepEqual(placeholdersIn("{{a}} {{b.c}} {{a}}").sort(), ["a", "b.c"]);
});

test("every shipped agent is valid and renders with no leftover placeholders", () => {
  const agents = loadAgents();
  assert.ok(agents.length >= 14, "expected at least 14 agents");

  const context = {
    business: { name: "N", what: "W", audience: "A", voice: "V", url: "U" },
    date: "2026-01-01",
    time: "08:00",
    agent: { id: "x", name: "X" },
  };
  for (const agent of agents) {
    // Each agent's declared inputs stand in for what setup/run would collect.
    for (const field of agent.inputs || []) context[field.key] = `<${field.key}>`;

    for (const field of ["prompt", "system"]) {
      const rendered = render(agent[field] || "", context);
      assert.ok(
        !rendered.includes("{{"),
        `${agent.id}.${field} has an unfilled placeholder: ${placeholdersIn(agent[field])}`
      );
    }
    assert.ok(agent.output?.filename, `${agent.id} has no output filename`);
  }
});

test("scheduled agents only require inputs that setup can pre-answer", () => {
  for (const agent of loadAgents()) {
    if (intervalMinutes(agent.schedule) == null) continue;
    for (const field of agent.inputs || []) {
      assert.ok(field.label, `${agent.id} input ${field.key} needs a label for the setup prompt`);
    }
  }
});

test("schedule intervals", () => {
  assert.equal(intervalMinutes(null), null);
  assert.equal(intervalMinutes({ everyMinutes: 30 }), 30);
  assert.equal(intervalMinutes({ everyHours: 6 }), 360);
  assert.equal(intervalMinutes({ dailyAt: "08:00" }), 1440);
});

test("dailyAt schedules to the next occurrence, never the past", () => {
  const now = new Date("2026-09-15T12:00:00");
  const next = nextRunAt({ dailyAt: "08:00" }, null, now);
  assert.ok(next > now);
  assert.equal(next.getHours(), 8);
  assert.equal(next.getDate(), 16, "08:00 has passed, so it should be tomorrow");

  const early = nextRunAt({ dailyAt: "18:00" }, null, now);
  assert.equal(early.getDate(), 15, "18:00 is still ahead today");
});

test("cost estimate counts cached reads as input", () => {
  const cost = estimateCost("claude-opus-5", {
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
  });
  assert.equal(cost, 30); // $5 in + $25 out
  assert.equal(estimateCost("unknown-model", { input_tokens: 999 }), 0);
});

test("scheduler fires an agent whose time has passed, then reschedules it", async () => {
  const { startScheduler } = await import("../core/scheduler.js");
  const agent = {
    id: "test-fire",
    name: "Test Fire",
    schedule: { everyMinutes: 60 },
    prompt: "say hello for {{business.name}}",
    output: { filename: "test-fire.md" },
  };
  const config = {
    business: { name: "Fixture Co" },
    defaults: { model: "claude-opus-5", effort: "high" },
    vars: {},
  };

  const handle = startScheduler({
    agents: [agent],
    config,
    client: null,
    dryRun: true, // no API call, no spend
    log: () => {},
  });

  // A fresh scheduler deliberately waits a full interval before the first run,
  // so backdate the due time to exercise the firing path.
  const firstDue = handle.due.get("test-fire");
  assert.ok(firstDue > new Date(), "should not fire immediately on start");

  handle.due.set("test-fire", new Date(Date.now() - 1000));
  await handle.tick();

  const after = handle.due.get("test-fire");
  assert.ok(after > new Date(), "should be rescheduled into the future after firing");
  handle.stop();

  const { readRuns } = await import("../core/store.js");
  const run = readRuns({ limit: 5, agentId: "test-fire" })[0];
  assert.ok(run, "the run should have been recorded");
  assert.equal(run.status, "ok");
  assert.equal(run.trigger, "schedule");
  assert.match(run.preview, /Fixture Co/, "business context should reach the prompt");
});
