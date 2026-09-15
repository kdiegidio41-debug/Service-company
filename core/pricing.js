/** USD per 1M tokens. Update when Anthropic publishes new rates. */
const RATES = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCost(model, usage = {}) {
  const rate = RATES[model];
  if (!rate) return 0;
  const input = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0);
  const output = usage.output_tokens || 0;
  return (input / 1e6) * rate.input + (output / 1e6) * rate.output;
}

export const knownModels = () => Object.keys(RATES);
