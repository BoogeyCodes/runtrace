# runtrace

[![CI](https://github.com/BoogeyCodes/runtrace/actions/workflows/ci.yml/badge.svg)](https://github.com/BoogeyCodes/runtrace/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-success)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

Normalize **AI coding-agent run transcripts** into one schema and summarise them with metrics.
Different agents log their runs differently; runtrace coerces those shapes into a common `Trace` of
typed steps, then reports the numbers an evaluator looks at first — commands run, files edited, lines
changed, whether tests ran and passed.

```ts
import { normalize, metrics, summarize } from 'runtrace'

const trace = normalize(rawAgentLog)       // -> { agent, task?, steps[], finalMessage? }
metrics(trace)                             // -> { commandCount, filesEdited, testsPassed, ... }
summarize(trace)                           // "agent-a: 4 cmds, 2 files edited (+14/-3), tests passed"
```

## Why

Judging which of several AI coding agents did a task best starts with reading each agent's full run —
the commands it ran, the files it changed, whether it verified its work. But every agent/harness emits
that log in a different shape. runtrace is the normaliser: it maps the many field names onto one
`Trace`, infers the kind of each step when it isn't stated, and computes the comparison metrics, so the
runs can be lined up and compared on the same terms.

## What it does

**`normalize(input)`** turns a loosely-typed record into a `Trace`:

- Reads the agent from `agent` / `name` / `id`, the task from `task` / `prompt` / `request`, and the
  final message from `finalMessage` / `summary` / `result`.
- Finds the steps under `steps` / `events` / `actions` / `trace`.
- Maps each step's kind from `kind` / `type` / `tool` / `action` (with aliases: `bash`→command,
  `write`→file_edit, …), and **infers** it when absent — a `pytest`/`jest`/`go test` command becomes a
  `test` step, a step with line counts becomes a `file_edit`, a shell-looking string becomes a
  `command`.
- Pulls the command/path/message text and any exit code and added/removed line counts from their
  various field names.

A `Step` is `{ kind, text, exitCode?, added?, removed? }` where kind is one of `command`, `file_edit`,
`file_read`, `message`, `test`, `other`.

**`metrics(trace)`** summarises it:

```ts
{
  stepCount, commandCount, failedCommands,
  filesEdited,   // distinct files
  filesRead, linesAdded, linesRemoved,
  testRuns, ranTests,
  testsPassed,   // true / false / null (null when no test reported an exit code)
  hasFinalMessage,
}
```

**`summarize(trace)`** gives a one-line human summary for a comparison view.

## Install

```bash
npm install runtrace
```

Node 18+. Ships as ESM and CommonJS with type definitions. No runtime dependencies.

## Example

```ts
import { normalize, metrics } from 'runtrace'

const trace = normalize({
  name: 'agent-a',
  prompt: 'Fix the failing login test',
  steps: [
    { tool: 'bash', command: 'npm ci', exitCode: 0 },
    { type: 'edit', path: 'src/auth.ts', additions: 6, deletions: 2 },
    { command: 'npm test', exitCode: 0 },
    'All tests pass now.',
  ],
  summary: 'Fixed the token-expiry comparison; suite is green.',
})

metrics(trace).testsPassed  // true
metrics(trace).filesEdited  // 1
```

## Testing

```bash
npm install
npm test            # 14 tests across normalisation and metrics
npm run build       # ESM + CJS + .d.ts via tsup
```

Tests cover field-name mapping, kind inference (test/command/edit), bare-string steps, alternative
container keys, line-count fields, the metrics (dedup, pass/fail/unknown, failed commands) and the
summary line. CI runs on Linux and Windows across Node 18/20/22.

## Where it fits

runtrace is the normalisation layer in an agent-evaluation workflow: pair it with a rubric scorer
(rate the normalised runs) and a diff view (compare what each changed).

## License

MIT
