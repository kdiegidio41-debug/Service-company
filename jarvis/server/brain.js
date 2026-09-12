/* =========================================================================
   JARVIS — thinking agents
   -------------------------------------------------------------------------
   The tasks that need a model rather than a rule. Runs server-side because
   this is where the Anthropic key lives; the page never sees it.

   Every task is given your real figures and told, in its system prompt, not
   to invent any. A strategist that makes up a number is worse than no
   strategist, so each one is instructed to work only from what it was
   handed and to say plainly when the data is too thin.
   ========================================================================= */
import Anthropic from '@anthropic-ai/sdk';

/* Override with AGENT_MODEL if you want a cheaper model — see the note on
   cost in server/README.md. Opus 5 is the default because these run rarely
   and on demand, never on a timer. */
const DEFAULT_MODEL = 'claude-opus-5';

const GUARDRAIL = `
You are given the operator's real figures as JSON. Rules you must follow:
- Use ONLY the numbers you are given. Never invent, estimate, or round into a
  figure that was not provided.
- If a number is 0 or missing, say so plainly. "No revenue logged this week"
  is a correct and useful answer; a fabricated trend is not.
- Never congratulate. Never pad. The operator is reading this to decide what
  to do in the next hour.
- Currency and units come from the data, not from your assumptions.
`.trim();

const TASKS = {
  /* The one worth the money: read the week, propose what to actually do. */
  strategist: {
    effort: 'high',
    maxTokens: 2000,
    system: `${GUARDRAIL}

You are a sharp operator advising a solo founder who runs a product and a
content channel. Given this week's figures, give:
1. One sentence on what the numbers actually say.
2. Exactly three actions for the coming week, each a concrete thing that can
   be done in under two hours, ordered by expected impact. Name the metric
   each one is meant to move.
3. One thing to stop doing, if the data supports naming one.

Be specific to these numbers. Generic growth advice is a failure.
No headings, no markdown, no preamble. Plain sentences.`
  },

  /* Natural-prose briefing instead of the template one. */
  briefing: {
    effort: 'low',
    maxTokens: 700,
    system: `${GUARDRAIL}

Write a spoken status briefing for the operator, to be read aloud by a voice
assistant. Composed and brief, like a chief of staff — state the figure, state
the change, move on. No greeting, no sign-off, no lists, no markdown. Six
sentences at most. It will be spoken, so write numbers as a person would say
them and avoid symbols.`
  },

  /* Hooks grounded in what actually performed, not generic templates. */
  hooks: {
    effort: 'medium',
    maxTokens: 900,
    system: `${GUARDRAIL}

Write 5 short-form video hooks on the topic given. If the data includes a top
performing post, infer what worked about it and lean that way. Each hook is one
line, under 12 words, written to stop a scroll. No numbering, no markdown, no
commentary — one hook per line, nothing else.`
  },

  /* A script shaped by what this specific channel does well. */
  script: {
    effort: 'medium',
    maxTokens: 1400,
    system: `${GUARDRAIL}

Write a 60-second short-form video script outline on the topic given, as
timestamped beats. Use the operator's real numbers as the proof section where
they are relevant and non-zero — if they are zero, build the proof beat around
the process instead and say so. One call to action, never two. Plain text.`
  }
};

export function taskNames() {
  return Object.keys(TASKS);
}

export async function think(env, task, context, topic) {
  const spec = TASKS[task];
  if (!spec) throw new Error(`unknown task "${task}" — try: ${Object.keys(TASKS).join(', ')}`);
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set on the proxy');

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.AGENT_MODEL || DEFAULT_MODEL;

  const prompt = [
    topic ? `Topic: ${topic}` : null,
    'Figures:',
    JSON.stringify(context, null, 2)
  ].filter(Boolean).join('\n');

  const req = {
    model,
    max_tokens: spec.maxTokens,
    system: spec.system,
    thinking: { type: 'adaptive' },
    output_config: { effort: spec.effort },
    messages: [{ role: 'user', content: prompt }]
  };

  /* Opus 5 can decline; the server-side fallback re-runs the same request on
     a fallback model inside the same call rather than just stopping. */
  let response;
  if (/^claude-(opus-5|fable-5)/.test(model)) {
    response = await client.beta.messages.create({
      ...req,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default'
    });
  } else {
    response = await client.messages.create(req);
  }

  if (response.stop_reason === 'refusal') {
    const why = response.stop_details && response.stop_details.category;
    throw new Error(`the model declined this request${why ? ` (${why})` : ''}`);
  }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return {
    task,
    model: response.model,
    text,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens
    }
  };
}
