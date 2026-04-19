# PocketMoney

A family allowance tracker where parents assign chores and children earn money toward savings goals.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v7 |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | SQLite (dev) |
| Auth | JWT stored in localStorage |
| Realtime | Socket.IO |

## Project Structure

```
pocket-money/
├── frontend/   # React SPA
│   └── src/
│       ├── screens/    # auth.jsx · parent.jsx · child.jsx
│       ├── components/ # layout.jsx · ui.jsx
│       ├── context.jsx # global state (AppProvider)
│       └── api.js      # HTTP calls → /api
└── backend/    # Express API
    ├── src/
    │   ├── controllers/
    │   ├── routes/
    │   ├── middleware/
    │   └── lib/
    └── prisma/
        └── schema.prisma
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
cd backend
cp .env.example .env       # fill in JWT_SECRET
npm install
npm run db:migrate         # create SQLite DB + run migrations
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

Full request/response examples are in `backend/PocketMoney_Postman_Collection.json`.

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="7d"
PORT=3001
CLIENT_URL="http://localhost:5173"
```

## License

MIT
