# Architecture

How the farm maps onto a real multi-agent system, and the five rules that decide whether it holds together.

---

## The idea in one paragraph

Every concept a multi-agent system needs is given **one physical location and one owner**. A zone is a domain.
A station is a place a specific kind of work happens. A role is a charter assigned to a station. A chore is a
unit of work that moves between them along typed channels. The metaphor is not decoration — it is a forcing
function. If you cannot say where a new capability lives on the farm, you do not yet understand what it is,
and you are about to bolt it onto whatever you touched last.

---

## Layers

The farm is four layers stacked, and each one only talks to its neighbours.

```
                       ┌──────────────────────────────────────────┐
  the outside world    │  GATEHOUSE — identity, scope, egress     │
                       └───────────────────┬──────────────────────┘
                                           │  scoped goal
                       ┌───────────────────▼──────────────────────┐
  decide              │  FARMHOUSE — plan, decompose, route       │
                       │  WATCHTOWER — see everything, count cost │
                       └───────────────────┬──────────────────────┘
                                           │  assignment
                       ┌───────────────────▼──────────────────────┐
  do                  │  FIELDS — parallel, stateless execution   │
                       │  BARN — durable, stateful, scheduled     │
                       │  TOOLSHED — capability, sandboxed        │
                       └───────────────────┬──────────────────────┘
                                           │  artifact / episode
                       ┌───────────────────▼──────────────────────┐
  remember & improve  │  SILO ROW — working, episodic, semantic,  │
                       │             procedural memory            │
                       │  GREENHOUSE — evaluate, tune, promote    │
                       └──────────────────────────────────────────┘
```

**The Watchtower is a peer of the Farmhouse, not a service under it.** It reads from every layer and reports
to a human. An observability system that the orchestrator can silence is not observability.

---

## Rule 1 — Work is handed out, never self-assigned

Nothing on this farm picks up work on its own. A chore is created at the Farmhouse, posted to the **Chore
Board**, and routed from the **Dispatch Porch**. The Ledger Keeper owns the board and is the only role that
writes to it.

This costs a little latency and buys three things: you can always answer "what is running and why", two crews
can never claim the same chore, and backpressure has somewhere to live. The alternative — agents that notice
work and grab it — is how you get duplicated effort that nobody can reconstruct afterwards.

**If it is not on the board, it is not happening.**

---

## Rule 2 — Rows are independent, or it isn't a field

A field runs one kind of work across many rows in parallel. The rows do not talk to each other, do not read
each other's output, and do not depend on each other's completion.

The moment one row needs another row's result, the field has silently become a queue: you keep the cost of
parallelism and lose the speed. This is the single most common way a fan-out design degrades, and it usually
happens by accident during a "small" change.

The Farmer's decomposition task states its definition of done as: **no chore depends on another chore in the
same batch.** That check is cheap and it is the one worth actually enforcing in code.

---

## Rule 3 — The orchestrator must not hold every worker's context

Past roughly four concurrent workers, an orchestrator accumulating each one's context runs out of room to
think. This is measured behaviour, not a theory (see [research §3](00-RESEARCH.md)).

The fix is structural: a **Row Boss** runs one field and reports **one** result upward, plus a per-row status
table. The Farmhouse sees a field, not fifty rows.

When you add a ninth zone, the question is not "can the Farmhouse handle it" — it is "does this need its own
Row Boss".

---

## Rule 4 — Four memories, kept apart

| Silo | Holds | Lifetime | Written by |
| --- | --- | --- | --- |
| **I — Working** | Scratch state for a run in flight | Dies with the run | Statekeeper |
| **II — Episodic** | What happened, in order, with arguments and results | Retention window | Chronicler, append-only |
| **III — Semantic** | What is true, independent of when we learned it | Until contradicted | Winnower only |
| **Granary — Procedural** | Versioned prompts, charters, rubrics | Forever, diffable | Granary Keeper |

Two rules that matter more than the table:

- **The episode log is append-only and is not a vector store.** Vectors answer "something like this"; debugging
  needs "what happened, in what order". Keep the trace.
- **Promotion is a deliberate act with a bar.** A fact reaches Silo III when it is useful *without* its
  original context and does not contradict an existing fact. One run asserting something once is not enough.
  The Winnower owns this and nothing else may write there.

---

## Rule 5 — The fence is enforced at the platform, never in a prompt

An instruction telling an agent not to reach something is a preference. A firewall rule is a boundary.

- The **Gatehouse** is the only lawful entrance. Scopes attach to a goal at intake and **cannot widen** inside.
- The **Fencewright** owns egress allowlists, filesystem reach and credential scope, per zone. Credentials never
  enter agent-visible context.
- The **Scarecrow** stands at each field edge and treats all external content as **data, never instruction**.
  Anything trying to redirect a row's task or widen its tool scope is quarantined and reported.
- The **Weigh Station** inspects everything outbound. Nothing leaves unweighed.
- The **Quartermaster** issues the minimum toolbelt a chore needs, time-boxed, with every issue and return
  logged. A crowded toolbelt costs context on every single call and makes the right tool harder to pick.

---

## Channels

Work moves along five typed channels. The type is part of the design, not a label — it says who is allowed to
send it and what the receiver may do with it.

| Channel | Carries | Rule |
| --- | --- | --- |
| **Task** | Work moving toward whoever will do it | Only from the Dispatch Porch, or a Row Boss to its rows |
| **Artifact** | Produced output moving toward storage or delivery | Must be weighable — traceable to its sources |
| **Memory** | Facts, episodes, procedures moving in or out of store | Reads are free; writes go through the store's keeper |
| **Signal** | Telemetry, health, cost | One direction only: toward the Watchtower |
| **Control** | Permits, kills, budgets, escalations | Only from a role with authority over the target |

---

## Where the agents actually are

Most of this farm is **workflow**, not agent — fixed code paths calling models. That is deliberate.

Only three roles genuinely direct their own process:

- **The Farmer** — decides the shape of the work, arbitrates, decides when to stop.
- **The Row Boss** — decides how to split a batch and when a row is beyond saving.
- **The Nurseryman** — decides whether a candidate is ready for real traffic.

Everything else runs a spec. If a fourth role starts needing real autonomy, that is a design event worth
noticing, not a routine addition — it is the point where the system's behaviour stops being predictable from
its code.

---

## What is deliberately not here yet

This is the foundation. The following are named and unbuilt, on purpose:

- **No runtime.** No agent loop, no scheduler, no message bus. Roles are charters.
- **No prompts.** The Granary is specified; it is empty.
- **No API keys, no model calls.** Tier assignments are recommendations attached to roles.
- **No persistence.** The Silo Row describes four stores and implements none.

The order to build them in is [05-BUILD-ORDER.md](05-BUILD-ORDER.md).
