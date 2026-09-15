# The Greenhouse — zone charter

**R&D and evaluation.** Nursery. Branch `claude/steading-greenhouse`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

Nothing reaches a field untested. New prompts, new agents and new tools are grown here under glass, graded against real data, and only then transplanted.

### Owns

- Prompt design and tuning
- New agent incubation in sandbox
- Eval sets and golden data
- Grading, rubrics and LLM judges
- Pruning what no longer earns its place

### Where it breaks

The eval set is written from the same head that wrote the prompt. Golden data has to come from real traffic or it only measures your own assumptions.

---

## Build this first

1. **The golden set, harvested from the Compost Heap.** Real failures from real runs. Not the Grader — the data.
2. A written rubric second. Writing the rubric usually reveals that the task was underspecified.
3. Shadow running before staged rollout, and the rollback trigger written down *before* traffic moves.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- Nothing reaches a field untested against real traffic.
- A score comes with a breakdown that explains the number.
- The held-out split is never tuned against.

---

## Stations (4)

### The Glasshouse

Where a new agent is grown from a prompt into something that survives contact with real input.

| | |
| --- | --- |
| Takes in | A job nobody currently does · Failed traces showing a gap · Golden examples of the wanted output |
| Puts out | A drafted role charter · A tuned system prompt · A sandbox transcript showing it works |
| Roles | The Grafter |

- **Draft a role charter** (`t-draft-role`, The Grafter) — done when the charter says what the role must not do as clearly as what it must. *Watch for: a charter that overlaps an existing role*
- **Tune a prompt** (`t-tune-prompt`, The Grafter) — done when one variable changed and the bench measured the result. *Watch for: changing three things and learning nothing*

### The Nursery Beds

Candidate agents run against real traffic in shadow mode — they produce output, nobody acts on it.

| | |
| --- | --- |
| Takes in | A candidate agent · A mirrored slice of live work |
| Puts out | Shadow transcripts · A first honest failure rate |
| Roles | The Nurseryman |

- **Run a candidate in shadow** (`t-shadow-run`, The Nurseryman) — done when it has seen real traffic and nobody acted on its output. *Watch for: shadow traffic that is not representative of the real mix*

### The Grading Bench

Scoring. Rubrics, judges and the eval sets that decide whether anything actually improved.

| | |
| --- | --- |
| Takes in | Candidate output · The golden set · A written rubric |
| Puts out | A score with a breakdown · A pass or fail against the bar · New eval cases harvested from failures |
| Roles | The Grader · The Soil Tester |

- **Curate the golden set** (`t-curate-evalset`, The Soil Tester) — done when cases come from real runs and the held-out split is untouched by tuning. *Watch for: an eval set written by whoever wrote the prompt*
- **Grade against the rubric** (`t-score-run`, The Grader) — done when the breakdown explains the number. *Watch for: a rubric that rewards length or confidence rather than correctness*

### The Cold Frames

Hardening off. A passing agent takes a small percentage of real work before it takes all of it.

| | |
| --- | --- |
| Takes in | An agent that passed the bench · A traffic percentage |
| Puts out | A staged rollout · A rollback if the live numbers disagree with the bench |
| Roles | The Pruner · The Pollinator |

- **Stage a rollout** (`t-stage-rollout`, The Nurseryman) — done when the rollback trigger is written down before traffic moves. *Watch for: going to full traffic because the small slice looked fine*

---

## Roles (6)

### The Grafter — Prompt Engineer

*Specialist tier (`claude-opus-5`) · The Glasshouse*

Designs and tunes the prompts every role is grown from. Changes one thing at a time and measures it.

- Write a charter before writing a prompt
- Change one variable per iteration
- Measure against the bench, not against intuition
- Delete instructions that no longer earn their tokens

Reads Failure patterns, Bench scores, The current seed. Writes Candidate prompts, Tuning notes. Escalates to **The Nurseryman**.

### The Nurseryman — Agent Incubator

*Steward tier (`claude-opus-5`) · The Nursery Beds*

Grows a candidate from prompt to production-ready. Owns the gate between the greenhouse and the fields.

- Run candidates in shadow against real traffic
- Hold the release bar and refuse to lower it under pressure
- Stage a rollout by percentage, never all at once
- Roll back when live numbers disagree with the bench

Reads Candidates, Shadow transcripts, Bench scores. Writes Release decisions, Rollout plans. Escalates to **The Farmer**.

### The Grader — Evaluator

*Specialist tier (`claude-opus-5`) · The Grading Bench*

Scores work against a written rubric. Independent of whoever produced it, on purpose.

- Grade against a rubric written before the output existed
- Report a breakdown, not just a number
- Flag when the rubric itself is the problem
- Never grade its own zone's output alone

Reads Candidate output, The golden set, The rubric. Writes Scores with breakdowns, Rubric defect reports. Escalates to **The Nurseryman**.

### The Soil Tester — Dataset Curator

*Hand tier (`claude-sonnet-5`) · The Grading Bench*

Owns the golden set. Keeps it drawn from real traffic rather than from imagination.

- Harvest cases from real runs and real failures
- Keep a held-out split nobody tunes against
- Refresh cases as the work changes
- Refuse synthetic-only eval sets

Reads Real traffic, Compost Heap cases. Writes The golden set, Train/held-out splits. Escalates to **The Grader**.

### The Pruner — Simplifier

*Specialist tier (`claude-opus-5`) · The Cold Frames*

Removes what no longer earns its place. Dead agents, redundant steps, instructions nobody follows.

- Find roles that have not run in a season
- Collapse two roles that do one job
- Delete prompt text that measurement shows is inert
- Argue for fewer agents, not more

Reads Usage data, Bench scores before and after removal. Writes Pruning proposals, Removal records. Escalates to **The Nurseryman**.

### The Pollinator — Cross-Zone Propagator

*Hand tier (`claude-sonnet-5`) · The Cold Frames*

Carries what works from one zone to another. Stops every crew from solving the same problem privately.

- Spot a technique that lifted one zone's scores
- Test whether it transfers before recommending it
- Write it into the Granary as standing procedure
- Retire practices that stopped working

Reads Per-zone score movements, Tuning notes. Writes Propagation proposals, Granary procedure updates. Escalates to **The Granary Keeper**.

---

## Wiring across the boundary

### In (3)

- **Artifact** from The Compost Heap (The Fields) → The Grading Bench · *new eval cases*
- **Memory** from The Granary (The Silo Row) → The Glasshouse · *current seed*
- **Signal** from The Vet Stall (The Barn) → The Nursery Beds · *drift referral*

### Out (2)

- **Memory** The Glasshouse → The Granary (The Silo Row) · *versioned prompt*
- **Control** The Cold Frames → North Field — Sowing (The Fields) · *staged rollout*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **Who can override the Nurseryman's hold?** If anyone can, under deadline, the release bar is decorative. This is a governance question wearing an engineering costume.
- **How big is the held-out split, and who guarantees its integrity?** The guarantee is the hard part — it erodes silently, one "quick check" at a time.
- **Model judge, rule, or both?** A model judge drifts and needs its own eval. A rule is brittle and honest. The mix is probably task-dependent, which means it needs deciding per task.
- **When the rubric is the problem, who fixes it?** The Grader flags it. Nobody currently owns rewriting it.
