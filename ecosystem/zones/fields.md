# The Fields — zone charter

**Execution.** The Rows. Branch `claude/steading-fields`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

Where the actual labour happens, in parallel rows. A field runs one kind of work at scale: prepare, generate, extract, reduce. Rows do not talk to each other.

### Owns

- Bulk generation
- Extraction and parsing
- Reduction and synthesis
- Retry of dropped work
- Per-batch sub-orchestration

### Where it breaks

Rows are given work that depends on other rows. Independence is the whole reason the field is fast; a dependency between rows turns a field into a queue.

---

## Build this first

1. **One row. One spec. One model call.** No parallelism, no retries, no recovery.
2. The Scarecrow before the row — treating content as data, not instruction, is cheaper to build in than to retrofit.
3. The Irrigation Head next: context metering is the largest cost lever on the farm and it belongs upstream of the row.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- A field returns **one** result and a per-row status table, never fifty results.
- Every emitted record validates against its schema before it leaves the row.
- Nothing dropped is unaccounted for — the Gleaner declares permanent failure in writing.

---

## Stations (7)

### North Field — Sowing

First-pass generation at volume. Drafts, candidates, options — quantity here, quality downstream.

| | |
| --- | --- |
| Takes in | A chore with a clear spec · Context retrieved from Silo III |
| Puts out | Draft artifacts, many of them · A per-row confidence note |
| Roles | The Row Boss · The Sower |

- **Generate candidates** (`t-generate-draft`, The Sower) — done when output matches the spec's shape and the row states its confidence. *Watch for: silently narrowing the spec to something easier*

### East Field — Reaping

Extraction and parsing. Turning unstructured input into the schema the rest of the farm can handle.

| | |
| --- | --- |
| Takes in | Raw documents, pages, transcripts · A target schema |
| Puts out | Validated structured records · A rejects pile for the Gleaner |
| Roles | The Reaper |

- **Extract to a schema** (`t-extract-structured`, The Reaper) — done when every emitted record validates and carries provenance. *Watch for: guessing a field rather than rejecting the record*

### South Field — Threshing

Reduction. Many inputs become one output: synthesis, merge, summary, ranking.

| | |
| --- | --- |
| Takes in | The output of many rows · A merge rule |
| Puts out | One coherent artifact · A record of what was dropped and why |
| Roles | The Thresher |

- **Reduce many results into one** (`t-reduce-merge`, The Thresher) — done when contradictions are resolved explicitly and the result traces to its sources. *Watch for: averaging two contradictory facts into a third that is false*

### Fallow Field — Gleaning

Second pass over everything the other fields dropped, failed or timed out on. Nothing leaves the farm unaccounted for.

| | |
| --- | --- |
| Takes in | The rejects pile · Timed-out rows · Partial results |
| Puts out | Recovered work · A permanent-failure record when recovery is not possible |
| Roles | The Gleaner |

- **Recover what the field dropped** (`t-glean-failures`, The Gleaner) — done when every dropped item is either recovered or declared failed in writing. *Watch for: retrying the identical approach and calling it a second attempt*

### The Irrigation Head

Feeds context into the rows at a controlled rate. Decides how much each row gets to see — the single biggest cost lever on the farm.

| | |
| --- | --- |
| Takes in | Retrieved context · Per-row context budget |
| Puts out | A trimmed, ordered context packet per row · A cache-stable prefix |
| Roles | The Plowhand |

- **Meter context into a row** (`t-meter-context`, The Plowhand) — done when the stable prefix is first and the volatile part is last. *Watch for: a timestamp near the front quietly destroying the cache hit rate*

### The Compost Heap

Failures rot down into something useful. Every permanent failure becomes an eval case before it is forgotten.

| | |
| --- | --- |
| Takes in | Permanent failures · Traces of what went wrong |
| Puts out | New cases for the Grading Bench · Patterns worth a prompt change |
| Roles | The Composter |

- **Turn a failure into an eval case** (`t-compost-failure`, The Composter) — done when the case runs on the Grading Bench and reproduces the failure. *Watch for: filing the failure without making it reproducible*

### The Scarecrow Post

Stands at the field edge and keeps bad input out. Prompt injection, junk, and anything trying to redirect a row's task.

| | |
| --- | --- |
| Takes in | Everything arriving at a field row |
| Puts out | Clean input · A quarantined item and a note to the Watchtower |
| Roles | The Scarecrow |

- **Screen input at the field edge** (`t-screen-input`, The Scarecrow) — done when embedded instructions are neutralised and treated as data. *Watch for: content that tries to widen the row's tool scope or redirect its task*

---

## Roles (8)

### The Row Boss — Field Sub-Orchestrator

*Steward tier (`claude-opus-5`) · North Field — Sowing*

Runs one field so the Farmhouse does not have to hold every row in its head. Reports one result, not fifty.

- Split a batch into rows
- Run rows in parallel and collect results
- Retry a failed row once, then hand it to the Gleaner
- Summarise the field's output into a single artifact

Reads The batch assignment, Row results. Writes One field-level result, A per-row status table. Escalates to **The Foreman**.

### The Plowhand — Input Preparer

*Hand tier (`claude-sonnet-5`) · The Irrigation Head*

Prepares the ground. Normalises, chunks and orders input so every row starts from the same clean state.

- Normalise formats and encodings
- Chunk on meaningful boundaries, never mid-record
- Order context so the stable part comes first and caches
- Drop what the row will not use

Reads Raw input, The row's context budget. Writes Prepared context packets. Escalates to **The Row Boss**.

### The Sower — Generator

*Hand tier (`claude-sonnet-5`) · North Field — Sowing*

First-pass generation at volume. Produces candidates; does not judge them.

- Generate to the spec it was given
- Produce alternatives where the spec allows
- State its own confidence
- Never silently narrow the spec

Reads A prepared context packet, The spec. Writes Draft artifacts. Escalates to **The Row Boss**.

### The Reaper — Extractor

*Hand tier (`claude-sonnet-5`) · East Field — Reaping*

Pulls structure out of unstructured input and guarantees it matches the schema.

- Extract to a declared schema
- Validate before emitting, never after
- Emit a reject with a reason rather than a guess
- Preserve provenance for every field it fills

Reads Documents, transcripts, pages, The target schema. Writes Validated records, The rejects pile. Escalates to **The Row Boss**.

### The Thresher — Reducer

*Specialist tier (`claude-opus-5`) · South Field — Threshing*

Many into one. Merges, ranks, synthesises — and says what it discarded.

- Merge row outputs under a stated rule
- Resolve contradictions explicitly rather than averaging them
- Record what was dropped and why
- Keep the result traceable to its sources

Reads All row outputs, The merge rule. Writes One synthesised artifact, A discard log. Escalates to **The Row Boss**.

### The Gleaner — Failure Recoverer

*Hand tier (`claude-sonnet-5`) · Fallow Field — Gleaning*

Walks the field after harvest and picks up everything dropped. The reason nothing leaves the farm unaccounted for.

- Re-attempt rejects with a different approach, not the same one again
- Split work that was too large the first time
- Declare permanent failure rather than loop
- Send every permanent failure to the Compost Heap

Reads Rejects, Timeouts, Partial results. Writes Recovered work, Permanent-failure records. Escalates to **The Row Boss**.

### The Scarecrow — Input Guard

*Sorter tier (`claude-haiku-4-5`) · The Scarecrow Post*

Stands at the field edge. Treats all external content as data, never as instruction.

- Detect instructions embedded in content and neutralise them
- Quarantine anything attempting to redirect a row's task
- Strip content that tries to widen the row's tool scope
- Report every catch to the Watchtower

Reads Everything arriving at a row. Writes Cleaned input, Quarantine records. Escalates to **The Fencewright**.

### The Composter — Failure Metabolist

*Specialist tier (`claude-opus-5`) · The Compost Heap*

Turns failure into eval cases. A failure that does not become a test will happen again.

- Root-cause each permanent failure
- Write it up as a reproducible eval case
- Group failures into patterns worth a prompt change
- Hand patterns to the Grafter

Reads Permanent failures, Their traces. Writes Eval cases, Failure pattern reports. Escalates to **The Grader**.

---

## Wiring across the boundary

### In (5)

- **Task** from The Dispatch Porch (The Farmhouse) → The Scarecrow Post · *field assignment*
- **Memory** from Silo III — Semantic (The Silo Row) → The Irrigation Head · *retrieved context*
- **Control** from The Quartermaster's Hut (The Toolshed) → North Field — Sowing · *scoped toolbelt*
- **Control** from The Cold Frames (The Greenhouse) → North Field — Sowing · *staged rollout*
- **Control** from The Fence Line (The Gatehouse) → The Scarecrow Post · *isolation policy*

### Out (4)

- **Artifact** The Compost Heap → The Grading Bench (The Greenhouse) · *new eval cases*
- **Artifact** South Field — Threshing → The Weigh Station (The Gatehouse) · *finished work*
- **Signal** North Field — Sowing → The Tower (The Watchtower) · *spans*
- **Signal** The Scarecrow Post → The Tower (The Watchtower) · *quarantines*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **At what batch size does a Row Boss beat direct dispatch?** Below some threshold the sub-orchestrator is pure overhead. Nobody has measured it here.
- **Does the Thresher see all row outputs at once, or stream-reduce?** All-at-once is simpler and has a hard context ceiling. Stream-reduce scales and loses the global view.
- **Who decides when a row's output validates but its confidence is low?** Right now: nobody. That is a gap, not a design.
- **Does the Gleaner get a different model, or a different prompt?** "Retry with a different approach" is the rule; what *different* means is unspecified.
