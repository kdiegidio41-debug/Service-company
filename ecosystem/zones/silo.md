# The Silo Row — zone charter

**Memory & knowledge.** Granary. Branch `claude/steading-silo`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

Four kinds of remembering, kept in four separate stores on purpose. Mixing them is the most common reason an agent ecosystem slowly goes senile.

### Owns

- Working memory (this task)
- Episodic memory (what happened)
- Semantic memory (what is true)
- Procedural memory (how we do it)
- Archive, retention and deletion

### Where it breaks

Everything is thrown into one vector store. Vectors are good at 'something like this' and bad at 'what happened, in what order' — keep the trace separate from the facts.

---

## Build this first

1. **Silo II — the episode log — first.** Append-only, ordered, with real arguments and results. It pays for itself the first time something goes wrong.
2. Silo I next, as soon as anything runs long enough to crash halfway.
3. Silo III only once there are episodes worth distilling. **Not a vector database on day one** — a buffer and exact lookup go further than people expect.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- Any run is replayable from the episode log alone.
- Every retrieval carries provenance. A passage without a source is not an answer.
- The Cellarer is the only role authorised to delete, and proves it.

---

## Stations (5)

### Silo I — Working

This task, right now. Scratch state for a run in flight; emptied when the run ends.

| | |
| --- | --- |
| Takes in | Intermediate results · Partial plans · Tool outputs still in play |
| Puts out | Current state to whoever is working · A handoff packet when work changes hands |
| Roles | The Statekeeper |

- **Checkpoint in-flight state** (`t-checkpoint-state`, The Statekeeper) — done when a crash at this point loses no completed stage. *Watch for: scratch state from one run visible to another*

### Silo II — Episodic

What happened, in what order, with timestamps. The thing vector search is worst at and you need most when debugging.

| | |
| --- | --- |
| Takes in | Ordered event records · Tool calls with their arguments and results |
| Puts out | Run histories · The raw material the Winnower distills into facts |
| Roles | The Chronicler |

- **Record what happened** (`t-record-episode`, The Chronicler) — done when the run is replayable from the log alone. *Watch for: summarising an episode at write time and losing the detail*

### Silo III — Semantic

What is true, independent of when we learned it. Facts, preferences, domain rules, distilled conclusions.

| | |
| --- | --- |
| Takes in | Facts promoted from episodes · Human-asserted ground truth |
| Puts out | Retrieved context for any agent that asks · Contradictions flagged for a human |
| Roles | The Winnower · The Water Carrier |

- **Promote an episode to a fact** (`t-promote-fact`, The Winnower) — done when the fact is useful without its original context and does not contradict an existing one. *Watch for: promoting something a single run asserted once*
- **Retrieve context** (`t-retrieve-context`, The Water Carrier) — done when it fits the budget and every passage cites its source. *Watch for: returning weak matches instead of saying nothing is relevant*

### The Granary

Procedural memory — how we do things. Versioned prompts, role charters, rubrics and agent blueprints.

| | |
| --- | --- |
| Takes in | Promoted prompts from the Greenhouse · Rubrics that held up · Role definitions |
| Puts out | The seed any new agent is grown from · A diffable history of every prompt change |
| Roles | The Granary Keeper |

- **Version a prompt or charter** (`t-version-prompt`, The Granary Keeper) — done when the change is diffable against the previous version and reversible. *Watch for: an unversioned edit made directly in production*

### The Root Cellar

Cold storage. Retention windows, legal holds, and the only place on the farm authorised to delete.

| | |
| --- | --- |
| Takes in | Aged-out episodes · Deletion requests |
| Puts out | Archived records · Proof of deletion |
| Roles | The Cellarer |

- **Age records out** (`t-age-out`, The Cellarer) — done when deletion is proven and holds are honoured over the schedule. *Watch for: deleting something under legal hold*

---

## Roles (6)

### The Granary Keeper — Procedural Memory Keeper

*Hand tier (`claude-sonnet-5`) · The Granary*

Holds how we do things: versioned prompts, role charters, rubrics and blueprints. Every agent is grown from a seed kept here.

- Version every prompt and charter with a diffable history
- Refuse an unversioned change
- Serve the current seed to the Nurseryman
- Roll back on request without ceremony

Reads Promoted prompts, Rubrics that held. Writes The seed vault, Version history. Escalates to **The Winnower**.

### The Chronicler — Episodic Memory Keeper

*Sorter tier (`claude-haiku-4-5`) · Silo II — Episodic*

Records what happened, in order, with the arguments and the results. The thing you need most at 2am and vectors are worst at.

- Append ordered, timestamped events
- Keep tool calls with their actual arguments and returns
- Never overwrite — episodes are append-only
- Make any run replayable from the record alone

Reads Events from every zone. Writes The episode log. Escalates to **The Winnower**.

### The Winnower — Memory Consolidator

*Specialist tier (`claude-opus-5`) · Silo III — Semantic*

Separates the grain from the chaff. Distils episodes into durable facts and throws the rest away.

- Promote a fact to Silo III only when it is useful without its original context
- Detect and surface contradictions rather than overwriting
- Prune facts nothing has read in a season
- Never promote something a single run asserted once

Reads Silo II episodes, Existing facts. Writes Promoted facts, Contradiction reports. Escalates to **The Farmer**.

### The Water Carrier — Retrieval Agent

*Sorter tier (`claude-haiku-4-5`) · Silo III — Semantic*

Fetches exactly the context an agent asked for, and no more. The difference between a cheap farm and an expensive one.

- Retrieve against the question actually asked
- Rank and cut to the requested budget
- Return provenance with every passage
- Say 'nothing relevant' instead of returning weak matches

Reads Silo III, The Granary. Writes Context packets with provenance. Escalates to **The Winnower**.

### The Cellarer — Archivist

*Sorter tier (`claude-haiku-4-5`) · The Root Cellar*

Retention and deletion. The only role on the farm authorised to destroy a record.

- Age records out on the declared schedule
- Honour legal holds over retention windows
- Execute deletion requests and prove it
- Keep the archive readable, not just stored

Reads Retention policy, Deletion requests. Writes Archives, Deletion proofs. Escalates to **The Gatekeeper**.

### The Statekeeper — Working Memory Steward

*Sorter tier (`claude-haiku-4-5`) · Silo I — Working*

Holds the scratch state of runs in flight, and empties it when they end.

- Checkpoint in-flight state so a crash is survivable
- Build a handoff packet when work changes hands
- Expire scratch state at run end — no exceptions
- Keep one run's scratch invisible to another

Reads In-flight intermediate results. Writes Checkpoints, Handoff packets. Escalates to **The Herdsman**.

---

## Wiring across the boundary

### In (3)

- **Memory** from The Ledger Office (The Farmhouse) → Silo II — Episodic · *episodes*
- **Memory** from The Glasshouse (The Greenhouse) → The Granary · *versioned prompt*
- **Memory** from The Great Barn (The Barn) → Silo I — Working · *checkpoints*

### Out (3)

- **Memory** Silo III — Semantic → The Irrigation Head (The Fields) · *retrieved context*
- **Memory** The Granary → The Glasshouse (The Greenhouse) · *current seed*
- **Memory** Silo I — Working → The Great Barn (The Barn) · *resume state*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **What is the promotion bar, concretely?** "Useful without its original context" is the right idea and not yet a test. Until it is one, the Winnower is applying taste.
- **Supersede or coexist?** A fact contradicted by a newer one could be replaced, or both kept with timestamps and the contradiction surfaced. The second is safer and costs more.
- **How long is the episode retention window, and who may shorten it?** Retention is where cost and forensics fight, and cost usually wins by default.
- **Does procedural memory self-modify?** The Granary requires versioned, reversible, gated changes today — deliberately more conservative than the literature. Worth revisiting, carefully.
