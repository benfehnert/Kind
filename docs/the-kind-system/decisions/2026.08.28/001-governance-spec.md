# 001. Adopt The Kind System governance specification

| Field | Value |
|---|---|
| Status | Proposed |
| Release | [`2026.08.28`](RELEASE.md) (reconstructed) |
| Author(s) | Grady Ng with Claude Sonnet 5 |
| Sections / rules affected | All: §0–§6, Appendices A–B |
| Supersedes | — |
| Superseded by | — |

## Context

Kind uses AI to generate interface code, design-system components, and research protocols. Before this release, nothing written down governed how that output was reviewed or who was accountable for it. The document itself gives the motivation (§0): heavy AI use increases the need for rigor, and a process counts as auditable only if every material decision leaves a record a third party can reconstruct.

The inputs were the Kind System FigJam board (`context/figjam/`) and a set of external precedents (`context/external-sources.md`). The prompts used with Claude Sonnet 5 were not kept.

## Decision

Adopt [`context/original-document.md`](context/original-document.md) as The Kind System. In summary:

- **Three required properties:** determinism where possible, a named accountable human, and a retained decision trail (§0).
- **Seven human-in-the-loop touchpoints.** AI never takes part in deciding that an artifact is fit to ship (§0.1).
- **Agents run only under scoped, version-controlled instruction sets** (Rule 0.2.1).
- **The Design System is the single source of truth** for visual design, language, accessibility, and coding standards. Changes are governed on the Polaris, Carbon, and Atlassian models (§2).
- **One AI Oversight Gate:** declared inputs → type-specific checklist → named human Pass/Fail → a decision trail (§3).
- **The Exploration Pipeline:** CENT-aligned generation, a Kind-readiness gate, science board and IRB review, and split personalised/deidentified data (§4).

## Alternatives considered

Not recorded.

## Consequences

- **Docs.** A new document, `docs/the-kind-system/the-kind-system.md`.
- **Code.** None in this release. The document described infrastructure as current (Storybook, Researcher Dashboard, DSPy/GROBID) that did not exist in the codebase. See release `2026.09.29`, decision 002.
- **Process.** From here on, every change to the Kind System has to pass Touchpoint 1 and leave a decision trail. The Kind System had no decision trail for itself until release `2026.09.29`.

## Sources

- `context/original-document.md`: the adopted text.
- `context/figjam/sources.md`: board nodes behind §1, §3, §4, and §5.
- `context/external-sources.md`: precedents cited in §2.2, §3.2, §4.1, §4.3, and §4.4.

## Open gaps

The generation prompts and the review record are missing. See [`RELEASE.md`](RELEASE.md#open-gaps).
