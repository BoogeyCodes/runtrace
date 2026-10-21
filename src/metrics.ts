import type { Trace, TraceMetrics } from './types.js'

/** Summarise a normalised trace into the metrics an evaluator reaches for first. */
export function metrics(trace: Trace): TraceMetrics {
  const commands = trace.steps.filter((s) => s.kind === 'command')
  const tests = trace.steps.filter((s) => s.kind === 'test')
  const edits = trace.steps.filter((s) => s.kind === 'file_edit')

  const failedCommands = [...commands, ...tests].filter((s) => s.exitCode !== undefined && s.exitCode !== 0).length

  // Pass/fail of the test steps: known only if at least one test step reports an exit code.
  const testsWithCode = tests.filter((s) => s.exitCode !== undefined)
  const testsPassed = testsWithCode.length === 0 ? null : testsWithCode.every((s) => s.exitCode === 0)

  return {
    stepCount: trace.steps.length,
    commandCount: commands.length,
    failedCommands,
    filesEdited: new Set(edits.map((s) => s.text)).size,
    filesRead: new Set(trace.steps.filter((s) => s.kind === 'file_read').map((s) => s.text)).size,
    linesAdded: edits.reduce((sum, s) => sum + (s.added ?? 0), 0),
    linesRemoved: edits.reduce((sum, s) => sum + (s.removed ?? 0), 0),
    testRuns: tests.length,
    testsPassed,
    ranTests: tests.length > 0,
    hasFinalMessage: Boolean(trace.finalMessage && trace.finalMessage.trim().length > 0),
  }
}

/** A one-line human summary of a trace, handy for a comparison view. */
export function summarize(trace: Trace): string {
  const m = metrics(trace)
  const parts = [
    `${m.commandCount} cmd${m.commandCount === 1 ? '' : 's'}`,
    `${m.filesEdited} file${m.filesEdited === 1 ? '' : 's'} edited (+${m.linesAdded}/-${m.linesRemoved})`,
  ]
  if (m.ranTests) parts.push(m.testsPassed === null ? 'ran tests' : m.testsPassed ? 'tests passed' : 'tests failed')
  else parts.push('no tests run')
  if (m.failedCommands > 0) parts.push(`${m.failedCommands} failed`)
  return `${trace.agent}: ${parts.join(', ')}`
}
