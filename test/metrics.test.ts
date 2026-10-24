import { describe, expect, it } from 'vitest'
import { metrics, summarize } from '../src/metrics.js'
import { normalize } from '../src/normalize.js'

const trace = normalize({
  agent: 'agent-a',
  steps: [
    { command: 'git status' },
    { command: 'npm ci', exitCode: 0 },
    { type: 'edit', path: 'src/a.ts', added: 10, removed: 2 },
    { type: 'edit', path: 'src/a.ts', added: 3, removed: 0 }, // same file twice
    { type: 'edit', path: 'src/b.ts', added: 1, removed: 1 },
    { action: 'read', file: 'README.md' },
    { command: 'pytest', exitCode: 1 },
  ],
  finalMessage: 'done',
})

describe('metrics', () => {
  it('counts commands, edits (deduped by file) and lines', () => {
    const m = metrics(trace)
    expect(m.commandCount).toBe(2) // git status + npm ci (pytest is a test step)
    expect(m.filesEdited).toBe(2) // a.ts counted once
    expect(m.linesAdded).toBe(14)
    expect(m.linesRemoved).toBe(3)
    expect(m.filesRead).toBe(1)
    expect(m.hasFinalMessage).toBe(true)
  })

  it('tracks test runs and pass/fail', () => {
    const m = metrics(trace)
    expect(m.ranTests).toBe(true)
    expect(m.testRuns).toBe(1)
    expect(m.testsPassed).toBe(false) // pytest exited 1
    expect(m.failedCommands).toBe(1)
  })

  it('reports unknown test result when no exit code is present', () => {
    const t = normalize({ steps: [{ type: 'test', command: 'jest' }] })
    expect(metrics(t).testsPassed).toBeNull()
    expect(metrics(t).ranTests).toBe(true)
  })

  it('reports no tests when none were run', () => {
    const t = normalize({ steps: [{ command: 'ls' }] })
    expect(metrics(t).ranTests).toBe(false)
    expect(metrics(t).testsPassed).toBeNull()
  })
})

describe('summarize', () => {
  it('produces a readable one-liner', () => {
    expect(summarize(trace)).toBe('agent-a: 2 cmds, 2 files edited (+14/-3), tests failed, 1 failed')
  })

  it('notes when no tests were run', () => {
    const t = normalize({ agent: 'b', steps: [{ command: 'ls' }] })
    expect(summarize(t)).toContain('no tests run')
  })
})
