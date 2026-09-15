# The crew

Fifteen working agents. They live in `.claude/agents/` and run in Claude Code
**with no API key.** Each embodies one or more roles from
[the roster](03-ROSTER.md) — 27 of the 54 roles are now staffed.

> ### Start a new session to use them
>
> Claude Code reads `.claude/agents/` **at session start.** Agents added during a
> session are not registered until the next one. If you get
> *"Agent type 'farmer' not found"*, that is why — open a fresh session in this
> repo and they will be there.
>
> Everything else here (`farm.mjs`, the board, the docs) works immediately.

---

## Using them

Ask for one by name, or describe the work and let routing pick:

```
"Have the farmer plan this out."
"Send that through the scarecrow first."
"Get the watchman to tell me what actually happened."
```

**For anything multi-step, start with `farmer`.** It writes the plan, cuts the
work into independent chores, and dispatches the rest of the crew. Calling
workers directly is fine when you already know which one you want — and skips
the planning overhead, which is the point.

---

## Who does what

### Orchestration

| Agent | Role | Use it when |
| --- | --- | --- |
| **`farmer`** | The Farmer | Work needs breaking up. The default entry point. |
| **`row-boss`** | The Row Boss | The same treatment applies to many units, and you want one answer back rather than fifty. |

### Execution

| Agent | Roles | Use it when |
| --- | --- | --- |
| **`field-hand`** | Sower, Reaper, Thresher, Plowhand | One concrete specced piece of work. The workhorse. |
| **`gleaner`** | The Gleaner | Something already failed. It retries *differently* and declares permanent failure in writing. |

### Guarding

| Agent | Roles | Use it when |
| --- | --- | --- |
| **`scarecrow`** | The Scarecrow | Input came from outside. Read-only; it reports, never edits. |
| **`inspector`** | The Inspector | Anything is about to leave — shipped, posted, committed. |

### Memory and judgement

| Agent | Roles | Use it when |
| --- | --- | --- |
| **`chronicler`** | Chronicler, Winnower, Water Carrier, Statekeeper | Record what happened, or recall what was decided before. |
| **`grader`** | Grader, Soil Tester | Judge output against a standard, or compare candidates. |

### Finding and winning work — the Market

The only agents that face a customer. Full playbook: [09-MARKET.md](09-MARKET.md).

| Agent | Roles | Use it when |
| --- | --- | --- |
| **`dowser`** | The Dowser | Build a prospect list — local businesses with a *provable* defect, with evidence per row. |
| **`surveyor`** | The Assayer | Audit a prospect and write the report you hand over. Runs `tools/audit.mjs`. |
| **`factor`** | The Factor | Turn the audit into an approach. Leads with the finding, gives it free, asks for the fix. |

> **A human sends the outreach, always.** `factor` writes it; `inspector` checks
> every claim traces to a real finding; you press send. That is not a formality —
> it is what keeps ten pieces of outreach from becoming fifty pieces of spam.

### Keeping the farm running

| Agent | Roles | Use it when |
| --- | --- | --- |
| **`smith`** | Smith, Wright | A script or tool doesn't exist yet and the work has come up three times. |
| **`grafter`** | Grafter, Pruner | An agent keeps getting something wrong, or a new one is needed. |
| **`watchman`** | Watchman, Tally Clerk, Surveyor | You want an honest account of a run. Reads state, never changes it. |
| **`sheepdog`** | Sheepdog, Vet | Work has been going a while and may have wandered off task. |

---

## Model tiers

| Tier | Model | Agents |
| --- | --- | --- |
| Steward / specialist | `claude-opus-5` | `farmer`, `row-boss`, `grader`, `grafter`, `smith`, `factor` |
| Hand | `claude-sonnet-5` | `field-hand`, `gleaner`, `chronicler`, `inspector`, `watchman`, `sheepdog`, `dowser`, `surveyor` |
| Sorter | `claude-haiku-4-5` | `scarecrow` |

Set in each agent's frontmatter. **These are starting points, not conclusions** —
measure before moving one down a tier. A cheaper call that needs three retries is
not cheaper.

---

## The ledger

The protocol in [02-PROTOCOL.md](02-PROTOCOL.md) is real, not aspirational.
`ecosystem/tools/farm.mjs` implements it with no dependencies.

```bash
node ecosystem/tools/farm.mjs goal "Audit the quote form for accessibility" \
  --success "every finding names a file, a line, and the WCAG criterion"

node ecosystem/tools/farm.mjs post "Check keyboard traps" --goal g-0001 \
  --zone fields --role r-reaper --done "every focusable element is reachable and escapable"

node ecosystem/tools/farm.mjs claim ch-0002 --by r-reaper
node ecosystem/tools/farm.mjs start ch-0002
node ecosystem/tools/farm.mjs span --chore ch-0002 --reason "why I did it this way"
node ecosystem/tools/farm.mjs done  ch-0002 --artifact path/to/output

node ecosystem/tools/farm.mjs board --open
node ecosystem/tools/farm.mjs report
```

State lives in `ecosystem/farm/`:

| File | Holds |
| --- | --- |
| `board.json` | Goals and chores, with full transition history |
| `episodes.jsonl` | What happened, in order. Append-only. |
| `facts.jsonl` | What is true, each with a source. A fact with no provenance is a rumour. |
| `traces/*.json` | Spans — what each role saw, and **why it decided what it decided** |

**Illegal state transitions are refused, not logged and allowed.** A chore that is
`DONE` cannot be restarted. A chore that never reached `RUNNING` cannot be `DONE`.
That's the point of having a state machine rather than a status field.

---

## What is still unstaffed

24 roles remain charters. That is a decision, not a backlog:

| Zone | Unstaffed | Why not yet |
| --- | --- | --- |
| **Farmhouse** | Foreman, Ledger Keeper, Dispatcher, Almanac Reader, Scribe, Well Keeper | The `farmer` and `farm.mjs` cover routing and the ledger between them at this scale. Split them out when one becomes a bottleneck. |
| **Barn** | Herdsman, Milkmaid, Stablehand | Nothing runs across days yet. Build these the day something does — and `sheepdog` ships with them, never later. |
| **Toolshed** | Sharpener, Quartermaster, Tractor Driver | There is no tool registry to curate because there are barely any tools. |
| **Gatehouse** | Gatekeeper, Fencewright, Toll Taker, Marketkeeper, Herald | Nothing is exposed to anyone but you. **These go in before the farm is reachable by anyone else.** |
| **Silo** | Granary Keeper, Cellarer | No retention obligations and no prompt library large enough to need a keeper. |
| **Greenhouse** | Nurseryman, Pollinator | Nothing is being promoted to production yet, so there is no gate to hold. |
| **Market** | Appraiser, Auctioneer, Reeve | Qualify, price and retain by hand until there is a pipeline — you learn the trade doing it. [09-MARKET.md](09-MARKET.md) says exactly when each earns its place. |
| **Watchtower** | Weathervane, Bell Ringer | There is no load to forecast and no one to page but you. |

**Building an agent before there is work for it buys complexity and no
capability.** The one standing exception is supervision: anything that can run for
an hour can loop for an hour, so `sheepdog` exists now.

---

## Adding an agent

Ask `grafter`, or write it yourself. **A new agent file needs a fresh session
before it can be invoked** — same reason as above.

```markdown
---
name: kebab-case-name
description: What it does and WHEN TO USE IT. This is the routing signal — write it for whoever is deciding whether to call this agent.
model: opus | sonnet | haiku
tools: Read, Grep, Glob        # omit for full access; restrict deliberately
---

# The Role — Title

Charter, loop, and the rules it does not bend.
```

Then register it against the world model so the map and the roster stay true:

```jsonc
// world/farm.world.json
"roles": [ { "id": "r-x", "agent": "kebab-case-name", ... } ],
"agents": { "kebab-case-name": { "roles": ["r-x"], "file": ".claude/agents/kebab-case-name.md" } }
```

```bash
node tools/validate.mjs     # checks the file exists and the role mapping agrees
node tools/build-docs.mjs
node tools/build-map.mjs
```

The validator will reject an agent whose file is missing, or whose claimed roles
disagree with the roles' own `agent` field. **Argue for fewer agents, not more** —
each one is a routing decision and a chance to pick wrong.


---

## The first run found two bugs

Worth recording, because it is what this crew is for.

The `watchman` charter was tested against a seeded run before anything shipped.
It reported the run correctly — and then found two defects in the farm's own
tooling that nobody had looked for:

1. **`farm done --artifact` accepted a path that did not exist.** A chore was
   marked `DONE`, claiming an artifact file that had never been written. Every
   downstream step would have trusted a result that did not exist. The ledger now
   refuses it, and `report` flags any `DONE` whose artifact has since gone
   missing as a **false DONE**.

2. **`report --goal` only partly scoped.** Chore counts filtered; goal, episode
   and fact counts did not. With one goal on the board it looked identical to the
   unscoped report, which is the worst kind of wrong — invisible.

It also flagged four gaps in its own charter. The largest: **the charter never
told it to check that artifacts exist.** It found the false DONE on its own
initiative, which means the next run might not have. That instruction is now the
second item in its reporting order, and `report` checks it independently so the
finding does not depend on an agent thinking of it.

Two lessons, both of which the architecture already claimed and neither of which
was being practised:

- **A charter is not tested until something runs under it.** Reading it back and
  agreeing with yourself proves nothing.
- **A check that depends on an agent's initiative is not a check.** If it matters,
  the tool enforces it.
