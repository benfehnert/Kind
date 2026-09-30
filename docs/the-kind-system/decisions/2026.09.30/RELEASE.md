# Release 2026.09.30

| Field | Value |
|---|---|
| Version | `2026.09.30` |
| Date | 2026-09-30 |
| Status | Proposed |
| Previous version | [`2026.09.29.1`](../2026.09.29.1/RELEASE.md) |
| Git tag | `kind-system/2026.09.30`, *not yet created* |
| Codebase at authoring | branch `dev`, commit `bd56ad3` |
| Authored by | Grady Ng with Claude Opus 5.5 (Claude Code) |

## Summary

Adds the `approve-kind-system` skill: the agent instructions for reviewing Proposed releases. It summarises them, raises what needs clarifying, and records a named human reviewer's own decisions. The governance rules are unchanged.

## Decisions

| # | Decision | Status |
|---|---|---|
| 001 | [An approval skill that prepares reviews and records the human's decision](001-approval-skill.md) | Proposed |

## Files changed

- `docs/the-kind-system/skills/approve-kind-system/SKILL.md`: new.
- `docs/the-kind-system/skills/approve-kind-system/references/review-checklist.md`: new.
- `.claude/skills/approve-kind-system/SKILL.md`: new stub.
- `docs/the-kind-system/decisions/README.md`: approval and ordering rules.
- `docs/the-kind-system/decisions/_template/NNN-decision.md`: `Reviewed` row.
- `docs/the-kind-system/README.md`: "Approving a change" section and version history.
- `docs/the-kind-system/skills/update-kind-system/SKILL.md`: step 8 points to approval.
- `docs/the-kind-system/implementation-status.md`: header and evidence for §2.1 and Rules 3.1.3–3.1.5.
- `docs/the-kind-system/the-kind-system.md`: version header only.
- `AGENTS.md`: names the skill.

## Figures

None.

## Context

| File | What it is |
|---|---|
| [`context/prompt.md`](context/prompt.md) | The request, verbatim |

## Human review record

| Touchpoint | Reviewer | Date | Outcome | Notes |
|---|---|---|---|---|
| 1: Design System change review | pending | | | This changes agent instructions, which §2.1 reviews like any Design System change. The reviewer must not be Grady Ng, the author. |

## Open gaps

1. The skill can't verify reviewer identity.
