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
