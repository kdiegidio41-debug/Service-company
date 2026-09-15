import Anthropic from "@anthropic-ai/sdk";

/**
 * Builds the API client. Throws a human-readable error rather than letting the
 * SDK fail later with an opaque 401, because a missing key is the single most
 * common first-run problem.
 */
export function makeClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error(
      "No ANTHROPIC_API_KEY found.\n" +
        "  1. Copy .env.example to .env\n" +
        "  2. Paste your key from https://console.anthropic.com/settings/keys\n" +
        "Or run any command with --dry-run to see prompts without calling the API."
    );
  }
  return new Anthropic();
}
