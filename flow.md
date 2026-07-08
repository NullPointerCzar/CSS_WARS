# CSS Battle Platform — Flow Guide

> A complete walkthrough of the project setup, what went wrong, how it was fixed, and how everything runs.

---

## 1. Project Overview

This is a **CSS Battle Platform** for Yatra @ NCE College — a competition where participants write HTML + CSS to match a target image, get scored on similarity, and compete on a live leaderboard.

**Tech Stack:**
| Layer | Choice |
|---|---|
| Frontend | React (Vite) + TailwindCSS + Monaco Editor |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 16 (Docker) |
| ORM | Prisma |
| Rendering | Playwright (headless Chromium) |
| Image Diff | Pixelmatch |
| Identity | Name dropdown + optional 4-digit PIN (no passwords) |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Vite dev server on :5173)                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  /api/*  →  proxied to localhost:4000            │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────┘
                                 │ HTTP (via Vite proxy)
                                 ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Express on :4000)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ identity │  │  admin   │  │  health  │              │
│  │  router  │  │  router  │  │  check   │              │
│  └────┬─────┘  └────┬─────┘  └──────────┘              │
│       │              │                                   │
│  ┌────▼──────────────▼────┐                             │
│  │      Prisma Client     │                             │
│  └───────────┬────────────┘                             │
└───────────────┼─────────────────────────────────────────┘
                │ TCP :5432
                ▼
┌─────────────────────────────────────────────────────────┐
│  PostgreSQL (Docker container)                           │
│  database: postgres   user: postgres                     │
│  host: localhost:5432   password: 1234                   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. The Problem: "Failed to load participants"

### 3.1 What the user saw

On loading the app, the frontend's `IdentitySelection.tsx` component makes a `fetch('/api/participants')` call. The React Query's `isError` state would show:

> **"Failed to load participants. Please try again."**

### 3.2 Root cause analysis

The issue was a **database configuration mismatch**. Two things were wrong:

#### 🔴 Problem 1: `.env` vs `docker-compose.yml` mismatch

The `backend/.env` file had:
```env
DATABASE_URL=postgresql://cssbattle:cssbattle_dev@localhost:5435/cssbattle
```

But the `docker-compose.yml` had:
```yaml
postgres:
    ports:      # Host:Container
      - '5432:5432'    # <--- Port 5432, not 5435
    environment:
      POSTGRES_USER: postgres        # <--- user postgres, not cssbattle
      POSTGRES_PASSWORD: 1234        # <--- password 1234, not cssbattle_dev
      POSTGRES_DB: postgres          # <--- database postgres, not cssbattle
```

**Mismatch summary:**

| Setting | `.env` (wrong) | `docker-compose.yml` (actual) |
|---|---|---|
| Port | `5435` | `5432` |
| User | `cssbattle` | `postgres` |
| Password | `cssbattle_dev` | `1234` |
| Database | `cssbattle` | `postgres` |

#### 🔴 Problem 2: Backend wasn't running

No process was listening on port `4000`, so even if the `.env` was correct, the frontend couldn't reach the API.

#### 🔴 Problem 3: Database wasn't migrated/seeded

Even after matching credentials, Prisma migrations had never been applied to the running PostgreSQL container, so there were no tables (and no participant data).

### 3.3 Debugging steps taken

1. **Identified the relevant files** — found `IdentitySelection.tsx` (frontend), `identity.ts` (backend route), `.env`, `docker-compose.yml`
2. **Checked the `.env` file** — confirmed the mismatch in credentials
3. **Checked running services** — `docker ps` confirmed PostgreSQL was running on port `5432`, backend was NOT running
4. **Attempted migration** — Prisma returned `P1001: Can't reach database server` because of the credentials mismatch
5. **Confirmed connectivity** — `psql` CLI successfully connected to the database, proving the credentials in docker-compose were correct

---

## 4. Fix Applied

### Step 1: Verify `.env` (already correct)

The `.env` file read:
```env
DATABASE_URL=postgresql://postgres:1234@localhost:5432/postgres
```

This already matched `docker-compose.yml` — no change was needed.

### Step 2: Apply Prisma migrations

```bash
cd backend
DATABASE_URL=postgresql://postgres:1234@localhost:5432/postgres npx prisma migrate dev
```

This applied the existing migration `20260705041457_init` to the running PostgreSQL database, creating all tables defined in `prisma/schema.prisma`:

- `User` — participants and admin
- `Challenge` — CSS challenges
- `Submission` — participant code submissions
- `CompetitionState` — global competition status singleton

**Why `DATABASE_URL=...` prefix?** The `prisma migrate dev` command reads `.env` automatically, but running it with the explicit env var bypasses any potential env-loading issues.

### Step 3: Seed the database

```bash
cd backend
npx prisma db seed
```

This executed `prisma/seed.ts` which creates:

**Users (8 total):**
| Name | Role | PIN | Roll Number |
|---|---|---|---|
| Admin Sarwagya | ADMIN | `0000` | — |
| Aarav Sharma | PARTICIPANT | `1234` | NCE-2024-001 |
| Priya Patel | PARTICIPANT | `5678` | NCE-2024-002 |
| Rohan Adhikari | PARTICIPANT | *(no PIN)* | NCE-2024-003 |
| Sita Basnet | PARTICIPANT | `9012` | NCE-2024-004 |
| Kiran Thapa | PARTICIPANT | *(no PIN)* | *(no rollno)* |
| Anisha Gurung | PARTICIPANT | `3456` | NCE-2024-006 |
| Dipesh Maharjan | PARTICIPANT | *(no PIN)* | NCE-2024-007 |

**Challenges (5 total):**
| Title | Difficulty | Round | Published |
|---|---|---|---|
| Simple Square | EASY | 1 | ✅ Yes |
| Traffic Light | EASY | 1 | ✅ Yes |
| Concentric Circles | MEDIUM | 2 | ❌ No |
| CSS Flag | MEDIUM | 2 | ❌ No |
| Mondrian Art | HARD | 3 | ❌ No |

**Submissions (7 total):** Various scores for Challenge 1 (Simple Square) and Challenge 2 (Traffic Light) across different participants.

**CompetitionState:** Set to `NOT_STARTED`, round 1.

### Step 4: Start the backend

```bash
cd backend
npx tsx src/server.ts &
```

This starts the Express server on port `4000` using `tsx` (TypeScript executor, no compilation step needed).

### Step 5: Verify it works

```bash
curl -s http://localhost:4000/api/health
# → {"status":"ok","service":"cssbattle-backend","uptime":22.16}

curl -s http://localhost:4000/api/participants
# → [{"id":"cmr7ii5y6...","name":"Aarav Sharma", ...}, ...]
```

Both endpoints return successful responses.

---

## 5. How to run the project from scratch

### Start PostgreSQL

```bash
docker compose up -d
# Starts PostgreSQL container on port 5432
```

### Apply migrations

```bash
cd backend
npx prisma migrate dev
```

### Seed the database

```bash
cd backend
npx prisma db seed
```

### Start the backend

```bash
cd backend
npx tsx src/server.ts
# Express server starts on http://localhost:4000
```

### Start the frontend (separate terminal)

```bash
cd frontend
npm run dev
# Vite dev server starts on http://localhost:5173
# /api/* calls are proxied to localhost:4000
```

### Open the app

Visit **http://localhost:5173** in a browser. The Identity Selection screen should load with all 7 participants + 1 admin.

---

## 6. Key files reference

| File | Purpose |
|---|---|
| `docker-compose.yml` | PostgreSQL service definition |
| `backend/.env` | Environment config (DB URL, admin PIN, CORS) |
| `backend/prisma/schema.prisma` | Database schema (User, Challenge, Submission, etc.) |
| `backend/prisma/seed.ts` | Seed script with sample data |
| `backend/src/server.ts` | Express server entry point |
| `backend/src/app.ts` | Express app setup (routes, CORS, middleware) |
| `backend/src/routes/identity.ts` | Participant listing & identity selection endpoints |
| `backend/src/routes/admin.ts` | Admin endpoints (bulk-create participants, PIN management) |
| `backend/src/db.ts` | Prisma client singleton |
| `frontend/src/pages/IdentitySelection.tsx` | Participant selection UI |
| `frontend/src/lib/identity.ts` | Client-side identity (localStorage) management |
| `frontend/vite.config.ts` | Vite config with API proxy to backend |
| `AGENTS.md` | Rules for AI coding agents working on this project |
| `CSS-Battle-Project-Plan.md` | Full project plan and architecture document |

---

## 7. Seed data details

### Participants with PINs (need to enter a 4-digit code to log in)

| Name | PIN |
|---|---|
| Aarav Sharma | `1234` |
| Priya Patel | `5678` |
| Sita Basnet | `9012` |
| Anisha Gurung | `3456` |
| Admin Sarwagya | `0000` |

### Participants without PINs (click name → auto-login)

| Name |
|---|
| Rohan Adhikari |
| Kiran Thapa |
| Dipesh Maharjan |

### Published challenges (visible to participants)

1. **Simple Square** (EASY) — Create a 200×200px blue square centered on the page
2. **Traffic Light** (EASY) — Build a vertical traffic light with red, yellow, green circles

### Unpublished challenges (admin must publish first)

3. **Concentric Circles** (MEDIUM) — Three concentric blue/white/blue circles
4. **CSS Flag** (MEDIUM) — Recreate a simplified flag with HTML/CSS only
5. **Mondrian Art** (HARD) — Mondrian-style composition with colored rectangles

---

## 8. API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/health` | Health check | None |
| GET | `/api/participants` | List all users (id, name, hasPin, role) | None |
| POST | `/api/identity/select` | Select identity (validate userId + optional PIN) | None |
| POST | `/api/admin/participants` | Bulk-create participants | Admin PIN |
| POST | `/api/admin/participants/:id/pin` | Set/regenerate participant PIN | Admin PIN |

---

## 9. Current running state

| Service | Status | Port |
|---|---|---|
| PostgreSQL (Docker) | ✅ Running | `5432` |
| Backend (Express) | ✅ Running | `4000` |
| Frontend (Vite) | ❌ Not started yet | `5173` |
