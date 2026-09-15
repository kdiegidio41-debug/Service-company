# Build order

What to build, in what order, and what to refuse to build early. Written for the next session.

---

## The principle: one thin slice before any zone is finished

The tempting order is to build the Farmhouse properly, then the Fields properly, then the Silo. That order
produces three impressive components and a system that has never once run end to end.

**Build the thinnest possible slice through every layer first.** One goal, one chore, one row, one artifact,
delivered and traced. It will be embarrassing. It will also tell you, in an afternoon, which three assumptions
in this repo are wrong — and those three are worth more than a finished zone.

---

## Stage 0 — Decide two things (15 minutes, and you cannot skip them)

1. **Theme.** Farm or starship. Everything renders from `world/farm.world.json`; the starship skin is a name
   overlay in `world/starship.theme.json`. This is cosmetic and it is also the vocabulary you will use in
   every conversation for months, so pick it deliberately. See [06-THEMES.md](06-THEMES.md).
2. **The first real goal.** One concrete thing you want the farm to do. Not a category — a specific job with a
   checkable output. Everything below is much easier with a real target and nearly impossible without one.

---

## Stage 1 — The Chore Board

**Build:** the ledger. A chore record, the state machine, legal-transition enforcement, and a way to list what
is open and what is blocked.

**Why first:** every other zone reads or writes it, and it is the only component where "we'll formalise it
later" reliably becomes "nobody can explain what ran".

**Done when:** you can post a chore, move it through `OPEN → CLAIMED → RUNNING → DONE`, and the board
**refuses** an illegal transition rather than logging a warning and allowing it.

**Refuse to build yet:** priority scoring, fair-share queueing, dependency graphs. A list and a state machine.

Spec: [02-PROTOCOL.md](02-PROTOCOL.md).

---

## Stage 2 — The Watchtower, before anything calls a model

**Build:** traces and spans. A span per action carrying `sawContext`, `reason`, `usage`, `outcome`. A way to
read one trace end to end.

**Why here:** the moment a model call happens without a trace, you start accumulating behaviour you cannot
explain. Instrument before you generate, not after.

**Done when:** you can answer *"why did it do that"* from stored data, without re-running anything.

**Refuse to build yet:** dashboards, alerting thresholds, anomaly detection. Store the spans; read them in a
terminal.

---

## Stage 3 — The thin slice

**Build, in one sitting:**

```
Gatehouse          authenticate, attach scope, hand a goal to the Farmhouse
  → Farmhouse      restate the goal, cut exactly ONE chore
  → Dispatch Porch route it to one field row
  → Scarecrow      screen the input
  → Irrigation Head trim context to a budget
  → one row        do the work (one model call)
  → Weigh Station  inspect the output
  → Market Stall   deliver it
  → Watchtower     the whole thing appears as one trace
```

**Done when:** one real goal produces one real artifact, and the trace explains every step.

This is the checkpoint. Everything after it is widening; everything before it was guessing.

**Refuse to build yet:** parallel rows, retries, memory, evals. One row. One call. No recovery.

---

## Stage 4 — The Well

**Build:** per-zone budget ceilings, draw permits, the dry-well signal, and cost attributed to a **chore**.

**Why here:** the first time you fan out, an unmetered system will surprise you with a bill or a rate-limit
wall, and it always happens on the run you were not watching.

**Done when:** a chore that exceeds its budget is stopped by the Tally Clerk, and you can report
**cost per completed task** — including retries, which is the only honest version of the number.

---

## Stage 5 — Widen the field

**Build:** a Row Boss. Split a batch into rows, run them in parallel, collect, reduce, and report **one**
result upward. Then the Gleaner: a second pass over rejects with a *different* approach, and a written
`REJECTED` when recovery fails.

**Done when:** the Farmhouse sees one field result, never fifty rows — and nothing dropped is unaccounted for.

**The check that matters:** confirm no row reads another row's output. If one does, you built a queue and paid
for a field.

---

## Stage 6 — Memory, in order

Build the stores in this order, and do not skip ahead:

1. **Silo II (episodic)** — append-only, ordered, with real arguments and results. This is the one that pays
   for itself immediately; it is also what makes Stage 3's traces durable.
2. **Silo I (working)** — checkpoints and handoff packets. Needed as soon as anything runs long enough to
   crash halfway.
3. **Silo III (semantic)** — the Winnower, with a real promotion bar. Not before you have episodes worth
   distilling.
4. **The Granary (procedural)** — versioned prompts and charters. The moment you have more than three prompts,
   or the first time you cannot remember what you changed.

**Refuse to build yet:** a vector database. Start with a conversation buffer and exact lookup. Add embeddings
when retrieval quality — measured, not felt — actually demands it.

---

## Stage 7 — The Greenhouse

**Build:** the golden set first, harvested from real runs and real failures. Then a rubric. Then the Grader.
Then shadow running, then staged rollout with a rollback trigger **written down before traffic moves**.

**Why last:** an eval set written before you have real traffic measures your assumptions. The Compost Heap
should already be full by the time you get here — that is your first honest eval set.

**Done when:** you can change a prompt and say, with a number, whether it got better.

---

## Stage 8 — Harden the fence

**Build:** the Fencewright's egress allowlists per zone, the Quartermaster's time-boxed toolbelts, credentials
that never enter agent-visible context.

**Why not first:** with one row and one tool, the fence is trivially satisfied and you would be building
policy for a system that does not exist. **Do this before anything untrusted reaches a row**, and before the
farm is exposed to anyone but you — whichever comes first.

---

## The zones that stay unbuilt longest

Named, mapped, and deliberately deferred:

| Zone / station | Build when |
| --- | --- |
| **The Barn** (durable sessions) | You have work that genuinely spans days. Not before. |
| **The Henhouse** (scheduled) | You have something worth running on a cadence. |
| **The Kennel** (Sheepdog) | The same day you build the Barn. Never a day later. |
| **The Smithy** (tool building) | You hit a capability gap a existing tool cannot fill. |
| **The Root Cellar** (retention) | You store anything you would be obliged to delete. |

**The Kennel is the one exception to "defer until needed."** Anything that can run for an hour can loop for an
hour. Supervision ships with the Barn or the Barn does not ship.

---

## A standing rule

Every stage above ends with something that runs. If a stage produces only a design, it is not done — and the
next stage will be built on an assumption nobody tested.
