# The Watchtower — zone charter

**Observability.** The Ridge. Branch `claude/steading-watchtower`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

Sits on the high ground and can see every zone at once. If it did not happen in a trace here, it did not happen — and nobody will be able to explain it later.

### Owns

- End-to-end traces and causality
- Cost and token accounting
- Load and anomaly forecasting
- Alerting and paging a human
- Quality reporting and SLOs

### Where it breaks

Logging records that an agent ran but not why it decided what it decided. A timestamp is not a trace; capture the reasoning and the inputs it saw.

---

## Build this first

1. **Spans, before any model call happens anywhere.** Instrument first, generate second. The reverse order accumulates behaviour you cannot explain.
2. A way to read one trace end to end in a terminal. Not a dashboard.
3. Cost attribution to a chore — including retries — before the first fan-out.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- "Why did it do that" is answerable from stored data, without re-running anything.
- Failures are never sampled away.
- Cost is reported per completed task, which is the only honest version of the number.

---

## Stations (4)

### The Tower

Every run, end to end, with the reasoning attached. The only place the whole farm is visible at once.

| | |
| --- | --- |
| Takes in | Spans from every zone · Inputs each agent actually saw · Decisions and their stated reasons |
| Puts out | A replayable trace per run · The causal chain behind any single output |
| Roles | The Watchman · The Surveyor |

- **Trace a run end to end** (`t-trace-run`, The Watchman) — done when causality survives every zone handoff. *Watch for: spans that record the call but not the reason*
- **Replay a failure** (`t-replay-failure`, The Watchman) — done when the failure is explained from the trace without re-running it. *Watch for: sampling that discarded the failing run*

### The Windmill

Reads which way the load is blowing. Forecasts demand and flags anomalies before they become incidents.

| | |
| --- | --- |
| Takes in | Historical throughput · Queue depth · Live error rates |
| Puts out | A load forecast · Anomaly flags · Advice to the Dispatcher on how hard to run |
| Roles | The Weathervane |

- **Forecast load** (`t-forecast-load`, The Weathervane) — done when the Dispatcher gets warning early enough to act. *Watch for: treating a spike as a trend, or the reverse*

### The Bell Post

Wakes a human. Deliberately hard to ring, because a bell that rings often stops being heard.

| | |
| --- | --- |
| Takes in | A breached threshold · A stuck or looping agent · A budget overrun |
| Puts out | A page with the trace link attached · An incident record |
| Roles | The Bell Ringer |

- **Ring the bell** (`t-raise-alarm`, The Bell Ringer) — done when a human has something actionable and duplicates are suppressed. *Watch for: ringing often enough that the bell stops being heard*

### The Tally Office

Counts what everything cost. Tokens, calls, wall time, and cost per completed task — not per request.

| | |
| --- | --- |
| Takes in | Token usage per span · Per-zone budgets |
| Puts out | Cost per task and per zone · Budget burn-down · The stop order when a budget is spent |
| Roles | The Tally Clerk |

- **Account for spend** (`t-account-spend`, The Tally Clerk) — done when cost is attributed to a chore, not just to a day. *Watch for: a cheap request that needed four retries being counted as cheap*

---

## Roles (5)

### The Watchman — Tracer

*Sorter tier (`claude-haiku-4-5`) · The Tower*

Captures every run end to end, with the reasoning attached. If it is not traced, it did not happen.

- Emit a span per agent action with inputs, outputs and the stated reason
- Preserve causality across zone handoffs
- Make any run replayable from the trace alone
- Sample nothing that failed — failures are always kept in full

Reads Events from every zone. Writes Traces, Span trees. Escalates to **The Surveyor**.

### The Weathervane — Forecaster

*Sorter tier (`claude-haiku-4-5`) · The Windmill*

Reads the trend and warns before it becomes an incident.

- Forecast load from throughput and queue depth
- Detect anomalies against the zone's own baseline
- Warn the Dispatcher early enough to matter
- Distinguish a spike from a trend

Reads Throughput history, Queue depth, Error rates. Writes Forecasts, Anomaly flags. Escalates to **The Bell Ringer**.

### The Tally Clerk — Cost Accountant

*Sorter tier (`claude-haiku-4-5`) · The Tally Office*

Counts what everything cost, per completed task rather than per request.

- Attribute tokens and wall time to a zone and a chore
- Report cost per completed task, which is the only honest number
- Track cache hit rate and flag silent invalidation
- Issue the stop order when a budget is spent

Reads Usage per span, Budgets. Writes Cost reports, Burn-down, Stop orders. Escalates to **The Bell Ringer**.

### The Bell Ringer — Alerting

*Sorter tier (`claude-haiku-4-5`) · The Bell Post*

Wakes a human, rarely. Owns the judgement of what is worth someone's night.

- Page only on breached thresholds that a human can act on
- Attach the trace link to every page
- Suppress duplicates and storms
- Keep the bar high — a bell that rings often stops being heard

Reads Thresholds, Anomaly flags, Kill records. Writes Pages, Incident records. Escalates to **A human**.

### The Surveyor — Quality Reporter

*Specialist tier (`claude-opus-5`) · The Tower*

Turns telemetry into a picture a human can act on. Owns the weekly read on whether the farm is getting better.

- Maintain SLOs per zone
- Report trend, not just current state
- Tie quality movements to what changed
- Say plainly when a change made things worse

Reads Traces, Scores, Cost reports. Writes Dashboards, The weekly report. Escalates to **The Farmer**.

---

## Wiring across the boundary

### In (6)

- **Signal** from North Field — Sowing (The Fields) → The Tower · *spans*
- **Signal** from The Great Barn (The Barn) → The Tower · *spans*
- **Signal** from The Gatehouse (The Gatehouse) → The Tower · *spans*
- **Signal** from The Scarecrow Post (The Fields) → The Tower · *quarantines*
- **Control** from The Kennel (The Barn) → The Bell Post · *kill record*
- **Signal** from The Market Stall (The Gatehouse) → The Tower · *receipt*

### Out (2)

- **Control** The Tally Office → The Well (The Farmhouse) · *burn-down*
- **Signal** The Windmill → The Dispatch Porch (The Farmhouse) · *load forecast*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **What sampling rate for successes?** Keeping everything is simplest and gets expensive exactly when the system gets interesting.
- **Who owns the paging threshold?** Thresholds get loosened under pressure, always by someone reasonable, always for a good reason that night.
- **Span-level or chore-level cost?** Chore is more useful to act on; span is more accurate. Probably both, which means reconciling them.
- **What does the Watchtower do when a zone stops reporting?** Silence currently looks identical to health.
