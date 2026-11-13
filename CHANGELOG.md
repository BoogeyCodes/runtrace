# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0]

Grows runtrace from a normalisation library into a **run-comparison dashboard**: paste several agent
transcripts (in any shape) and see them normalised and laid side by side. The library stays
zero-dependency and unchanged; the web app is a separate client-side bundle (Vite + vanilla TS).

### Added
- A browser **dashboard** (`web/`) that normalises several transcripts and compares them: a per-run
  metrics table, each run's one-line `summarize()`, bars comparing commands/edits/lines, and a
  **shared-files** panel built on `touchedFiles()` showing which runs touched the same files. A
  "Load sample" button demonstrates it with three differently-shaped transcripts.
- `web/compare.ts` — a DOM-free comparison layer (`compareRuns`, `sharedFiles`, `computeMaxima`) over
  the library, with its own vitest suite.
- A `Dockerfile` (nginx) serving the built dashboard, and `dev` / `build:web` / `preview` scripts.

### Changed
- Version bumped to 0.2.0. Vite added as a dev dependency for the web build (the published library
  package is unchanged — still ESM + CJS + types, zero runtime dependencies).

## [0.1.x]

### Added
- `touchedFiles(trace)` — the sorted set of distinct files a run edited or read, for
  spotting when two agents touched the same files.
- `TraceMetrics.netLines` (`linesAdded - linesRemoved`) — a one-number sense of
  how much a run grew or shrank the codebase, useful when comparing runs.

## [0.1.0]

### Added
- Normaliser that maps heterogeneous agent run transcripts onto one `Trace` schema.
- `metrics()` for command/edit/test/line counts and pass-fail detection.
- `summarize()` one-line summary for comparison views.
