# 004. Version the Kind System with CalVer

| Field | Value |
|---|---|
| Status | Proposed |
| Release | [`2026.09.29`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5 |
| Sections / rules affected | Document header; `decisions/` folder names; git tags |
| Supersedes | — |
| Superseded by | — |

## Context

v0.1 used a semantic-style version ("Version 0.1 — Draft for review"). The user asked for decision folders "using CalVer" (`context/prompt.md`) and chose `YYYY.MM.DD` (`context/clarifications.md`, Q3).

## Decision

- **Versions are `YYYY.MM.DD`**, with `.N` added for a second release on the same day.
- **The same string is used in three places:** the `the-kind-system.md` header, the `decisions/` folder name, and the git tag `kind-system/<version>`.
- **v0.1 is renamed to `2026.08.28`**, the date of commit `15a1016`.

## Alternatives considered

- **`YYYY.0M.MICRO`.** Rejected: the counter carries no meaning, and the date is what readers look for.
- **`YYYY-MM-DD-slug`.** Rejected: a slug describes one change, but a release can hold several decisions.
- **Keep SemVer.** Rejected: the Kind System has no API consumers who need to know what's breaking, and "when did the rules change" matters more to readers.

## Consequences

- **Docs.** The version header now reads `2026.09.29` and notes the old name for the previous version.
- **Code.** None.
- **Process.** A release's version is the date it was written. If it's accepted on a later date, the version stays the same and the acceptance date goes in the review record.

## Sources

- `context/prompt.md`
- `context/clarifications.md`, Q3

## Open gaps

None.
