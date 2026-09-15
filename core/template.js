/**
 * Fills {{dotted.path}} placeholders from a context object. An unknown or empty
 * placeholder becomes "" rather than leaking the literal braces into a prompt.
 */
export function render(text, context) {
  if (typeof text !== "string") return text;
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const value = key.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), context);
    return value == null ? "" : String(value);
  });
}

/** Placeholders a spec references, so setup knows which questions to ask. */
export function placeholdersIn(text) {
  const found = new Set();
  for (const m of String(text).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) found.add(m[1]);
  return [...found];
}
