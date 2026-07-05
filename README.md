# CSS Battle Platform — Yatra @ NCE College

A competition platform where participants write HTML + CSS to match a target image, get a similarity score, and compete on a live leaderboard.

See [`AGENTS.md`](./AGENTS.md) for the locked tech stack and the non-negotiable rules every agent must follow, and [`CSS-Battle-Project-Plan.md`](./CSS-Battle-Project-Plan.md) for the full project plan.

## Structure

```
.
├── backend/      # Node.js + Express + TypeScript API
├── frontend/     # React + Vite + TypeScript + Tailwind
└── AGENTS.md     # Coding-agent rules (READ FIRST)
```

## Quick start

```bash
# from the repo root
npm install                # installs backend + frontend workspaces
npm run dev                # runs backend (port 4000) + frontend (port 5173) in parallel
```

Open http://localhost:5173 for the app. The frontend proxies `/api/*` to the backend on port 4000, so `fetch('/api/health')` works in both dev and production.

### Individual workspaces

```bash
npm run dev:backend        # backend only
npm run dev:frontend       # frontend only
npm run typecheck          # typecheck both
npm run build              # build both
```

## Environment

Copy `backend/.env.example` to `backend/.env` and fill in the values you need (admin PIN, database URL once Prisma lands, etc.). The frontend needs no env in dev — it talks to relative `/api` URLs through the Vite proxy.

## Status

Scaffolding only. Routing, models, scoring, and admin are intentionally left for follow-up tasks.
