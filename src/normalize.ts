import type { Step, StepKind, Trace } from './types.js'

/**
 * Agent run logs come in many shapes. `normalize` accepts a loosely-typed record and coerces it into
 * a {@link Trace}: it maps common field names (`tool`/`type`/`action` → kind, `command`/`cmd`/`input`
 * → text), infers the step kind when it isn't stated, and tolerates missing fields.
 */
export function normalize(input: unknown): Trace {
  if (!isRecord(input)) {
    throw new TypeError('trace must be an object')
  }

  const agent = str(input.agent ?? input.name ?? input.id) || 'unknown'
  const task = optionalStr(input.task ?? input.prompt ?? input.request)
  const rawSteps = firstArray(input.steps, input.events, input.actions, input.trace)
  const steps = rawSteps.map(normalizeStep)
  const finalMessage = optionalStr(input.finalMessage ?? input.final_message ?? input.summary ?? input.result)

  return { agent, task, steps, finalMessage }
}

function normalizeStep(raw: unknown): Step {
  if (typeof raw === 'string') {
    return { kind: looksLikeCommand(raw) ? 'command' : 'message', text: raw }
  }
  if (!isRecord(raw)) {
    return { kind: 'other', text: String(raw) }
  }

  const text = str(
    raw.text ?? raw.command ?? raw.cmd ?? raw.input ?? raw.path ?? raw.file ?? raw.content ?? raw.message ?? '',
  )
  const kind = resolveKind(raw, text)

  const step: Step = { kind, text }
  const exit = num(raw.exitCode ?? raw.exit_code ?? raw.code ?? raw.status)
  if (exit !== undefined) step.exitCode = exit
  const added = num(raw.added ?? raw.additions ?? raw.insertions)
  if (added !== undefined) step.added = added
  const removed = num(raw.removed ?? raw.deletions ?? raw.deleted)
  if (removed !== undefined) step.removed = removed
  return step
}

const KIND_ALIASES: Record<string, StepKind> = {
  command: 'command',
  cmd: 'command',
  shell: 'command',
  bash: 'command',
  run: 'command',
  edit: 'file_edit',
  file_edit: 'file_edit',
  write: 'file_edit',
  patch: 'file_edit',
  read: 'file_read',
  file_read: 'file_read',
  view: 'file_read',
  cat: 'file_read',
  message: 'message',
  msg: 'message',
  say: 'message',
  test: 'test',
  tests: 'test',
}

function resolveKind(raw: Record<string, unknown>, text: string): StepKind {
  const declared = str(raw.kind ?? raw.type ?? raw.tool ?? raw.action).toLowerCase()
  if (declared && KIND_ALIASES[declared]) return KIND_ALIASES[declared]

  // Infer from the content.
  if (raw.added !== undefined || raw.removed !== undefined || raw.additions !== undefined) return 'file_edit'
  if (isTestCommand(text)) return 'test'
  if (looksLikeCommand(text)) return 'command'
  if (declared.includes('edit') || declared.includes('write')) return 'file_edit'
  return text ? 'message' : 'other'
}

const TEST_PATTERN = /\b(pytest|jest|vitest|go test|cargo test|npm test|dotnet test|mocha|phpunit|rspec|unittest)\b/i

function isTestCommand(text: string): boolean {
  return TEST_PATTERN.test(text)
}

// Common first tokens of a shell command, used to recognise a command among free-text steps.
const COMMAND_PREFIX =
  /^(sudo|git|npm|pnpm|yarn|python3?|pip3?|node|go|cargo|dotnet|make|docker|curl|wget|ls|cd|cat|grep|rg|find|rm|mv|cp|mkdir|touch|chmod|sed|awk|echo|export|source|bash|sh|pytest|jest|vitest|mocha|tsc|eslint|ruff|\.\/)\b/

function looksLikeCommand(text: string): boolean {
  const t = text.trim()
  if (t.length === 0 || t.includes('\n')) return false
  return COMMAND_PREFIX.test(t)
}

// -- small helpers ---------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function optionalStr(value: unknown): string | undefined {
  const s = str(value)
  return s.length > 0 ? s : undefined
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value)
  return undefined
}

function firstArray(...candidates: unknown[]): unknown[] {
  for (const c of candidates) {
    if (Array.isArray(c)) return c
  }
  return []
}
