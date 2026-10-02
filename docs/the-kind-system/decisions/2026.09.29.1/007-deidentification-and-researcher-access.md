# 007. De-identification standard, researcher access, and DPO re-identification review

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §0.1 Touchpoint 9 (new) and its closing paragraph; §4.4, Rule 4.4.2 (new); §6; Appendix B; Figure 3c caption |
| Supersedes | — |
| Superseded by | — |

## Context

Ben's analysis found three gaps in Kind System 2026.08.28 (`context/analysis.md`, "De-identification and researcher access"):
- It named no de-identification standard or minimum group sizes.
- The dashboard's data export contradicted the website's "aggregated only" wording.
- It didn't mention Data Use Agreements.

The user's comment: "Should reference Safe Harbor Method plus a review to reduce chance of any reidentification".

The sources say the DPO applies HIPAA Safe Harbor "as a working definition" plus minimum cohort sizes. Researchers get aggregate outputs by default, and row-level data only under a DUA that bans re-identification and onward transfer (R&R p.11; Science Advisory Q9; Deck s3). Kind is not a HIPAA covered entity (Deck s11). The user chose a DPO review before each release of de-identified data (`context/clarifications.md`, Q3).

## Decision

- **New Rule 4.4.2:** Safe Harbor as the working definition, plus minimum cohort sizes, owned by the DPO. Researcher output is aggregate by default, and row-level data is released only under a DUA.
- **New Touchpoint 9:** the DPO reviews re-identification risk before any de-identified dataset or export leaves Kind.
- **The §0.1 closing paragraph** now says de-identification is a technical control followed by a human review. Only data *routing* stays purely automated.

## Alternatives considered

- **Review once, at DPO protocol sign-off.** Rejected (Q3): risk depends on the actual dataset and its cohort size, not only on the protocol.
- **Leave the review as an open gap.** Rejected (Q3).

## Consequences

- **Docs.** §0.1, §4.4, §6, Appendix B, and the Figure 3c caption.
- **Code.** None changed. `COHORT_MIN = 50` already gates feed comparisons (`apps/api/src/data/morningRulesFeedLibrary.js`).
- **Website (not changed).** The website says researcher data is "always anonymised and aggregated" and "built to HIPAA-compliant standards" (`context/codebase-audit.md`). Both conflict with Rule 4.4.2 and with Deck s11. This is recorded as drift in `implementation-status.md`. The user is updating the privacy policy separately (decision 010).

## Sources

- `context/analysis.md`
- `context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`, p.11
- `context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`, Q9
- `context/Kind_Organization_2026-09-28_v5.pdf`, s3, s11
- `context/external-sources.md` (HHS guidance)
- `context/codebase-audit.md`
- `context/clarifications.md`, Q3

## Open gaps

- No Kind-wide minimum cohort size has been set; the DPO decides it.
- The DPO role is vacant.
- Website copy needs changing.
- Figure 3c needs a new export.
