---
name: update-kind-system
description: Propose a change to The Kind System (Kind's design system and governance docs in docs/the-kind-system). Use when asked to update, change, add, or remove a design token, colour, type style, primitive component, governance rule, review touchpoint, pipeline step, infrastructure component, figure, or implementation status, or when code under apps/mobile/src/theme has changed and the docs must catch up. Takes the user's prompt, works out the delta against the current docs and codebase, asks only for missing information, then writes a new CalVer release in decisions/ and updates the core docs, leaving it Proposed for human review.
---

# Update The Kind System

These are the scoped instructions (Rule 0.2.1) for any agent changing The Kind System. You propose. A named human decides (Rule 3.1.3). Never mark a release or decision `Accepted`.

Package root: `docs/the-kind-system/`. All paths below are relative to it unless they start with `apps/`, `supabase/`, `.github/`, or `scripts/`.

## What you may use

- **You may read:** the core docs (`README.md`, `the-kind-system.md`, `implementation-status.md`, `design-tokens.md`); every release in `decisions/`; any file in the repository that a core doc cites or that the change touches; and files, links, or comments the user supplies.
- **You may write:** a new `decisions/<version>/` folder; the four core docs; `images/` (only with an export the user supplied); and, only if the user asks for it explicitly, the code the change requires.
- **You must not:**
  - edit an `Accepted` release folder (the only exception is the `Superseded by` back-link);
  - invent rationale, reviewers, sources, or dates;
  - create git tags, commit, or push;
  - change the Section 0.1 touchpoints or Section 3 gate without flagging this as a governance change that needs the user's explicit confirmation.

## Workflow

### 1. Load the current state
1. Read `README.md` to get the current version and the latest release.
2. Read the latest release's `RELEASE.md` and its decisions, and any earlier decision the prompt refers to.
3. Read the sections of `the-kind-system.md`, `implementation-status.md`, and `design-tokens.md` that the prompt touches.
4. Read the code those sections cite. For visual changes, always read `apps/mobile/src/theme/*.js`. For stack changes, read the relevant `package.json` and `.github/workflows/*`.
5. Note the current branch and short SHA (`git rev-parse --short HEAD`, `git branch --show-current`). If the working tree is dirty, note which files are changed.

### 2. Classify
Split the prompt into separate decisions. Two choices that could be accepted or rejected independently become two decisions. Give each one a type:

| Type | Examples |
|---|---|
| `token` | colour, spacing, type scale, radius |
| `primitive` | a new or changed shared component in `components/primitives/` |
| `governance` | a rule, touchpoint, or gate in §0–§4 |
| `pipeline` | the exploration pipeline steps in §4 |
| `infrastructure` | stack components in §1 / §5 |
| `figure` | regenerating or adding a diagram |
| `status` | code caught up with the spec, or the spec now describes code that exists |
| `correction` | a past record or doc was wrong |

### 3. Compute the delta
For each decision, write down three things:
- **Requested state:** what the user wants to be true.
- **Documented state:** what the core docs say now, quoted with section numbers.
- **Code state:** what the repository does now, with paths.

Report any mismatch between the documented and code states even if the user didn't ask about it. That existing drift is part of the delta, and may be its own `status` decision.

### 4. Find the missing information
Go through [`references/delta-checklist.md`](references/delta-checklist.md) for each decision's type. For each required field:
- **Can be found** in the repo, the docs, or earlier releases → fill it in and cite where it came from.
- **Supplied** in the prompt or attachments → fill it in and cite the prompt.
- **Otherwise it's missing.** Collect it.

Ask for all missing fields **in one batch**, grouped by decision. Offer concrete options where the repo suggests some. Don't ask for anything you could find yourself. Don't write files until the blocking fields are answered. Fields marked *may be pending* can be written as `pending` and listed under Open gaps.

### 5. Write the release
1. **Version.** Use today's date as `YYYY.MM.DD`. If `decisions/YYYY.MM.DD/` already exists, use the next free `.N`.
2. Copy `decisions/_template/RELEASE.md` → `decisions/<version>/RELEASE.md`, and `_template/NNN-decision.md` once per decision as `001-<slug>.md`, `002-…`.
3. **`context/`**, saving every input verbatim:
   - `prompt.md`: the user's prompt(s) word for word, with the date, the receiving agent/model, and the branch and SHA.
   - `clarifications.md`: your questions, the options offered, and the answers.
   - Every file, comment, slide deck, or export the user supplied, unchanged. Give external links an access date.
   - `codebase-audit.md` when the change needed code inspection, listing the paths read and what was found at which SHA.
4. **Supersession.** If a decision replaces an earlier one, set `Supersedes` on the new decision. Then add `Superseded by <version>/<NNN>` to the old one. This is the only edit allowed in an accepted folder.
5. **Review record.** In the `RELEASE.md` review record, list the touchpoints this release needs, with every reviewer set to `pending`:
   - Any change → Touchpoint 1.
   - A visual change → Touchpoint 2.
   - A new component or pattern → Touchpoint 3.

### 6. Apply the change to the core docs
1. `the-kind-system.md`:
   - Set the version header to the new version, and move the old version into the "Previous version" line.
   - Make the text changes the decisions call for. Keep rule numbering stable: add new rules as the next number in their section, and mark removed rules as removed rather than renumbering.
2. `implementation-status.md`: update the affected rows, re-verify every cited path, and update the header commit.
3. `design-tokens.md`: when theme code or primitives changed, regenerate the affected tables from source (see its "Re-verifying" section) and update the header commit. Add new drift to Known drift, and remove drift that a decision has resolved.
4. `README.md`: add a row to the version history for the new release, and update "Current version".
5. If the user asked for code changes and they're in scope, make them. List them under Consequences → Code, and in `RELEASE.md` › Files changed.

### 7. Verify
From the repository root, run:

```sh
bash docs/the-kind-system/skills/update-kind-system/scripts/verify.sh
```

It checks five things:
- Relative links and images resolve.
- Every repo path cited in `implementation-status.md` and `design-tokens.md` exists.
- Every colour in `apps/mobile/src/theme/colors.js` is recorded in `design-tokens.md`.
- Every decision listed in a `RELEASE.md` exists.
- No existing release file has changed apart from `Superseded by` back-links. A `CHANGED` line is acceptable only for a release that is still `Proposed`.

Fix any failure. Then check by hand:
- Non-colour token values you touched match `apps/mobile/src/theme/tokens.js` (regenerate per `design-tokens.md` › Re-verifying).
- Every `context/` file cited by a new decision exists.

### 8. Report
Tell the user:
- The new version, and one line per decision.
- What was deferred or left `pending`.
- The touchpoints that now need a human reviewer.
- Next steps: review, commit (on `dev` first, per this repo's workflow), then tag with:

```sh
git tag -a kind-system/<version> -m "The Kind System <version>" <commit> && git push origin kind-system/<version>
```

Don't run these commands yourself.
