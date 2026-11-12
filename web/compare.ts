// The comparison layer: turn several raw agent transcripts into a side-by-side view.
// It builds entirely on the runtrace library (normalize / metrics / summarize / touchedFiles) and
// stays DOM-free so it can be unit-tested on its own.
import { metrics, normalize, summarize, touchedFiles } from '../src/index.js'
import type { TraceMetrics } from '../src/index.js'

export interface RunCard {
  /** A unique, display-friendly label (the agent name, disambiguated if two runs share one). */
  label: string
  agent: string
  task?: string
  metrics: TraceMetrics
  summary: string
  touched: string[]
}

export interface SharedFile {
  file: string
  /** Labels of the runs that touched this file (length >= 2). */
  agents: string[]
}

export interface Maxima {
  stepCount: number
  commandCount: number
  filesEdited: number
  linesAdded: number
  linesRemoved: number
  netLines: number
}

export interface RunComparison {
  runs: RunCard[]
  sharedFiles: SharedFile[]
  maxima: Maxima
}

/** Normalise one raw transcript and derive its card (metrics + one-line summary + touched files). */
export function toCard(input: unknown): RunCard {
  const trace = normalize(input)
  return {
    label: trace.agent,
    agent: trace.agent,
    task: trace.task,
    metrics: metrics(trace),
    summary: summarize(trace),
    touched: touchedFiles(trace),
  }
}

/** Give every card a unique label; identical agent names get a ` #n` suffix so they don't merge. */
function assignLabels(cards: RunCard[]): void {
  const counts = new Map<string, number>()
  for (const c of cards) counts.set(c.agent, (counts.get(c.agent) ?? 0) + 1)
  const seen = new Map<string, number>()
  for (const c of cards) {
    if ((counts.get(c.agent) ?? 0) > 1) {
      const n = (seen.get(c.agent) ?? 0) + 1
      seen.set(c.agent, n)
      c.label = `${c.agent} #${n}`
    } else {
      c.label = c.agent
    }
  }
}

/** Files touched by more than one run, with the labels of the runs that touched them. */
export function sharedFiles(cards: RunCard[]): SharedFile[] {
  const byFile = new Map<string, string[]>()
  for (const card of cards) {
    for (const file of card.touched) {
      const agents = byFile.get(file) ?? []
      agents.push(card.label)
      byFile.set(file, agents)
    }
  }
  const shared: SharedFile[] = []
  for (const [file, agents] of byFile) {
    if (agents.length > 1) shared.push({ file, agents: [...agents].sort() })
  }
  return shared.sort((a, b) => b.agents.length - a.agents.length || a.file.localeCompare(b.file))
}

/** The largest value of each metric across the runs (floored at 1), for scaling comparison bars. */
export function computeMaxima(cards: RunCard[]): Maxima {
  const max = (pick: (m: TraceMetrics) => number) => Math.max(1, ...cards.map((c) => pick(c.metrics)))
  return {
    stepCount: max((m) => m.stepCount),
    commandCount: max((m) => m.commandCount),
    filesEdited: max((m) => m.filesEdited),
    linesAdded: max((m) => m.linesAdded),
    linesRemoved: max((m) => m.linesRemoved),
    netLines: max((m) => Math.abs(m.netLines)),
  }
}

/** Compare several raw transcripts: per-run cards, cross-run shared files, and scaling maxima. */
export function compareRuns(inputs: unknown[]): RunComparison {
  const runs = inputs.map(toCard)
  assignLabels(runs)
  return { runs, sharedFiles: sharedFiles(runs), maxima: computeMaxima(runs) }
}
