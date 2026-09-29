# 009. Governing live AI output to individuals

| Field | Value |
|---|---|
| Status | Proposed |
| Release | [`2026.09.29.1`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5; findings from Ben Fehnert (`context/analysis.md`) |
| Sections / rules affected | §3.3 (new), Rules 3.3.1–3.3.3; §0.1 Touchpoint 10 (new) and closing paragraph; §5 (new row); §6 |
| Supersedes | — |
| Superseded by | — |

## Context

The analysis found that nothing in Kind System 2026.08.28 governs the AI companion that talks to participants: "Its messages are generated live, so they never pass a review gate." It flags two concerns: Q7 (spotting safety issues), and claims, since the companion must never give advice. The user asked: "How would we govern the AI companion discussions with Individuals?" (`context/analysis.md`).

The sources set the rules any live output must follow:
- Logs and summarises only, with no diagnosis or treatment advice.
- A non-dismissible crisis redirect to 911/988.
- A full audit trail of consent, prompts, confirmations and screening (Deck s12).
- The Head of Product keeps that trail and enforces the redirect and no-advice rules (R&R p.9).
- The Safety Officer monitors content for drift toward disease or treatment claims (R&R p.12).
- The companion sends reminders once or twice a day (Science Advisory Q4).

The codebase has no companion. It does already have live AI output: `apps/api/src/feedContent.js` rewrites feed copy with an LLM (`context/codebase-audit.md`).

The user chose to gate the system rather than each message (`context/clarifications.md`, Q4).

## Decision

- **New §3.3.** Live AI systems pass the AI Oversight Gate as one artifact: instructions, content library, model and version, and runtime limits. The Head of Product and the Safety Officer review it, and any change re-enters the gate (Rule 3.3.1).
- **Rule 3.3.2** sets runtime limits enforced in code:
  - no advice;
  - never change numbers;
  - a crisis redirect that is never AI-generated;
  - safety copy that is never rewritten;
  - a deterministic fallback.
- **Rule 3.3.3** requires every message to be logged.
- **New Touchpoint 10:** the Safety Officer reviews a sample of logged output on a schedule.
- **§3.3 covers the existing feed-copy LLM as well as the future companion.**

## Alternatives considered

- **Templates only at launch.** No live generation would reach individuals. Rejected (Q4).
- **Record as an open gap.** Rejected (Q4).

## Consequences

- **Docs.** §0.1, §3.3, §5, §6.
- **Code (not changed; recorded as non-conformance in `implementation-status.md`).** `apps/api/src/feedContent.js`:
  - has no gate record;
  - enforces "preserve numbers" only as a prompt instruction;
  - doesn't log prompts or outputs;
  - has no crisis redirect.

  Before the feed-copy LLM is enabled for individuals, it needs a Rule 3.3.1 gate pass and the Rule 3.3.2–3.3.3 controls.
- **Process.** The Safety Officer role is vacant, and no sampling schedule has been set.

## Sources

- `context/analysis.md`, "Gaps in AI coverage"
- `context/Kind_Organization_2026-09-28_v5.pdf`, s12
- `context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`, pp.9, 12
- `context/Kind_Science-Advisory-Questions_2026-09-28_v3.pdf`, Q4, Q7
- `context/codebase-audit.md`
- `context/clarifications.md`, Q4

## Open gaps

- Set a sample size and cadence for Touchpoint 10.
- Decide which checks enforce "no advice" in code, for example a classifier or blocklist.
- Confirm whether `OPENAI_API_KEY` is set in production.
- Fill the Safety Officer role.
