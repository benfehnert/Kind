---
name: approve-kind-system
description: Review and record a human decision on proposed changes to The Kind System (docs/the-kind-system). Use when asked to approve, accept, reject, sign off, review, or send back a Kind System release or decision, or to find out what is waiting for approval. Summarises every Proposed release and decision in plain language, checks them against the docs, the codebase, and each other, asks the reviewer to resolve anything unclear, then records the reviewer's own Accept/Reject calls in the decision trail. It never makes the call itself.
---

# Approve The Kind System

These are the scoped instructions (Rule 0.2.1) for helping a person review proposed Kind System changes. **You prepare the review and record the outcome. The named human reviewer decides** (Rule 3.1.3; Touchpoint 1). You never choose an outcome, never infer approval from vague wording, and never record a reviewer the person didn't name.

Package root: `docs/the-kind-system/`. Paths below are relative to it unless they start with `apps/`, `supabase/`, `.github/`, or `scripts/`.

## What you may use

- **You may read:** everything in the package, including every `context/` file, and any repository file a release cites.
- **You may write, and only to record a review:**
  - in a decision file: the `Status` and `Reviewed` rows;
  - in a `RELEASE.md`: the `Status` row and the review record table;
  - in `README.md`: the Status column of the version history;
  - in `the-kind-system.md`: the status wording in the version header.
- **You must not:**
  - change what a decision says, or any rule text. If the reviewer wants content changed, that is a Fail, and the change goes through `update-kind-system`;
  - edit an `Accepted` release, except the `Superseded by` back-link that `update-kind-system` adds;
  - overwrite or delete an earlier review attempt (Rule 3.1.4);
  - commit, tag, push, or run release scripts.

## Workflow

### 1. Find what's pending
1. List every release folder in `decisions/` whose `RELEASE.md` says `Status | Proposed`. If the person named specific versions, limit the review to those.
2. Order them oldest first. A later release may build on an earlier one, so it can only be `Accepted` once every earlier release is `Accepted`, or has had its changes removed after a Fail.
3. Run `bash docs/the-kind-system/skills/update-kind-system/scripts/verify.sh` from the repository root. If it fails, report the failure and stop. Records that don't match the docs can't be approved.

### 2. Identify the reviewer
Ask who is reviewing: their name and their role. Show `git config user.name` as a suggestion only, and never assume it.

Then check the reviewer against each release's review record and authors:
- **Touchpoint 1:** the reviewer must not be an author of the release (the `Authored by` row and every decision's `Author(s)`). If they are, say so plainly. They can still go through the review, but you can't record a Touchpoint 1 outcome under their name. Ask for, or wait for, a reviewer who isn't an author.
- **Touchpoint 2** (visual changes): needs a design reviewer plus two developer approvers. Record each person separately, and treat the touchpoint as passed only when all three have recorded Pass.
- **Touchpoint 3** (new components or patterns): needs the scheduled design-system review session. Ask for the session date and the decision it reached.
- **Any other touchpoint** listed in the review record: confirm the reviewer holds the named role.

You can't verify identity. Record the name the reviewer gives, and add who recorded it (`recorded by <git user> via approve-kind-system`).

### 3. Summarise
For each pending release, in order, give:
- **One paragraph:** what the release changes and why, in plain language.
- **One entry per decision:**
  - what becomes true;
  - what it replaces;
  - where it came from: user-supplied sources in `context/`, versus the agent's own inference or citations;
  - its consequences for the docs, the code, and people;
  - its open gaps.

Keep each decision to a few lines, and link to the decision file. Don't paraphrase rule text in a way that changes it. Quote it when precision matters.

### 4. Find what needs clarifying
Go through [`references/review-checklist.md`](references/review-checklist.md) for every decision. It lists the conditions to look for: contradictions, unverified sources, rules nobody can meet yet, drift from the code, missing context, and dependencies on other decisions.

Put every finding in one batch, grouped by release and decision. For each finding, say why it matters and what the reviewer's options are. Keep **blocking** findings (the decision can't be recorded until the reviewer resolves or explicitly acknowledges them) separate from **notes**. Don't bury the summary under findings: summary first, then findings.

### 5. Ask for the decisions
In the same batch, or right after it, ask for an explicit outcome on every decision:
- **Accept.** The reviewer must also acknowledge each blocking finding: accepted with the gap noted, or resolved by an answer you record.
- **Reject.** Ask for the reason.

Blanket answers ("approve everything") count only if you repeat back the exact list of decisions they cover and the reviewer confirms it. "Looks good", "fine", or silence is not an outcome. Ask again.

### 6. Record
Use today's date. For each release:

**If every decision is Accepted, the release passes:**
1. In each decision file, set `Status | Accepted`. Add or fill `Reviewed | <name> (<role>), <YYYY-MM-DD>, <touchpoint>` directly below `Status`.
2. In `RELEASE.md`, set `Status | Accepted`. Add a new row to the review record for each touchpoint and reviewer: reviewer, date, `Pass`, and notes. Notes list the acknowledged findings, the answers given, and `recorded by <git user> via approve-kind-system`. Replace a `pending` placeholder row; never overwrite an earlier Fail row.
3. In `README.md`, set the release's Status column to `Accepted`.
4. If this is the newest release, change `Proposed, pending review` in the `the-kind-system.md` header to `Accepted <YYYY-MM-DD>`.

**If any decision is Rejected, the release fails (Rule 3.1.4):**
1. Set each rejected decision to `Status | Rejected`, with the `Reviewed` row and the reason. Leave the accepted decisions as `Proposed`: their acceptance still depends on the amended release.
2. Add a `Fail` row to the `RELEASE.md` review record, with the rejected decisions and the reasons. The release stays `Proposed`.
3. Tell the reviewer that the release's doc changes still include what was rejected. The next step is `update-kind-system`, to amend this Proposed release and back those changes out, and then a fresh approval. Don't edit the docs yourself.

**If the reviewer defers a decision,** record nothing for it, and leave the release `Proposed`.

### 7. Verify
Run `verify.sh` again. Then check that:
- every decision you recorded has matching `Status` and `Reviewed` rows;
- every Accepted release has only Accepted (or Superseded) decisions;
- the README history agrees with each `RELEASE.md`;
- `git diff` shows changes only to status and review fields.

### 8. Report
Tell the person:
- What was recorded, per release: Pass or Fail, by whom.
- What's still pending, and why.
- Findings that were accepted as known gaps.
- The next steps, printed but not run: commit on `dev`, then tag each Accepted release and release to staging.

```sh
git tag -a kind-system/<version> -m "The Kind System <version>" <commit>
git push origin kind-system/<version>
npm run release:staging
```
