import { runAgent } from "./runner.js";

/**
 * Minutes between runs for a spec's schedule, or null if it is manual-only.
 * Supported shapes: {everyMinutes: N}, {everyHours: N}, {dailyAt: "HH:MM"}.
 */
export function intervalMinutes(schedule) {
  if (!schedule) return null;
  if (schedule.everyMinutes) return Number(schedule.everyMinutes);
  if (schedule.everyHours) return Number(schedule.everyHours) * 60;
  if (schedule.dailyAt) return 24 * 60;
  return null;
}

/** Next fire time for a schedule, given the last time it ran. */
export function nextRunAt(schedule, lastRun = null, now = new Date()) {
  const mins = intervalMinutes(schedule);
  if (mins == null) return null;

  if (schedule.dailyAt) {
    const [h, m] = String(schedule.dailyAt).split(":").map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next;
  }
  const base = lastRun ? new Date(lastRun) : now;
  return new Date(base.getTime() + mins * 60_000);
}

/**
 * Runs enabled, scheduled agents forever. Ticks once a minute; an agent whose
 * next-run time has passed is executed, then rescheduled from the finish time.
 *
 * @returns {{stop: () => void}} handle for tests and clean shutdown.
 */
export function startScheduler({ agents, config, client, dryRun = false, log = console.log }) {
  const scheduled = agents.filter((a) => intervalMinutes(a.schedule) != null);
  const due = new Map();
  const now = new Date();
  for (const agent of scheduled) {
    due.set(agent.id, nextRunAt(agent.schedule, null, now));
    log(`  scheduled ${agent.name} -> ${due.get(agent.id).toLocaleString()}`);
  }
  if (!scheduled.length) {
    log("  no enabled agents have a schedule; nothing to run automatically.");
  }

  let running = false;
  const tick = async () => {
    if (running) return; // never overlap ticks
    running = true;
    try {
      for (const agent of scheduled) {
        const at = due.get(agent.id);
        if (!at || at > new Date()) continue;
        log(`[${new Date().toLocaleTimeString()}] running ${agent.name}...`);
        const run = await runAgent({
          agent,
          config,
          client,
          input: { __trigger: "schedule" },
          dryRun,
        });
        log(
          run.status === "ok"
            ? `  done in ${(run.durationMs / 1000).toFixed(1)}s -> data/artifacts/${run.artifact}`
            : `  FAILED: ${run.error}`
        );
        due.set(agent.id, nextRunAt(agent.schedule, new Date(), new Date()));
      }
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, 60_000);
  tick();
  // `tick` and `due` are returned so the firing path can be tested without
  // waiting on the real interval.
  return { stop: () => clearInterval(timer), due, tick };
}
