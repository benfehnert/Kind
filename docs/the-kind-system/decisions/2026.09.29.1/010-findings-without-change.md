# 010. Findings closed without a Kind System change

| Field | Value |
|---|---|
| Status | Proposed |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | None |
| Supersedes | — |
| Superseded by | — |

## Context

Five points in `context/analysis.md` got a user comment that asks for no change to the Kind System.

## Decision

| Finding | User's comment | Disposition |
|---|---|---|
| AI and participant data: the closed loop feeds insights into AI protocol generation, which may not be covered by consent and privacy wording | "I will update the privacy policy separately." | No Kind System change. The privacy policy is handled outside this package. The rule on using data for AI is still open (Science Advisory Q9). |
| Data location: the Supabase region isn't stated (the working assumption is the US; the privacy policy says US, UK and Netherlands) | "I will update the privacy policy separately." | No Kind System change. The §5 Kind DB row still doesn't state a region. |
| Terminology: "Individual/Participant" vs "explorers" | "No action" | Unchanged (§6). |
| N-of-1 defined as "often randomized and blinded", though Kind won't blind at launch | "No action" | Unchanged (§6). Note that the definition describes N-of-1 trials in general, not Kind's launch design. |
| Public repository ("benfehnert/Kind Public") names the infrastructure | "No action" | Unchanged. |

## Alternatives considered

None. These follow the user's comments.

## Consequences

None, in the docs or the code.

## Sources

`context/analysis.md`

## Open gaps

- Once the privacy policy is updated, a later release should record the data region and the AI-use rule, if they affect §4.4 or §5.
