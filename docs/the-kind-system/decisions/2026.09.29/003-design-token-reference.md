# 003. Record design tokens, with code as authoritative for values

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5 |
| Sections / rules affected | §2 (Rule 2.1), §2.1; new `design-tokens.md` |
| Supersedes | — |
| Superseded by | — |

## Context

The Kind System calls the Design System the single source of truth for visual design (Rule 2.1) and places it in Storybook (§2.1). Storybook doesn't exist. The visual system that actually ships is defined in `apps/mobile/src/theme/` and `apps/mobile/src/components/primitives/`, transcribed from `apps/mobile/prototype.html` (`context/codebase-audit.md`). The user asked that the docs reflect "how it looks" (`context/prompt.md`, and `context/clarifications.md` Q2).

## Decision

- **`design-tokens.md` records the visual system at a named commit.** It covers colours, font families, the typography scale, scale tokens (native and web values), and the primitive inventory.
- **Code is authoritative for values.** When the doc and the code disagree, the code wins until a release resolves the difference, either by changing the code or by recording the new value. Neither side is silently edited to match the other.
- **Until Storybook exists, `apps/mobile/src/theme/` together with `design-tokens.md` is the interim home** that §2.1 assigns to Storybook.
- **Drift found while writing the doc is recorded, not approved.** That includes raw hex colours in 11 files and a separate website token set.

## Alternatives considered

- **Make the doc authoritative and generate the theme from it.** Rejected for now: it would need build tooling, and the code already works as a single source.
- **Leave visual tokens out of the Kind System.** Rejected by the user (Q2).
- **Fix the drift in this release.** Rejected: that would be an unreviewed code change inside a documentation release. Each fix needs its own decision, since a colour change is a visual change under Rule 2.2.2.

## Consequences

- **Docs.** A new `design-tokens.md`.
- **Code.** None. The drift is listed in `design-tokens.md` › Known drift.
- **Process.** Any change to `apps/mobile/src/theme/` now needs a matching Kind System release. The update skill checks token values against source.

## Sources

- `context/codebase-audit.md`: the visual system and drift findings.
- `context/clarifications.md`, Q2.

## Open gaps

Whether `apps/kind-website` counts as a Design System consumer bound by Rule 2.1 hasn't been decided. Its token differences are recorded, not judged.
