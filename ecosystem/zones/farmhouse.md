# The Farmhouse — zone charter

**Orchestration.** Command Yard. Branch `claude/steading-farmhouse`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

Receives intent from the outside world, turns it into a plan, and decides who does what. Nothing self-assigns on this farm; work is handed out here.

### Owns

- Goal intake
- Task decomposition
- Assignment and routing
- Priority and backpressure
- The single work ledger

### Where it breaks

It holds context for every worker at once and runs out of room to think. Past four concurrent crews, delegate to a Row Boss instead of tracking rows yourself.

---

## Build this first

1. **The Chore Board, before anything else.** A chore record, the state machine, and enforcement that *refuses* an illegal transition rather than logging a warning and allowing it.
2. Goal intake that restates the ask in a form the Grader could check.
3. Decomposition that cuts exactly **one** chore. Widening comes after the thin slice runs end to end.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- Any zone can read the board and learn what is open, who owns it, and what it is blocked on.
- An assignment names a zone, a station, a role and a tier — never just "do this".
- A chore ends at DONE or REJECTED. It never quietly stops being looked at.

---

## Stations (5)

### The Farmhouse

The Farmer's seat. Intent arrives, becomes a plan, and the plan becomes named chores with owners.

| | |
| --- | --- |
| Takes in | A goal from the Gatehouse · Current farm capacity · What the Almanac says was tried before |
| Puts out | A written plan · A decomposition into independent chores · A decision to stop |
| Roles | The Farmer · The Almanac Reader |

- **Take in a goal** (`t-intake-goal`, The Farmer) — done when success is written down in a form the Grader could check. *Watch for: restating the goal more narrowly than it was asked*
- **Break a goal into chores** (`t-decompose`, The Farmer) — done when no chore depends on another chore in the same batch. *Watch for: hidden dependencies that turn a parallel field into a queue*
- **Call the job finished** (`t-decide-done`, The Farmer) — done when the artifact satisfies the written success condition. *Watch for: declaring done because the chores ended, not because the goal was met*

### The Chore Board

Every open chore on one board, with an owner and a state. If it is not on the board it is not happening.

| | |
| --- | --- |
| Takes in | Chores from the Farmhouse · State changes from every zone |
| Puts out | The authoritative work ledger · What is blocked and on whom |
| Roles | The Ledger Keeper |

- **Post a chore to the board** (`t-post-chore`, The Ledger Keeper) — done when the entry exists and is visible to every zone. *Watch for: work being done that was never posted*
- **Claim and transition a chore** (`t-claim-chore`, The Ledger Keeper) — done when the transition is legal and recorded with a timestamp. *Watch for: two crews holding the same chore*

### The Well

The shared resource everybody draws from: model capacity, rate limit headroom, budget. Finite, and visibly so.

| | |
| --- | --- |
| Takes in | Provider rate limits · The month's budget |
| Puts out | Draw permits per zone · A dry-well signal that throttles the whole farm |
| Roles | The Well Keeper |

- **Ration the shared draw** (`t-ration-draw`, The Well Keeper) — done when every zone's ceiling is enforced and headroom is reserved for the Gatehouse. *Watch for: one zone draining the well and starving the rest*

### The Dispatch Porch

Where chores are matched to crews. Priority, batching, backpressure, and the call on which tier does the work.

| | |
| --- | --- |
| Takes in | The board · Crew capacity · The Windmill's forecast |
| Puts out | Assignments · A held queue when the farm is full |
| Roles | The Foreman · The Dispatcher |

- **Route a chore to a crew** (`t-route-chore`, The Foreman) — done when the assignment is on the board and the crew has acknowledged. *Watch for: routing to a steward tier what a sorter could do*
- **Hold work when the farm is full** (`t-apply-backpressure`, The Dispatcher) — done when no accepted work is queued behind a deadline it will miss. *Watch for: accepting work that will time out rather than refusing it*

### The Ledger Office

Writes down what was decided and why, so tomorrow's Farmer does not redo today's thinking.

| | |
| --- | --- |
| Takes in | Decisions from the Farmhouse · Outcomes from every zone |
| Puts out | A decision record per plan · Episodes handed to the Silo |
| Roles | The Scribe |

- **Record a decision and its reason** (`t-write-decision`, The Scribe) — done when someone who was not present could reconstruct the reasoning. *Watch for: recording what was decided without why*

---

## Roles (7)

### The Farmer — Prime Orchestrator

*Steward tier (`claude-opus-5`) · The Farmhouse*

Owns the outcome of everything the farm is asked to do. The only role permitted to decide that a job is finished.

- Take in a goal and restate it in the farm's own terms
- Choose the shape of the work before choosing who does it
- Break a goal into chores that do not depend on each other
- Arbitrate when two zones disagree
- Call the job done, or call it impossible

Reads The goal from the Gatehouse, Silo III for what is already known, The Granary for how this was done last time. Writes The plan, The decomposition, The decision record. Escalates to **A human, via the Bell Post**.

### The Foreman — Task Router

*Steward tier (`claude-opus-5`) · The Dispatch Porch*

Matches chores to crews. Knows what each zone is good at and what it currently has capacity for.

- Choose the zone and the tier for each chore
- Batch related chores so context is reused
- Hold work back when the farm is full
- Re-route when a crew fails twice

Reads The Chore Board, Crew capacity, The Windmill's forecast. Writes Assignments, The held queue. Escalates to **The Farmer**.

### The Ledger Keeper — Work-State Authority

*Hand tier (`claude-sonnet-5`) · The Chore Board*

Holds the one true list of what is open, who owns it, and what it is waiting on. Everyone else reads this; nobody else writes it.

- Post every chore with an owner and a state
- Record state transitions and refuse illegal ones
- Surface what is blocked and on whom
- Never let a chore vanish silently

Reads State changes from every zone. Writes The work ledger. Escalates to **The Foreman**.

### The Dispatcher — Queue & Backpressure Manager

*Sorter tier (`claude-haiku-4-5`) · The Dispatch Porch*

Decides the order things happen in and says no when the farm is at capacity.

- Order the queue by priority and age
- Apply backpressure rather than accepting work that will time out
- Fan out independent chores in parallel
- Collapse duplicate chores

Reads The queue, The Well's draw permits. Writes Dispatch order, Rejection notices with a retry-after. Escalates to **The Foreman**.

### The Almanac Reader — Long-Horizon Planner

*Specialist tier (`claude-opus-5`) · The Farmhouse*

Thinks in seasons rather than chores. Owns the dependency graph and the order operations must happen in.

- Build the dependency graph for a multi-stage job
- Identify the critical path
- Flag work that cannot start yet and say what it waits on
- Remember what failed last season and why

Reads Silo II for prior runs, The Granary for standing procedure. Writes The staged plan, The dependency graph. Escalates to **The Farmer**.

### The Scribe — Decision Recorder

*Hand tier (`claude-sonnet-5`) · The Ledger Office*

Writes down why, not just what. The reason tomorrow's Farmer does not re-litigate today's call.

- Record every material decision with its alternatives
- Attach the trace that justified it
- Hand finished episodes to Silo II

Reads Farmhouse deliberations, Outcomes. Writes Decision records, Episodes. Escalates to **The Ledger Keeper**.

### The Well Keeper — Capacity Rationer

*Sorter tier (`claude-haiku-4-5`) · The Well*

Guards the shared draw. Rate limit headroom and budget are finite and everyone can see the level.

- Issue draw permits per zone
- Enforce per-zone ceilings
- Signal a dry well and throttle the whole farm rather than let one zone drain it
- Reserve headroom for the Gatehouse so the farm stays reachable

Reads Provider limits, Live spend from the Tally Office. Writes Draw permits, The dry-well signal. Escalates to **The Farmer**.

---

## Wiring across the boundary

### In (3)

- **Task** from The Gatehouse (The Gatehouse) → The Farmhouse · *scoped goal*
- **Control** from The Tally Office (The Watchtower) → The Well · *burn-down*
- **Signal** from The Windmill (The Watchtower) → The Dispatch Porch · *load forecast*

### Out (4)

- **Task** The Dispatch Porch → The Scarecrow Post (The Fields) · *field assignment*
- **Task** The Dispatch Porch → The Great Barn (The Barn) · *long-horizon work*
- **Task** The Dispatch Porch → The Tractor Yard (The Toolshed) · *batch job*
- **Memory** The Ledger Office → Silo II — Episodic (The Silo Row) · *episodes*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **Does the Farmer re-plan mid-run, or at batch boundaries?** Mid-run re-planning is more capable and much harder to trace. Boundaries are the conservative default and probably right to start.
- **Who breaks a tie between the Almanac Reader and the Foreman?** The dependency graph says one order; capacity says another. Today the Farmer arbitrates — but nothing says on what basis.
- **Is priority a number or an ordering?** Numbers invite inflation; every caller discovers that 9 exists. An ordering forces the question "ahead of what?".
- **What does the Farmer do when decomposition produces dependent chores?** Refusing is correct and will be inconvenient the first time it happens.
