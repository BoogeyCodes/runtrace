import { describe, expect, it } from 'vitest'
import { normalize } from '../src/normalize.js'

describe('normalize', () => {
  it('reads agent, task and final message from common field names', () => {
    const trace = normalize({ name: 'agent-a', prompt: 'do the thing', summary: 'done', steps: [] })
    expect(trace.agent).toBe('agent-a')
    expect(trace.task).toBe('do the thing')
    expect(trace.finalMessage).toBe('done')
  })

  it('defaults a missing agent and tolerates missing fields', () => {
    const trace = normalize({})
    expect(trace.agent).toBe('unknown')
    expect(trace.steps).toEqual([])
    expect(trace.finalMessage).toBeUndefined()
  })

  it('maps tool/type/action to a step kind', () => {
    const trace = normalize({
      steps: [
        { tool: 'bash', command: 'npm ci' },
        { type: 'edit', path: 'src/app.ts', added: 10, removed: 2 },
        { action: 'read', file: 'README.md' },
        { kind: 'message', text: 'looks good' },
      ],
    })
    expect(trace.steps.map((s) => s.kind)).toEqual(['command', 'file_edit', 'file_read', 'message'])
    expect(trace.steps[1]).toMatchObject({ kind: 'file_edit', text: 'src/app.ts', added: 10, removed: 2 })
  })

  it('infers a test step from the command', () => {
    const trace = normalize({ steps: [{ command: 'pytest -q', exitCode: 0 }] })
    expect(trace.steps[0]).toMatchObject({ kind: 'test', exitCode: 0 })
  })

  it('infers command vs message for bare strings', () => {
    const trace = normalize({ steps: ['git status', 'I will now fix the bug'] })
    expect(trace.steps[0].kind).toBe('command')
    expect(trace.steps[1].kind).toBe('message')
  })

  it('reads edit line counts from several field names', () => {
    const trace = normalize({ steps: [{ type: 'write', file: 'a.ts', additions: 5, deletions: 1 }] })
    expect(trace.steps[0]).toMatchObject({ added: 5, removed: 1 })
  })

  it('accepts alternative container keys (events / actions)', () => {
    expect(normalize({ events: ['git log'] }).steps).toHaveLength(1)
    expect(normalize({ actions: [{ cmd: 'ls' }] }).steps[0].kind).toBe('command')
  })

  it('throws for a non-object', () => {
    expect(() => normalize(42)).toThrow(TypeError)
  })
})
