# Decisions

This is the paper trail for The Kind System. Every version of the system has a folder here. The folder holds the decisions that produced that version and all the context used to make them. This folder is how the Kind System meets its own Rules 3.1.1 (declared, retained inputs) and 3.1.5 (a decision trail).

## Model

The trail combines **CalVer releases** with **ADR-style decisions**:

- **A release** is one folder, named for the date the Kind System changed. It is a single version of the system as a whole.
- **A decision** is one file inside a release, recording one choice. A release can hold several unrelated decisions. Each one can be accepted, rejected, or later superseded on its own.
- **Context** is the `context/` folder in each release. It holds every input shared by that release's decisions.
- **A git tag** `kind-system/<version>` marks the commit that lands a release. It ties the documentation to the exact state of the codebase at that point.

The folders hold **inputs and reasoning only, never copies of the core docs**. To see the docs as they stood at a version, use git:

```sh
git show kind-system/2026.09.29:docs/the-kind-system/the-kind-system.md
git diff kind-system/2026.08.28 kind-system/2026.09.29 -- docs/ apps/
```

## Versioning (CalVer)

- The format is `YYYY.MM.DD`, using the date the release was written.
- A second release on the same day adds `.N`: `2026.09.29.1`, `2026.09.29.2`.
- The version appears in three places, which must match: the folder name, the header of `the-kind-system.md`, and the git tag.

## Folder layout

```
decisions/<YYYY.MM.DD[.N]>/
  RELEASE.md          # the release: status, review record, codebase ref, decision list, files changed
  001-<slug>.md       # one decision per file, numbered in order within the release
  002-<slug>.md
  context/            # every input, kept verbatim
    prompt.md         # the request that triggered the release, word for word
    clarifications.md # questions asked and answers given
    ...               # reference files, comments, slide decks, board exports, audits, citations
```

Start from [`_template/RELEASE.md`](_template/RELEASE.md) and [`_template/NNN-decision.md`](_template/NNN-decision.md).

### What goes in `context/`

Everything that informed a decision goes in `context/`, as it was received:

- Prompts and messages, word for word, including the model or agent that received them.
- Clarifying questions and their answers.
- Reference files, comments (from documents, pull requests, boards), and slide decks.
- Exported figures and board frames, with their source node or URL.
- For external sources, a citation with an access date. Include a copy when the licence allows.
- Audits of the codebase, with the commit they were taken at.

Binary files are committed directly. If a single file goes over about 5 MB, move that file type to Git LFS and note the change in this README.

## Status and immutability

- **Decision status** is one of `Proposed`, `Accepted`, `Rejected`, or `Superseded by <version>/<NNN>`.
- **Release status** is `Proposed` until a named human records the review in `RELEASE.md`, and `Accepted` after. Agents never set a release or decision to `Accepted` of their own accord (Rule 3.1.3).
- **Approval.** Use the `approve-kind-system` skill ([`../skills/approve-kind-system/SKILL.md`](../skills/approve-kind-system/SKILL.md)). It summarises what is pending, raises anything that needs clarifying, and records the named reviewer's own Accept or Reject on each decision. A release passes only when every decision in it is Accepted. If any decision is Rejected, the release fails and stays `Proposed`: the rejected changes are backed out through `update-kind-system`, and the release is reviewed again. Every attempt stays in the review record.
- **Order.** Releases are decided oldest first. A release can't be Accepted while an earlier release is still `Proposed`.
- **After acceptance, a release folder is immutable.** The only edit allowed is adding a `Superseded by` back-link to an old decision when a later decision replaces it. Corrections, including corrections to a past record, are made as new decisions in a new release.
- **Proposed releases may be edited** until they are reviewed. The history is still in git.

## Tagging

Once a release's commit has landed, tag it:

```sh
git tag -a kind-system/<version> -m "The Kind System <version>" <commit>
git push origin kind-system/<version>
```

The `update-kind-system` skill prints this command. It never runs the command itself.

## Releases

The version history in [`../README.md`](../README.md) lists every release. Each release's `RELEASE.md` is the source for its row there.

## Known exceptions

- `2026.08.28/` was reconstructed on 2026.09.29, after the fact. Its original prompts weren't kept, and the reconstruction says so.
- `2026.08.28/context/original-document.md` is a byte-for-byte copy of the v0.1 document. Its relative image links (`images/…`) don't resolve from that location, and the same images are in `2026.08.28/context/figjam/`. The file is left unedited so that it stays a faithful copy.
