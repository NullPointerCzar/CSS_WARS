# WHY.md — Design Decisions & Architecture Rationale

This document captures **why** every major decision in the CSS Battle Platform was made. It's the resource you consult when you find yourself asking "Why did we do it this way?" — so you can understand whether a constraint is still relevant before changing it.

---

## Table of Contents

1. [Project Scope & Event Context](#1-project-scope--event-context)
2. [Tech Stack Decisions](#2-tech-stack-decisions)
3. [Architecture: Single Machine, Not Cloud](#3-architecture-single-machine-not-cloud)
4. [Identity: Name + PIN, Not Auth](#4-identity-name--pin-not-auth)
5. [PostgreSQL + Prisma (Database Layer)](#5-postgresql--prisma-database-layer)
6. [Rendering & Scoring Pipeline](#6-rendering--scoring-pipeline)
7. [Scoring Formula: Pure Pixel Match + Tiebreakers](#7-scoring-formula-pure-pixel-match--tiebreakers)
8. [No Job Queue (Redis/BullMQ)](#8-no-job-queue-redisbullmq)
9. [Pollling, Not WebSockets](#9-polling-not-websockets)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Admin Panel Design](#11-admin-panel-design)
12. [Comparison Tools (Split/Opacity/Diff)](#12-comparison-tools-splitopacitydiff)
13. [Docker Compose Setup](#13-docker-compose-setup)
14. [Security: Defense in Depth](#14-security-defense-in-depth)
15. [What Is Explicitly Out of Scope](#15-what-is-explicitly-out-of-scope)
16. [Event-Day Checklist (from the project plan)](#16-event-day-checklist-from-the-project-plan)

---

## 1. Project Scope & Event Context

### We're building a competition platform, not a general-purpose CSSBattle clone.

This software runs **one live event** called "Yatra" at NCE College, for roughly **50 pre-registered participants**, over a few hours. That changes everything:

- **Stability over features.** Five things that never break beat twenty-five things that might. Every feature not explicitly scoped was left out because it adds risk without helping the core goal.
- **The scoring/rendering pipeline is the highest-risk part.** Everything else is standard CRUD web development. The rendering service is where we spent the most design and testing effort.
- **Module boundaries are designed for post-event evolution.** The codebase is structured so it can grow into a fuller platform after Yatra without a rewrite, but nothing beyond the MVP was built.

---

## 2. Tech Stack Decisions

| Layer | Choice | Why NOT alternatives |
|---|---|---|
| Frontend | React + Vite | Vite is fast, simple, and the team is already comfortable with React. Next.js would add SSR complexity we don't need (this is a LAN app). |
| Editor | Monaco Editor | Same engine as VS Code. Free, open-source (MIT). At 10–15 concurrent participants on a local network, its larger bundle size is irrelevant. Alternatives like CodeMirror would save bundle size at the cost of a less polished feel. |
| Backend | Node.js + Express | Familiar from the team's existing MERN stack experience. No need for NestJS (too opinionated for a small app) or Fastify (Express knowledge transfers better). |
| Database | PostgreSQL | Chosen for reliability and the team's familiarity. NOT MongoDB (relational data, leaderboard queries need joins) and NOT SQLite (can't handle concurrent writes during the event). |
| ORM | Prisma | Type-safe, auto-generated client, fast migrations. Chosen over Sequelize because it gives better TypeScript integration and a cleaner migration workflow. |
| Styling | TailwindCSS | Fast to build a clean, minimal UI without writing custom CSS. No runtime cost (it's built-time). |
| Rendering | Playwright (Chromium) | The standard for headless browser automation. Chosen over Puppeteer because it's more actively maintained and has a cleaner API. |
| Image diff | Pixelmatch | The same MIT-licensed library used in the client-side comparison tools — one diffing library across the whole stack. |
| Containerization | Docker + docker-compose | Consistent dev/prod environment. Isolates Postgres and the rendering service from the host OS. |

### Why NOT:
- **No TypeORM** — raw SQL scattered across the codebase would be a maintenance nightmare.
- **No WebSockets** — see Section 9 below.
- **No Redis/BullMQ** — see Section 8 below.
- **No cloud services** — see Section 3 below.

---

## 3. Architecture: Single Machine, Not Cloud

### The entire application runs on one dedicated machine — a powerful school computer on the local network.

```
                    React (Vite dev / built)
                         │
                    REST API (HTTP)
                         │
                 Node.js / Express Backend
                         │
        ┌────────────────┴─────────────────┐
        │                                   │
   PostgreSQL                      Rendering Service
   (Docker container)              (spawned child process)
        │                                   │
        └───────────────┬───────────────────┘
                         │
                  Playwright (Chromium)
                         │     ↑ fresh context per render
                  Screenshot → Pixelmatch → Score
```

### Why not cloud?

1. **Zero hosting cost** — the school provides the machine.
2. **Zero internet dependency** — if the school wifi goes down, the app still works within the LAN.
3. **No free-tier throttling** — Render/Railway would spin down or throttle the app mid-event.
4. **Massive hardware headroom** — the server is an i9-14900K with 64GB RAM. It could handle 200+ concurrent renders before breaking a sweat.

### How deployment works:
1. Run `docker-compose up` on the server machine (starts Postgres).
2. Start the backend (`npm run start` or `npm run dev`).
3. The backend auto-spawns the rendering service as a child process.
4. Participants connect via browser to `http://<server-local-ip>:4000`.
5. The server machine should use a **wired ethernet connection** and a **static/reserved local IP**.

---

## 4. Identity: Name + PIN, Not Auth

### Full authentication (passwords, JWT, sessions) was deliberately skipped.

This is the single most important simplification in the project. The reasoning:

- **50 known participants, one room, a few hours.** Password-based auth adds complexity (bcrypt, JWT middleware, login/register screens, password reset flows) for literally zero benefit at this scale.
- **Pre-registered names prevent confusion.** Participants select their name from a dropdown — no free-typing, no duplicate-name ambiguity on the leaderboard.
- **Optional 4-digit PIN** — handed out at check-in if the admin wants a lightweight check. PINs are stored as plain strings (not hashed) because this is identity-lite, not security. If someone at the event is determined to impersonate another participant, there are much easier ways to do it than guessing a 4-digit PIN.
- **localStorage persistence** — identity is stored in `{ userId, name, role }` in the browser. No cookies, no tokens, no server-side sessions. "Switch User" clears it.
- **Admin PIN** — a single shared passphrase in an environment variable (`ADMIN_PIN`). Checked via `x-admin-pin` header on every admin API request. This is intentionally simple — one shared secret for all organizers, no per-admin-user accounts.

### What this removes from scope:
- Password hashing (bcrypt)
- JWT issuing/verification middleware
- Login / register screens
- Password reset flows
- Refresh tokens / session management

---

## 5. PostgreSQL + Prisma (Database Layer)

### Five tables, one schema, one migration.

- **User** — pre-registered participants and admins. Unique name constraint prevents leaderboard ambiguity.
- **Challenge** — a CSS challenge with a target image. Published flag controls visibility to participants.
- **Submission** — a participant's HTML/CSS code, with score and screenshot. `isBest` flag tracks the user's best per challenge. `rejudgedAt` tracks admin-triggered re-scoring.
- **CompetitionState** — singleton table (one row, updated in place). Tracks competition status, lock state, leaderboard freeze, and frozen snapshot data.

### Key design decisions:
- **Score is `Decimal(5, 2)`** — precision up to 99.99%. Two decimal places is enough for competition scoring without floating-point drift.
- **`codeLength` is computed server-side** — byte size of sanitized HTML+CSS combined. Prevents client-side manipulation.
- **`isBest` is recomputed in a Prisma transaction** — prevents race conditions when a user double-submits rapidly. The transaction reads all scored submissions, picks the best via tiebreak rules, resets all `isBest` flags, then sets the new one.
- **`frozenLeaderboardData` is a JSON column** — stores a complete snapshot of rankings when the admin freezes the leaderboard. This avoids complex history tables and makes unfreeze trivial (just delete the JSON).

---

## 6. Rendering & Scoring Pipeline

This is the highest-risk, most important part of the system. Every design choice here assumes a participant is actively hostile.

### Architecture: Isolated Process

The rendering service runs as a **separate Node.js process** (spawned as a child process from `server.ts`). It communicates with the main API over HTTP on a different port (4001 by default).

**Why isolated?** If a malicious submission crashes Chromium, it takes down only the rendering process. The main API (auth, leaderboard, submission history) stays up. This is non-negotiable.

### Per-Submission Flow:

```
User submits HTML + CSS
    │
    ▼
1. Validate payload size (500KB max, 10B min)
    │
    ▼
2. Sanitize (strip <script>, event handlers, javascript: URLs, external @imports)
    │
    ▼
3. Check render service status
    │
    ▼
4. Create DB record (score = null, screenshot = null)
    │
    ▼
5. POST to rendering service: /render
    │
    ▼
6. Render service receives HTML + CSS
    ├─ Validate payload again (defense in depth)
    ├─ Create fresh browser context with:
    │   ├─ JavaScript disabled
    │   ├─ All network requests blocked (only data: URIs allowed)
    │   ├─ 800×600 viewport
    │   └─ 10-second execution timeout
    ├─ Load HTML as data: URI (no file system access)
    ├─ Wait 200ms for CSS to settle
    ├─ Take screenshot
    ├─ Destroy browser context (ALWAYS — even on error)
    └─ Return screenshot path
    │
    ▼
7. Compare screenshot vs target image (Pixelmatch)
    ├─ Both images resized to 800×600 reference canvas
    ├─ Lanczos3 resampling (better for pixel-art than nearest-neighbor)
    ├─ threshold: 0.1 (anti-aliasing tolerance)
    └─ Returns similarity % (0–100)
    │
    ▼
8. Update DB record with score + screenshot URL
    │
    ▼
9. Recalculate isBest (inside Prisma transaction)
    │
    ▼
10. Return result to frontend
```

### Why a shared browser instance?
Launching Chromium takes 1-2 seconds. We share the browser process across renders but **each render gets its own fresh context** (page, cookies, storage). The browser process is shared; the context is not. This gives us isolation without the 1-2 second startup penalty on every submission.

### Sanitization: Defense in Depth

Sanitization runs at **two layers**:

1. **In `sanitize.ts`** — before the HTML/CSS ever reaches the renderer. Strips `<script>` tags, event handlers (`onclick`, `onerror`, etc.), `javascript:` URLs, external `@import` statements, and external `<link>` tags.

2. **In Playwright** — JavaScript is disabled at the browser context level (`javaScriptEnabled: false`), and all network requests are blocked via route interception. Even if sanitization misses something, Playwright won't execute it.

### Resource Isolation:
- **10-second timeout** per render. Hanging CSS animations or infinite loops are killed.
- **500KB payload max** — prevents DOM-bombing.
- **Fresh context per render** — no state leaks between submissions.
- **Context destroyed in `finally` block** — even if the render crashes, the context is cleaned up.

---

## 7. Scoring Formula: Pure Pixel Match + Tiebreakers

### The score IS the pixel similarity percentage. Nothing else.

**Implementation:**
1. Both images (screenshot + target) are resized to an 800×600 reference canvas with white background (`fit: 'contain'`, so aspect ratio is preserved with letterboxing).
2. Pixelmatch compares every pixel.
3. `score = (totalPixels - mismatchedPixels) / totalPixels * 100`
4. Score is rounded to 2 decimal places.

**Code length is used STRICTLY as a tiebreaker** — it is never blended into the score. The tiebreak order:
1. Highest pixel similarity score wins
2. Tie → shortest combined HTML+CSS byte length wins
3. Still tied → earliest submission time wins

**Why NOT a blended formula?** A blended formula (`score = pixelMatch - smallPenalty * codeLength`) would let a short, poorly-matching submission outscore a long, nearly-perfect one. Competition results must be unambiguous — the person whose output most closely matches the target wins.

### Pixelmatch Tuning:
- `threshold: 0.1` — ignores tiny YUV color differences caused by sub-pixel anti-aliasing between different renderers. Two visually identical images should not get penalized.
- `includeAA: true` — skips anti-aliased pixels when they fall under the threshold.
- `kernel: 'lanczos3'` — produces softer edges than nearest-neighbor, which matters for CSS-rendered shapes.

---

## 8. No Job Queue (Redis/BullMQ)

### Rendering is synchronous per request. No queue. No Redis.

This decision is validated by the hardware, not a shortcut:

- **Hardware:** i9-14900K (24 threads), 64GB RAM.
- **Per render:** ~150-300MB RAM, <1 second CPU time.
- **Capacity:** At 10-15 participants, this is 1-2% of the machine's realistic capacity.

A job queue would add:
- Redis as a dependency (another thing that can crash)
- BullMQ queue management code
- Async submission polling on the frontend
- Reconnection logic

**All for zero benefit at this scale.** If the event ever grows to 200+ simultaneous participants, revisit this — but not before.

---

## 9. Polling, Not WebSockets

### The frontend uses 3-second polling for competition state and 5-second polling for challenges.

**Why not WebSockets?**
- **The request is trivial.** Reading one `CompetitionState` row and a few `Challenge` rows from Postgres takes <1ms.
- **~10 requests every 3 seconds** across 10-15 participants = ~30-50 lightweight queries per second. This is a rounding error for Postgres.
- **Local network latency is <1ms.** WebSocket overhead savings are negligible.
- **WebSockets add complexity:** connection management, reconnection logic, server-side state tracking, heartbeat intervals. More code to break during the live event.
- **SSE is simpler** but still adds a persistent connection per participant, which is unnecessary when a 3-second poll achieves the same UX.

**If this ever needs to scale to 200+ remote participants,** consider Server-Sent Events (SSE) over WebSockets — SSE is one-directional (server→client), auto-reconnects, and is simpler to implement. But for this event, polling is the right call.

---

## 10. Frontend Architecture

### Page Structure:
- `/` — Dashboard (competition status, stats, podium, user performance, challenge list)
- `/challenges` — Challenge list
- `/challenges/:id` — Battle page (editor + target + preview + submission)
- `/leaderboard` — Full leaderboard
- `/admin` — Admin dashboard (competition controls, submissions review, participants)
- `/admin/challenges` — Challenge management (CRUD)

### Key patterns:
- **`useIdentity()` hook** — wraps localStorage identity management. Components re-render when identity changes via a custom `identityChange` event.
- **`useQuery` with `refetchInterval`** — polling is handled by React Query's built-in mechanism, not manual `setInterval`.
- **Module-level state for editor code** — `CompareModes.tsx` exports `setPreviewCode()`/`getPreviewCode()` so the DiffMode component can send the latest editor content to the render service without needing a ref to the editor DOM.
- **Draft auto-save** — editor content is saved to localStorage as `cssbattle_draft_{userId}_{challengeId}` and restored on page load.
- **Framer Motion** — used for transitions and animations throughout (modals, toggles, staggered lists). Adds visual polish without heavvy configuraiton.

### Auto-navigation on challenge start:
The Dashboard polls competition state every 3 seconds and challenges every 5 seconds. When the competition transitions to `RUNNING` and published challenges exist, the participant is automatically navigated to the first challenge's Battle page. If they navigate back, the flag resets and they get re-directed again — this fulfills "without requiring any click" from the UX requirements.

---

## 11. Admin Panel Design

### Everything the admin needs is on one page (except challenge creation).

The admin dashboard has two columns:
- **Left column:** Competition Controls (start/pause/end, lock submissions, round +/−), Leaderboard Controls (freeze/unfreeze, export CSV), Participant Management.
- **Right column:** Submission Review (select challenge, view/expand submissions, rejudge), link to Challenge Manager.

### Participant Management Design:
The admin creates participants **by name only** — no required fields beyond the name. Two methods:
1. **Single add** — input + "Add" button, one name at a time.
2. **Bulk add** — expandable textarea, paste names one per line, auto-counts detected names.

PINs are optional and can be set/cleared per-participant via an inline input that appears on hover. This separates the "create all participants quickly" flow from the "assign PINs to specific participants" flow.

### Why no participant management was done with forms:
The original plan called for CSV import or a form-heavy approach. During implementation, the team realized the real workflow is: admin walks into the room 10 minutes before start, pulls up a list of names from the registration sheet, and types/pastes them in. The UI was redesigned to match this actual workflow.

### Competition Controls:
- **Start / Resume / Pause / End** — changes `CompetitionState.status`.
- **Lock / Unlock submissions** — changes `CompetitionState.locked`. When locked, all submission attempts are rejected server-side with a clear message.
- **Round +/−** — changes `CompetitionState.currentRound`. This is metadata for the admin; the auto-navigation logic uses published challenge round numbers.
- **Freeze / Unfreeze leaderboard** — takes a snapshot of all current rankings and stores it in the database. Participants see a frozen display instead of live data. Useful for suspense in the final minutes.
- **Export CSV** — compiles overall leaderboard data into a CSV with per-challenge score columns. UTF-8 BOM for Excel compatibility.

---

## 12. Comparison Tools (Split/Opacity/Diff)

Three visual comparison modes help participants judge accuracy before submitting:

### Split Slider:
A vertical divider follows the cursor position (no click-and-drag — just hover). Target image on one side, participant's preview on the other. Implemented with `clip-path: inset(0 X% 0 0)` on the overlaid target image.

### Opacity Slider:
A range input (0–100%) fades the target image over the live preview. Simple CSS `opacity` on the overlaid target `<img>`. Slider is visible only on hover to keep the UI clean.

### Difference Mode:
**Changed from original plan:** Originally called for client-side `html2canvas` + Pixelmatch. This was replaced with a **server-side approach**:
1. The participant's current code is sent to the rendering service's `/render` endpoint (no DB write, just a screenshot).
2. The resulting screenshot + target image are sent to `/diff` (a separate endpoint on the rendering service).
3. The diff PNG is returned with score headers (`X-Diff-Score`, `X-Diff-Mismatched`, `X-Diff-Total`).

**Why the change?** `html2canvas` had reliability issues with complex CSS rendering and cross-origin iframe content. The server-side approach uses the exact same Pixelmatch pipeline as real scoring, so the diff preview perfectly matches what the actual score will be.

The diff is debounced (700ms) and auto-runs on every code change. The previous diff is shown grayed out while updating, so the participant always sees something.

---

## 13. Docker Compose Setup

### Single service: PostgreSQL.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: cssbattle-postgres
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
```

### Why only PostgreSQL in Docker, and not the whole app?

1. **The rendering service needs direct hardware access.** Playwright needs to launch Chromium, which has specific system dependencies (shared libraries, sandboxing). Running it in Docker adds an extra layer of indirection that makes debugging harder.

2. **Development iteration speed.** Hot-reloading (`tsx watch`) works best when the Node process runs directly on the host, not in a container.

3. **PostgreSQL is the only dependency that benefits from Docker.** It gives us a clean, reproducible Postgres instance without installing it on the host. The data persists in a Docker volume (`pgdata`) so it survives container restarts.

4. **Deployment simplicity.** On event day, the admin just runs:
   - `docker compose up -d` (start Postgres)
   - `npm run dev` or `npm run start` (start backend, which spawns the rendering service)

   No Docker Compose for the Node app means no port mapping confusion, no container networking issues, and no volume mounting for upload directories.

### If you wanted to containerize everything:
The plan's original architecture shows the rendering service as a "container" — this is a future option if the event grows. For now, the child-process approach gives us isolation without Docker complexity.

---

## 14. Security: Defense in Depth

This is the single highest-risk part of the system — participants submit arbitrary HTML/CSS that gets executed in a headless browser.

### Layer 1: Input Validation (before any processing)
- Payload size limits: 500KB max, 10B min.
- Reject non-string types.

### Layer 2: Sanitization (before reaching Playwright)
- Strip `<script>` tags and contents.
- Strip event handler attributes (`onclick`, `onerror`, `onload`, etc.).
- Replace `javascript:` URLs with `blocked:`.
- Replace external `url()` references in CSS with a transparent pixel.
- Block external `@import` URLs.
- Remove `<link>` tags with external `href`s.

### Layer 3: Playwright Browser Context
- **JavaScript disabled** (`javaScriptEnabled: false`).
- **All network requests blocked** — only `data:` URIs and `about:blank` are allowed. No remote fonts, images, scripts, stylesheets.
- **Fresh context per render** — no shared cookies, storage, or state.
- **10-second timeout** — infinite loops or hanging animations are killed.
- **Context destroyed in `finally`** — even if the render crashes, the context is cleaned up.

### Layer 4: Process Isolation
- The rendering service runs as a **separate Node process**.
- If Chromium crashes, only the rendering process is affected.
- The main API (auth, leaderboard, CRUD) stays up.

### Layer 5: Rate Limiting
- **In-memory rate limiter**: 1 submission per 3 seconds per user.
- **Frontend button lockout**: 2-second disable after each submission (UX polish, not security — the server enforces this independently).

### What we do NOT protect against (and why it's acceptable):
- **XSS via rendered output** — the preview iframe uses `sandbox` attributes without `allow-scripts`. Even if a participant injects HTML, it cannot execute JavaScript in the preview.
- **DoS via many concurrent renders** — the hardware can handle ~200 concurrent Chromium instances before breaking a sweat. At 10-15 participants, this is not a realistic attack vector.

---

## 15. What Is Explicitly Out of Scope

These features are deliberately NOT built. If an AI agent tries to add them, stop it:

- **Full auth (passwords/JWT/sessions)** — out of scope; use name + optional PIN.
- **Teams, multiplayer rooms** — individual competition only.
- **Chat / comments / discussion** — nothing social.
- **AI-generated challenges** — challenges are created manually by the admin.
- **Community submissions** — no public challenge creation.
- **Theming, animations** — one theme, minimal animations.
- **Notifications** — polling replaces push notifications.
- **Achievements / gamification** — not needed for a one-day event.
- **Public profiles** — no account pages beyond what the leaderboard shows.
- **WebSockets** — polling was deliberately chosen (see Section 9).

---

## 16. Event-Day Checklist (from the project plan)

Before the event, confirm:

- [ ] Server machine has a **static/reserved local IP** (DHCP reservation on the school router).
- [ ] School wifi does **not** have AP/client isolation (test with two devices).
- [ ] Server machine's firewall allows inbound connections on port 4000 (or whichever PORT is configured).
- [ ] Server machine has enough free RAM (~2GB+ for Postgres + Node + Chromium).
- [ ] Wired ethernet connection for the server machine (not wifi).
- [ ] Backup machine with the repo cloned and ready.
- [ ] `pg_dump` backups scheduled periodically during the event.
- [ ] Local IP + port printed somewhere visible, or a QR code generated.
- [ ] Admin PIN set via `ADMIN_PIN` environment variable.
- [ ] Participants pre-registered in the database.
- [ ] Challenges created, target images uploaded, and published.
- [ ] Full end-to-end test: participant selects name → sees challenge → writes code → submits → sees score → leaderboard updates.
- [ ] Rendering service tested with a known-good submission and a known-malicious one (script injection, external URL).
