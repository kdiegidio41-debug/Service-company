# farm/ — live state

This is the Steading's working memory. Agents read and write it through
`../tools/farm.mjs`; you can too (`node ecosystem/tools/farm.mjs help`).

| File | Holds | Rule |
| --- | --- | --- |
| `board.json` | Goals and chores, with the full transition history of each | Illegal transitions are refused, not logged |
| `episodes.jsonl` | What happened, in order, with timestamps | **Append-only.** Corrections are appended; originals stay |
| `facts.jsonl` | What is true, independent of when we learned it | Every fact carries a `source`. No provenance, no fact |
| `traces/*.json` | Spans — what each role saw, and **why it decided what it decided** | Failures are never sampled away |
| `artifacts/` | Output produced by chores | A `DONE` chore whose artifact is missing is a **false DONE** and the tool refuses it |
| `seeds/` | Versioned prompts and rubrics — the Granary | Nothing here is edited in place |

## Why this is committed rather than ignored

Memory that does not survive a fresh checkout is not memory. The cost is that
`board.json` can conflict across branches. That is the right trade at this size —
and the `.jsonl` files merge as a union, which is what append-only buys you.

If the board ever becomes a merge problem, the fix is per-branch boards, not
gitignoring the farm's memory.

## Starting over

```bash
node ecosystem/tools/farm.mjs reset --yes
```

Erases the board, episodes, facts and traces. There is no undo.
