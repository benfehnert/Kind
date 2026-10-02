# 002. Track implementation status against the codebase

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5 |
| Sections / rules affected | §1, §2.1, §4.1, §5 (status callouts and table); new `implementation-status.md` |
| Supersedes | — |
| Superseded by | — |

## Context

v0.1 describes Storybook, a Researcher Dashboard, and DSPy/GROBID as Kind's current infrastructure. None of them exist in the repository (`context/codebase-audit.md`). The user asked for documentation that "is intrinsically tied to the state of the codebase at that version, and informs and is informed by how it looks" (`context/prompt.md`). They chose status markers plus a token reference (`context/clarifications.md`, Q2).

## Decision

- **Rules stay normative and unchanged.** A rule isn't weakened or removed because it isn't implemented yet.
- **`implementation-status.md` records the status of each rule and component** as one of Implemented, Partial, Specified, or Out of repo. Each row has repository-path evidence and a named gap, and the whole file is verified at a named commit.
- **`the-kind-system.md` carries short status callouts** where v0.1 read as a description of the present (§1, §2.1, §4.1). The §5 table gains a Status column. The table also adds the Kind website and deployment detail (Cloudflare Workers/Pages, Supabase RLS) that v0.1 left out.
- **Status changes go through a release** in `decisions/`, like any other change.

## Alternatives considered

- **Status markers only, with no token reference.** Rejected by the user (Q2). See decision 003.
- **Keep the governance docs aspirational and record gaps only in the decision record.** Rejected: readers of the core docs would still take the stack described there to be the current one.
- **Rewrite §5 to describe only what exists.** Rejected: that would silently drop requirements (the Dashboard, generation tooling, Storybook) that the Kind System still makes.

## Consequences

- **Docs.** A new `implementation-status.md`, and the edits to `the-kind-system.md` listed above.
- **Code.** None. The gaps are recorded, not fixed.
- **Process.** When code lands that implements a Specified item, a status-only release is needed. The update skill looks for this in both directions.

## Sources

- `context/codebase-audit.md`: every status and piece of evidence.
- `context/clarifications.md`, Q2.

## Open gaps

The Figure 4 image still shows the specified stack without status.
