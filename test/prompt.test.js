import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { createPrompter } from "../core/prompt.js";

const sink = () => new Writable({ write(_c, _e, cb) { cb(); } });

test("reads every line from a piped stdin that closes immediately", async () => {
  // The exact shape that hangs node:readline/promises: all lines arrive at once
  // and the stream ends before the second question is asked.
  const prompter = createPrompter({
    input: Readable.from(["one\ntwo\nthree\n"]),
    output: sink(),
  });
  assert.equal(await prompter.ask("Q1"), "one");
  assert.equal(await prompter.ask("Q2"), "two");
  assert.equal(await prompter.ask("Q3"), "three");
  prompter.close();
});

test("falls back to the default once input is exhausted", async () => {
  const prompter = createPrompter({ input: Readable.from(["only\n"]), output: sink() });
  assert.equal(await prompter.ask("Q1", "fallback"), "only");
  assert.equal(await prompter.ask("Q2", "fallback"), "fallback");
  assert.equal(await prompter.ask("Q3"), "");
  prompter.close();
});

test("an empty line takes the default, and answers are trimmed", async () => {
  const prompter = createPrompter({ input: Readable.from(["\n  spaced  \n"]), output: sink() });
  assert.equal(await prompter.ask("Q1", "kept"), "kept");
  assert.equal(await prompter.ask("Q2"), "spaced");
  prompter.close();
});
