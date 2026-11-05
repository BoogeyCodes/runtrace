# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `TraceMetrics.netLines` (`linesAdded - linesRemoved`) — a one-number sense of
  how much a run grew or shrank the codebase, useful when comparing runs.

## [0.1.0]

### Added
- Normaliser that maps heterogeneous agent run transcripts onto one `Trace` schema.
- `metrics()` for command/edit/test/line counts and pass-fail detection.
- `summarize()` one-line summary for comparison views.
