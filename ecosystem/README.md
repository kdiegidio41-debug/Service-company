# The Steading

**An AI agent ecosystem, mapped as a working farm.**

Eight zones, thirty-eight stations, forty-eight roles, fifty-three tasks, and the wiring between them —
designed as one system, described in one file, and drawn five different ways.

> **Status: earning.** 15 working agents in `.claude/agents/` cover 27 of the 54 roles, running in Claude
> Code **with no API key** — see [docs/08-AGENTS.md](docs/08-AGENTS.md). The Market is the only zone that
> faces a customer; [docs/09-MARKET.md](docs/09-MARKET.md) is the playbook for turning it into money. The
> remaining roles are charters, deliberately: building an agent before there is work for it buys complexity
> and no capability.

---

## Open the map

**Live:** https://claude.ai/artifact/CHCKVVTi3xGeXTgocxP5qU

Or locally — no server, no build step, no dependencies:

```bash
open map/steading-map.html        # macOS
```

Five views of the same farm, switchable in the top bar:

| View | What it is |
| --- | --- |
| **Homestead** | Isometric, built in three dimensions, lit from the north-west. The one to look at first. |
| **Blueprint** | Issued drawing. Dimensioned, hatched, title-blocked. |
| **Almanac** | Surveyor's estate plan, inked on laid paper. |
| **Night Watch** | Live operations display. Channels animate along their routes. |
| **Editorial** | The clean one. Built for a deck or a wall. |

Click any building for its purpose, the roles stationed there, and the tasks that happen there. Click open
ground inside a boundary for the zone. **Roster** lists all forty-eight roles at once. **Channels** overlays
the wiring — what moves between stations and what kind of thing it is.

Drag to pan, scroll to zoom, `⌂` to reset.

---

## The eight zones

| Zone | Domain | What it owns | Stations | Roles |
| --- | --- | --- | --- | --- |
| **The Farmhouse** | Orchestration | Intake, planning, decomposition, routing, the work ledger | 5 | 7 |
| **The Fields** | Execution | Generation, extraction, reduction, recovery — in parallel rows | 7 | 8 |
| **The Barn** | Long-running & stateful | Durable sessions, scheduled work, supervision, health | 5 | 5 |
| **The Silo Row** | Memory & knowledge | Working, episodic, semantic and procedural memory; retention | 5 | 6 |
| **The Toolshed** | Tools & integrations | Tool building, schemas, the registry, scoped toolbelts | 4 | 5 |
| **The Greenhouse** | R&D and evaluation | Prompt design, eval sets, grading, shadow runs, staged rollout | 4 | 6 |
| **The Watchtower** | Observability | Traces, cost, forecasting, alerting, quality reporting | 4 | 5 |
| **The Gatehouse** | Security & the outside world | Identity, scope, sandboxing, outbound inspection, delivery | 4 | 6 |
| **The Market** | Finding and winning work | Prospecting, qualifying, the diagnostic, outreach, pricing, retention | 4 | 6 |

Each zone carries a `failsWhen` — the specific way it degrades. That field is required by the schema, because
a zone nobody can describe the failure of is not understood yet.

---

## The five rules the design rests on

1. **Work is handed out, never self-assigned.** If it is not on the Chore Board, it is not happening.
2. **Rows are independent, or it isn't a field.** The moment one row needs another's output, you built a queue
   and paid for a field.
3. **The orchestrator must not hold every worker's context.** Past ~4 concurrent workers it runs out of room
   to think — that is why the Row Boss exists.
4. **Four memories, kept apart.** The episode log is append-only and is not a vector store.
5. **The fence is enforced at the platform, never in a prompt.** An instruction is a preference; a firewall
   rule is a boundary.

The evidence behind each is in [docs/00-RESEARCH.md](docs/00-RESEARCH.md); the reasoning is in
[docs/01-ARCHITECTURE.md](docs/01-ARCHITECTURE.md).

---

## What's here

```
ecosystem/
├── world/
│   ├── farm.world.json          ← the single source of truth. Everything else is generated from it.
│   ├── starship.theme.json      ← a name overlay: same system, rendered as a ship
│   └── schema/world.schema.json
├── map/
│   ├── steading-map.html        ← built, self-contained, double-clickable
│   └── src/                     ← geometry, the plan-view engine, five style configs, the app shell
├── docs/
│   ├── 00-RESEARCH.md           What the field actually knows, with sources
│   ├── 01-ARCHITECTURE.md       The layers and the five rules
│   ├── 02-PROTOCOL.md           The chore record, states, envelopes, spans
│   ├── 03-ROSTER.md             All 48 roles                      (generated)
│   ├── 04-STATIONS.md           All 38 stations and 53 tasks      (generated)
│   ├── 05-BUILD-ORDER.md        What to build next, in order
│   ├── 06-THEMES.md             Farm ↔ ship, and writing your own
│   └── 07-GLOSSARY.md           Farm word → engineering word      (generated)
└── tools/
    ├── validate.mjs             referential integrity + escalation cycles
    ├── build-map.mjs            world → one self-contained page
    ├── build-docs.mjs           world → the generated reference docs
    └── apply-theme.mjs          swap the name overlay
```

Node 18+. No dependencies, no install step.

```bash
node tools/validate.mjs             # check the world model
node tools/build-map.mjs            # rebuild map/steading-map.html
node tools/build-docs.mjs           # rebuild the generated docs
node tools/apply-theme.mjs starship # rename everything to the ship theme
node tools/apply-theme.mjs farm     # back to default
```

**`world/farm.world.json` is the only file to edit by hand.** Change it, run `validate`, then the two build
steps. The map and the docs cannot drift from each other because neither is written by hand.

---

## The working crew

Twelve agents in `.claude/agents/`, covering 24 roles. No API key needed — they run in Claude Code now.

```
farmer      plan and route            scarecrow   screen untrusted input
row-boss    run a batch in parallel   inspector   check before anything ships
field-hand  do one specced unit       chronicler  record and recall
gleaner     recover what failed       grader      judge against a standard
smith       build a missing tool      grafter     tune the farm itself
watchman    what actually happened    sheepdog    is this still on task
```

Work runs on a real ledger — `node tools/farm.mjs help`. Illegal state transitions are refused, not
warned about. Full guide: [docs/08-AGENTS.md](docs/08-AGENTS.md).

**Still unstaffed, on purpose:** the Gatehouse crew (nothing is exposed yet), the Barn crew (nothing runs
across days yet), and the Toolshed curators (barely any tools to curate). `docs/08-AGENTS.md` says when
each becomes worth building.

---

## Branches

The base lives on `claude/jolly-ride-d85fgj`. Each zone also has its own branch, carrying the full base plus a
deep-dive charter for that zone alone — so work on one zone can proceed without touching the others.

| Zone | Branch |
| --- | --- |
| The Farmhouse | `claude/steading-farmhouse` |
| The Fields | `claude/steading-fields` |
| The Barn | `claude/steading-barn` |
| The Silo Row | `claude/steading-silo` |
| The Toolshed | `claude/steading-toolshed` |
| The Greenhouse | `claude/steading-greenhouse` |
| The Watchtower | `claude/steading-watchtower` |
| The Gatehouse | `claude/steading-gatehouse` |

---

## A note on the metaphor

It is doing real work, not decoration. It forces every concept to have **one location and one owner**, and it
makes the org chart legible at a glance. If you cannot say where a new capability lives on the farm, you do not
yet understand what it is.

If it ever starts *deciding* architecture instead of *describing* it, drop it. That is why the theme system
exists: [docs/06-THEMES.md](docs/06-THEMES.md).
