# 001. The Protocol Review Board replaces the Science Advisory Board as the scientific gate

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §0.1 Touchpoint 6; §4.3 (retitled *Protocol and Ethics Review*), Rules 4.3.1, 4.3.3 (new); §6; Figure 3b caption |
| Supersedes | — |
| Superseded by | — |

## Context

Kind System 2026.08.28 named the science advisory board as the scientific review before the IRB, and described it as external (§4.3, Touchpoint 6). Kind's governance has since moved on (`context/analysis.md`, first point; the user's comment: "Protocol Review Board is a new function"):

- The **Protocol Review Board** approves Health Explorations before the IRB. It is chaired by the CSO, run by the Head of Science, and has a quorum that includes a non-scientist and an unaffiliated member. Its process is prepare, declare, review (scientific, clinical and user-safety), DPO sign-off, submit to IRB. ([Deck](context/Kind_Organization_2026-09-28_v5.pdf) s6, s9; [R&R](context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf) pp.4, 8, 16–17)
- The **Science Advisory Board** is "advisory, not operational". It "does not approve explorations", and provides specialists and the rolling stand-in chair. (Deck s8; R&R pp.14–15)
- The CEO "does not approve Health Explorations. That sits with the Protocol Review Board and the IRB, kept separate from product approval." (R&R p.3)

## Decision

- **Touchpoint 6 becomes Protocol Review Board review:** scientific, clinical and user-safety approval, with a quorum.
- **§4.3 describes** the board's membership, quorum, five-step process, and advisory relationship with the Science Advisory Board.
- **New Rule 4.3.3:** a decision is valid only with a quorum and declared interests, and conflicted members step out.
- **Rule 4.3.1** now requires a Protocol Review Board approval on record.
- **The Science Advisory Board leaves §0.1** and is defined in §6 as advisory.
- **The precedent paragraph** (Sleepio) is reworded: the Protocol Review Board is an internal screen, and the IRB is the external review.

## Alternatives considered

- **Keep the Science Advisory Board as a touchpoint alongside the Protocol Review Board.** Rejected: the sources say the Science Advisory Board is advisory only and doesn't approve explorations.

## Consequences

- **Docs.** §0.1, §4.3, §6, and the Figure 3b caption, which now says the figure is out of date.
- **Code.** None.
- **Process.** No Protocol Review Board decisions are recorded yet. The non-scientist and unaffiliated members are to be confirmed, and the minimum number of voting members (suggested 4 or 5) is to be confirmed with BRANY (R&R p.17).

## Sources

- `context/analysis.md`, "Who reviews protocols"
- `context/Kind_Organization_2026-09-28_v5.pdf`, s3, s6, s8, s9
- `context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`, pp.3, 4, 8, 14–17
- `context/clarifications.md`, Q2 (the user's explicit confirmation of the §0.1 change)

## Open gaps

- Figure 3b needs a new FigJam export.
- The Protocol Review Board's membership is incomplete.
