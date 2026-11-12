import { compareRuns } from './compare.js'
import type { RunCard, RunComparison } from './compare.js'
import { SAMPLE_JSON } from './samples.js'

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel)
  if (!el) throw new Error(`missing element: ${sel}`)
  return el
}

const input = $<HTMLTextAreaElement>('#input')
const results = $<HTMLDivElement>('#results')
const errorBox = $<HTMLDivElement>('#error')

function parseInput(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Paste one or more agent transcripts as JSON (an array, or a single object).')
  let data: unknown
  try {
    data = JSON.parse(trimmed)
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`)
  }
  const runs = Array.isArray(data) ? data : [data]
  if (runs.length === 0) throw new Error('No transcripts found.')
  return runs
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
}

function bar(value: number, max: number, cls = ''): string {
  const pct = Math.round((value / max) * 100)
  return `<div class="bar ${cls}"><i style="width:${pct}%"></i></div>`
}

function testsCell(m: RunCard['metrics']): string {
  if (!m.ranTests) return '<span class="chip muted">no tests</span>'
  if (m.testsPassed === null) return '<span class="chip">ran</span>'
  return m.testsPassed
    ? '<span class="chip pass">passed</span>'
    : '<span class="chip fail">failed</span>'
}

function renderMetricsTable(c: RunComparison): string {
  const head =
    '<tr><th>Run</th><th class="num">Steps</th><th class="num">Cmds</th><th class="num">Failed</th>' +
    '<th class="num">Files edited</th><th class="num">+Lines</th><th class="num">-Lines</th>' +
    '<th class="num">Net</th><th>Tests</th><th class="num">Final msg</th></tr>'
  const rows = c.runs
    .map((r) => {
      const m = r.metrics
      const net = m.netLines >= 0 ? `+${m.netLines}` : `${m.netLines}`
      return (
        `<tr><td><strong>${esc(r.label)}</strong></td>` +
        `<td class="num">${m.stepCount}</td><td class="num">${m.commandCount}</td>` +
        `<td class="num ${m.failedCommands ? 'warn' : 'muted'}">${m.failedCommands}</td>` +
        `<td class="num">${m.filesEdited}</td><td class="num good">${m.linesAdded}</td>` +
        `<td class="num bad">${m.linesRemoved}</td><td class="num">${net}</td>` +
        `<td>${testsCell(m)}</td><td class="num">${m.hasFinalMessage ? '✓' : '—'}</td></tr>`
      )
    })
    .join('')
  return `<table>${head}${rows}</table>`
}

function renderBars(c: RunComparison): string {
  const metrics: { label: string; pick: (r: RunCard) => number; max: number; cls: string }[] = [
    { label: 'Commands', pick: (r) => r.metrics.commandCount, max: c.maxima.commandCount, cls: '' },
    { label: 'Files edited', pick: (r) => r.metrics.filesEdited, max: c.maxima.filesEdited, cls: '' },
    { label: 'Lines added', pick: (r) => r.metrics.linesAdded, max: c.maxima.linesAdded, cls: 'good' },
    { label: 'Lines removed', pick: (r) => r.metrics.linesRemoved, max: c.maxima.linesRemoved, cls: 'bad' },
  ]
  return metrics
    .map(
      (metric) =>
        `<div class="bargroup"><h3>${metric.label}</h3>` +
        c.runs
          .map(
            (r) =>
              `<div class="barrow"><span class="barlabel">${esc(r.label)}</span>` +
              `${bar(metric.pick(r), metric.max, metric.cls)}` +
              `<span class="barval">${metric.pick(r)}</span></div>`,
          )
          .join('') +
        `</div>`,
    )
    .join('')
}

function renderSharedFiles(c: RunComparison): string {
  if (c.sharedFiles.length === 0) {
    return '<div class="empty">No file was touched by more than one run.</div>'
  }
  const rows = c.sharedFiles
    .map(
      (s) =>
        `<tr><td><code>${esc(s.file)}</code></td><td>${s.agents
          .map((a) => `<span class="chip">${esc(a)}</span>`)
          .join(' ')}</td></tr>`,
    )
    .join('')
  return `<table><tr><th>File</th><th>Touched by</th></tr>${rows}</table>`
}

function renderSummaries(c: RunComparison): string {
  return c.runs
    .map(
      (r) =>
        `<div class="summary"><div class="row"><strong>${esc(r.label)}</strong>` +
        `${r.task ? `<span class="muted">— ${esc(r.task)}</span>` : ''}</div>` +
        `<p>${esc(r.summary)}</p></div>`,
    )
    .join('')
}

function render(c: RunComparison): void {
  results.innerHTML =
    `<h2>Summary</h2><div class="panel">${renderSummaries(c)}</div>` +
    `<h2>Metrics</h2><div class="panel">${renderMetricsTable(c)}</div>` +
    `<h2>Side by side</h2><div class="panel bars">${renderBars(c)}</div>` +
    `<h2>Shared files</h2><div class="panel">${renderSharedFiles(c)}</div>`
  results.hidden = false
}

function run(): void {
  try {
    const comparison = compareRuns(parseInput(input.value))
    errorBox.hidden = true
    render(comparison)
  } catch (e) {
    errorBox.textContent = (e as Error).message
    errorBox.hidden = false
    results.hidden = true
  }
}

$('#compare').addEventListener('click', run)
$('#sample').addEventListener('click', () => {
  input.value = SAMPLE_JSON
  run()
})

// Auto-load the sample on first visit or with ?sample in the URL, so the page is never empty.
if (new URLSearchParams(location.search).has('sample') || !input.value.trim()) {
  input.value = SAMPLE_JSON
  run()
}
