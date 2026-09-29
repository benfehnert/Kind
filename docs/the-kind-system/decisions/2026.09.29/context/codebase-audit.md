# Codebase audit: release 2026.09.29

**Taken at:** branch `staging`, commit `15a1016`, 2026-09-29
**By:** Claude Opus 5.5, using read-only inspection (file listings, `grep`, reading source)
**Purpose:** compare the Kind System v0.1 claims with what the repository actually contains

## Claims in v0.1 compared with the repository

| v0.1 claim | Where | Found in repository |
|---|---|---|
| Kind App: Expo, React Native | §5 | Yes. `apps/mobile/package.json`: `expo ^53.0.9`, `react-native 0.79.6`, `react-native-web ^0.20.0`. The web build is deployed to Cloudflare by `.github/workflows/mobile-web-deploy.yml`. |
| Kind API: Hono | §5 | Yes. `apps/api/package.json`: `hono ^4`, deployed with `wrangler ^4` as a Cloudflare Worker by `.github/workflows/api-deploy.yml`. v0.1 doesn't mention Cloudflare. |
| Kind DB: Supabase | §5 | Yes. `supabase/config.toml` and 11 migrations in `supabase/migrations/`. RLS is enabled on all 22 public tables in `20260618000000_enable_rls_policies.sql` and extended in `20260701091457_fix_missing_rls_policies.sql`. |
| Kind Researcher Dashboard | §1, §4.4, §5 | **No.** `apps/` contains `ad-prototype`, `api`, `kind-website`, and `mobile`. There is no dashboard. |
| Protocol generation: DSPy, GROBID | §4.1, §5 | **No.** No code, dependency, or config references either one. |
| Storybook as the Design System's home | §2.1, §5 | **No.** No `.storybook/` directory, no `*.stories.*` files, and no Storybook dependency. |
| Language style guides under source control | §2.1 | **No.** None found. |
| AI agent instructions under source control | §2.1, Rule 0.2.1 | **Partial.** `AGENTS.md`, `.github/agents/monorepo-release-operator.agent.md`, and `.claude/skills/supabase*` exist. They are scoped to releases and Supabase, not to code generation. |
| Decision logs under source control | §2.1 | **No.** This release adds the first one. |
| Reviewer rules, named maintainers | Rules 2.2.1–2.2.2 | **Not in repository.** There is no `CODEOWNERS`, PR template, or `.changeset/`. `scripts/release.mjs` merges `dev` → `staging` → `main` with a clean-tree check and interactive confirmation. Branch protection can't be checked from source. |
| Automated checks before deploy | §3.2 | **Partial.** `api-deploy.yml` runs `npm test` (apps/api tests, including snapshot tests in `apps/api/tests/outputs/`) before deploying. `mobile-web-deploy.yml` runs no tests. |
| CENT-aligned protocols | Rule 4.1.1 | **Partial.** CENT analysis pipelines exist for deployed explorations in `apps/api/src/lib/cent/` (morningRules, relaxationPractices, screenSleep, timeRestrictedEating, upfReduction) and `apps/api/src/lib/centShort/`. Protocols are hand-authored as seed data in `apps/api/scripts/seed-kind.mjs`. There is no generator. |
| Science board / IRB | §4.3 | **Out of repository.** Related in-app surfaces: `ResearchEthicsScreen.js`, `ExplorationConsentScreen.js`, `OnboardingConsentScreen.js`, `ConsentSummaryScreen.js` in `apps/mobile/src/screens/`. |
| Personalised data never on researcher surfaces | Rule 4.4.1 | **Holds trivially**, because no researcher surface exists. Related: `apps/api/src/lib/communityVisibility.js` (community visibility) and `apps/api/src/lib/dataExportRequest.js` (an individual's export request, emailed to Kind rather than exported automatically). |

## Parts of the codebase v0.1 doesn't mention

- **Kind website** (`apps/kind-website`): a static site deployed to GitHub Pages. It keeps its own CSS token set in `style.css`.
- **Ad prototype** (`apps/ad-prototype`): has a root script (`dev:ad-prototype`). It is not covered by the Kind System and was not audited further.
- **The actual visual system**: `apps/mobile/src/theme/` (`colors.js`, `tokens.js`, `typography.js`, `textStyles.js`) and 13 primitive files in `apps/mobile/src/components/primitives/`. The tokens were transcribed from `apps/mobile/prototype.html`.

## Token drift observed

- 11 files under `apps/mobile/src` outside `theme/` contain raw 6-digit hex colours. The most frequent are `#8A4A1A` (11 occurrences, equal to `colors.amberText`), `#FDF0E4` (9, equal to `colors.amberBg`), `#EF9F27` (8, not a token), `#E24B4A` (6, equal to `colors.notifDot`), `#888780` (6, not a token), `#5F6B5C` (6, not a token), `#185FA5` (6, equal to `colors.blueText`), and `#FAEEDA` (5, not a token). The files are listed in `docs/the-kind-system/design-tokens.md` › Known drift.
- The website's `--muted` is `#A8B3A0`, while the app's `colors.textMuted` is `#666666`. The core greens, background, text, border, and accent match.

## Other `docs/` files

`docs/kind-data-model.md`, `docs/kind-schema.sql`, `docs/kind-data-model-print.html`, `docs/scripts/generate-kind-data-model-pdf.mjs`, `docs/mobile-deterministic-algorithms.md`, and `docs/.pdf-gen-tmp/` were checked. None is cited by the Kind System, and none cites it.

- `docs/.pdf-gen-tmp/` is the working directory for `apps/api/scripts/generate-cent-reports-pdf.mjs`, `generate-cent-eating-reports-pdf.mjs`, and `generate-cent-six-week-reports-pdf.mjs`.
- `scripts/md-to-docx.py` uses `docs/mobile-deterministic-algorithms.md` as its default input.

The user left these untouched for a later decision.
