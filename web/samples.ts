// Three realistic agent transcripts in deliberately different shapes, to show that the normaliser
// copes with heterogeneous logs. All three are "fix the failing login test" runs.

export const SAMPLE_RUNS: unknown[] = [
  // Shape A: the canonical schema (agent + steps with kind/added/removed).
  {
    agent: 'claude-sonnet',
    task: 'Fix the failing login test in the auth module',
    steps: [
      { kind: 'command', text: 'git status' },
      { kind: 'file_read', text: 'src/auth/token.py' },
      { kind: 'file_read', text: 'tests/test_login.py' },
      { kind: 'file_edit', text: 'src/auth/token.py', added: 6, removed: 3 },
      { kind: 'test', text: 'pytest -q tests/test_login.py', exitCode: 0 },
      { kind: 'command', text: 'git diff', exitCode: 0 },
    ],
    finalMessage: 'Root cause was an off-by-one in token expiry. Fixed it and the suite is green.',
  },
  // Shape B: "events" with aliased field names (tool/cmd/input/additions/deletions).
  {
    name: 'gpt-balanced',
    prompt: 'Fix the failing login test in the auth module',
    events: [
      { tool: 'bash', cmd: 'rg "expired" src' },
      { tool: 'write', file: 'src/auth/token.py', additions: 4, deletions: 2 },
      { tool: 'write', file: 'src/auth/session.py', additions: 2, deletions: 0 },
      { tool: 'test', input: 'pytest -q', status: 1 },
      { tool: 'write', file: 'src/auth/token.py', additions: 1, deletions: 1 },
      { tool: 'test', input: 'pytest -q', code: 0 },
    ],
    summary: 'Adjusted expiry comparison and a session default; tests pass after a second try.',
  },
  // Shape C: a bare list of strings plus loose action records ("actions").
  {
    id: 'local-coder',
    request: 'Fix the failing login test in the auth module',
    actions: [
      'git status',
      'cat tests/test_login.py',
      { action: 'edit', path: 'src/auth/token.py', insertions: 12, deletions: 9 },
      { action: 'edit', path: 'tests/test_login.py', insertions: 1, deletions: 1 },
      'pytest -q',
    ],
    result: 'Changed the token code and also edited the test; did not report whether it passed.',
  },
]

export const SAMPLE_JSON = JSON.stringify(SAMPLE_RUNS, null, 2)
