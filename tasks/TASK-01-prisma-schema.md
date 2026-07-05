# Task: Prisma Schema, Migration & Seed Data

**Module:** `db/` (schema) — consumed by `identity/`, `challenges/`, `submissions/`, `admin/`, `leaderboard/`
**Read first:** `AGENTS.md` and `CSS-Battle-Project-Plan.md` (Section 8: Database Schema, Section 3.0: Identity, Not Auth) — this task must stay consistent with both. If anything below seems to conflict with either file, stop and flag it rather than guessing.

---

## Context

This is the CSS Battle platform for Yatra @ NCE College. Before any feature work (identity, challenges, submissions, rendering, leaderboard) can be built, the database schema needs to exist and be migratable. This task covers **only** the schema, migration, and seed data — not the API routes or business logic that will use them later.

**Stack for this task:** PostgreSQL + Prisma ORM, running via Docker (see `docker-compose.yml` if one already exists in the repo; create a minimal one for Postgres if not).

**Important — do not deviate from this:**
- No auth/password fields. Identity is name + optional short PIN, not hashed passwords. See Section 3.0 of the project plan for the full reasoning — do not reintroduce `password_hash`, JWT-related fields, or email-based login.
- Do not add tables, fields, or relations beyond what's specified below without flagging it first. If a task later needs something not covered here, that's a sign to update this schema deliberately, not to silently extend it mid-task.

---

## 1. Schema to Implement

Create `prisma/schema.prisma` with the following models. Field names below are a guide, not gospel — use idiomatic Prisma conventions (e.g. `camelCase` field names, `@id @default(cuid())` or `@default(uuid())` for IDs) as long as the meaning and constraints match.

### `User` (participants + admin)
```
id            String    @id @default(cuid())
name          String                        // pre-registered by admin, shown in dropdown
rollNumber    String?                       // optional, for matching against school records
pinCode       String?                       // optional 4-digit code, plain string (not hashed — this is identity-lite, not security)
role          Role      @default(PARTICIPANT)
submissions   Submission[]
createdAt     DateTime  @default(now())

// Constraint: name should be unique per event to avoid leaderboard ambiguity.
// Enforce uniqueness at the DB level with @@unique([name]) unless product
// requirements later call for allowing duplicate display names with
// disambiguation (not currently planned — flag if this comes up).
```

### `Role` (enum)
```
enum Role {
  PARTICIPANT
  ADMIN
}
```

### `Challenge`
```
id              String    @id @default(cuid())
title           String
description     String?
difficulty      Difficulty
targetImageUrl  String
roundNumber     Int
published       Boolean   @default(false)
createdBy       String                       // FK → User.id (admin who created it)
creator         User      @relation(fields: [createdBy], references: [id])
submissions     Submission[]
createdAt       DateTime  @default(now())
```

### `Difficulty` (enum)
```
enum Difficulty {
  EASY
  MEDIUM
  HARD
}
```

### `Submission`
```
id              String    @id @default(cuid())
userId          String
user            User      @relation(fields: [userId], references: [id])
challengeId     String
challenge       Challenge @relation(fields: [challengeId], references: [id])
htmlCode        String    @db.Text
cssCode         String    @db.Text
codeLength      Int                          // bytes, computed server-side at submission time
score           Decimal?  @db.Decimal(5, 2)  // similarity %, nullable until scored
screenshotUrl   String?
isBest          Boolean   @default(false)     // flags this user's best submission per challenge
submittedAt     DateTime  @default(now())

@@index([challengeId, score])                // supports leaderboard queries
@@index([userId, challengeId])
```

### `CompetitionState`
```
id              String    @id @default(cuid())
status          CompetitionStatus @default(NOT_STARTED)
currentRound    Int       @default(1)
locked          Boolean   @default(false)     // true = submissions frozen
leaderboardFrozen Boolean @default(false)     // separate toggle for "freeze leaderboard visibility" (Section 9/13 of plan)
updatedAt       DateTime  @updatedAt
```

### `CompetitionStatus` (enum)
```
enum CompetitionStatus {
  NOT_STARTED
  RUNNING
  PAUSED
  ENDED
}
```

**Note:** `CompetitionState` should realistically only ever have a single row for this event (it's global competition state, not per-user or per-challenge). Don't build multi-row logic for it — a single row that gets updated in place is correct here.

---

## 2. Migration

- Run `npx prisma migrate dev --name init` (or equivalent) to generate and apply the initial migration against a local Postgres instance.
- Confirm the migration applies cleanly against a **fresh** database (drop and recreate locally to verify — don't just trust that it worked once).
- Commit the generated migration files under `prisma/migrations/` as normal — these should be tracked in git (unlike `.env`).

---

## 3. Seed Script

Create `prisma/seed.js` (or `.ts` if the project is using TypeScript) that populates:

- **5–8 fake participants** with realistic names (no real student data — use placeholder names) and a few of them with a `pinCode` set and a few without, to exercise both paths.
- **1 admin user** (`role: ADMIN`).
- **3–5 fake challenges** across difficulty levels (easy/medium/hard), with placeholder `targetImageUrl` values (a placeholder image URL or a locally hosted test image is fine — doesn't need to be a real target yet).
- **A handful of fake submissions** against a couple of the challenges, with varied scores, so leaderboard queries have something real to sort/test against later.
- **One `CompetitionState` row** in `NOT_STARTED` status.

Wire this up so `npx prisma db seed` (or the project's equivalent script) runs it. Make the seed script **idempotent or safely re-runnable** — either clear relevant tables first or use `upsert` where it makes sense, so running it twice doesn't error out or duplicate data.

---

## 4. Verification Checklist

Before marking this task done, confirm:

- [ ] `docker-compose up` (or equivalent) brings up Postgres cleanly
- [ ] `npx prisma migrate dev` applies without errors against a fresh DB
- [ ] `npx prisma studio` (or a direct query) shows all 4 tables with correct columns/types
- [ ] Seed script runs successfully and populates all tables described above
- [ ] Running the seed script a second time doesn't crash or silently duplicate everything
- [ ] `User.name` uniqueness constraint actually rejects a duplicate name at the DB level (test this — don't just assume the schema annotation works)
- [ ] No `password_hash`, JWT, or email/login-related fields exist anywhere in the schema

---

## 5. What NOT to Do

- Do not add authentication logic, password hashing, or session/token handling in this task — that's explicitly out of scope (see Section 3.0 of the plan).
- Do not build the actual API routes/controllers that use this schema yet — this task is schema + migration + seed only. Routes are a separate task.
- Do not add extra tables (e.g. teams, achievements, notifications) — not in scope for this event, see Section 3 ("Scope Discipline") of `AGENTS.md`.
- Do not swap Prisma for a different ORM or hand-roll raw SQL migrations.

---

## 6. Handoff Notes for the Next Task

Once this is done, the next tasks that depend on it are:
- `identity/` — name+PIN selection flow, reading/writing to `User`
- `challenges/` — admin CRUD against `Challenge`
- `submissions/` — writing to `Submission`, triggering the render/score pipeline
- `leaderboard/` — read-heavy queries against `Submission` joined with `User`/`Challenge`

Leave a short note in the PR/commit description confirming the exact Prisma version used and whether `cuid()` or `uuid()` was chosen for IDs, so later tasks are consistent.
