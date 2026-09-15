import { render } from "./template.js";
import { recordRun, saveArtifact } from "./store.js";
import { estimateCost } from "./pricing.js";

/** Server-side tools an agent spec may request by short name. */
const TOOLS = {
  web_search: { type: "web_search_20260209", name: "web_search" },
  code_execution: { type: "code_execution_20260521", name: "code_execution" },
};

function buildContext(config, agent, overrides = {}) {
  const now = new Date();
  return {
    business: config.business,
    ...config.vars,
    ...overrides,
    date: now.toISOString().slice(0, 10),
    time: now.toISOString().slice(11, 16),
    agent: { id: agent.id, name: agent.name },
  };
}

/** Pulls the readable answer out of a response, ignoring thinking and tool blocks. */
function extractText(content) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function artifactName(agent, context) {
  const base = render(agent.output?.filename || `${agent.id}-{{date}}.md`, context);
  return `${Date.now()}-${base}`;
}

/**
 * Runs one agent end to end and records the result. Never throws for an API
 * failure -- a failed run is recorded with status "error" so the scheduler and
 * dashboard can show it instead of the process dying.
 *
 * @param {object} opts.client  An Anthropic SDK client, or null when dryRun.
 */
export async function runAgent({ agent, config, client, input = {}, dryRun = false }) {
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const context = buildContext(config, agent, input);
  const model = agent.model || config.defaults.model;
  const effort = agent.effort || config.defaults.effort;
  const prompt = render(agent.prompt, context);
  const system = render(agent.system || "", context);

  const base = {
    agentId: agent.id,
    agentName: agent.name,
    model,
    startedAt,
    trigger: input.__trigger || "manual",
  };

  if (dryRun) {
    const body =
      `# ${agent.name} (dry run)\n\n` +
      `No API call was made. This is the exact prompt that would have been sent:\n\n` +
      `## System\n\n${system || "(none)"}\n\n## Prompt\n\n${prompt}\n`;
    const file = saveArtifact(artifactName(agent, context), body);
    return recordRun({
      ...base,
      status: "ok",
      dryRun: true,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      artifact: file.split("/").pop(),
      preview: body.slice(0, 400),
      usage: {},
      costUsd: 0,
    });
  }

  try {
    const tools = (agent.tools || [])
      .map((name) => TOOLS[name])
      .filter(Boolean);

    const request = {
      model,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: { effort },
      messages: [{ role: "user", content: prompt }],
    };
    if (system) {
      request.system = [
        { type: "text", text: system, cache_control: { type: "ephemeral" } },
      ];
    }
    if (tools.length) request.tools = tools;

    const stream = client.messages.stream(request);
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      throw new Error(
        `Model declined this request (${response.stop_details?.category || "unspecified"}). Rewrite the agent prompt.`
      );
    }

    const text = extractText(response.content);
    const file = saveArtifact(artifactName(agent, context), text);

    return recordRun({
      ...base,
      status: "ok",
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      artifact: file.split("/").pop(),
      preview: text.slice(0, 400),
      usage: response.usage,
      costUsd: Number(estimateCost(model, response.usage).toFixed(4)),
      stopReason: response.stop_reason,
    });
  } catch (err) {
    return recordRun({
      ...base,
      status: "error",
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      error: err.message,
      usage: {},
      costUsd: 0,
    });
  }
}
