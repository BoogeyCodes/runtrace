import { describe, expect, it } from 'vitest'
import { compareRuns, computeMaxima, sharedFiles, toCard } from '../web/compare.js'

const runA = {
  agent: 'agent-a',
  task: 'fix bug',
  steps: [
    { kind: 'command', text: 'git status' },
    { kind: 'file_edit', text: 'src/a.ts', added: 10, removed: 2 },
    { kind: 'file_read', text: 'README.md' },
    { kind: 'test', text: 'pytest', exitCode: 0 },
  ],
  finalMessage: 'done',
}

// A different shape: aliased field names, a failing test, a shared file (src/a.ts).
const runB = {
  name: 'agent-b',
  events: [
    { tool: 'bash', cmd: 'ls' },
    { tool: 'write', file: 'src/a.ts', additions: 3, deletions: 0 },
    { tool: 'write', file: 'src/b.ts', additions: 1, deletions: 1 },
    { tool: 'test', input: 'pytest', status: 1 },
  ],
}

describe('toCard', () => {
  it('normalises a raw transcript into a card with metrics and a summary', () => {
    const card = toCard(runA)
    expect(card.label).toBe('agent-a')
    expect(card.metrics.commandCount).toBe(1)
    expect(card.metrics.filesEdited).toBe(1)
    expect(card.metrics.linesAdded).toBe(10)
    expect(card.metrics.testsPassed).toBe(true)
    expect(card.touched).toEqual(['README.md', 'src/a.ts'])
    expect(card.summary).toContain('agent-a')
  })
})

describe('compareRuns', () => {
  it('builds a card per input regardless of transcript shape', () => {
    const c = compareRuns([runA, runB])
    expect(c.runs.map((r) => r.label)).toEqual(['agent-a', 'agent-b'])
    expect(c.runs[1]!.metrics.testsPassed).toBe(false) // runB's pytest exited 1
    expect(c.runs[1]!.metrics.filesEdited).toBe(2)
  })

  it('finds files touched by more than one run', () => {
    const c = compareRuns([runA, runB])
    expect(c.sharedFiles).toEqual([{ file: 'src/a.ts', agents: ['agent-a', 'agent-b'] }])
  })

  it('computes maxima for scaling bars (floored at 1)', () => {
    const c = compareRuns([runA, runB])
    expect(c.maxima.linesAdded).toBe(10)
    expect(c.maxima.filesEdited).toBe(2)
    expect(computeMaxima([]).commandCount).toBe(1) // never divide by zero
  })

  it('disambiguates runs that share an agent name', () => {
    const c = compareRuns([runA, { agent: 'agent-a', steps: [] }])
    expect(c.runs.map((r) => r.label)).toEqual(['agent-a #1', 'agent-a #2'])
  })
})

describe('sharedFiles', () => {
  it('returns nothing when runs touch disjoint files', () => {
    const cards = [toCard({ agent: 'x', steps: [{ kind: 'file_edit', text: 'x.ts', added: 1 }] })]
    expect(sharedFiles(cards)).toEqual([])
  })

  it('sorts by how many runs share the file, then by name', () => {
    const c = compareRuns([
      { agent: 'a', steps: [{ kind: 'file_edit', text: 'shared.ts', added: 1 }, { kind: 'file_edit', text: 'z.ts', added: 1 }] },
      { agent: 'b', steps: [{ kind: 'file_edit', text: 'shared.ts', added: 1 }, { kind: 'file_edit', text: 'z.ts', added: 1 }] },
      { agent: 'c', steps: [{ kind: 'file_edit', text: 'shared.ts', added: 1 }] },
    ])
    expect(c.sharedFiles[0]!.file).toBe('shared.ts')
    expect(c.sharedFiles[0]!.agents).toEqual(['a', 'b', 'c'])
    expect(c.sharedFiles[1]!.file).toBe('z.ts')
  })
})
