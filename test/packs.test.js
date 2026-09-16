import { test } from "node:test";
import assert from "node:assert/strict";
import { listPacks, loadPackAgents, loadAgents } from "../core/registry.js";
import { render, placeholdersIn } from "../core/template.js";

const context = (agent) => {
  const ctx = {
    business: { name: "N", what: "W", audience: "A", voice: "V", url: "U" },
    date: "2026-01-01",
    time: "08:00",
    agent: { id: agent.id, name: agent.name },
  };
  for (const field of agent.inputs || []) ctx[field.key] = `<${field.key}>`;
  return ctx;
};

test("packs are discovered and every spec in them is valid", () => {
  const packs = listPacks();
  assert.ok(packs.length >= 2, "expected at least the service and trading packs");
  for (const pack of packs) {
    assert.ok(pack.agents.length > 0, `pack "${pack.name}" is empty`);
    for (const agent of pack.agents) {
      for (const field of ["prompt", "system"]) {
        const out = render(agent[field] || "", context(agent));
        assert.ok(
          !out.includes("{{"),
          `${pack.name}/${agent.id}.${field} left a placeholder: ${placeholdersIn(agent[field])}`
        );
      }
      assert.ok(agent.output?.filename, `${pack.name}/${agent.id} has no output filename`);
    }
  }
});

test("packs ship inactive -- none of their ids leak into the active library", () => {
  const active = new Set(loadAgents().map((a) => a.id));
  for (const pack of listPacks()) {
    for (const agent of pack.agents) {
      assert.ok(
        !active.has(agent.id),
        `${agent.id} is in pack "${pack.name}" but also active in agents/`
      );
    }
  }
});

test("every trading agent carries the research-only guardrails", () => {
  const agents = loadPackAgents("trading");
  assert.equal(agents.length, 8);

  for (const agent of agents) {
    const system = agent.system;
    assert.match(system, /not\s+personalized\s+investment\s+advice/i, `${agent.id} is missing the advice disclaimer`);
    assert.match(system, /Never\s+tell\s+the\s+user\s+to\s+buy,\s+sell,\s+or\s+hold/i, `${agent.id} is missing the no-recommendation rule`);
    assert.match(system, /NEEDS:/, `${agent.id} is missing the no-fabricated-figures rule`);

    // The disclaimer has to survive templating, or it never reaches the reader.
    const rendered = render(system, context(agent));
    assert.match(
      rendered.replace(/\s+/g, " "),
      /Research only, generated 2026-01-01\. Not investment advice\./
    );
  }
});

test("no trading agent asks the model to place an order or predict a price", () => {
  for (const agent of loadPackAgents("trading")) {
    const text = `${agent.prompt} ${agent.description}`;
    assert.doesNotMatch(text, /\b(place|execute|submit) (a |the )?(trade|order)\b/i, `${agent.id} looks like it executes trades`);
    assert.doesNotMatch(text, /\bprice target\b(?! *,? *(or|and) *a? *recommendation)/i, `${agent.id} mentions a price target outside a prohibition`);
  }
});

test("every betting agent carries the responsible-gambling guardrails", () => {
  const agents = loadPackAgents("betting");
  assert.equal(agents.length, 8);

  for (const agent of agents) {
    // Normalize wrapping so an assertion isn't defeated by a line break.
    const system = agent.system.replace(/\s+/g, " ");

    assert.match(system, /Never call anything a lock, a guarantee, free money, or a sure thing/i,
      `${agent.id} is missing the no-guarantee rule`);
    assert.match(system, /Never encourage chasing losses/i,
      `${agent.id} is missing the no-chasing rule`);
    assert.match(system, /never suggest automating wagers/i,
      `${agent.id} is missing the no-automated-wagering rule`);
    assert.match(system, /NEEDS:/,
      `${agent.id} is missing the no-fabricated-figures rule`);
    assert.match(system, /You do not know their finances/i,
      `${agent.id} is missing the no-assumed-finances rule`);

    // Both closing lines must survive templating or they never reach the reader.
    const rendered = render(agent.system, context(agent)).replace(/\s+/g, " ");
    assert.match(rendered, /Research and math only, generated 2026-01-01\. Not a guarantee; every bet can lose\./,
      `${agent.id} loses its disclaimer when rendered`);
    assert.match(rendered, /National Problem Gambling Helpline is 1-800-GAMBLER/,
      `${agent.id} loses the helpline when rendered`);
  }
});

test("no betting agent sells picks or promises a winner", () => {
  for (const agent of loadPackAgents("betting")) {
    const text = `${agent.prompt} ${agent.description}`.replace(/\s+/g, " ");
    assert.doesNotMatch(text, /\bguaranteed\b/i, `${agent.id} uses "guaranteed"`);
    assert.doesNotMatch(text, /\b(best|top|winning) (pick|bet)s?\b/i, `${agent.id} reads like a picks service`);
    assert.doesNotMatch(text, /\b(place|submit|auto-?place) (a |the )?(bet|wager)\b/i,
      `${agent.id} looks like it places wagers`);
  }
});
