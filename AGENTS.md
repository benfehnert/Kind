# Agents Guide

This repository uses a custom agent focused on local monorepo setup and safe release automation.

## Primary Agent

- Name: Monorepo Release Operator
- File: .github/agents/monorepo-release-operator.agent.md
- Purpose: make local run and release workflows easy for non-coders through root npm scripts and guardrails.

## Supported Root Scripts

Run all commands from repository root:

### Setup & database

- `npm run setup` — fresh-clone setup: install deps, start Supabase, populate .env, reset DB, seed demo data
- `npm run reset:db` — wipe and reseed the database (Supabase must already be running)

### Running services

- `npm run dev` — start all 4 services (API, mobile, website, Supabase); shows a URL summary box; Ctrl+C stops everything
- `npm run dev:api` — start API only (port 4000)
- `npm run dev:mobile` — start Expo web only
- `npm run dev:website` — start website only (port 3333)
- `npm run dev:db` — start Supabase only (ports 54321–54323)

If a port is already in use, the script will ask whether to stop the existing process or use the next available port.

### Supabase utilities

- `npm run supabase:start` — start local Supabase stack
- `npm run supabase:stop` — stop local Supabase stack
- `npm run supabase:reset` — re-apply migrations (wipes data)
- `npm run supabase:push` — push migrations to remote project
- `npm run supabase:status` — show local URLs and API keys
- `npm run seed:kind` — seed demo data into a running local DB
- `npm run backfill:activity-detail` — recompute `detail_metrics` on existing activity posts from their matching daily log (dry-run by default; pass `-- --confirm` to apply)

### Testing

- `npm run test:api` — run the API test suite (algorithm pipelines, shared stats, and snapshot tests)
- `npm run test:api:update-snapshots` — regenerate the algorithm snapshot files in `apps/api/tests/outputs/`

The snapshot tests compare the cent/centShort analysis output for every exploration against the JSON files committed in `apps/api/tests/outputs/`. If an agent changes anything under `apps/api/src/lib/cent/` or `apps/api/src/lib/centShort/`, the snapshot tests will fail; when the change is intentional, run `npm run test:api:update-snapshots`, review the git diff of `apps/api/tests/outputs/` to confirm the numbers moved as expected, and commit the updated snapshots with the code change. Never hand-edit the files in `tests/outputs/` — they are always regenerated.

### Releases

- `npm run release:staging` — push `dev`, merge `dev` → `staging`, and push `staging`
- `npm run release:main` — push `staging`, merge `staging` → `main`, and push `main`

## Kind System docs

- `docs/the-kind-system/` holds The Kind System: the design-system and governance spec (`the-kind-system.md`), implementation status against the codebase, the design token reference, and a CalVer decision trail in `decisions/`.
- To change it (tokens, primitives, rules, pipeline, stack, figures), use the `update-kind-system` skill (`/update-kind-system`, canonical instructions in `docs/the-kind-system/skills/update-kind-system/SKILL.md`). The skill writes a new release in `decisions/` and leaves it `Proposed` for human review.
- To review or approve proposed changes, use the `approve-kind-system` skill (`/approve-kind-system`). It summarises what's pending, asks for clarifications, and records a named human reviewer's decisions. An agent never approves on its own, and a reviewer can't approve their own release.
- If a change to `apps/mobile/src/theme/` or `apps/mobile/src/components/primitives/` has no matching Kind System release, the two have drifted. Record the change through the skill.

## Release Guardrails

- Release targets are fixed to dev -> staging and staging -> main.
- Release flow requires a clean working tree.
- Release flow checks remote branches before merge.
- Merge conflicts stop the process and print manual fallback steps.
- Push requires interactive confirmation.
- Build and test gates are not run in release scripts; CI in GitHub Actions is source of truth.

## Agent Communication Style

- The agent should frequently remind users what it can do in this repository.
- Capability reminders should be short and practical, focused on the exact commands and workflows available.
- Capability reminders should appear at major milestones: before setup, before release actions, and after validations.