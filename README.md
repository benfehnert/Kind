# Kind

Monorepo for the Kind health exploration app.

## Structure

- `apps/api`: Node.js + Express API backed by Supabase (PostgreSQL)
- `apps/mobile`: Expo React Native app
- `supabase/`: Local Supabase config and migrations

## Prerequisites

- Node.js 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase` or `npx supabase`)

## Local dev

```sh
# 1. Start local Supabase (Postgres + Auth + Studio)
npm run supabase:start

# 2. Apply schema and seed demo data
npm run supabase:reset
npm run seed:kind

# 3. Start the API  (in apps/api/)
cd apps/api && npm run dev

# 4. Start the mobile app (in apps/mobile/)
cd apps/mobile && npm start
```

Supabase Studio runs at `http://localhost:54323`.

## Supabase commands (from repo root)

| Command | Description |
|---|---|
| `npm run supabase:start` | Start local Supabase stack |
| `npm run supabase:stop` | Stop local Supabase stack |
| `npm run supabase:reset` | Wipe DB and re-apply migrations |
| `npm run supabase:push` | Push migrations to remote project |
| `npm run supabase:status` | Show local URLs and keys |
| `npm run seed:kind` | Seed demo data (runs after reset) |

## API

- Local: `http://localhost:4000`
- Health check: `GET /health`
- Demo login: `anna@kind.example` / `demo1234`

### Auth routes (no token needed)

- `POST /auth/signup` — `{ email, name, password }`
- `POST /auth/login` — `{ email, password }` → `{ token, refreshToken, individualId }`
- `POST /auth/refresh` — `{ refreshToken }` → `{ token, refreshToken }`
- `POST /auth/logout`

### Protected routes (`Authorization: Bearer <token>`)

- `GET /explorations`
- `GET /explorations/:id`
- `GET /community`
- `GET /feed`
- `GET /home`
- `GET /profile`
- `GET /insights`
- `GET /search?q=`
- `GET /notifications`

## Dev flags (`apps/api/.env`)

| Flag | Values | Effect |
|---|---|---|
| `USE_MOCK_DATA` | `true` / `false` | Serve static JSON mocks instead of DB |
| `MOCK_AUTH` | `true` / `false` | Skip JWT, resolve all requests as Anna Ross |
