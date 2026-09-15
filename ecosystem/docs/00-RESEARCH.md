# Research — what actually works in agent ecosystems

*Gathered 15 September 2026, before any of the design in this repo was fixed. The conclusions here are
what the rest of the repo is built on; where I made a judgement call that the sources don't settle, it
says so.*

---

## 1. The finding that should shape everything else

Multi-agent systems are no longer research demos — and they fail at a rate that should make you
conservative. Roughly **40% of multi-agent pilots fail within six months of production deployment**, and the
most-cited cause is not model quality. It is teams picking an orchestration pattern that does not fit their
problem, or picking the right one without understanding how it breaks.
([explainx](https://explainx.ai/blog/multi-agent-orchestration-patterns-guide-2026),
[TechAhead](https://www.techaheadcorp.com/blog/ways-multi-agent-ai-fails-in-production/))

Adoption is real: Gartner recorded a **1,445% increase in multi-agent system inquiries** between Q1 2024 and
Q2 2025, and Salesforce's 2026 Connectivity Benchmark put the average organisation at **12 agents, projected
to grow 67% within two years**.
([beam.ai](https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production))

**What I took from this.** The failure rate is a design constraint, not a caveat. Every zone in this repo has
an explicit `failsWhen` field, and every task has a `watchFor`. Those fields are not decoration — they are the
part most likely to save the project, and they are written before any code exists.

---

## 2. Don't build an agent until you have to

The most useful distinction in the literature is Anthropic's: a **workflow** is a system where models and
tools are orchestrated through predefined code paths; an **agent** is a system where the model dynamically
directs its own process and tool use.
([Anthropic, *Building Effective AI Agents*](https://www.anthropic.com/engineering/building-effective-agents))

Five composable patterns cover most of what people actually need, none of which require a full agent:

| Pattern | Shape | Use when |
| --- | --- | --- |
| **Prompt chaining** | Step → step → step | The task decomposes into fixed stages |
| **Routing** | Classify, then dispatch | Distinct input categories need distinct handling |
| **Parallelisation** | Fan out, fan in | Subtasks are genuinely independent |
| **Orchestrator–workers** | A manager splits and synthesises | Subtasks aren't known until you see the input |
| **Evaluator–optimiser** | Generate, grade, revise | Clear criteria exist and iteration measurably helps |

Most production systems **combine** patterns rather than committing to one.
([digitalapplied](https://www.digitalapplied.com/blog/multi-agent-orchestration-5-patterns-that-work),
[glukhov](https://www.glukhov.org/ai-systems/architecture/multi-agent-orchestration-patterns/))

Before building an agent at all, four questions are worth answering honestly: is the task genuinely hard to
specify up front, does the outcome justify the cost and latency, is the model actually good at this class of
work, and can errors be caught and recovered. A "no" to any of them means stay at a simpler tier.

**What I took from this.** The Fields are deliberately *workflow*-shaped: rows run a fixed spec with no
autonomy. Only the Farmhouse, the Row Boss and the Nurseryman are true agents that decide their own path.
That is a ratio worth defending — three orchestrating roles against dozens of constrained ones.

---

## 3. Orchestrator–worker has one specific failure, and it is context

Orchestrator–worker buys parallelism while keeping one accountable brain. The cost is that
**the orchestrator accumulates context from every worker**, and at roughly **four or more concurrent workers,
context frequently exceeds window limits**.
([beam.ai](https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production))

The related failure is subtler: **context window contention**. One agent consuming 80% of available context
on a large document starves a second agent that had plenty of capacity in isolation. The system has enough
room in aggregate and still fails.
([futureagi](https://futureagi.com/blog/trace-debug-multi-agent-systems-observability-guide/))

Shared-resource exhaustion generalises past context — **database connection pool exhaustion** from agents
draining a shared pool is a documented production failure.
([Augment Code](https://www.augmentcode.com/guides/multi-agent-ai-production-requirements))

At the top of hierarchical systems sits a scheduler or supervisor tier that partitions work, assigns
subgoals, tracks dependencies and **controls budget**; beneath it sit workers, critics, reducers, verifiers
and aggregators. ([dev.to](https://dev.to/monuminu/ai-agent-architecture-2026-building-production-grade-systems-patterns-benchmarks-and-lessons-5d34))

**What I took from this.** Two structural decisions:

1. **The Row Boss exists specifically because of the four-worker ceiling.** A field's sub-orchestrator reports
   one result upward, not fifty. The Farmhouse's `failsWhen` names this directly.
2. **The Well is a first-class station**, not a config value. Capacity is a shared resource that one zone can
   drain, so it gets a keeper, per-zone ceilings, and reserved headroom for the Gatehouse so the farm stays
   reachable under load.

---

## 4. Memory is four things, and conflating them is how systems go senile

The architecture that keeps recurring mirrors human cognition: **short-term** memory for the current
conversation, **working** memory for active reasoning, and **long-term** memory split into **episodic**,
**semantic** and **procedural** stores.
([Redis](https://redis.io/blog/long-term-memory-architectures-ai-agents/),
[dev.to](https://dev.to/pat9000/ai-agent-memory-in-2026-how-it-works-and-when-to-use-it-e6m))

- **Semantic** — facts and concepts independent of time: preferences, domain rules, distilled summaries.
- **Episodic** — time-indexed experience: specific conversations, specific tool calls, in order.
- **Procedural** — learned behaviour that updates the agent's own instructions over time.

Consolidation is the mechanism that keeps this from growing without bound: **an episode is distilled into a
semantic fact when it stays useful without its original context, and the raw episode drops out.**

The sharpest practical warning: **vector stores are good at semantic similarity and bad at exact sequences and
time.** The thing you need when debugging is "on 20 June at step 4 I called the pricing API, got a 429, then
retried with backoff" — and that is exactly what a vector store will not give you back reliably.

Past simple recall, the hard problems arrive quickly: **write policy, memory drift, and deciding what gets
promoted** from transient execution state into durable knowledge. The research literature is actively working
this — typed semantic memory with information-theoretic retrieval
([Memanto](https://arxiv.org/pdf/2604.22085)), multi-resolution substrates for long-lived agents
([MRMS](https://arxiv.org/pdf/2607.04617)), provenance-grounded memory
([Eywa](https://arxiv.org/pdf/2605.30771)), and contamination defence
([MemGuard](https://arxiv.org/pdf/2605.28009)).

The consensus advice for a first build is nonetheless: **start simple.** A conversation buffer and a basic
vector store cover most cases.

**What I took from this.** The Silo Row is four separate stores on purpose, with the episode log
**append-only** and kept out of the vector store. The Winnower owns promotion and is forbidden from promoting
something a single run asserted once. The Water Carrier returns **provenance with every passage** — the Eywa
result, applied cheaply. And per "start simple": nothing here requires a vector database on day one.

---

## 5. Observability has to capture reasoning, not events

The failure mode named repeatedly: traditional logging captures *"Agent B called at 2:34 PM"* and misses the
thing that matters — **why Agent B decided what it decided**. Standard infrastructure monitoring cannot
capture the failures that matter in a multi-agent system; it needs purpose-built instrumentation.
([futureagi](https://futureagi.com/blog/trace-debug-multi-agent-systems-observability-guide/),
[Galileo](https://galileo.ai/blog/multi-agent-ai-failures-prevention))

**Context tracing** — where information was lost, and where excessive context is burning money — is called out
as its own discipline separate from request tracing.

The characteristics common to deployments that *did* work: **high task independence, explicit coordination
protocols, comprehensive observability, and systematic validation.**
([Augment Code](https://www.augmentcode.com/guides/multi-agent-ai-systems),
[orq.ai](https://orq.ai/blog/why-do-multi-agent-llm-systems-fail))

**What I took from this.** The Watchman's charter says a span carries *the reason*, not just the call, and
**failures are never sampled away**. Task independence is why field rows are forbidden from depending on each
other — the Fields' `failsWhen` is exactly this. Explicit coordination is the Chore Board: if it is not on the
board, it is not happening.

---

## 6. Cost is a design decision made early

Model selection per role, from the current lineup:

| Model | Context | Input / 1M | Output / 1M | Fits |
| --- | --- | --- | --- | --- |
| `claude-opus-5` | 1M | $5.00 | $25.00 | Orchestration, synthesis, anything where being wrong is expensive |
| `claude-sonnet-5` | 1M | $2.00 | $10.00 | Bulk execution under a clear spec |
| `claude-haiku-4-5` | 200K | $1.00 | $5.00 | Classify, route, extract, score |

Two things that matter more than the table:

- **Cost per *completed task*, not per request.** A cheaper request that needs three retries to finish the job
  is not cheaper. The Tally Clerk's charter says this explicitly.
- **Caches are model-scoped.** A cost cascade across three models forfeits cache reuse between them. Measure
  the capable model at lower effort before you build a cascade — on current models, lower effort often beats
  the previous generation at high effort.

**What I took from this.** Tiers are recommendations attached to roles, not rules, and the roster says so.
The cheapest real win is upstream of model choice anyway: the Irrigation Head exists because *how much context
each row sees* is a larger cost lever than which model reads it.

---

## 7. What the sources do not settle

Honest gaps, flagged so nobody mistakes them for decided:

- **How many agents is too many.** "Average of 12" is an observation, not a recommendation. The Pruner exists
  because I expect the answer to be "fewer than you built", but that is a bet.
- **Whether procedural memory should self-modify.** Agents rewriting their own system prompts is described in
  the memory literature but is a genuine risk surface. Here, the Granary requires versioned, diffable,
  reversible changes and the Nurseryman gates promotion — deliberately more conservative than the sources.
- **Whether a farm metaphor survives scale.** It is doing real work right now: it forces every concept to have
  one location and one owner, and it makes the org chart legible at a glance. If it ever starts deciding
  architecture instead of describing it, drop it.

---

## Sources

- [Anthropic — Building Effective AI Agents](https://www.anthropic.com/engineering/building-effective-agents)
- [beam.ai — 6 Multi-Agent Orchestration Patterns for Production (2026)](https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production)
- [digitalapplied — Multi-Agent Orchestration: 5 Patterns That Work in 2026](https://www.digitalapplied.com/blog/multi-agent-orchestration-5-patterns-that-work)
- [explainx — Multi-Agent Orchestration Patterns: Production Guide for 2026](https://explainx.ai/blog/multi-agent-orchestration-patterns-guide-2026)
- [Rost Glukhov — Multi-Agent Orchestration Patterns: A Practical Guide](https://www.glukhov.org/ai-systems/architecture/multi-agent-orchestration-patterns/)
- [dev.to — AI Agent Architecture 2026: Building Production-Grade Systems](https://dev.to/monuminu/ai-agent-architecture-2026-building-production-grade-systems-patterns-benchmarks-and-lessons-5d34)
- [Redis — Long-Term Memory Architectures for AI Agents](https://redis.io/blog/long-term-memory-architectures-ai-agents/)
- [dev.to — AI Agent Memory in 2026: How It Works and When to Use It](https://dev.to/pat9000/ai-agent-memory-in-2026-how-it-works-and-when-to-use-it-e6m)
- [Memanto — Typed Semantic Memory with Information-Theoretic Retrieval](https://arxiv.org/pdf/2604.22085)
- [MRMS — A Multi-Resolution Memory Substrate for Long-Lived AI Agents](https://arxiv.org/pdf/2607.04617)
- [Eywa — Provenance-Grounded Long-Term Memory for AI Agents](https://arxiv.org/pdf/2605.30771)
- [MemGuard — Preventing Memory Contamination in Long-Term Memory-Augmented LLMs](https://arxiv.org/pdf/2605.28009)
- [Future AGI — Trace and Debug Multi-Agent Systems in 2026](https://futureagi.com/blog/trace-debug-multi-agent-systems-observability-guide/)
- [Galileo — Why Multi-Agent AI Systems Fail and How to Fix Them](https://galileo.ai/blog/multi-agent-ai-failures-prevention)
- [Augment Code — Multi-Agent AI Production Requirements](https://www.augmentcode.com/guides/multi-agent-ai-production-requirements)
- [Augment Code — Multi-Agent AI Systems: Architecture & Failure Modes](https://www.augmentcode.com/guides/multi-agent-ai-systems)
- [orq.ai — Why Multi-Agent LLM Systems Fail](https://orq.ai/blog/why-do-multi-agent-llm-systems-fail)
- [TechAhead — The Multi-Agent Reality Check: 7 Failure Modes](https://www.techaheadcorp.com/blog/ways-multi-agent-ai-fails-in-production/)
- [Maxim — Multi-Agent System Reliability: Failure Patterns and Root Causes](https://www.getmaxim.ai/articles/multi-agent-system-reliability-failure-patterns-root-causes-and-production-validation-strategies/)
