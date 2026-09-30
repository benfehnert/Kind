# 001. An approval skill that prepares reviews and records the human's decision

| Field | Value |
|---|---|
| Status | Proposed |
| Reviewed | pending |
| Release | [`2026.09.30`](RELEASE.md) |
| Author(s) | Grady Ng with Claude Opus 5.5 |
| Sections / rules affected | §2.1 (agent instructions under source control), Rule 0.2.1, Rules 3.1.2–3.1.4 as applied to Kind System changes; `decisions/README.md`; `decisions/_template/NNN-decision.md`; `README.md` |
| Supersedes | — |
| Superseded by | — |

## Context

The package had a skill for proposing changes (`update-kind-system`), but no defined way to approve them. The user asked for "a new skill for approving decisions, which will summarise the proposals and ask for for clarifications where needed" (`context/prompt.md`). The Kind System's own rules constrain what such a skill may do:

- The Pass/Fail call belongs to a named human (Rule 3.1.3).
- At Touchpoint 1, the reviewer can't be the author.
- A failed attempt is retained (Rule 3.1.4).
- Agents work only under scoped instructions (Rule 0.2.1).

## Decision

Add `skills/approve-kind-system/` (with a `.claude/skills/` stub), with the following design. Each point is the agent's choice and is open to the reviewer:

1. **The agent prepares and records, and the human decides.** The skill summarises, checks, and asks, then writes down the named reviewer's explicit Accept or Reject per decision. Vague approval ("looks good") isn't recorded. Blanket approval is recorded only after the exact list is read back and confirmed.
2. **Author ≠ reviewer is enforced.** A release's authors can walk through the review, but their name can't be recorded as the Touchpoint 1 reviewer. Touchpoints 2 and 3 get their required roles or session.
3. **Findings are raised against a fixed checklist** (`references/review-checklist.md`, applying Rule 3.1.2 to reviews):
   - contradictions;
   - unverified agent-supplied sources;
   - rules nobody can meet on adoption;
   - code drift;
   - missing context;
   - dependencies.

   Findings are either blocking (they must be acknowledged) or notes.
4. **A release passes only if every decision in it is Accepted.** Any Rejected decision makes the release a Fail. The release stays Proposed, and the rejected changes are backed out through `update-kind-system` before a fresh review. The approval skill never edits content.
5. **Every attempt is kept.** New rows are added to the review record, and existing rows are never overwritten. Decisions get a `Reviewed` row, which is now in the template.
6. **Releases are decided oldest first.** A release can't be Accepted while an earlier one is still Proposed.
7. **The recorder is noted alongside the reviewer** (`recorded by <git user> via approve-kind-system`), since the agent can't verify identity.
8. **No commits, tags, pushes, or release scripts.** The skill prints the next commands.

## Alternatives considered

- **Let the agent approve when the checklist comes back clean.** Rejected: it contradicts Rule 3.1.3, because the checklist informs the review and does not replace it.
- **Allow partial acceptance of a release.** Rejected: the release's doc changes would then contain unapproved content.
- **Approve through GitHub PR reviews only.** Rejected for now: no PR or CODEOWNERS setup exists (`implementation-status.md`, Rules 2.2.1–2.2.2), and the review record has to live in the package.

## Consequences

- **Docs.**
  - New: `skills/approve-kind-system/SKILL.md` and `references/review-checklist.md`.
  - Updated: `decisions/README.md` (approval, order), `decisions/_template/NNN-decision.md` (`Reviewed` row), `README.md` ("Approving a change"), `skills/update-kind-system/SKILL.md` (step 8 points to approval), and `implementation-status.md` (evidence for §2.1 and Rules 3.1.3–3.1.5).
  - `the-kind-system.md`: version header only.
- **Code.** None. `.claude/skills/approve-kind-system/SKILL.md` and `AGENTS.md` point to the skill.
- **Process.** Every release from 2026.08.28 to 2026.09.30 was authored by Grady Ng. Under design point 2, someone else has to be the Touchpoint 1 reviewer for all of them.

## Sources

- `context/prompt.md`
- `the-kind-system.md`: Rule 0.2.1, §2.1, Rules 3.1.2–3.1.4, §0.1 Touchpoints 1–3

## Open gaps

- The skill can't verify who the reviewer is. The record relies on the name they give, plus the recorder.
