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

### Releases

- `npm run release:staging` — merge current branch → staging and push
- `npm run release:main` — merge staging → main and push

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