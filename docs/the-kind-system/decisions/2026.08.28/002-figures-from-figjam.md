# 002. Ship figures as versioned repository images, not live-board links

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.08.28`](RELEASE.md) (reconstructed) |
| Author(s) | Grady Ng with Claude Sonnet 5 |
| Sections / rules affected | Figures 1–4, Appendix A |
| Supersedes | — |
| Superseded by | — |

## Context

The system's diagrams live on the Kind System FigJam board. A live board keeps changing, needs Figma access to view, and can't be checked against a specific version of the document.

## Decision

Every figure is committed as a PNG in `docs/the-kind-system/images/` and versioned with the document. Reading the document needs nothing from Figma. Each figure's source node is recorded only so the figure can be regenerated when the system changes (Appendix A of [`context/original-document.md`](context/original-document.md)).

Figures 1, 2, and 4 are direct exports. Figures 3a–3c are structural reconstructions of node 17:1968, pending a direct export.

## Alternatives considered

Not recorded. The document implies that embedding or linking the live board was rejected, because "This document is not required to stay in sync with a live board to remain accurate" (Appendix A).

## Consequences

- **Docs.** Six PNGs in `images/`. Appendix A lists each figure's node and provenance.
- **Code.** None.
- **Process.** A changed diagram needs a new export, and a release that records the node and the new file in its `context/`.

## Sources

- `context/figjam/sources.md`: node IDs, provenance, and checksums.
- `context/original-document.md`, Appendix A.

## Open gaps

The FigJam file key and URL weren't recorded, and Figures 3a–3c still need a direct export.
