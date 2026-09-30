# Review checklist

These are the conditions to check on every Proposed decision before asking for an outcome. This is the type-specific checklist from Rule 3.1.2, applied to reviewing Kind System changes.

Legend: **Blocking** means the reviewer must resolve or explicitly acknowledge it before an outcome can be recorded. **Note** means you tell the reviewer, but it doesn't gate the outcome.

## Integrity of the record

| Check | Severity | How |
|---|---|---|
| `verify.sh` passes | Blocking | Run it. If it fails, stop the whole review. |
| Every `context/` file the decision cites exists | Blocking | `test -e` each path. |
| The docs contain the change the decision describes | Blocking | Find the rule or section the decision names in the current docs. A decision whose change isn't in the docs, or docs changed with no decision behind them, can't be accepted as-is. |
| No existing review row has been edited or deleted | Blocking | Compare against `git log -p` for the `RELEASE.md` file. |
| The reviewer isn't an author | Blocking | See SKILL.md step 2. |

## Soundness of the decision

| Check | Severity | How |
|---|---|---|
| Contradicts another decision | Blocking | Compare it with every other Proposed decision and every Accepted decision on the same sections or rules. Name both. |
| Contradicts a user-supplied source in `context/` | Blocking | Name the source and page. If the release resolved the conflict with a recorded answer (in `clarifications.md`), say so and downgrade this to a Note. |
| Rests on agent-supplied facts or citations that haven't been checked | Blocking | Look for "supplied by the agent", "to be verified", or citations absent from the user's sources. The reviewer either confirms they've checked them or accepts them as an open gap. |
| Nobody can comply with the rule on adoption | Blocking | Examples: the rule needs a vacant role, a missing board seat, or a system that doesn't exist. The reviewer confirms that adopting it now is intended, meaning everything is blocked until the gap is filled. |
| The code already violates the rule | Note | From `implementation-status.md`. Tell the reviewer the rule is adopted with the code still non-conforming. |
| The rule changes a §0.1 touchpoint or the §3 gate | Note | Say so plainly. These change who has to approve what, from now on. |
| An open gap is phrased as a question for a person or body | Note | List it, with the owner if one is named. |
| A figure is out of date | Note | |

## Dependencies

| Check | Severity | How |
|---|---|---|
| Depends on a decision in an earlier release that is still Proposed | Blocking | The earlier release has to be decided first (SKILL.md step 1). |
| Depends on another decision in the same release | Note | If one might be rejected and not the other, tell the reviewer. |
| Superseded by a later Proposed decision | Note | Accepting it records history; the later decision governs once it's accepted. |
