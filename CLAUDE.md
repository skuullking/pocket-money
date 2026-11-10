# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

```
pocket-money/
├── frontend/   # React 18 + Vite SPA
├── backend/    # Node.js + Express + Prisma API
├── e2e/        # Playwright, against the production build
└── deploy/     # Caddyfile, backup, restore and monitor scripts
```

## Commands

```bash
# Frontend
cd frontend
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Production build to /frontend/dist
npm run preview  # Preview production build

# Backend
cd backend
npm run dev      # Start Express API (http://localhost:3001)

# Quality (backend and frontend)
npm test              # Vitest (backend: real Postgres, started automatically)
npm run test:coverage
npm run lint          # ESLint
npm run typecheck
npm run format:check  # Prettier, tests and config only (source not reformatted yet)

# End-to-end (Playwright, desktop + mobile, production build)
cd e2e
npx playwright install chromium   # once
npm test
```

Backend and e2e tests start a disposable embedded Postgres; set `TEST_DATABASE_URL` to use an existing server (CI does). Its database name must contain `test`, because every table gets wiped.

## Architecture

**PocketMoney** is a React 18 + Vite SPA connected to a Node.js/Express backend. Parents assign chores, children earn allowances. Auth via JWT stored in an httpOnly cookie. Everything is scoped to a `family`; a user is `PARENT` or `CHILD`.

### Backend (`backend/src/`)

All routes live in one file, `server.ts`, with the cross-cutting concerns factored out:
- `validation.ts` — one zod schema per endpoint; handlers call `parseBody(schema, req.body)` before touching the DB.
- `authCookie.ts` — issues/reads the JWT in an httpOnly cookie (`AUTH_COOKIE`); `authenticateToken` in `server.ts` verifies it and loads the user.
- `middleware/roles.ts` — role gates (parent-only endpoints).
- `socket.ts` — Socket.IO auth + room helpers (`emitToFamily`/`emitToUser`, rooms `family:<id>` / `user:<id>`).
- `config.ts` — production config checks, run at startup.
- `monitoring.ts` — JSON logger, optional Sentry reporting with scrubbing, webhook alerts. Route handlers report failures through `sendHandlerError`.

Four patterns matter more than any single route and are easy to break:

1. **Money invariant — balance never goes below 0.** Every debit goes through `clampedDeduct` (deducts up to the available balance, returns `capped`). `balance` is the one spendable pot; `saveBalance`/`spendBalance`/`giveBalance` (the pedagogical split) are **additive and informational only** — never debit them.
2. **Recurring items are evaluated lazily, not by a cron.** `processDueAllowances` runs inside `GET /api/family`, `generateDueChores` inside `GET /api/chores` — each pays out/creates whatever is due since last time. This is deliberate so it survives serverless (no long-lived scheduler). Date math respects `APP_TIMEZONE`.
3. **Realtime only runs off-Vercel.** The Socket.IO server is behind `if (!process.env.VERCEL)` at the bottom of `server.ts`; on Vercel there are no websockets and the frontend degrades silently. Emits are best-effort — never rely on them for correctness, always persist first.
4. **Multi-tenancy is enforced per handler.** There is no global tenant filter: each route re-checks role and that the target row's `familyId` matches `req.user`. New routes must do the same.

Fail-fast config: in production the server refuses to start without `CLIENT_URL`, a strong `JWT_SECRET` (at least 32 characters, no placeholder), `RESEND_API_KEY` and an `EMAIL_FROM` outside `@resend.dev`. `TRUST_PROXY_HOPS` must match the proxy count (2 behind Caddy and nginx) or rate limiting breaks.

### State Management

`frontend/src/context.jsx` is the single source of truth via React Context (`AppProvider`). It holds `user`/`loading` (from `GET /api/auth/me`) and `family`, `chores`, `goals`, `transactions`, `expenses`, `choreTemplates` (loaded by `fetchAppData()`). Key pattern: **socket events don't patch state — they re-trigger `fetchAppData()` + a toast**, so the server stays authoritative. All mutations are thin action handlers (`addChore`, `approveChore`, `fundGoal`, `applyPenalty`, `removeChild`, `deleteFamily`, …) that call the API then refetch.

### Screen Routing

`frontend/src/App.jsx` uses React Router v7. Screens live in four files:
- `frontend/src/screens/auth.jsx` — Welcome, SignIn, SignUp, Splash
- `frontend/src/screens/parent.jsx` — Dashboard, InboxScreen (chores and expenses awaiting approval), ChoresList, ChoreDetail, CreateChore, ChildrenView, RulesScreen, AnalyticsScreen, SettingsScreen
- `frontend/src/screens/child.jsx` — Dashboard, AvailableChores, SubmitChore, MyChores, BalanceScreen, GoalsScreen, ProfileScreen
- `frontend/src/screens/legal.jsx` — privacy policy and terms (`/privacy`, `/terms`), filled from the `VITE_LEGAL_*` build args

### Components

- `frontend/src/components/layout.jsx` — responsive shell: Sidebar (desktop) / BottomNav (mobile), Layout, Toast
- `frontend/src/components/ui.jsx` — shared primitives: `Btn`, `Badge`, `Card`, `Input`, `Modal` (bottom sheet on mobile), `ConfirmModal`, `Toast`, `Avatar`, `Switch`, `Segmented`, `Chip`, `Coin`, `StatCard`, `Select`, `Amount`, `EmptyState`

### API

`frontend/src/api.js` — all HTTP calls, grouped by resource (`authAPI`, `familyAPI`, `accountAPI`, `choresAPI`, `expensesAPI`, `goalsAPI`, `transactionsAPI`, `rulesAPI`, `childSettingsAPI`, `allowanceAPI`, `choreTemplatesAPI`, `analyticsAPI`). Base URL is `VITE_API_URL` (falls back to `http://localhost:3001/api`); every request sends `credentials: 'include'` so the auth cookie rides along — there is no token in `localStorage`.

### Styling

Tailwind CSS with a custom theme (`frontend/tailwind.config.js`, colors as CSS variables in `frontend/src/index.css`, light and `.dark`):
- "Pièce d'or" look: violet and gold, chunky buttons with a hard offset shadow (`shadow-press`), coins as the money metaphor (`Coin`, `BigCoin`, `CoinRow`, `CoinStack`)
- Child screens use thick outlined cards (`Card sticker`); parent screens use light bordered cards
- Fonts: Bricolage Grotesque (headings and big amounts), Figtree (body)
- Amounts go through `euro` / `euroShort` (French format, `127,50 €`)
- Mobile-first; `lg:` breakpoint switches to desktop sidebar layout

### Design References

- `POCKETMONEY_DESIGN_SYSTEM.md` — full color system, typography, component specs, WCAG AA requirements
- `POCKETMONEY_WIREFRAMES_SCREENS.md` — wireframes and user flows for all screens

## Deployment

**Docker Compose is the only supported production target**, see "Production" in `README.md` for setup. Compose refuses to start while a required value from `.env.production.example` is missing.
- **Docker Compose** (`docker-compose.yml`) — Postgres, the app (nginx and Node via `supervisord`, only `expose`d), Caddy for HTTPS, plus the `backup` and `monitor` services. Realtime included. Migrations run on boot (`prisma migrate deploy`).
- **Vercel** (`backend/vercel.json`, `frontend/vercel.json`) — previews only, not for production: serverless, **no Socket.IO** (see the `VERCEL` guard above), migrations out of band.

`prisma/schema.prisma` must stay `provider = "postgresql"` — every environment uses Postgres. Do not switch it to SQLite to run locally (it will break the Docker/Vercel deploy); point `DATABASE_URL` at a local Postgres instead.
