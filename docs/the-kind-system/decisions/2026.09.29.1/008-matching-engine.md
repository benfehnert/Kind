# 008. The matching engine is deterministic, and changes need Protocol Review Board approval

| Field | Value |
|---|---|
| Status | Proposed |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §4.5 (new), Rules 4.5.1–4.5.2; §5 (new row) |
| Supersedes | — |
| Superseded by | — |

## Context

The analysis notes that Kind System 2026.08.28 doesn't cover the matching engine, "though it's described elsewhere as a deterministic, AI-enabled algorithm" (`context/analysis.md`, "Gaps in AI coverage"). The sources describe it as follows:
- A rule-based, deterministic engine. Any change to rules, tags or weights needs Protocol Review Board approval. Relevance feedback "never change[s] matching scores automatically" (R&R pp.8, 9).
- It matches adults using rule-based eligibility filters (Deck s4).
- It doesn't use other people's outcomes (Science Advisory Q10).
- Changes to matching logic trigger an FDA-scope re-review (R&R p.12; Deck s11).

In code, `apps/api/src/lib/onboardingRecommendations.js` scores explorations with fixed goal boosts and no model.

## Decision

- **New §4.5 and Rules 4.5.1–4.5.2** govern the engine as exploration logic, not as live AI output.
- **§5 gets a matching-engine row.**

## Alternatives considered

- **Govern it under §3.3 as live AI.** Rejected: it generates no content and uses no model.

## Consequences

- **Docs.** §4.5 and §5.
- **Code.** None. The current recommender has no recorded Protocol Review Board approval, and is listed as a gap.

## Sources

- `context/analysis.md`
- `context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`, pp.8, 9, 12
- `context/Kind_Organization_2026-09-28_v5.pdf`, s4, s11
- `context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`, Q10
- `context/codebase-audit.md`

## Open gaps

- The eligibility and exclusion hard filters haven't been audited.
- The source (`CAT`, "AI Matching Logic" tab) wasn't among the supplied documents.
