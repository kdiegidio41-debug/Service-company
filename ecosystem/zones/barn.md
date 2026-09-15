# The Barn — zone charter

**Long-running & stateful agents.** Barnyard. Branch `claude/steading-barn`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

Home to everything that stays alive between requests: durable sessions, scheduled jobs, and the supervisors that keep them honest. Fields forget; the barn remembers.

### Owns

- Durable agent sessions
- Scheduled and recurring work
- Liveness and health checks
- Timeout, runaway and kill-switch supervision
- Workspace and container lifecycle

### Where it breaks

A long-running agent is left unsupervised. Anything that can run for an hour can loop for an hour — the Sheepdog is not optional.

---

## Build this first

1. **Nothing, until you have work that genuinely spans days.** Building durable sessions before you need them buys complexity and no capability.
2. When you do: the session, its checkpoint, and **the Sheepdog on the same day**. Anything that can run for an hour can loop for an hour.
3. The Vet after the first week — drift is invisible until you have a baseline to drift from.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- A session survives a restart without losing its assignment.
- A resumed session continues from a checkpoint rather than replaying its whole history.
- Nothing is killed silently. Every kill carries its reason.

---

## Stations (5)

### The Great Barn

Durable agent sessions that live across many turns and many days. Each has a stall, a name and a keeper.

| | |
| --- | --- |
| Takes in | A long-horizon assignment · Session state from Silo I |
| Puts out | Progress across days · A session that can be resumed, inspected or ended |
| Roles | The Herdsman |

- **Open a durable session** (`t-open-session`, The Herdsman) — done when the session survives a restart without losing its assignment. *Watch for: a session whose assignment is not attached to it*
- **Resume a session** (`t-resume-session`, The Herdsman) — done when work continues without replaying the entire history. *Watch for: replaying the whole transcript and paying for it twice*

### The Paddock

Open ground for agents that are running but not currently working — warm, idle, cheap to wake.

| | |
| --- | --- |
| Takes in | Idle sessions · Wake triggers |
| Puts out | Fast resume without a cold start · Sessions retired when nobody comes for them |
| Roles | The Stablehand |

- **Park an idle session** (`t-park-session`, The Stablehand) — done when resume is fast and the idle cost is near zero. *Watch for: idle sessions holding workspaces nobody will come back for*

### The Henhouse

Scheduled work that lays on a cadence — nightly digests, hourly polls, weekly reports.

| | |
| --- | --- |
| Takes in | A cron expression · A standing instruction |
| Puts out | A run per firing · A skipped-run record when the farm is throttled |
| Roles | The Milkmaid |

- **Register recurring work** (`t-schedule-job`, The Milkmaid) — done when the schedule is stored in UTC and the next firing is known. *Watch for: local-time schedules that drift twice a year*
- **Fire a scheduled run** (`t-fire-scheduled`, The Milkmaid) — done when it fired exactly once, or the skip is recorded as loudly as a failure. *Watch for: stacking a new run on top of one still going*

### The Kennel

Home of the Sheepdog. Watches every long-running agent for the three ways they go wrong: stuck, looping, or wandering off-task.

| | |
| --- | --- |
| Takes in | Heartbeats · Step counts · The original assignment to compare against |
| Puts out | A nudge back on task · A timeout · A kill, with the reason recorded |
| Roles | The Sheepdog |

- **Nudge a wandering agent** (`t-herd-stray`, The Sheepdog) — done when the agent is working the assignment again, or is killed. *Watch for: an agent making steady progress on the wrong thing*
- **Kill a runaway** (`t-kill-runaway`, The Sheepdog) — done when the agent is stopped and the kill reason is on the record. *Watch for: killing silently and leaving nothing to diagnose*

### The Vet Stall

Health, not behaviour. Is this agent responding, is its context poisoned, has its quality drifted since last week?

| | |
| --- | --- |
| Takes in | Liveness probes · Rolling quality scores · Context size over time |
| Puts out | A clean bill of health · A restart · A referral back to the Greenhouse |
| Roles | The Vet |

- **Probe health** (`t-health-check`, The Vet) — done when every durable agent has a health record newer than its interval. *Watch for: a responsive agent whose output quality has quietly fallen*
- **Detect quality drift** (`t-detect-drift`, The Vet) — done when the drift is reproduced on the bench. *Watch for: patching a drifting agent in place instead of regrowing it*

---

## Roles (5)

### The Herdsman — Session Manager

*Hand tier (`claude-sonnet-5`) · The Great Barn*

Keeps durable agents alive, named and resumable across days.

- Open and name a session with its assignment attached
- Checkpoint state so a session survives a restart
- Resume cleanly without replaying the whole history
- Retire a session and free its stall

Reads Assignments, Silo I state. Writes Session records, Checkpoints. Escalates to **The Sheepdog**.

### The Sheepdog — Supervisor

*Sorter tier (`claude-haiku-4-5`) · The Kennel*

Watches for the three ways a long-running agent goes wrong: stuck, looping, or quietly working on the wrong thing.

- Compare current activity against the original assignment
- Nudge a wandering agent back before killing it
- Enforce step and wall-clock ceilings
- Kill, and record why — never kill silently

Reads Heartbeats, Step counts, The assignment. Writes Nudges, Timeouts, Kill records. Escalates to **The Bell Ringer**.

### The Milkmaid — Scheduled Runner

*Hand tier (`claude-sonnet-5`) · The Henhouse*

Runs the work that happens on a cadence rather than on request.

- Fire scheduled jobs on time and exactly once
- Skip rather than stack when the previous run is still going
- Record a skipped run as loudly as a failed one
- Carry forward state between firings

Reads Schedules, Prior run state. Writes Run records, Skip records. Escalates to **The Herdsman**.

### The Vet — Health & Drift Checker

*Specialist tier (`claude-opus-5`) · The Vet Stall*

Health, not behaviour. Catches the slow problems: context bloat, quality drift, a poisoned working set.

- Probe liveness on a schedule
- Track rolling quality against the Grading Bench baseline
- Watch context size trend upward and flag it
- Refer a drifting agent back to the Greenhouse rather than patching it in place

Reads Probes, Rolling scores, Context metrics. Writes Health records, Drift referrals. Escalates to **The Nurseryman**.

### The Stablehand — Workspace Steward

*Sorter tier (`claude-haiku-4-5`) · The Paddock*

Owns the physical stalls: containers, workspaces, temp files. Cleans up after everyone.

- Provision a workspace per session
- Keep idle sessions warm but cheap
- Reclaim stalls nobody has come for
- Guarantee no workspace outlives its session

Reads Session lifecycle events. Writes Workspace records, Reclamation logs. Escalates to **The Herdsman**.

---

## Wiring across the boundary

### In (3)

- **Task** from The Dispatch Porch (The Farmhouse) → The Great Barn · *long-horizon work*
- **Memory** from Silo I — Working (The Silo Row) → The Great Barn · *resume state*
- **Control** from The Quartermaster's Hut (The Toolshed) → The Great Barn · *scoped toolbelt*

### Out (4)

- **Memory** The Great Barn → Silo I — Working (The Silo Row) · *checkpoints*
- **Signal** The Vet Stall → The Nursery Beds (The Greenhouse) · *drift referral*
- **Signal** The Great Barn → The Tower (The Watchtower) · *spans*
- **Control** The Kennel → The Bell Post (The Watchtower) · *kill record*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **What is "stray", computably?** The Sheepdog compares activity against the assignment. Until that comparison is a function, the Kennel is decoration.
- **Do scheduled runs share a session or get a fresh one?** Sharing carries state forward and accumulates context. Fresh is clean and loses continuity.
- **Is the wall-clock ceiling per run or per day?** A run that behaves and never finishes is still a problem.
- **Who may resurrect a killed session?** If the answer is "the thing that was killed", the kill switch does not work.
