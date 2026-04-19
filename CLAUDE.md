# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

```
pocket-money/
├── frontend/   # React 18 + Vite SPA
└── backend/    # Node.js + Express + Prisma API
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
```

No linting or test runner is configured.

## Architecture

**PocketMoney** is a React 18 + Vite SPA connected to a Node.js/Express backend. Parents assign chores, children earn allowances. Auth via JWT stored in `localStorage`.

### State Management

`frontend/src/context.jsx` is the single source of truth via React Context (`AppProvider`). It holds:
- `user`, `token`, `loading` — auth state (fetched from `GET /api/auth/me`)
- `family`, `chores`, `goals`, `transactions` — fetched on login via `fetchAppData()`
- Action handlers: `addChore`, `approveChore`, `rejectChore`, `submitChore`, `fundGoal`, `updateRules`, `applyPenalty`

### Screen Routing

`frontend/src/App.jsx` uses React Router v7. Screens live in three files:
- `frontend/src/screens/auth.jsx` — Welcome, SignIn, SignUp, Splash
- `frontend/src/screens/parent.jsx` — Dashboard, ChoresList, ChoreDetail, CreateChore, ChildrenView, RulesScreen, AnalyticsScreen, SettingsScreen
- `frontend/src/screens/child.jsx` — Dashboard, AvailableChores, SubmitChore, MyChores, BalanceScreen, GoalsScreen, ProfileScreen

### Components

- `frontend/src/components/layout.jsx` — responsive shell: Sidebar (desktop) / BottomNav (mobile), Layout, Toast
- `frontend/src/components/ui.jsx` — shared primitives: `Btn`, `Badge`, `Card`, `Input`, `Modal`, `Toast`, `Avatar`, `ProgressBar`, `StatCard`, `Select`, `Amount`, `EmptyState`

### API

`frontend/src/api.js` — all HTTP calls to `http://localhost:3001/api`. Exports: `authAPI`, `familyAPI`, `choresAPI`, `expensesAPI`, `goalsAPI`, `transactionsAPI`, `rulesAPI`.

### Styling

Tailwind CSS with a custom theme (`frontend/tailwind.config.js`):
- Claymorphism aesthetic (layered box-shadows for toy-like depth)
- Fonts: Epilogue (headings), Plus Jakarta Sans (body), JetBrains Mono (numbers)
- Mobile-first; `lg:` breakpoint switches to desktop sidebar layout

### Design References

- `POCKETMONEY_DESIGN_SYSTEM.md` — full color system, typography, component specs, WCAG AA requirements
- `POCKETMONEY_WIREFRAMES_SCREENS.md` — wireframes and user flows for all screens
