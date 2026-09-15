# The chore protocol

The one thing every zone has to agree on. Everything else can be swapped; this cannot be swapped quietly.

---

## The chore record

A chore is the unit of work. It is created at the Farmhouse, lives on the Chore Board, and is the only thing
that moves along a `task` channel.

```jsonc
{
  "id": "ch-2026-0915-0031",
  "goal": "g-2026-0915-0007",        // the goal this serves
  "parent": null,                     // set when a Row Boss splits a batch
  "title": "Extract line items from 412 supplier PDFs",

  "assignment": {
    "zone": "fields",
    "station": "fd-east",
    "role": "r-reaper",
    "tier": "hand"                    // recommendation from the role; the Porch may override
  },

  "spec": {
    "input": "...",                   // or a pointer into Silo I
    "schema": "...",                  // required when the output is structured
    "doneWhen": "Every emitted record validates and carries provenance"
  },

  "scope": {                          // attached at the Gatehouse. NEVER widened downstream.
    "caller": "u-kd",
    "tools": ["pdf.read", "schema.validate"],
    "egress": [],
    "budget": { "tokens": 250000, "wallSeconds": 900 }
  },

  "state": "OPEN",
  "owner": null,
  "blockedOn": null,
  "attempts": 0,
  "trace": "tr-2026-0915-0031",       // set before the first model call, never after
  "history": [
    { "at": "2026-09-15T02:31:04Z", "from": null, "to": "OPEN", "by": "r-farmer" }
  ]
}
```

### Fields that are not optional

- **`trace`** is assigned before the first model call. A chore that produced output without a trace is a bug,
  not a shortcut.
- **`spec.doneWhen`** is written in a form the Grader could check. "Do a good job" is not a definition of done.
- **`scope`** travels with the chore. A zone may narrow it and may never widen it.
- **`attempts`** is how the Gleaner knows the difference between a first failure and a loop.

---

## States

```
          ┌────────────────────────────────────────────────┐
          │                                                ▼
  OPEN ──► CLAIMED ──► RUNNING ──► DONE                 REJECTED
    │          │           │                               ▲
    │          │           ├──► BLOCKED ──► RUNNING        │
    │          │           │                               │
    │          │           └──► FAILED ──► GLEANING ───────┤
    │          │                              │            │
    │          └──────────────────────────────┴──► DONE    │
    └───────────────────────────────────────────────────────┘
                    (withdrawn before anyone claimed it)
```

| State | Means | Who may set it |
| --- | --- | --- |
| `OPEN` | Posted, unclaimed | Ledger Keeper |
| `CLAIMED` | A crew has taken it, work not started | Ledger Keeper, on a crew's request |
| `RUNNING` | Work in progress, `trace` is live | The owning role |
| `BLOCKED` | Waiting on a named thing in `blockedOn` | The owning role |
| `FAILED` | This attempt failed | The owning role |
| `GLEANING` | Handed to the Fallow Field for recovery | Row Boss |
| `REJECTED` | Permanent failure, declared in writing | Gleaner only |
| `DONE` | `spec.doneWhen` is satisfied | The owning role; confirmed by the Farmer for a goal's last chore |

**Illegal transitions are refused, not logged and allowed.** The Ledger Keeper's charter says this. A state
machine that can be talked out of its rules is a suggestion.

### Two rules with teeth

1. **A chore never vanishes.** It ends at `DONE` or `REJECTED`. There is no "we stopped looking at it".
2. **`REJECTED` is a written act.** The Gleaner declares it, and the Composter turns it into a reproducible
   eval case before it is forgotten. A failure that does not become a test will happen again.

---

## The envelope

Everything crossing a channel is wrapped. The envelope is what makes a trace reconstructable.

```jsonc
{
  "channel": "task",                  // task | artifact | memory | signal | control
  "from": { "zone": "farmhouse", "station": "fh-porch", "role": "r-foreman" },
  "to":   { "zone": "fields",    "station": "fd-east",  "role": "r-reaper" },
  "chore": "ch-2026-0915-0031",
  "trace": "tr-2026-0915-0031",
  "span":  "sp-0004",
  "parentSpan": "sp-0001",
  "at": "2026-09-15T02:31:09Z",
  "body": { }
}
```

**Channel rules, enforced at the boundary:**

| Channel | May be sent by | May not |
| --- | --- | --- |
| `task` | Dispatch Porch; a Row Boss to its own rows | Be sent sideways between peers |
| `artifact` | Any executing role | Leave the farm without passing the Weigh Station |
| `memory` | Any role may read; only a store's keeper may write | Write across stores |
| `signal` | Any role | Flow anywhere but toward the Watchtower |
| `control` | A role with authority over the target | Be sent upward |

---

## Spans

A span is one action by one role. It carries what the role saw and **why it decided what it decided** — that
second part is the whole point, and it is the part most tracing gets wrong.

```jsonc
{
  "span": "sp-0004",
  "parentSpan": "sp-0001",
  "trace": "tr-2026-0915-0031",
  "role": "r-reaper",
  "station": "fd-east",
  "model": "claude-sonnet-5",
  "sawContext": ["si-semantic/doc-8841", "chore.spec"],   // what was actually in the window
  "reason": "Schema required a date; the document gives two. Took the invoice date per rule R-14.",
  "usage": { "in": 18244, "out": 1102, "cacheRead": 16000 },
  "outcome": "ok",
  "at": "2026-09-15T02:31:14Z"
}
```

- **`sawContext` is a list of what was in the window**, not a summary of it. Context tracing — where
  information was lost, and where context is burning money — depends on this being honest.
- **Failures are never sampled away.** Sample successes if you must; keep every failure in full.
- **`usage.cacheRead` at zero across repeated runs means something is silently invalidating the cache.** That
  is the Tally Clerk's job to notice, and it is usually a timestamp near the front of a prompt.

---

## Escalation

Every role has exactly one escalation target, listed in [the roster](03-ROSTER.md). The chains terminate in
one of two places: the Farmer, or a human via the Bell Post.

Escalate when you are blocked, when the spec is wrong, or when doing the work as written would be a mistake.
Do not escalate to ask permission for something already in scope.

**The Bell Post is deliberately hard to ring.** A bell that rings often stops being heard, and then it does not
matter how good the rest of this is.
