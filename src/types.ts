/** The normalised shape of an AI coding-agent run, whatever format it arrived in. */

export type StepKind = 'command' | 'file_edit' | 'file_read' | 'message' | 'test' | 'other'

export interface Step {
  kind: StepKind
  /** A shell command, a file path, or a short description, depending on kind. */
  text: string
  /** Exit code for a command/test step, when known. */
  exitCode?: number
  /** For a file_edit: lines added / removed, when known. */
  added?: number
  removed?: number
}

export interface Trace {
  /** Agent identifier. */
  agent: string
  /** The task/prompt the agent was given, if present. */
  task?: string
  steps: Step[]
  /** The agent's final summary message, if present. */
  finalMessage?: string
}

export interface TraceMetrics {
  stepCount: number
  commandCount: number
  failedCommands: number
  filesEdited: number
  filesRead: number
  linesAdded: number
  linesRemoved: number
  testRuns: number
  testsPassed: boolean | null // null when no test step is present
  ranTests: boolean
  hasFinalMessage: boolean
}
