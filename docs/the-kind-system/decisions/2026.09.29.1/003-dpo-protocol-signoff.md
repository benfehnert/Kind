# 003. DPO data-protection sign-off on every protocol is its own touchpoint

| Field | Value |
|---|---|
| Status | Accepted |
| Reviewed | Ben Fehnert (CEO), 2026-10-02, Touchpoint 1 |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §0.1 Touchpoint 8 (new); §4.3; Rule 4.3.1; §6 |
| Supersedes | — |
| Superseded by | — |

## Context

Kind System 2026.08.28 left out the DPO's sign-off (`context/analysis.md`: "It also leaves out the DPO sign-off"). The DPO "Signs off every protocol at the Protocol Review Board for data protection and security" and "Can withhold sign-off on any protocol". The DPO also has a direct line to the Board of Directors (R&R p.11; Deck s9 step 4).

## Decision

- **New Touchpoint 8:** DPO protocol sign-off, which can be withheld independently of the Protocol Review Board's vote.
- **Rule 4.3.1** requires a DPO sign-off on record before any exploration reaches individuals.

## Alternatives considered

- **Fold DPO sign-off into Touchpoint 6.** Rejected by the user (`context/clarifications.md`, Q2): the DPO's veto is independent of the board's vote, so it gets its own row.

## Consequences

- **Docs.** §0.1, §4.3, §6.
- **Code.** None.
- **Process.** The DPO role is vacant (R&R p.1). Until it's filled, no protocol can meet Rule 4.3.1.

## Sources

- `context/analysis.md`
- `context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`, pp.1, 11
- `context/Kind_Organization_2026-09-28_v5.pdf`, s9
- `context/clarifications.md`, Q2

## Open gaps

The DPO role is unfilled.
