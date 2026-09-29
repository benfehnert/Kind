# Release 2026.08.28

> **Reconstructed record.** This folder was written on 2026-09-29, a month after the release it describes. It is built from the committed document, its figures, and the commit metadata. Anything that wasn't recorded at the time is marked as unknown, not guessed.

| Field | Value |
|---|---|
| Version | `2026.08.28` (issued as "Version 0.1 — Draft for review") |
| Date | 2026-08-28 |
| Status | Proposed. The original was issued as a draft for review, and no review was recorded. |
| Previous version | — (initial release) |
| Git tag | `kind-system/2026.08.28` → `15a1016`, *not yet created* |
| Codebase at authoring | branch `staging`, commit `15a1016` (parent `fe171f0`), 2026-08-28 14:19 +08:00 |
| Authored by | Grady Ng with Claude Sonnet 5 (from the commit's `Co-Authored-By` trailer) |

## Summary

This is the first version of The Kind System: a governing specification for how Kind builds, reviews, and deploys features. It covers the design system, AI-generated output, and the exploration (research protocol) pipeline. It defines seven human-in-the-loop touchpoints and a single AI Oversight Gate. It also requires every gate to leave a retained decision trail. The figures come from the Kind System FigJam board.

## Decisions

| # | Decision | Status |
|---|---|---|
| 001 | [Adopt The Kind System governance specification](001-governance-spec.md) | Proposed |
| 002 | [Ship figures as versioned repository images, not live-board links](002-figures-from-figjam.md) | Proposed |

## Files changed

- `docs/the-kind-system/the-kind-system.md`: new, 275 lines.
- `docs/the-kind-system/images/fig-1-system-architecture.png`, `fig-2-ai-oversight-gate.png`, `fig-3a-inputs-and-gate.png`, `fig-3b-science-ethics-review.png`, `fig-3c-publishing-and-data.png`, `fig-4-tech-stack.png`: new.

No application code changed in this release.

## Figures

All six figures are new. Their sources, provenance, and checksums are in [`context/figjam/sources.md`](context/figjam/sources.md).

## Context

| File | What it is |
|---|---|
| [`context/original-document.md`](context/original-document.md) | Byte-for-byte copy of the v0.1 document as committed in `15a1016` |
| [`context/figjam/`](context/figjam/sources.md) | The six figure exports, with node IDs and provenance |
| [`context/external-sources.md`](context/external-sources.md) | The external precedents cited, mapped to the rules they support |

**Not included, because none of it was retained:** the prompts and conversation used to generate the document with Claude Sonnet 5, any draft versions, and any review comments. Leaving these out is a gap against Rule 3.1.1, which this same document introduced. It's recorded here, not hidden.

**Files considered and excluded.** `docs/kind-data-model.md`, `docs/kind-schema.sql`, `docs/kind-data-model-print.html`, `docs/mobile-deterministic-algorithms.md`, `docs/scripts/`, and `docs/.pdf-gen-tmp/` were in the repository when this release was written. Nothing in the v0.1 document cites or depends on them. Whether they belong to the Kind System is still open, and was deferred by the user on 2026-09-29 (see [`../2026.09.29/context/clarifications.md`](../2026.09.29/context/clarifications.md)).

## Human review record

| Touchpoint | Reviewer | Date | Outcome | Notes |
|---|---|---|---|---|
| 1: Design System change review | unknown | | not recorded | Committed directly to `staging` as a draft for review |

## Open gaps

1. Original generation prompts were not kept (Rule 3.1.1).
2. No review was recorded (Touchpoint 1 / Rule 3.1.3).
3. The FigJam board's file key and URL were not recorded. Only node IDs survive.
4. Figures 3a–3c are reconstructions awaiting a direct export.
5. The document described Storybook, a Researcher Dashboard, and DSPy/GROBID as current infrastructure. None of them existed in the codebase at `15a1016`. This is addressed in release [`2026.09.29`](../2026.09.29/RELEASE.md).
