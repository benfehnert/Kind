# 001. Documentation package and decision trail

| Field | Value |
|---|---|
| Status | Proposed |
| Release | [`2026.09.29`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5 |
| Sections / rules affected | §2.1 (decision logs under source control), Rules 0.2.1, 3.1.1, 3.1.5; package structure |
| Supersedes | — |
| Superseded by | — |

## Context

The Kind System requires every gated artifact to leave a decision trail (Rule 3.1.5), with inputs retained (Rule 3.1.1). It also requires agents to work from scoped, version-controlled instructions (Rule 0.2.1). The document itself had neither: it was a single file with no record of how it was made, and no instructions for changing it (`context/prompt.md`).

## Decision

`docs/the-kind-system/` becomes a package with three parts:

1. **Core docs**: `README.md`, `the-kind-system.md`, `implementation-status.md`, `design-tokens.md`, and `images/`. These describe the current version.
2. **`decisions/`**: a hybrid trail.
   - One CalVer folder per release, each holding one or more ADR-style decision files (`NNN-<slug>.md`), a `RELEASE.md`, and a verbatim `context/` folder.
   - A git tag `kind-system/<version>` on the commit that lands each release.
   - Folders hold inputs and reasoning, never copies of the docs. Git holds doc content at each version.
   - Accepted folders are immutable. Binaries are committed directly, and Git LFS is used past about 5 MB.
   - Full contract: [`../README.md`](../README.md).
3. **`skills/update-kind-system/`**: the scoped agent instruction set for changing the Kind System. It takes a user prompt, computes the delta from the docs and the codebase, asks only for information it can't find, writes a release, and leaves it `Proposed` for human review. A stub in `.claude/skills/` makes it callable from Claude Code.

## Alternatives considered

These were presented to the user in round 2 (`context/clarifications.md`, Q5):

- **One `DECISION.md` per CalVer folder** (the first plan). Rejected: several unrelated choices made on the same day couldn't be accepted or superseded separately.
- **Pure ADRs** (a flat, numbered list). Rejected: there's no unit for "the Kind System at version X", and it doesn't naturally bundle shared context such as slide decks.
- **Git-native** (PRs, tags, and a changelog). Rejected: the context lives in GitHub, where agents can't reach it at runtime, and binary inputs don't fit.
- **Changesets** (as used by Polaris, cited in Rule 2.2.1). Rejected as the main mechanism: they're good for release notes but thin on context. The one-file-per-change idea is kept in the decision files.
- **Versioned docs site** (Docusaurus/Storybook). Rejected for now: it snapshots content but doesn't capture reasoning, and Storybook doesn't exist yet (decision 002).

## Consequences

- **Docs.** New package files, listed in [`RELEASE.md`](RELEASE.md). `2026.08.28/` is reconstructed so the trail starts at the first version.
- **Code.** None. `AGENTS.md` names the skill.
- **Process.** Every future Kind System change goes through `update-kind-system` or follows its steps by hand, and lands as a new release folder that stays `Proposed` until a human records the review.

## Sources

- `context/prompt.md`: the request for core docs, CalVer decision folders with context, and a skill.
- `context/clarifications.md`: Q3 (CalVer), Q4 (skill location), Q5 (hybrid), Q6 (binaries).

## Open gaps

Tags aren't created yet. Whether the other `docs/` files belong in the trail is deferred.
