# 004. SPENT/SPIRIT govern protocol writing; CENT/CONSORT govern reporting

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §4.1, Rule 4.1.1 (amended); Rule 4.4.3 (new); §6 (CENT redefined, CONSORT/SPENT/SPIRIT added); Appendix B; Figure 3a caption |
| Supersedes | — |
| Superseded by | — |

## Context

Kind System 2026.08.28 based protocol generation only on CENT, which is a *reporting* guideline. The analysis says that SPENT, the SPIRIT extension for N-of-1 trials, is the standard for *writing* protocols, and that it's what the deck and the Science Advisory answers cite (`context/analysis.md`, "Standards"). The company materials name all four standards: Deck s3 and s14; Science Advisory Q4 ("Protocols are developed against SPENT/SPIRIT and CENT/CONSORT guidance"); R&R p.15.

The user's comment in `analysis.md` mapped CENT/CONSORT to *design* and SPENT/SPIRIT to *reporting*. That is the reverse of what the published standards say. The agent flagged the conflict, and the user chose the standard mapping (`context/clarifications.md`, Q1). The codebase agrees: `apps/api/src/lib/cent/` produces results *reports* from logged data.

## Decision

| Stage | N-of-1 | Group analyses |
|---|---|---|
| Writing the protocol (§4.1, Rule 4.1.1) | SPENT | SPIRIT |
| Reporting results (§4.4, Rule 4.4.3) | CENT | CONSORT |

Rule 4.1.1 now requires the checklist stage to check against SPENT (it previously named CENT). The new Rule 4.4.3 aligns reporting to CENT and CONSORT.

## Alternatives considered

- **The mapping in the user's comment in `analysis.md`.** Rejected by the user (Q1), because it conflicts with the standards and the sources.

## Consequences

- **Docs.** §4.1, §4.4, §6, and Appendix B. The Figure 3a caption now says it is out of date, because it shows CENT as the input.
- **Code.** None. The existing CENT pipelines are reporting, which fits.
- **Process.** The protocol generation checklist, when built, is derived from SPENT.

## Sources

- `context/analysis.md`
- `context/Kind_Organization_2026-09-28_v5.pdf`, s3, s5, s14
- `context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`, Q4
- `context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`, p.15
- `context/external-sources.md`: citations supplied by the agent, to be verified
- `context/clarifications.md`, Q1

## Open gaps

- Pin the SPIRIT and CONSORT versions (2013/2010 vs the 2025 updates).
- Audit whether current reports cover every CENT item.
- Re-export Figure 3a.
