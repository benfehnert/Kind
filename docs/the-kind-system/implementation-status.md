# Implementation Status

*Kind System version 2026.09.29.1. Verified against the codebase at commit `15a1016` (branch `staging`), 29 September 2026.*

[`the-kind-system.md`](the-kind-system.md) says how Kind is required to work. This document says how far the codebase at a named commit actually does. The two are kept apart on purpose: a rule does not get weaker because it isn't implemented yet, and a gap does not go unmentioned because the rule sounds settled.

## Status values

| Status | Meaning |
|---|---|
| **Implemented** | The codebase does what the rule or component describes. Evidence is a repository path. |
| **Partial** | Some of it exists in the codebase. The gap is named. |
| **Specified** | The Kind System requires it. Nothing in the repository implements it yet. |
| **Out of repo** | A human or organisational process that can't be verified from source code. Any in-app surface that touches it is listed. |

Every change to a status is made through a decision in [`decisions/`](decisions/README.md). Each row's evidence must be a path that exists at the verified commit.

## Architecture and infrastructure (Sections 1 and 5)

| Component | Status | Evidence | Gap / next step |
|---|---|---|---|
| Kind App | Implemented | `apps/mobile` (Expo 53, React Native 0.79, react-native-web 0.20); web build deployed by `.github/workflows/mobile-web-deploy.yml` | — |
| Kind API | Implemented | `apps/api` (Hono 4 on Cloudflare Workers, `apps/api/src/server.js`, `apps/api/src/worker.js`); deployed by `.github/workflows/api-deploy.yml` | — |
| Kind DB | Implemented | `supabase/migrations` (11 migrations; RLS enabled in `supabase/migrations/20260618000000_enable_rls_policies.sql` and extended in `supabase/migrations/20260701091457_fix_missing_rls_policies.sql`) | — |
| Kind website | Implemented | `apps/kind-website` | Not named in Figure 1 or Figure 4. |
| Kind Researcher Dashboard | Specified | — | No dashboard app in `apps/`. Researcher-facing surfaces today are read-only profile screens in the App (`apps/mobile/src/screens/ResearcherProfileScreen.js`). |
| Protocol-generation tooling (DSPy, GROBID) | Specified | — | No DSPy or GROBID code or dependency in the repository. |
| Design System documentation (Storybook) | Specified | — | No Storybook configuration or `*.stories.*` files. Interim source of truth: `apps/mobile/src/theme/`, recorded in [`design-tokens.md`](design-tokens.md). |

## The Design System (Section 2)

| Rule | Status | Evidence | Gap / next step |
|---|---|---|---|
| Rule 2.1 — no decision contradicts the Design System | Partial | Tokens in `apps/mobile/src/theme/colors.js`, `apps/mobile/src/theme/tokens.js`, `apps/mobile/src/theme/typography.js`, `apps/mobile/src/theme/textStyles.js`; primitives in `apps/mobile/src/components/primitives/` | 11 files under `apps/mobile/src` outside `theme/` use raw hex colours, some of which aren't tokens (e.g. `#EF9F27`, `#888780`, `#5F6B5C`). The website keeps a separate token set in `apps/kind-website/style.css`. See [`design-tokens.md`](design-tokens.md#known-drift). |
| §2.1 — style guides, agent instructions, and decision logs under source control | Partial | Agent instructions: `AGENTS.md`, `.github/agents/monorepo-release-operator.agent.md`, `.claude/skills/`. Decision log: `docs/the-kind-system/decisions/`. Update skill: `docs/the-kind-system/skills/update-kind-system/SKILL.md` | No language style guide in the repository. |
| Rule 0.2.1 — agents get scoped, version-controlled instructions | Partial | `.github/agents/monorepo-release-operator.agent.md`; `docs/the-kind-system/skills/update-kind-system/SKILL.md` | Instructions are scoped for releases and Kind System updates only. Code-generation agents have no scoped instruction set yet. |
| Rules 2.2.1–2.2.2 — reviewed changes, named maintainers, design sign-off | Specified | — | No `CODEOWNERS` file, PR template, or changeset tooling in the repository. Branch protection can't be verified from source. `scripts/release.mjs` merges `dev` → `staging` → `main` with a clean-tree check and interactive confirmation, but without review gates. |
| Rule 2.2.3 — scheduled review session for new components | Out of repo | — | No record of sessions yet. Decisions accepted in a session should name it in their `RELEASE.md` review record. |

## The AI Oversight Gate (Section 3)

| Rule | Status | Evidence | Gap / next step |
|---|---|---|---|
| Rule 3.1.1 — declared, retained inputs | Partial | For Kind System changes: each release's `context/` folder under `decisions/`. | Not applied to AI-generated application code. Release 2026.08.28 is itself missing its original prompts (see [`decisions/2026.08.28/RELEASE.md`](decisions/2026.08.28/RELEASE.md)). |
| Rule 3.1.2 — type-specific checklist | Partial | Kind System changes: `docs/the-kind-system/skills/update-kind-system/references/delta-checklist.md` and `docs/the-kind-system/skills/update-kind-system/scripts/verify.sh`. Automated checks: `apps/api/tests/` (including snapshot tests in `apps/api/tests/outputs/`), run by `.github/workflows/api-deploy.yml` before deploy | `.github/workflows/mobile-web-deploy.yml` runs no tests. There are no checklists for other artifact types. |
| Rules 3.1.3–3.1.5 — named reviewer, Pass/Fail, retained trail | Partial | Kind System changes: the review record in each `RELEASE.md`. | Not recorded for application code changes. |
| Rule 3.3.1 — live AI system gated as one artifact | Specified | Live AI output in code: `apps/api/src/feedContent.js` (LLM rewrite of feed copy via OpenAI, default `gpt-4o-mini`, used when `OPENAI_API_KEY` is set; exposed at `POST /feed/generate` in `apps/api/src/worker.js`). Instructions: `TONE` and `SAFETY` in `apps/api/src/data/morningRulesFeedLibrary.js` | No gate record for the feed-copy system. Whether `OPENAI_API_KEY` is set in production can't be verified from the repository. The scheduled path (`apps/api/src/lib/userExplorationUpdates.js`) passes `openaiApiKey: null` and always uses templates. No AI companion in the repository. |
| Rule 3.3.2 — runtime limits enforced in code | Partial | Deterministic template fallback when the key is absent or the call fails; safety copy never LLM-rewritten; cohort comparisons suppressed below `COHORT_MIN` (all in `apps/api/src/feedContent.js`, `apps/api/src/data/morningRulesFeedLibrary.js`) | "Never change numbers" and "no advice" are prompt instructions only, not checked on the output. No crisis (911/988) redirect exists anywhere in `apps/`. |
| Rule 3.3.3 — every live AI message logged | Specified | — | LLM prompts and outputs are not logged. |
| Touchpoint 10 — Safety Officer sampled review | Out of repo | — | Role vacant (per `decisions/2026.09.29.1/context/Kind_Roles-and-Responsibilities_2026-09-28_v5.pdf`); sampling schedule not set. |

## The Exploration Pipeline (Section 4)

| Rule | Status | Evidence | Gap / next step |
|---|---|---|---|
| Rule 4.1.1 — protocols checked against SPENT and internal guidelines | Specified | Related, for reporting (Rule 4.4.3) rather than generation — CENT-aligned analysis of deployed explorations: `apps/api/src/lib/cent/` (morningRules, relaxationPractices, screenSleep, timeRestrictedEating, upfReduction), `apps/api/src/lib/centShort/`; tests in `apps/api/tests/algorithm-pipelines.test.js`, `apps/api/tests/snapshot-outputs.test.js` | No SPENT-aligned protocol-generation checklist or generator. Exploration protocols (phases, log fields, outcomes) are currently hand-authored as seed data (`apps/api/scripts/seed-kind.mjs`). |
| Rule 4.1.2 — AI-drafted protocols labelled and disclosed | Specified | — | No generation tooling exists yet, so nothing is labelled. |
| Rules 4.2.1–4.2.2 — Kind-readiness gate (Head of Science) | Specified | — | No recorded Kind-readiness reviews. The Head of Science is to be recruited; the interim holder also chairs the Protocol Review Board. |
| Rules 4.3.1–4.3.3 — Protocol Review Board, DPO sign-off, BRANY routes | Out of repo | In-app consent and ethics surfaces: `apps/mobile/src/screens/ResearchEthicsScreen.js`, `apps/mobile/src/screens/ExplorationConsentScreen.js`, `apps/mobile/src/screens/OnboardingConsentScreen.js`, `apps/mobile/src/screens/ConsentSummaryScreen.js` | No Protocol Review Board decisions, DPO sign-offs, or BRANY route determinations are recorded in the repository. The non-scientist and unaffiliated members are to be confirmed, the DPO is vacant, and the minimum number of voting members is to be confirmed with BRANY. |
| Rule 4.4.1 — personalised data never on researcher surfaces; deidentify first | Partial | RLS on all public tables (`supabase/migrations/20260618000000_enable_rls_policies.sql`); community visibility controls (`apps/api/src/lib/communityVisibility.js`); individual data export requests (`apps/api/src/lib/dataExportRequest.js`, which emails a request to Kind rather than exporting automatically) | No deidentification step or researcher export exists, because there is no Researcher Dashboard. The rule holds trivially today and must be implemented along with the dashboard. |
| Rule 4.4.2 / Touchpoint 9 — Safe Harbor, cohort minimums, DUAs, DPO re-identification review | Partial | Cohort minimum for feed comparisons: `COHORT_MIN = 50` in `apps/api/src/data/morningRulesFeedLibrary.js` | No researcher export, DUA process, or re-identification review. No Kind-wide cohort minimum has been set. Website copy says researcher data is "always anonymised and aggregated" (`apps/kind-website/faq.html`, `apps/kind-website/individuals.html`, `apps/kind-website/researchers.html`, `apps/kind-website/privacy-policy.html`), which contradicts row-level access under a DUA. |
| Rule 4.4.3 — reporting against CENT / CONSORT | Partial | `apps/api/src/lib/cent/`, `apps/api/src/lib/centShort/` | Individual reports exist. Group analyses and preprints don't. Whether the reports cover every CENT item hasn't been audited. |
| Rules 4.5.1–4.5.2 — deterministic matching, PRB-approved changes | Partial | `apps/api/src/lib/onboardingRecommendations.js` (`scoreExploration`, fixed `HEALTH_GOAL_BOOSTS`; no model, no other individuals' outcomes) | No Protocol Review Board approval is recorded for the current rules. Eligibility and exclusion hard filters haven't been audited. |

## How to re-verify

Run from the repository root:

```sh
# every backticked repo path in this file exists
grep -oE '`(apps|supabase|docs|scripts|\.github|\.claude|AGENTS\.md)[^`]*`' docs/the-kind-system/implementation-status.md \
  | tr -d '`' | sed 's/ (.*//' | sort -u | while read -r p; do test -e "$p" || echo "MISSING: $p"; done
```

Update the commit in the header when you re-verify. Any status change goes through a new release in [`decisions/`](decisions/README.md).
