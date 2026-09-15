const $ = (sel) => document.querySelector(sel);
const modal = $("#modal");
let state = { agents: [], runs: [], stats: {} };

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

function describeSchedule(s) {
  if (!s) return "manual";
  if (s.dailyAt) return `daily ${s.dailyAt}`;
  if (s.everyHours) return s.everyHours === 168 ? "weekly" : `every ${s.everyHours}h`;
  if (s.everyMinutes) return `every ${s.everyMinutes}m`;
  return "manual";
}

function when(iso) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString();
}

async function load() {
  state = await (await fetch("/api/state")).json();
  render();
}

function render() {
  const { business, stats, agents, runs } = state;
  $("#biz").textContent = business.name || "Mission Control";
  $("#bizwhat").textContent = business.what || "Run `node cli.js setup` to configure.";

  $("#stats").innerHTML = [
    ["runs", stats.total],
    ["ok", stats.ok],
    ["failed", stats.failed],
    ["spend", `$${(stats.costUsd || 0).toFixed(2)}`],
  ]
    .map(([label, value]) => `<div class="stat"><b>${esc(value)}</b><span>${label}</span></div>`)
    .join("");

  $("#agents").innerHTML = agents
    .map(
      (a) => `
    <div class="card ${a.enabled ? "" : "off"}">
      <div class="card-top">
        <h3>${esc(a.name)}</h3>
        <span class="tag ${a.nextRunAt ? "live" : ""}">${esc(describeSchedule(a.schedule))}</span>
      </div>
      <p>${esc(a.description)}</p>
      <div class="tags">
        <span class="tag">${esc(a.category)}</span>
        ${a.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
      </div>
      <button class="run-btn" data-agent="${esc(a.id)}">Run now</button>
    </div>`
    )
    .join("");

  $("#runs").innerHTML = runs.length
    ? runs
        .map(
          (r) => `
      <div class="run ${r.status === "error" ? "error" : ""}">
        <span class="pip"></span>
        <span class="when">${esc(when(r.startedAt))}</span>
        <span class="what"><strong>${esc(r.agentName)}</strong>
          <em>${esc(r.error || (r.dryRun ? "dry run" : `${(r.durationMs / 1000).toFixed(1)}s · $${r.costUsd || 0}`))}</em></span>
        ${r.artifact ? `<a href="#" data-artifact="${esc(r.artifact)}">view</a>` : "<span></span>"}
      </div>`
        )
        .join("")
    : `<div class="empty">No runs yet. Hit "Run now" on any agent.</div>`;
}

function openModal(title, html) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = html;
  modal.classList.remove("hidden");
}
const closeModal = () => modal.classList.add("hidden");

async function promptAndRun(agentId) {
  const agent = state.agents.find((a) => a.id === agentId);
  const fields = agent.inputs || [];
  const form = fields
    .map(
      (f) => `<label>${esc(f.label)}${f.required ? "" : " (optional)"}
        <textarea data-key="${esc(f.key)}"></textarea></label>`
    )
    .join("");

  openModal(
    agent.name,
    `${form || `<p class="muted">No inputs needed.</p>`}
     <button class="primary" id="go">Run ${$("#dry").checked ? "(dry run)" : ""}</button>`
  );

  $("#go").addEventListener("click", async () => {
    const btn = $("#go");
    btn.disabled = true;
    btn.textContent = "Running...";
    const input = {};
    for (const el of $("#modal-body").querySelectorAll("[data-key]")) {
      if (el.value.trim()) input[el.dataset.key] = el.value.trim();
    }
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, input, dryRun: $("#dry").checked }),
    });
    const run = await res.json();
    openModal(
      agent.name,
      run.status === "ok"
        ? `<pre>${esc(run.preview)}${run.preview.length >= 400 ? "\n\n[...] full output in data/artifacts/" + esc(run.artifact) : ""}</pre>`
        : `<pre>${esc(run.error)}</pre>`
    );
    load();
  });
}

document.addEventListener("click", async (e) => {
  const runBtn = e.target.closest("[data-agent]");
  if (runBtn) return promptAndRun(runBtn.dataset.agent);

  const link = e.target.closest("[data-artifact]");
  if (link) {
    e.preventDefault();
    const data = await (await fetch(`/api/artifact/${encodeURIComponent(link.dataset.artifact)}`)).json();
    return openModal(data.name || "Artifact", `<pre>${esc(data.contents || data.error)}</pre>`);
  }

  if (e.target.id === "modal-close" || e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());

load();
setInterval(load, 15000);
