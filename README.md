# Health Protocol App (MVP Skeleton)

Monorepo scaffold for a health and wellbeing protocol adherence app.

## What is included

- `apps/api`: Node.js + Express + PostgreSQL API with MVP endpoint stubs
- `apps/mobile`: Expo React Native app with core navigation screens
- `infra/db/migrations`: SQL migrations for core MVP schema
- `docker-compose.yml`: Local PostgreSQL service

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL)

## Quick start

1. Start PostgreSQL:
   - `docker compose up -d`
2. Install dependencies:
   - `cd apps/api && npm install`
   - `cd ../mobile && npm install`
3. Configure API environment:
   - Copy `apps/api/.env.example` to `apps/api/.env`
4. Run migrations:
   - `cd apps/api && npm run migrate`
5. Start API:
   - `npm run dev`
6. Start mobile app:
   - `cd ../mobile && npm run start`

## API base URL

- Local API: `http://localhost:4000`
- Health check: `GET /health`
- Demo login: `demo@example.com` / `demo1234`

## Core protected routes

Use `Authorization: Bearer <token>` after login.

- `POST /plans/generate`
- `GET /plans/today`
- `PATCH /plan-items/:id`
- `GET /adherence/weekly?week_start=YYYY-MM-DD`
- `GET /me`
- `POST /onboarding/complete`

## Auth token lifecycle

- `POST /auth/login` returns `token` and `refreshToken`.
- `POST /auth/refresh` rotates refresh tokens and returns a fresh pair.
- `POST /auth/logout` revokes the provided refresh token.

## Notes

- This is an MVP skeleton with lightweight business logic and DB-backed refresh sessions.
- Replace demo credentials and add stronger rate limits, secrets management, and security hardening before release.
