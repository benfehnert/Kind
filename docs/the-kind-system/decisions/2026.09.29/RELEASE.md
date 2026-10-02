# Release 2026.09.29

| Field | Value |
|---|---|
| Version | `2026.09.29` |
| Date | 2026-09-29 |
| Status | Accepted |
| Previous version | [`2026.08.28`](../2026.08.28/RELEASE.md) |
| Git tag | `kind-system/2026.09.29`, *not yet created* |
| Codebase at authoring | branch `staging`, commit `15a1016` |
| Authored by | Grady Ng with Claude Opus 5.5 (Claude Code) |

## Summary

This release turns The Kind System from a single document into a versioned documentation package:

- Core docs, plus a decision trail of CalVer releases containing ADR-style decisions, and a skill for making future updates.
- The documentation is now tied to the state of the codebase. Each specified rule and component has an implementation status backed by repository evidence.
- The visual token values that actually exist in code are now recorded.

The governance rules themselves are unchanged.

## Decisions

| # | Decision | Status |
|---|---|---|
| 001 | [Documentation package and decision trail](001-documentation-package-and-trail.md) | Accepted |
| 002 | [Track implementation status against the codebase](002-implementation-status.md) | Accepted |
| 003 | [Record design tokens, with code as authoritative for values](003-design-token-reference.md) | Accepted |
| 004 | [Version the Kind System with CalVer](004-calver.md) | Accepted |

## Files changed

- `docs/the-kind-system/README.md`: new. Package index and version history.
- `docs/the-kind-system/the-kind-system.md`: the version header, plus implementation-status callouts in §1, §2.1, and §4.1. The §5 table gains a Status column, a Kind website row, and Cloudflare/RLS detail. Appendix A gains a pointer to `decisions/`. No rule text changed.
- `docs/the-kind-system/implementation-status.md`: new.
- `docs/the-kind-system/design-tokens.md`: new.
- `docs/the-kind-system/decisions/`: new. Contains `README.md`, `_template/`, `2026.08.28/` (reconstructed), and `2026.09.29/`.
- `docs/the-kind-system/skills/update-kind-system/`: new. Contains `SKILL.md`, `references/delta-checklist.md`, and `scripts/verify.sh`.
- `.claude/skills/update-kind-system/SKILL.md`: new. A stub that points to the canonical skill.
- `AGENTS.md`: adds a "Kind System docs" section.

No application code changed. The other files in `docs/` are untouched by user decision (see `context/clarifications.md`, Q1).

## Figures

None regenerated. Figure 4 still shows the stack as specified. The §5 table carries the status.

## Context

| File | What it is |
|---|---|
| [`context/prompt.md`](context/prompt.md) | The user's request and follow-up, verbatim |
| [`context/clarifications.md`](context/clarifications.md) | Six questions asked during planning, and the answers |
| [`context/codebase-audit.md`](context/codebase-audit.md) | v0.1 claims compared with the repository at `15a1016` |

## Human review record

| Touchpoint | Reviewer | Date | Outcome | Notes |
|---|---|---|---|---|
| 1: Design System change review | Ben Fehnert (CEO) | 2026-10-02 | Pass | Accepted 001–004. recorded by Ben via approve-kind-system |

## Open gaps

1. What to do with the other `docs/` files is deferred (clarifications, Q1).
2. Neither `kind-system/2026.08.28` nor `kind-system/2026.09.29` has been created as a tag yet.
3. The Figure 4 image doesn't show implementation status.
4. The token drift recorded in `design-tokens.md` › Known drift is not resolved.
