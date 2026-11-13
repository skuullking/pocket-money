# PocketMoney

A family allowance tracker where parents assign chores and children earn money toward savings goals.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v7 |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL (dev and production) |
| Auth | JWT in an httpOnly cookie |
| Realtime | Socket.IO |
| Production | Docker Compose, Caddy (HTTPS), nginx |

## Project Structure

```
pocket-money/
├── frontend/   # React SPA
│   ├── public/         # PWA manifest, icons, service worker
│   └── src/
│       ├── screens/    # auth.jsx · parent.jsx · child.jsx · legal.jsx
│       ├── components/ # layout.jsx · ui.jsx
│       ├── context.jsx # global state (AppProvider)
│       └── api.js      # HTTP calls → /api
├── backend/    # Express API
│   ├── src/
│   │   ├── server.ts      # every route
│   │   ├── validation.ts  # zod schemas
│   │   ├── authCookie.ts  # session cookie
│   │   ├── config.ts      # production config checks
│   │   ├── monitoring.ts  # JSON logs, Sentry, alerts
│   │   ├── socket.ts      # Socket.IO
│   │   └── middleware/    # role gates
│   ├── prisma/         # schema, migrations, seed
│   └── tests/          # Vitest, real Postgres
├── e2e/        # Playwright, production build
└── deploy/     # Caddyfile, backup, restore, monitor scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone

```bash
git clone https://github.com/skuullking/pocket-money.git
cd pocket-money
```

### 2. Backend setup

```bash
# From the repo root: start a local Postgres (dev matches production's engine)
docker compose -f docker-compose.dev.yml up -d

cd backend
cp .env.example .env       # DATABASE_URL already points at the dev Postgres; set JWT_SECRET
npm install
npm run db:migrate         # run Postgres migrations
npm run db:seed            # (optional) seed demo data
npm run dev                # http://localhost:3001
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

## Features

**Parent**
- Create & manage chores with point values and due dates
- Approve or reject chore submissions with feedback
- View family analytics and transaction history
- Set household rules and apply penalties
- Reset a child's password
- Export the family's data and delete accounts

**Child**
- Browse available chores and submit completion photos/notes
- Track earnings and balance
- Create savings goals and fund them from balance
- View personal history and profile

## API Endpoints

The backend exposes a REST API under `/api`:

| Resource | Prefix |
|---|---|
| Auth | `/api/auth` |
| Family | `/api/family` |
| Chores | `/api/chores` |
| Goals | `/api/goals` |
| Transactions | `/api/transactions` |
| Rules | `/api/rules` |
| Account (GDPR) | `/api/account` |
| Health | `/api/health` |

Full request/response examples are in `backend/PocketMoney_Postman_Collection.json`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
DATABASE_URL="postgresql://pocketmoney:pocketmoney@localhost:5432/pocketmoney"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
CLIENT_URL="http://localhost:5173"
```

> The project uses PostgreSQL in both development and production (`schema.prisma`
> declares `provider = "postgresql"`). `docker-compose.dev.yml` provides a local
> dev database; the full production stack is in `docker-compose.yml`. Do not point
> `DATABASE_URL` at a SQLite `file:` path — the migrations are Postgres-only.

## Production

The supported production target is **Docker Compose**: PostgreSQL, the app (nginx and Node in one container), Caddy for HTTPS, daily backups and a health monitor. Vercel is not supported for production because it cannot run the realtime server.

### Before the first deployment

You need a server with Docker, a domain whose DNS points at it with ports 80 and 443 open, a [Resend](https://resend.com) account with a verified sending domain, and the publisher details shown on the legal pages.

```bash
cp .env.production.example .env   # then fill it in
openssl rand -hex 32              # run twice: POSTGRES_PASSWORD and JWT_SECRET
docker compose up -d --build
```

Compose refuses to start while a required value is missing, and the API refuses placeholder secrets. Migrations run when the app container starts.

The CI `stack` job runs the whole Compose stack on `DOMAIN=localhost` with `deploy/stack-test.sh`: HTTPS through Caddy, nginx, the API and Postgres, the session cookie, Socket.IO over WebSocket, the monitor, the daily backup and the restore procedure below. The script wipes the database, so never run it on the production server.

| Variable | Required | Purpose |
|---|---|---|
| `DOMAIN` | yes | Public domain, used for the certificate and `CLIENT_URL` |
| `POSTGRES_PASSWORD`, `JWT_SECRET` | yes | Generated secrets |
| `RESEND_API_KEY`, `EMAIL_FROM` | yes | Password reset emails, from a verified domain |
| `LEGAL_OPERATOR`, `LEGAL_CONTACT`, `LEGAL_HOST` | yes | Publisher details on the legal pages |
| `SENTRY_DSN`, `SENTRY_DSN_FRONTEND` | no | Error tracking for the API and the browser |
| `ALERT_WEBHOOK_URL` | no | Slack or Discord webhook for outages, 5xx spikes and failed backups |
| `ALERT_5XX_THRESHOLD` | no | 5xx errors in 5 minutes that trigger an alert (default 10) |
| `BACKUP_RETENTION_DAYS` | no | Days of backups kept (default 14) |

Legal pages and the frontend DSN are compiled into the image: rebuild after changing them.

### Health and monitoring

`GET /api/health` returns 200 when the API can reach the database and 503 otherwise. Docker uses it through nginx, and the `monitor` service alerts after 3 failed minutes. That service runs on the same host, so also point an external uptime check at `https://your-domain/api/health`.

Logs are one JSON object per line, read them with `docker compose logs app`.

### Backups

The `backup` service writes a verified dump to the `db-backups` volume once a day. The volume lives on the same disk as the database, so copy the dumps off the server regularly. To restore:

```bash
docker compose stop app
docker compose exec -e CONFIRM_RESTORE=yes backup sh /deploy/restore.sh /backups/FILE.dump
docker compose start app
```

### Legal review

The privacy policy and terms in `frontend/src/screens/legal.jsx` are drafts. Have them reviewed before opening to the public, in particular parental consent for minors (GDPR article 8). The app is not built for COPPA verifiable parental consent, so do not open it to children in the United States without further work.

## License

MIT
