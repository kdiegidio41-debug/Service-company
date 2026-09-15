# The Toolshed — zone charter

**Tools & integrations.** Works Yard. Branch `claude/steading-toolshed`.

> This is the deep dive for one zone. The whole ecosystem is in [the README](../README.md);
> the map is [map/steading-map.html](../map/steading-map.html).

---

## Charter

Every capability an agent has, it got from here. Tools are built, sharpened, catalogued and handed out — and taken away again when they go dull.

### Owns

- Tool and MCP server construction
- External API adapters
- Tool schemas and descriptions
- The tool registry and who may hold what
- Deprecation and removal

### Where it breaks

Tools accumulate and nothing is ever retired. A crowded toolbelt costs context on every single call and makes the right tool harder to pick.

---

## Build this first

1. **The registry, with a cost profile per tool.** Before any tool exists, the thing that decides who may hold what.
2. The Quartermaster's time-boxed issue and return, with an audit line for each.
3. Tools themselves last. Most capability gaps are better filled by an existing MCP server than a new tool.

See [docs/05-BUILD-ORDER.md](../docs/05-BUILD-ORDER.md) for where this sits against the other zones.

---

## What this zone promises everyone else

- A role holds only the tools its current chore needs, and gives them back.
- No agent ever sees a raw credential. The Wright owns refresh.
- Every tool's failure modes are written down before it ships.

---

## Stations (4)

### The Toolshed

The tool catalogue. What exists, what it does, what it costs, and which roles are allowed to pick it up.

| | |
| --- | --- |
| Takes in | New tools from the Smithy · Usage data from the Watchtower |
| Puts out | The registry · A per-role toolbelt · A deprecation notice |
| Roles | The Sharpener |

- **Register a tool** (`t-register-tool`, The Sharpener) — done when cost and permitted roles are recorded alongside it. *Watch for: registry entries for tools nothing has called in a season*
- **Issue a toolbelt** (`t-issue-toolbelt`, The Quartermaster) — done when no tool is issued that the chore does not need. *Watch for: issuing the full catalogue because it is easier*

### The Smithy

Tools are forged here. Function tools, MCP servers, and the adapters that make a stubborn external API behave.

| | |
| --- | --- |
| Takes in | A capability gap named by a zone · An external API's documentation |
| Puts out | A working tool with a tested schema · An MCP server · Its failure modes, written down |
| Roles | The Smith · The Wright |

- **Forge a tool** (`t-forge-tool`, The Smith) — done when it has been tested against the real service and its errors are recoverable. *Watch for: a tool tested only against a mock*
- **Write the tool's description** (`t-write-tool-schema`, The Sharpener) — done when an agent picks it correctly without picking it wrongly elsewhere. *Watch for: two tools whose descriptions overlap*

### The Tractor Yard

Heavy machinery: code execution, batch runs, the sandbox where a tool can do real damage cheaply.

| | |
| --- | --- |
| Takes in | A job too big or too risky for a normal row |
| Puts out | Batch results · A sandboxed execution record |
| Roles | The Tractor Driver |

- **Run heavy or untrusted work** (`t-run-batch`, The Tractor Driver) — done when results are keyed to their request and the sandbox held. *Watch for: matching batch results by position instead of by key*

### The Quartermaster's Hut

Signs tools in and out. A role holds only the tools its current chore needs, and gives them back afterwards.

| | |
| --- | --- |
| Takes in | A chore and its assigned role |
| Puts out | A scoped, time-boxed toolbelt · An audit line for every issue and return |
| Roles | The Quartermaster |

- **Time-box and return tools** (`t-scope-tools`, The Quartermaster) — done when every issue has a matching return. *Watch for: tools still held after the chore closed*

---

## Roles (5)

### The Smith — Tool Builder

*Specialist tier (`claude-opus-5`) · The Smithy*

Forges the tools. A tool is not done until its failure modes are written down.

- Build function tools and MCP servers to a named gap
- Make errors informative enough for an agent to recover from
- Test against the real external service, not a mock
- Document every way the tool can fail

Reads Capability gaps, External API docs. Writes Tools, MCP servers, Failure-mode notes. Escalates to **The Quartermaster**.

### The Sharpener — Tool Curator

*Specialist tier (`claude-opus-5`) · The Toolshed*

Tool descriptions are prompts. Keeps them short, unambiguous and honest about cost.

- Write descriptions an agent can choose correctly from
- Collapse near-duplicate tools
- Watch for tools that are never picked and find out why
- Retire dull tools — a crowded toolbelt costs every call

Reads Tool usage data, Mis-selection traces. Writes Sharpened schemas, Deprecation notices. Escalates to **The Quartermaster**.

### The Quartermaster — Tool Registry & Permissions

*Hand tier (`claude-sonnet-5`) · The Quartermaster's Hut*

Issues a toolbelt scoped to the chore at hand, and takes it back afterwards.

- Issue the minimum toolbelt a chore needs
- Time-box every issue
- Log every issue and return
- Refuse a request for tools outside the chore's scope

Reads Chores, The registry, Role scopes. Writes Toolbelts, The tool audit log. Escalates to **The Gatekeeper**.

### The Wright — Integration Engineer

*Hand tier (`claude-sonnet-5`) · The Smithy*

Makes stubborn external systems behave. Adapters, retries, pagination, auth refresh.

- Wrap external APIs behind a stable internal shape
- Handle pagination and partial failure inside the adapter
- Own credential refresh so no agent ever sees a raw secret
- Absorb upstream breaking changes without the farm noticing

Reads External API behaviour, Failure reports. Writes Adapters, Integration health notes. Escalates to **The Smith**.

### The Tractor Driver — Batch & Sandbox Operator

*Hand tier (`claude-sonnet-5`) · The Tractor Yard*

Runs the heavy and the dangerous: batch jobs and code execution, always inside a sandbox.

- Route large volume to batch rather than live calls
- Execute untrusted code only in the yard, never in a zone
- Cap runtime and output size
- Return results keyed to their request, never by position

Reads Batch jobs, Code to execute. Writes Batch results, Sandbox execution records. Escalates to **The Fencewright**.

---

## Wiring across the boundary

### In (1)

- **Task** from The Dispatch Porch (The Farmhouse) → The Tractor Yard · *batch job*

### Out (2)

- **Control** The Quartermaster's Hut → North Field — Sowing (The Fields) · *scoped toolbelt*
- **Control** The Quartermaster's Hut → The Great Barn (The Barn) · *scoped toolbelt*

---

## Open questions

Unresolved on purpose. These are the decisions worth making deliberately rather than discovering.

- **Is the toolbelt fixed at routing time, or may a role request more mid-chore?** Mid-chore requests are convenient and are a scope-widening hole. Probably: no, and escalate instead.
- **How long does an unused tool live before removal?** A crowded toolbelt costs context on every call. Nobody enjoys deleting tools, so the policy has to exist before the sentiment does.
- **Build or wrap?** The Smithy forges tools; most needs are better met by wrapping an MCP server. The registry must not care which, or it will start preferring one.
- **Who owns a tool that two zones both depend on?** The Toolshed, in theory. In practice whoever last fixed it.
