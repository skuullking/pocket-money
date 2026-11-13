# Architecture and technical decisions

PocketMoney is a family allowance app: parents assign chores, children submit proof, parents approve and the child gets paid, with goals, spending requests, penalties and a recurring allowance around it. This page explains how it is built and, more importantly, **why**, with the trade-offs I made.

## Overview

```
 Browser (React SPA, PWA)
        │  HTTPS, cookie session, WebSocket
        ▼
 Caddy ── TLS certificates, security headers, HTTP→HTTPS
        ▼
 nginx ── static SPA + reverse proxy for /api and /socket.io
        ▼
 Node.js / Express ── REST API + Socket.IO, zod validation, Prisma
        ▼
 PostgreSQL 16
        ▲
 backup (daily verified pg_dump)   monitor (health probe → webhook)
```

Everything runs from one `docker-compose.yml`. nginx and Node share a container under `supervisord`, so the app is a single deployable image, and only Caddy is exposed to the Internet.

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18, Vite, Tailwind, React Router 7 | Fast iteration, a design system expressed as Tailwind tokens (light and dark). |
| State | One React Context | The app is small enough that a store library would be ceremony. The server stays the source of truth (see *Realtime*). |
| API | Express + TypeScript | Plain, well known, easy to test with supertest. |
| Validation | zod, one schema per endpoint | Every handler parses its body before it touches the database. Invalid input never reaches Prisma. |
| ORM | Prisma on PostgreSQL | Typed queries and versioned migrations. Postgres everywhere, including tests, so there is no SQLite/Postgres drift. |
| Realtime | Socket.IO | Rooms per family and per user, authenticated by the same cookie as the API. |

## 1. Money can never go below zero

The core rule: **a child's balance never goes negative**, whatever the parent or child does, and however many requests arrive at once.

Every debit (penalty, approved expense, goal funding) goes through one function, `clampedDeduct`, inside a database transaction:

1. `SELECT … FOR UPDATE` locks the child's row, so two concurrent debits are serialized.
2. The amount taken is `min(requested, balance)`.
3. The transaction records the amount **actually** taken, not the amount requested, and the API returns `capped: true` so the UI can say "capped at 0 €, insufficient balance".

This was not in the first version. A QA pass found that a 999 € penalty could take a child to −948 € ([QA report, MONEY-1](QA_BUG_REPORT.md)). The fix is covered by regression tests, including `concurrency.test.ts`, which fires 10 identical requests in parallel and checks that the balance ends at exactly 0.

The "save / spend / give" split is deliberately **informational and additive**: `balance` is the only spendable pot, so there is a single place to enforce the rule.

## 2. Recurring work without a cron

Weekly allowances and recurring chores are not run by a scheduler. They are evaluated **lazily**: `GET /api/family` pays whatever allowance is due since the last payment, and `GET /api/chores` creates whatever recurring chore is due today.

Why:
- It works anywhere, including serverless previews where no process lives long enough to run a cron.
- Nothing is missed if the server was down: the next read catches up.
- Each payment is guarded by an optimistic `updateMany … where lastPaidAt = <value read>`. If two requests race, exactly one of them wins and pays, and the other does nothing.

The trade-off is that a payment happens when someone next opens the app, not at midnight sharp. For an allowance, that is fine. Dates are computed in one configured time zone (`APP_TIMEZONE`), not the server's, which is UTC in Docker.

## 3. Multi-tenancy, checked in every handler

Every family's data is isolated, but there is no magic global filter. Each route checks the caller's role and that the target row's `familyId` matches the caller's.

A global Prisma middleware was considered and rejected: it hides the check, and the bugs it would prevent are exactly the ones a test can catch. So the tests try cross-family access explicitly. For example, a child of one family tries to fund a goal of another, or a parent tries to approve a chore that is not theirs. The QA pass found one such leak (a child could see a sibling's private goal), which is now covered too.

## 4. Security

- **Session in an httpOnly cookie**, never in `localStorage`, so an XSS cannot steal it. An end-to-end test checks that `document.cookie` cannot see the JWT.
- **Cross-site write protection.** The browser attaches the cookie by itself, so any non-GET request whose `Origin` is not the frontend is refused with 403. Socket.IO applies the same check, because CORS does not cover WebSockets.
- **Rate limiting** on login (failures only), signup, password reset, family deletion, exports and demo creation. Behind two proxies, Express is told exactly how many hops to trust (`TRUST_PROXY_HOPS=2`), so a client cannot spoof its IP with `X-Forwarded-For`.
- **Fail-fast configuration.** In production the API refuses to start with a missing or placeholder `JWT_SECRET` (under 32 characters, or a value from the repository), without an email provider, or with Resend's sandbox sender.
- **Password reset** tokens are random, stored hashed, single use and valid for one hour. The endpoint answers the same way whether or not the email exists, so it cannot be used to enumerate accounts.
- **GDPR**: timestamped terms and parental consent, full JSON export, and deletion of a child, a parent or the whole family (cascading).

## 5. Realtime that cannot corrupt state

Socket.IO events **never patch client state**. An event (`chore:submitted`, `expense:approved`, …) only triggers a toast and a refetch of the data from the API. Writes are persisted first and emitted after, on a best-effort basis.

Consequences:
- A lost or duplicated event cannot desynchronize the UI. At worst, the user sees the update at the next refresh.
- On hosts without WebSockets (Vercel previews), the app still works, just without live updates.

## 6. The demo, isolated per visitor

The "Try the demo" button creates a **fresh family for each visitor** (a parent and two children, with chores to approve, a pending expense, goals, rules and history) and signs them in. A gold bar lets them switch between the parent and the children without a password.

- Visitors cannot spoil each other's demo, because nothing is shared.
- Demo families carry a `demoExpiresAt` and are deleted after 24 hours. As with allowances, there is no cron: expired demos are purged whenever someone starts a new one, and an expired session is refused even if the purge has not happened yet.
- Passwordless switching only works inside a demo family. A real family gets 403, which a test covers.
- Creation is rate limited per IP and capped in total (`DEMO_MAX_LIVE`), so the demo cannot fill the database.

## 7. Testing strategy

| Suite | Tool | What it covers |
|---|---|---|
| Backend (361 tests) | Vitest + supertest on a **real PostgreSQL** | Every route: validation, roles, cross-family access, money rules, concurrency, recurring payments, GDPR, sockets, monitoring. |
| Frontend (336 tests) | Vitest + Testing Library | Screens, routing, context actions, API client, UI primitives. |
| End-to-end (124 runs) | Playwright on the **production build**, desktop and mobile | Real user journeys, WCAG AA checks with axe in light and dark themes, PWA, legal pages. Each test fails if the browser console shows an error. |
| Production stack | `deploy/stack-test.sh` in CI | Boots the actual `docker-compose.yml` and checks HTTPS, the session through both proxies, Socket.IO, the monitor, the backup and a real restore. |

Tests run against Postgres, never a mock or SQLite. A disposable embedded Postgres starts automatically on a developer machine, and CI uses a service container.

## 8. Operations

- **Health**: `GET /api/health` checks the database. Docker's health check goes through nginx, so it tests the whole chain.
- **Logs**: one JSON object per line, with optional Sentry reporting (personal data scrubbed).
- **Alerts**: a webhook (Slack or Discord) on outages, 5xx spikes and failed backups.
- **Backups**: a daily `pg_dump`, verified with `pg_restore --list` before it is kept, plus a documented restore that the CI exercises.

## What I would do next

- Move the monolithic `server.ts` routes into one router per resource. The cross-cutting pieces (validation, auth, sockets, monitoring) are already split out.
- Add a shared rate-limit store (Redis) before running more than one API instance.
- Store proof photos in object storage instead of the database.
