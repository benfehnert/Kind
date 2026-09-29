# The Kind System

This is the governing specification for how Kind builds, reviews, and deploys features. It covers the design system, AI-generated output, and the exploration (research protocol) pipeline, and it's kept in step with the codebase that implements it.

**Current version: `2026.09.29.1`** (Proposed, pending review)

## What's here

| Path | What it is |
|---|---|
| [`the-kind-system.md`](the-kind-system.md) | **The specification.** Its rules, human-in-the-loop touchpoints, AI Oversight Gate, and exploration pipeline are all normative. |
| [`implementation-status.md`](implementation-status.md) | How much of the specification the codebase implements at a named commit, with evidence and gaps. |
| [`design-tokens.md`](design-tokens.md) | The visual system as it exists in code: colours, type, scale tokens, primitives, and known drift. |
| [`images/`](images/) | Figures used by the specification. |
| [`decisions/`](decisions/README.md) | The paper trail: one CalVer folder per version, holding its decisions and all the context used to make them. |
| [`skills/update-kind-system/`](skills/update-kind-system/SKILL.md) | Agent instructions for proposing a change. |

## Reading order

1. Start with `the-kind-system.md` §0 (purpose, touchpoints) and §1 (architecture).
2. Read `implementation-status.md` to see what is real today and what is still specified only.
3. If you're building UI, read `design-tokens.md`.
4. To find out why something is the way it is, read `decisions/`, newest first.

## Version history

| Version | Status | Decisions | Tag |
|---|---|---|---|
| [`2026.09.29.1`](decisions/2026.09.29.1/RELEASE.md) | Proposed | [001](decisions/2026.09.29.1/001-protocol-review-board.md) Protocol Review Board · [002](decisions/2026.09.29.1/002-kind-readiness-owner.md) Kind-readiness owner · [003](decisions/2026.09.29.1/003-dpo-protocol-signoff.md) DPO sign-off · [004](decisions/2026.09.29.1/004-reporting-and-protocol-standards.md) SPENT/CENT standards · [005](decisions/2026.09.29.1/005-ai-drafts-only.md) AI drafts only · [006](decisions/2026.09.29.1/006-irb-routes.md) IRB routes · [007](decisions/2026.09.29.1/007-deidentification-and-researcher-access.md) De-identification · [008](decisions/2026.09.29.1/008-matching-engine.md) Matching engine · [009](decisions/2026.09.29.1/009-live-ai-output.md) Live AI output · [010](decisions/2026.09.29.1/010-findings-without-change.md) No-change findings | *not yet created* |
| [`2026.09.29`](decisions/2026.09.29/RELEASE.md) | Proposed | [001](decisions/2026.09.29/001-documentation-package-and-trail.md) Documentation package and decision trail · [002](decisions/2026.09.29/002-implementation-status.md) Implementation status against the codebase · [003](decisions/2026.09.29/003-design-token-reference.md) Design token reference · [004](decisions/2026.09.29/004-calver.md) CalVer versioning | *not yet created* |
| [`2026.08.28`](decisions/2026.08.28/RELEASE.md) | Proposed (reconstructed; issued as "0.1 — Draft for review") | [001](decisions/2026.08.28/001-governance-spec.md) Governance specification · [002](decisions/2026.08.28/002-figures-from-figjam.md) Figures from FigJam | *not yet created* |

## Proposing a change

Every change becomes a new release in `decisions/`. Nothing is edited quietly.

- **With Claude Code:** run `/update-kind-system` and describe the change. The skill works out what the change touches in the docs and the code, asks only for what it can't find, writes the release, and leaves it `Proposed`.
- **By hand:** follow [`skills/update-kind-system/SKILL.md`](skills/update-kind-system/SKILL.md) step by step, using the templates in [`decisions/_template/`](decisions/_template/).

A release becomes `Accepted` only when a named human records the review in its `RELEASE.md`. After it's committed, tag it `kind-system/<version>`.
