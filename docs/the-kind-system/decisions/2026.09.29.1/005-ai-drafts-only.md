# 005. AI tooling produces draft protocols only, with disclosure

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §4.1, Rule 4.1.2 (new); §5 protocol-generation row |
| Supersedes | — |
| Superseded by | — |

## Context

Kind System 2026.08.28 describes generating protocols from published papers with AI tools (DSPy, GROBID). This doesn't appear in the IRB brief, the Science Advisory answers, or the R&R. The analysis points out that BRANY and the Science Advisory Board will expect it to be disclosed. The user commented: "Need to be clear that its only draft protocols that are created using these tools and that the Protocol Review Board and the IRB will also be involved before being added to Kind" (`context/analysis.md`).

## Decision

- **§4.1 states** that AI tooling produces draft protocols only, and that a draft passes Touchpoints 5–8 like any human-drafted protocol.
- **New Rule 4.1.2:** AI-drafted protocols are labelled in the decision trail and disclosed to the Protocol Review Board and the IRB, with no shortcut through any gate.
- **The §5 row** now says the tooling generates *draft* protocols.

## Alternatives considered

None.

## Consequences

- **Docs.** §4.1 and §5.
- **Code.** None. The tooling doesn't exist yet.
- **Outside the Kind System.** The analysis suggests Q4 of the Science Advisory answers (`context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`) should mention AI drafting. That document isn't part of this package, so it's recorded here as a follow-up for its author.

## Sources

- `context/analysis.md`, "AI drafts protocols"
- `context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`, Q4

## Open gaps

The Science Advisory answers (Q4) and any IRB submission still need to disclose AI drafting.
