# 006. BRANY review routes under an umbrella protocol

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §0.1 Touchpoint 7; §4.3, Rule 4.3.2 (amended); §6 |
| Supersedes | — |
| Superseded by | — |

## Context

Kind System 2026.08.28 described only "expedited or full" IRB review, assigned "depending on the risk profile". The umbrella protocol, templated sub-studies, and BRANY deciding whether an exploration fits a template were all missing. The user's comment: "Need to add" (`context/analysis.md`).

The sources describe BRANY as central, independent and AAHRPP-accredited, with three routes:
- **Full board:** the umbrella protocol and the first set of exemplar templates.
- **Expedited:** an exploration that fits an approved template, submitted as a modification.
- **Fuller review:** a novel exploration, submitted as a modification request, which can become a new template once approved.

BRANY decides whether an exploration fits a template (Deck s10; R&R p.13; Science Advisory Q3, Q8).

## Decision

- **§4.3 names BRANY**, the umbrella protocol, and the three routes, and says that BRANY decides template fit. The investigator of record is accountable to BRANY.
- **Rule 4.3.2 records** the route, the template submitted against, and BRANY's determination of fit.
- **Touchpoint 7 names BRANY and its three routes.**

## Alternatives considered

None.

## Consequences

- **Docs.** §0.1, §4.3, §6. The Figure 3b caption now says it is out of date, because it shows two tracks.
- **Code.** None.
- **Process.** Rule 4.3.2 records need the IRB route, the template, and BRANY's fit determination.

## Sources

- `context/analysis.md`, "IRB routes"
- `context/Kind_Organization_2026-09-28_v5.pdf`, s10
- `context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`, pp.4, 13
- `context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`, Q3, Q8

## Open gaps

The approved-template library is still to be built, and is proposed to be kept by the Head of Science (R&R p.8).
