# Release 2026.09.29.1

| Field | Value |
|---|---|
| Version | `2026.09.29.1` |
| Date | 2026-09-29 |
| Status | Accepted |
| Previous version | [`2026.09.29`](../2026.09.29/RELEASE.md) |
| Git tag | `kind-system/2026.09.29.1`, *not yet created* |
| Codebase at authoring | branch `staging`, commit `15a1016` (with release `2026.09.29` uncommitted) |
| Authored by | Grady Ng with Claude Opus 5.5 (Claude Code); findings by Ben Fehnert |

## Summary

This release brings the Kind System's research governance into line with Kind's organisation documents of 28 September 2026: the Organization deck v5, Roles and Responsibilities v5, and the Science Advisory answers v3. Ben Fehnert's gap analysis, with the user's comments, sets the scope.

- **Review gates.** The Protocol Review Board replaces the Science Advisory Board as the scientific gate. DPO sign-off and a DPO re-identification review become touchpoints, and the Head of Science owns Kind-readiness. BRANY's three review routes under an umbrella protocol replace "expedited or full".
- **Standards.** Protocols are written against SPENT/SPIRIT, and results are reported against CENT/CONSORT.
- **AI and data.** AI tooling drafts protocols only. De-identification follows Safe Harbor, plus cohort minimums and Data Use Agreements.
- **New sections.** One governs live AI output to individuals (§3.3), and one governs the deterministic matching engine (§4.5).

## Decisions

| # | Decision | Status |
|---|---|---|
| 001 | [The Protocol Review Board replaces the Science Advisory Board as the scientific gate](001-protocol-review-board.md) | Accepted |
| 002 | [The Head of Science owns the Kind-readiness determination](002-kind-readiness-owner.md) | Accepted |
| 003 | [DPO data-protection sign-off on every protocol is its own touchpoint](003-dpo-protocol-signoff.md) | Accepted |
| 004 | [SPENT/SPIRIT govern protocol writing; CENT/CONSORT govern reporting](004-reporting-and-protocol-standards.md) | Accepted |
| 005 | [AI tooling produces draft protocols only, with disclosure](005-ai-drafts-only.md) | Accepted |
| 006 | [BRANY review routes under an umbrella protocol](006-irb-routes.md) | Accepted |
| 007 | [De-identification standard, researcher access, and DPO re-identification review](007-deidentification-and-researcher-access.md) | Accepted |
| 008 | [The matching engine is deterministic, and changes need Protocol Review Board approval](008-matching-engine.md) | Accepted |
| 009 | [Governing live AI output to individuals](009-live-ai-output.md) | Accepted |
| 010 | [Findings closed without a Kind System change](010-findings-without-change.md) | Accepted |

## Files changed

- **`docs/the-kind-system/the-kind-system.md`:**
  - version header;
  - §0.1 touchpoints 5–7 revised, 8–10 added, and the closing paragraph revised;
  - new §3.3;
  - §4.1 rewritten for SPENT, AI drafts, and the standards table, with new Rule 4.1.2;
  - §4.2 owner;
  - §4.3 rewritten, with Rules 4.3.1–4.3.2 amended and 4.3.3 added;
  - §4.4 Rules 4.4.2–4.4.3 and Touchpoint 9 added;
  - new §4.5;
  - §5 rows for matching and live AI output;
  - §6 definitions;
  - Figure 3a–3c captions and Appendices A and B.
- **`docs/the-kind-system/implementation-status.md`:** rows for Rules 3.3.x, 4.1.x, 4.2, 4.3.x, 4.4.x, and 4.5.x.
- **`docs/the-kind-system/README.md`:** version history.

No application code changed.

## Figures

None regenerated. Figures 3a and 3b are now marked out of date, and 3c is marked incomplete. Re-exports from FigJam node 17:1968 are needed. The board's file URL is still unrecorded (see release 2026.08.28).

## Context

| File | What it is |
|---|---|
| [`context/prompt.md`](context/prompt.md) | Both prompts for this release, verbatim, and the list of files the user supplied |
| [`context/analysis.md`](context/analysis.md) | Ben Fehnert's gap analysis, with the user's comments (supplied by the user) |
| [`context/Kind_Organization_2026-09-28_v5.pdf`](context/Kind_Organization_2026-09-28_v5.pdf) | Organization deck, v5 (supplied) |
| [`context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`](context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf) | Roles and Responsibilities, v5 (supplied) |
| [`context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`](context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf) | Science Advisory answers, v3 (supplied) |
| [`context/clarifications.md`](context/clarifications.md) | Four questions asked, and the answers |
| [`context/codebase-audit.md`](context/codebase-audit.md) | The analysis points checked against the code |
| [`context/external-sources.md`](context/external-sources.md) | Citations for SPENT, SPIRIT, CONSORT, and Safe Harbor. They were supplied by the agent and need checking. |

## Human review record

| Touchpoint | Reviewer | Date | Outcome | Notes |
|---|---|---|---|---|
| 1: Design System change review | Ben Fehnert (CEO) | 2026-10-02 | Pass | Accepted 001–010. Acknowledged as known gaps: agent-supplied SPENT/SPIRIT/CONSORT/HHS citations not fetched (004, 007); adopting now means explorations stay blocked until DPO, Safety Officer, PRB seats, and Head of Science are filled (001, 002, 003, 007, 009). recorded by Ben via approve-kind-system |

## Open gaps

1. **Interim conflict at Touchpoints 5/6.** The interim Head of Science and the Protocol Review Board chair are the same person (decision 002).
2. **Unfilled roles and board seats.** The DPO and Safety Officer roles are vacant, the Protocol Review Board's non-scientist and unaffiliated members are to be confirmed, and the minimum number of voting members is to be confirmed with BRANY.
3. **Figures.** 3a, 3b, and 3c need re-exporting.
4. **Standards versions and CENT coverage.** Pin the SPIRIT and CONSORT versions, and audit report coverage against CENT.
5. **Cohort minimum.** No Kind-wide minimum cohort size has been set.
6. **Website drift.** The copy says "always anonymised and aggregated" and "HIPAA-compliant".
7. **`apps/api/src/feedContent.js` doesn't conform to §3.3.** It has no gate pass, no logging, no crisis redirect, and prompt-only limits.
8. **Touchpoint 10 details.** The sampling schedule and the in-code "no advice" checks are undefined.
9. **Science Advisory Q4 disclosure.** The answers still need to disclose AI drafting. That document is outside this package.
10. **Citations to verify.** The external citations in `context/external-sources.md` haven't been checked by a person.
