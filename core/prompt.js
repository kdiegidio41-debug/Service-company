import readline from "node:readline";

/**
 * A line reader that survives a closed stdin.
 *
 * node:readline/promises drops queued lines when the input is a pipe: the first
 * question resolves, "close" fires with the rest of the buffer still unread, and
 * every later question hangs forever. That breaks scripted installs. This queues
 * every line as it arrives and answers pending questions from the queue, falling
 * back to the default once input is genuinely exhausted.
 */
export function createPrompter({ input = process.stdin, output = process.stdout } = {}) {
  const rl = readline.createInterface({ input, output });
  const queue = [];
  const waiting = [];
  let closed = false;

  rl.on("line", (line) => {
    const next = waiting.shift();
    if (next) next(line);
    else queue.push(line);
  });
  rl.on("close", () => {
    closed = true;
    while (waiting.length) waiting.shift()(null);
  });

  return {
    async ask(question, fallback = "") {
      output.write(question + " ");
      let line;
      if (queue.length) line = queue.shift();
      else if (closed) line = null;
      else line = await new Promise((resolve) => waiting.push(resolve));

      if (line === null) {
        output.write("\n");
        return fallback;
      }
      return line.trim() || fallback;
    },
    close() {
      rl.close();
    },
    get exhausted() {
      return closed && queue.length === 0;
    },
  };
}
