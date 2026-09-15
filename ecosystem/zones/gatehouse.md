# The Gatehouse — zone charter

**Security & the outside world.** South Gate. Branch `claude/steading-gatehouse`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

The only lawful way in or out. Every request from outside is identified here, every artifact leaving is inspected here, and the fence line is everyone's business.

### Owns

- Identity and scopes
- Sandboxing and blast radius
- Rate limiting and fair share
- Outbound inspection for secrets and PII
- The external interface humans actually touch

### Where it breaks

The fence is treated as the gate's problem alone. Egress from a field row is a hole in the fence no matter how well the gate is staffed.

---

## Build this first

1. **Authenticate, and attach a scope that travels.** Before the first external request, not after.
2. The Weigh Station before anything is delivered to anyone but you.
3. The Fencewright's egress allowlists before any untrusted content reaches a row.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- Scopes attach at intake and cannot widen inside the farm.
- Nothing leaves unweighed.
- A refusal carries a reason. Nothing fails silently at the boundary.

---

## Stations (4)

### The Gatehouse

The only lawful entrance. Identifies who is asking, what they may ask for, and hands the request to the Farmhouse.

| | |
| --- | --- |
| Takes in | External requests · Credentials and scopes |
| Puts out | An authenticated, scoped goal · A refusal with a reason |
| Roles | The Gatekeeper · The Toll Taker |

- **Authenticate a caller** (`t-authenticate`, The Gatekeeper) — done when identity is established before any farm resource is touched. *Watch for: work beginning before identity resolves*
- **Attach scopes to a goal** (`t-scope-request`, The Gatekeeper) — done when scopes travel with the goal and cannot widen inside the farm. *Watch for: a zone granting itself more reach than the goal carried*

### The Fence Line

Blast radius. Network egress, filesystem reach and credential scope for every zone — the fence is checked from the inside.

| | |
| --- | --- |
| Takes in | Per-zone isolation policy |
| Puts out | Enforced sandbox boundaries · A breach alarm |
| Roles | The Fencewright |

- **Enforce the fence** (`t-enforce-sandbox`, The Fencewright) — done when the boundary is enforced at the platform, not requested in a prompt. *Watch for: relying on an instruction where a firewall rule belongs*

### The Market Stall

What the outside world actually sees and touches. Delivery of finished artifacts, in the form the asker wanted.

| | |
| --- | --- |
| Takes in | Finished artifacts · The original request's delivery preference |
| Puts out | The delivered result · A receipt linked to its trace |
| Roles | The Marketkeeper · The Herald |

- **Deliver the result** (`t-deliver-artifact`, The Marketkeeper) — done when delivery is confirmed, not assumed. *Watch for: reporting success on an unconfirmed send*

### The Weigh Station

Nothing leaves unweighed. Outbound inspection for secrets, PII, policy violations and claims the farm cannot support.

| | |
| --- | --- |
| Takes in | Every artifact bound for the outside |
| Puts out | A cleared artifact · A redaction · A block, with the reason recorded |
| Roles | The Inspector |

- **Weigh an outbound artifact** (`t-inspect-outbound`, The Inspector) — done when nothing leaves that was not inspected. *Watch for: secrets pasted into an artifact as evidence*

---

## Roles (6)

### The Gatekeeper — Identity & Authorisation

*Hand tier (`claude-sonnet-5`) · The Gatehouse*

Decides who is asking and what they are allowed to ask for. Everything inbound passes here.

- Authenticate every external request
- Attach scopes that travel with the goal through the whole farm
- Refuse with a reason rather than failing silently
- Never let a scope widen once inside

Reads Credentials, Policy. Writes Authenticated, scoped goals, Refusals. Escalates to **A human**.

### The Fencewright — Isolation Engineer

*Specialist tier (`claude-opus-5`) · The Fence Line*

Owns blast radius. Network egress, filesystem reach and credential scope, enforced per zone.

- Define what each zone may reach
- Enforce egress allowlists at the boundary, not in prompts
- Keep credentials out of agent-visible context entirely
- Alarm on any attempt to cross a fence

Reads Isolation policy, Egress attempts. Writes Sandbox configuration, Breach alarms. Escalates to **The Gatekeeper**.

### The Toll Taker — Rate Limiter

*Sorter tier (`claude-haiku-4-5`) · The Gatehouse*

Fair share at the entrance. Stops one caller consuming the farm.

- Throttle per caller, not just in aggregate
- Return a retry-after rather than a bare failure
- Reserve headroom so the farm stays reachable under load
- Escalate sustained abuse rather than absorbing it

Reads Per-caller request rates. Writes Throttle decisions, Abuse reports. Escalates to **The Gatekeeper**.

### The Inspector — Outbound Guard

*Specialist tier (`claude-opus-5`) · The Weigh Station*

Nothing leaves unweighed. The last check before the farm's work becomes someone else's problem.

- Scan every outbound artifact for secrets and personal data
- Block claims the farm cannot support with a trace
- Redact rather than block where redaction is enough
- Record every block with its reason

Reads Outbound artifacts, Policy. Writes Cleared artifacts, Redactions, Block records. Escalates to **The Gatekeeper**.

### The Marketkeeper — Delivery Interface

*Hand tier (`claude-sonnet-5`) · The Market Stall*

Hands the finished work to whoever asked for it, in the shape they wanted it.

- Deliver in the requested format and channel
- Attach a receipt linked to the run's trace
- Confirm delivery rather than assuming it
- Hold artifacts the Inspector has not cleared

Reads Cleared artifacts, Delivery preferences. Writes Deliveries, Receipts. Escalates to **The Gatekeeper**.

### The Herald — Human Notifier

*Sorter tier (`claude-haiku-4-5`) · The Market Stall*

Tells the humans what the farm did, without making them come and look.

- Summarise a run in the fewest words that stay true
- Notify on completion of long work
- Never notify for routine progress
- Lead with what the reader would act on

Reads Run outcomes, The Surveyor's report. Writes Notifications, Summaries. Escalates to **The Marketkeeper**.

---

## Wiring across the boundary

### In (1)

- **Artifact** from South Field — Threshing (The Fields) → The Weigh Station · *finished work*

### Out (4)

- **Task** The Gatehouse → The Farmhouse (The Farmhouse) · *scoped goal*
- **Signal** The Gatehouse → The Tower (The Watchtower) · *spans*
- **Control** The Fence Line → The Scarecrow Post (The Fields) · *isolation policy*
- **Signal** The Market Stall → The Tower (The Watchtower) · *receipt*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **Refuse or degrade an out-of-scope request?** Refusing is honest. Degrading is friendlier and teaches callers that scope is negotiable.
- **May the Weigh Station block, or only redact and flag?** Blocking outright is safer and will eventually block something important at a bad moment.
- **Where do credentials actually live?** No agent may see them and the Wright must use them. That implies a substitution layer nobody has designed yet.
- **Is the Toll Taker per-caller, per-key, or per-identity?** They diverge the moment one person holds two keys.
