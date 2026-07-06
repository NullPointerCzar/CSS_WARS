# CSS Battle Platform — Project Plan (Yatra Edition)

**Event:** Yatra, NCE College
**Project Lead:** Sarwagya
**Timeline:** 20–25 days
**Tech Stack:** React + Node.js (Express) + PostgreSQL

---

## 1. What We're Building

A **competition platform**, not a general-purpose CSSBattle clone. Participants at Yatra will:

1. Register / log in
2. See the active challenge(s)
3. Write HTML + CSS to match a target image
4. Preview their work live
5. Submit (multiple times if allowed — best score counts)
6. See their score and the live leaderboard

Organizers (you, as admin) will be able to create challenges, run the event live, and export results — without touching the database directly.

**Guiding principle:**
> Make the simplest CSS Battle platform that feels professional and never crashes during the event.

Reliability > feature count. Five things that never break beat twenty-five things that might.

---

## 2. Why This Scope (Context)

This isn't "the next CSSBattle.org" — it's software to run **one live event**, for roughly **50 concurrent participants**, over a few hours or days. That changes the engineering priorities:

- Optimize for **stability** and **ease of administration**, not feature breadth.
- The scoring/rendering pipeline is the highest-risk, highest-effort part — everything else is fairly standard CRUD + auth web development.
- Build clean module boundaries now so the codebase can evolve into a fuller platform *after* Yatra, without a rewrite.

---

## 3. MVP Scope

### 3.0 Identity, Not Auth (Deliberate Simplification)

**Decision:** skip full authentication (login/password/JWT sessions) in favor of a lightweight, pre-registered identity flow. This is a deliberate scope cut based on the event's actual size and stakes (about 50 known participants, a few hours, one room) — not a shortcut that compromises the platform.

**Important distinction:** dropping auth does **not** mean dropping the database. PostgreSQL is still fully required — it stores the participant list, every submission, challenge definitions, and competition state regardless of how someone identifies themselves. Only the `password_hash` / login / JWT layer goes away; the `User` table itself stays, just simpler.

**How it works:**
1. Before the event, admin pre-registers each participant's name (and optionally a roll number) into the database — either via a small admin form or a bulk CSV import.
2. On event day, participants **select their name from a dropdown** (not free-typed) to avoid duplicate-name or typo confusion on the leaderboard.
3. Optionally, each participant is given a short 4-digit **PIN** at check-in (printed on a card or handed out), which they enter alongside their name to "unlock" their session. This is identity-lite, not real auth — no password hashing complexity needed, just a simple match against the stored PIN.
4. Once selected, their identity is stored in the browser's `localStorage` so a page refresh doesn't lose their session — no token/JWT machinery required.
5. Admin identity (for the admin panel) can stay marginally more protected — e.g. a single shared admin PIN/passphrase set via environment variable — since only you and maybe co-organizers need that, and it's not worth building a full auth system for one role.

**What this removes from scope:** password hashing (bcrypt), JWT issuing/verification middleware, login/register screens, password reset flows, refresh tokens. All of that goes away.

**What this does NOT change:** the database schema for `Submission`, `Challenge`, `CompetitionState`, and the leaderboard queries are unaffected — see Section 8.

### 3.1 Participant Features
- Select name from pre-registered dropdown (+ optional PIN) — see Section 3.0
- Dashboard: active competition, remaining time, challenge list, personal rank
- Challenge page (single page, everything visible):
  - Target image
  - HTML editor
  - CSS editor
  - Live preview (updates on a short debounce, no page reloads)
  - **Comparison tools** (see 3.1.1 below) to check accuracy before submitting
  - Submit button
- Score view after submission (similarity %, code length, rank)
- Leaderboard (polled every 5–10s — no need for WebSockets)

#### 3.1.1 Comparison Tools (CSSBattle-style)

These help participants visually judge their own accuracy before submitting — a nice touch that costs relatively little to build since it's all client-side (no backend involvement, no extra load on the rendering service):

- **Split Slider** — a draggable vertical divider over the preview area: target image on one side, participant's live-rendered output on the other. Implemented by layering the target `<img>` and the preview `<iframe>` in the same container and using `clip-path: inset(0 <slider%> 0 0)` on the top layer, updated on drag.
- **Opacity Slider** — a range input (0–100%) that fades the target image over the live preview (`opacity` CSS property on the overlaid target `<img>`), so participants can see both blended together.
- **Difference Mode** — highlights pixel-level mismatches in red, using the same approach as server-side scoring for consistency. Render the target image to one `<canvas>` and the live preview to another (via `html2canvas`, free/open-source), then run **Pixelmatch** (free, MIT-licensed, the same library used for server-side scoring) client-side to produce a diff overlay. This is more accurate than a CSS-only trick like `mix-blend-mode: difference` — which just inverts overlapping colors and can look "different" even where things aren't actually mismatched — and reusing Pixelmatch means one diffing library and one mental model across both the client-side preview tool and the real scoring engine.

All three are purely visual aids — they don't affect scoring, which still happens server-side via the actual Playwright + Pixelmatch pipeline at submission time. Keep them as toggleable view modes above/around the preview pane (e.g. a small "Split / Opacity / Diff / Normal" toggle group).

### 3.2 Admin Features
- Create / edit / delete challenges
- Upload target image per challenge
- Publish / unpublish a challenge
- Start / Pause / Resume / End the competition
- Lock submissions (freeze the round)
- View all submissions (user, code, rendered output, score, timestamp)
- Manual **Rejudge/Recalculate** button (for scoring bugs — avoids asking everyone to resubmit)
- Export final leaderboard/results to CSV

### 3.3 Explicitly Out of Scope (for v1)
Do **not** build these before the event — they add risk without helping the core goal:

- Public profiles, achievements, friends, teams (unless team mode is chosen — see Section 9)
- Chat / comments / discussion
- Daily challenges, multiplayer rooms, tournament brackets
- AI hints or AI-generated challenges
- Community-submitted challenges
- Theming, complex animations
- Notifications

These are good *future* ideas, not Yatra-week ideas.

---

## 4. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | **React** (Vite) | Fast dev server, simple build — both free/open-source |
| Editor | **Monaco Editor** | Same editor engine as VS Code; free, open-source (MIT), excellent HTML/CSS support and highlighting |
| Frontend data | React Query | Handles polling (leaderboard), caching, retries |
| Routing | React Router | |
| Styling | TailwindCSS | Fast to build a clean, minimal UI |
| Backend | **Node.js + Express** | REST API |
| ORM | Prisma (or Sequelize) | Prisma recommended — type-safe, fast migrations |
| Database | **PostgreSQL** | Relational data: users, challenges, submissions, scores |
| Identity | Pre-registered name dropdown + optional short PIN, stored in `localStorage` | No JWT, no password hashing — see Section 3.0. Admin panel uses a single shared PIN/passphrase via env variable |
| Rendering/Scoring | Playwright (headless Chromium) | Renders submitted HTML/CSS, takes a screenshot |
| Image comparison | Pixelmatch or `sharp` + custom diff | Produces the similarity % score |
| Async job handling | Not needed — validated by hardware | On the planned server hardware (see Section 4.1 Capacity Reality Check), synchronous rendering has massive headroom even well beyond 10–15 concurrent users — skip Redis/BullMQ |
| Containerization | Docker + docker-compose | Isolate the rendering service; consistent deploys |
| Deployment | **Self-hosted on your own computer**, over the local network (LAN/wifi) | Nginx as reverse proxy in front of the Node app; no cloud hosting needed |
| CI | GitHub Actions (optional but recommended) | Basic lint/test/build checks |

**On the editor:** Monaco is back in — with only 10–15 concurrent participants, its larger bundle size is a non-issue (it was only a concern at higher scale/weaker connections). It's fully free and open-source, gives a genuinely polished, IDE-like feel, and its extra weight is barely noticeable for a room of 10–15 people on decent wifi.

### 4.1 Hosting: A Dedicated School Computer (Local Network)

**Decision:** the event will be self-hosted on a powerful computer available at the school — used as a dedicated server for the day — rather than any cloud/VPS provider. Since Yatra is an **in-person** event, this is genuinely the better choice, not just the free one: zero hosting cost, zero dependency on internet uptime, and no risk of a cloud provider's free tier throttling or sleeping the app mid-competition. A dedicated, more powerful machine also gives more comfortable headroom for running Postgres + the Node backend + the Playwright/Chromium rendering service simultaneously, compared to a personal laptop.

**How it works:**

1. Run the full stack (Node/Express backend, PostgreSQL, Playwright rendering service — via `docker-compose up`) on the school's server machine.
2. Serve the built React frontend from the same machine (Nginx or `express.static`).
3. All participant devices connect over the **same school wifi/LAN** and hit the server machine's **local IP address** (e.g. `http://192.168.1.42:3000`) — no domain name or public internet exposure needed.
4. Give the server machine a **static/reserved local IP** — ideally via a DHCP reservation set on the school's router/network, so the address doesn't change mid-event. This is a good thing to coordinate with whoever manages the school's network, if that's not you.

**Capacity Reality Check (given the actual hardware — i9-14900K, 64GB RAM, RTX 4060 Ti):**

The rendering step (Playwright + Chromium screenshot + Pixelmatch diff) is the only real bottleneck in this whole system, and on this hardware it's a non-issue:

- Each render takes roughly 0.5–1 second of work and ~150–300MB RAM.
- RAM alone would support 200+ concurrent Chromium instances before becoming a constraint.
- With 24 threads, 15–20 renders can run genuinely in parallel with no contention.
- Realistically, this machine could handle **150–200 simultaneous participants** submitting at once before queuing became noticeable — and even then, it would degrade gracefully (a few seconds of queuing), not break.

At the actual planned scale of **10–15 participants**, this is roughly 1–2% of the machine's realistic capacity for this workload. GPU is irrelevant here (Playwright's headless rendering is not GPU-bound).

**Practical implication:** this validates, rather than just permits, the decision to skip a job queue (Redis/BullMQ) and run rendering synchronously per request. Don't spend build time on concurrency caps or queuing infrastructure for stability reasons — it buys nothing at this scale. Revisit only if the event scope grows dramatically (multi-classroom, 200+ participants) or if this hardware is ever swapped for something weaker.

Given the compute is this overprovisioned, the actual risk shifts entirely to **network reliability and machine access/logistics** — see the checklist below.

**Practical checklist for event day:**
- [ ] Confirm with school IT/network admin (if separate from you) that the machine can get a reserved static IP and that inbound connections on the app's port are allowed within the LAN.
- [ ] Test the full flow on the **actual school network**, not just your home wifi, well before the event — school networks sometimes have client isolation, guest-network restrictions, or captive portals that silently block device-to-device traffic.
- [ ] Confirm the network doesn't have **AP/client isolation** enabled (blocks devices on the same wifi from reaching each other — this would silently break everything). If the main school wifi has this, consider setting up a separate router/hotspot dedicated to the event instead.
- [ ] Set the server machine's firewall to allow inbound connections on the app's port (e.g. 3000/80) from the local network.
- [ ] Confirm the machine's specs are adequate: enough RAM (~2GB+ free, ideally more) to comfortably run Postgres, Node, and headless Chromium instances at once without swapping.
- [ ] Have a **backup plan**: know who has access to the machine if it needs a restart mid-event, and keep a second machine (even a laptop) with the same repo cloned and ready as a fallback. Since PostgreSQL data lives in a Docker volume, back it up periodically during the event (`pg_dump`) in case you need to recover on a different machine.
- [ ] Keep the machine plugged into power throughout — don't rely on a battery for a multi-hour event.
- [ ] Use a **wired ethernet connection** for the server machine to the router/switch if at all possible — this is the single biggest reliability win over wifi for the machine hosting the whole event.
- [ ] Confirm you (or whoever is running the event) has admin/terminal access to that machine well before event day — don't assume access will be available last-minute.
- [ ] Print or write down the local IP + port somewhere visible so participants can type it in easily (a QR code linking to `http://<ip>:<port>` is a nice, cheap touch).

**Why this is a real recommendation, not just a cost-cutting one:** free cloud tiers (Render, Railway, etc.) often spin down idle instances or throttle after a usage cap — exactly the kind of thing that could fail silently in the middle of a live event. A dedicated, more powerful machine physically at the venue, with no internet dependency, is more predictable and has more headroom for a few hours of live competition than a personal laptop would.

Every other tool in the stack remains free/open-source regardless of hosting choice:

| Need | Free option |
|---|---|
| Rendering (Playwright + Chromium) | Fully free, and the school server's extra RAM/CPU gives comfortable headroom for concurrent renders |
| PostgreSQL | Free, self-hosted via Docker on the same server machine |
| CI (for development, pre-event) | GitHub Actions free tier (2,000 min/month on public repos) |
| Domain | Not needed — local IP address is sufficient for an in-person event |

If you ever *do* want the platform reachable outside the event room (e.g. remote participants, or running it again later as a hosted practice tool), Render/Railway free tiers or Oracle Cloud Always Free remain valid free options to revisit post-event — but that's explicitly out of scope for Yatra itself.

### 4.2 Capacity Reality Check (Server: i9-14900K, 64GB RAM, RTX 4060 Ti)

The school's server machine is dramatically overpowered for this workload. Documenting the math here so the "keep it simple, no queue" decision (Section 4, "Async job handling") is understood as validated by the hardware, not a shortcut taken due to time pressure.

**Where the bottleneck actually is:** the rendering pipeline (headless Chromium + Playwright), not the API or database. Auth, leaderboard polling, and CRUD are trivial at any realistic scale for this event.

**Per-submission cost:** roughly 150–300MB RAM and under a second of mostly single-threaded CPU work (render + screenshot + Pixelmatch diff).

**Resulting capacity, given 24 threads / 64GB RAM:**

| Scenario | Outcome |
|---|---|
| 10–15 participants, staggered submissions (realistic) | Instant, imperceptible load — effectively a non-event for the machine |
| 50 participants submitting within the same few seconds | Still fine — worst case ~1–2s informal queuing behind other renders |
| 100+ participants, simultaneous mass-submit (e.g. "5 minutes left!" moment) | Still handled — brief queuing possible, nothing that looks broken |
| 300+ concurrent | This is the point where a real job queue (BullMQ/Redis) and concurrency capping would start to matter — well beyond this event's scale |

**Bottom line:** at 10–15 participants, this hardware runs at roughly 1–2% of its realistic capacity for this workload. The GPU (4060 Ti) is essentially idle for this use case, since headless Chromium screenshotting is not GPU-bound work — it's a nice-to-have, not a factor in capacity planning here.

**What this changes practically:** nothing in the architecture needs to be revisited for stability reasons — the no-queue, synchronous-render-per-request approach stays. It does shift where the real event-day risk sits (see Section 4.1's checklist) toward **network reliability and access to the machine**, not compute capacity.

**Why this maps well from your existing MERN/Django/Postgres background:** Node + Express + Postgres keeps you inside familiar territory (Express ≈ Django's URL/view layer, Prisma ≈ an ORM you already understand conceptually from Django ORM). React on the frontend is already comfortable for you.

---

## 5. High-Level Architecture

```
                    React (Vite)
                         │
                    REST API (HTTPS)
                         │
                 Node.js / Express Backend
                         │
        ┌────────────────┴─────────────────┐
        │                                   │
   PostgreSQL                      Rendering Service
   (users, challenges,             (isolated process/
    submissions, scores)            container)
        │                                   │
        └───────────────┬───────────────────┘
                         │
                  Playwright (Chromium)
                         │
                  Screenshot Engine
                         │
                  Image Comparison (Pixelmatch)
                         │
                    Similarity Score
```

**Key architectural decision:** the rendering service (the part that executes *user-submitted* HTML/CSS) must be isolated from the main API process. If a malicious or broken submission crashes the renderer, it should never take down the authentication/leaderboard/API layer. Run it as a separate Node process or container, and consider queuing jobs (BullMQ/Redis) so submission bursts are handled in order rather than overwhelming the server at once.

**Hosting note:** the entire diagram above runs on a **single dedicated machine** — a powerful computer at the school, used as the event server — rather than being split across cloud services. See Section 4.1 for the local-network setup and event-day checklist.

---

## 6. Backend Module Structure

```
backend/
├── src/
│   ├── identity/         # participant name+PIN selection, admin PIN check (no JWT/passwords)
│   ├── users/            # participant records, roles (admin/participant)
│   ├── challenges/      # CRUD, publish/unpublish, target image upload
│   ├── submissions/     # receive code, trigger render+score, store result
│   ├── scoring/         # image diff logic, similarity %, tie-break rules
│   ├── rendering/       # Playwright wrapper, sandboxing, screenshot capture
│   ├── leaderboard/     # ranking queries, CSV export
│   ├── admin/           # competition controls (start/pause/end/lock)
│   ├── db/              # Prisma client / migrations
│   ├── middleware/      # identity check, error handler, rate limiter
│   └── routes/          # Express route definitions, grouped by module
├── prisma/
│   └── schema.prisma
└── server.js
```

Keeping `scoring`, `rendering`, `challenges`, and `submissions` as separate modules means you can later swap the scoring algorithm, scale the renderer independently, or add new challenge types without touching unrelated code.

---

## 7. Frontend Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ChallengePage.jsx
│   │   ├── Leaderboard.jsx
│   │   └── Admin/
│   │       ├── AdminDashboard.jsx
│   │       ├── ChallengeEditor.jsx
│   │       ├── SubmissionViewer.jsx
│   │       └── CompetitionControls.jsx
│   ├── components/
│   │   ├── Editor/          # Monaco wrapper for HTML/CSS
│   │   ├── Preview/         # sandboxed iframe live preview
│   │   ├── CompareTools/    # SplitSlider.jsx, OpacitySlider.jsx, DifferenceMode.jsx
│   │   ├── LeaderboardTable/
│   │   └── shared/          # buttons, modals, layout
│   ├── hooks/                # useIdentity, usePolling, useSubmission
│   ├── services/             # API calls (axios/fetch wrappers)
│   └── App.jsx
```

**Live preview note:** render the participant's HTML/CSS inside a **sandboxed `<iframe>`** (`sandbox="allow-same-origin"` — deliberately *without* `allow-scripts` if you're keeping this HTML/CSS-only) using `srcDoc`, updated on a short debounce (e.g. 300–500ms) as they type. This avoids injecting arbitrary code into the main page.

---

## 8. Database Schema (PostgreSQL)

```
User
────
id              PK
name            unique per event (pre-registered by admin)
roll_number     optional, for matching against school records
pin_code        optional, short 4-digit code (not hashed — low-stakes identity, not security)
role            enum('participant', 'admin')
created_at

Challenge
─────────
id              PK
title
description
difficulty      enum('easy','medium','hard')
target_image_url
round_number
published       boolean
created_by      FK → User.id
created_at

Submission
──────────
id              PK
user_id         FK → User.id
challenge_id    FK → Challenge.id
html_code
css_code
code_length     (bytes)
score           numeric (similarity %)
screenshot_url
submitted_at
is_best         boolean   -- flags the user's best submission per challenge

CompetitionState
────────────────
id              PK
status          enum('not_started','running','paused','ended')
current_round
locked          boolean
updated_at
```

**Relationships**
```
User        1 ──── N   Submission
Challenge   1 ──── N   Submission
```

**Ranking logic (decide early — see Section 9):**
1. Highest similarity score wins
2. Tie → shortest code length wins
3. Still tied → earliest submission time wins

---

## 9. Decisions to Lock In Before Coding

These affect the data model and UI, so decide them in the first day or two:

| Question | Recommendation |
|---|---|
| Individual or team competition? | Individual — simpler, no team-management overhead. Only go team-based if Yatra's format requires it. |
| One challenge or multiple? | Multiple, increasing difficulty (e.g. 3–5 challenges). |
| Are resubmissions allowed? | Yes — best score counts, keep submitting until the round locks. |
| Is the leaderboard live? | Live throughout, with an option to **freeze it in the last 5 minutes** for suspense (admin toggle). |
| Expected participant count? | Design for 10–15 concurrent users. At this scale, synchronous rendering (no job queue) is fine — one thing less to build and debug. |

---

## 10. Submission → Scoring Pipeline

```
User submits HTML + CSS
        │
        ▼
Backend sanitizes input (strip <script>, disallow external requests)
        │
        ▼
Write to a temporary HTML file
        │
        ▼
Launch headless Chromium (Playwright) in the isolated rendering service
        │
        ▼
Load the HTML, wait for render
        │
        ▼
Take a screenshot at a fixed viewport size
        │
        ▼
Compare against the target image (pixel diff → similarity %)
        │
        ▼
Store score + screenshot + submission record
        │
        ▼
Update leaderboard
```

**Isolation matters most here** — this is the one part of the system executing untrusted code.

---

## 11. Security Considerations

Because participants submit arbitrary HTML/CSS, this is the most important section of the plan:

- Render every submission inside an **isolated, disposable** Playwright/Chromium instance (ideally a separate container/process — not inside the main API server).
- **Disable JavaScript execution** in the renderer if challenges are HTML/CSS only.
- Block external network requests, remote fonts, and remote images from submitted code — only allow the target's own assets.
- Enforce hard limits: execution timeout (e.g. 5s), memory cap, CPU cap.
- Limit submission size (DOM size / CSS length) to prevent abuse (e.g. someone submitting a 5MB CSS file).
- Destroy/reset the rendering environment after every submission — never reuse browser state between users.
- Rate-limit the submit endpoint per user to avoid accidental or intentional spam during the event.

---

## 12. 25-Day Timeline

```
Days 1–3    Project setup, Identity flow (name+PIN), DB schema, Docker, basic CI
Days 4–7    Challenge CRUD, Admin panel skeleton, User dashboard
Days 8–12   Monaco editor integration, live preview (sandboxed iframe),
            comparison tools (split slider, opacity slider, difference mode)
Days 13–16  Rendering service (Playwright), screenshot capture, image diff
            ← hardest part, get this stable before adding anything else
Days 17–19  Leaderboard, ranking logic, submission history
Days 20–22  Testing, bug fixing, load testing (~10–15 concurrent users)
Days 23–25  Buffer — never plan to finish on the last day
```

**Biggest technical risk:** the rendering/scoring pipeline. Everything else here is standard web development you already have the background for. Get the render→screenshot→diff→score loop working end-to-end early (even with a rough scoring formula), then refine it — don't leave it until the last week.

---

## 13. Operational Features Organizers Will Actually Need

During a live event you'll get asked things like:

- "Can we extend this round by 10 minutes?"
- "Can we hide the leaderboard until the end?"
- "Can we disqualify a submission?"
- "Can we unlock Challenge 2 now?"
- "Can we freeze rankings for the last 5 minutes?"
- "Can we export results to CSV?"

Build the admin **Competition Controls** panel (Start / Pause / Resume / End / Lock Submissions / Unlock Next Challenge / Freeze Leaderboard / Export CSV) early — these low-effort features are what actually make the event runnable smoothly, more than any participant-facing polish.

---

## 14. Post-Event Roadmap (Not for v1)

Once Yatra is done and the codebase is stable, natural next steps include:

- Public accounts & permanent leaderboards
- Team-based competitions
- Daily challenges / practice mode
- Solution gallery, replays
- Community-submitted challenges
- Achievements, profiles
- WebSocket-based real-time leaderboard instead of polling
- Tournament brackets / multiplayer rooms

The current module boundaries (`identity`, `challenges`, `submissions`, `scoring`, `rendering`, `admin`) are designed so these can be added later without a rewrite. Full auth (login/password/JWT) is a natural post-event addition if the platform ever needs persistent accounts across events.

---

## 15. Summary Checklist

- [ ] Confirm: individual vs. team format
- [ ] Confirm: number of challenges and difficulty curve
- [ ] Confirm: expected participant count
- [ ] Set up repo structure (backend/, frontend/, docker-compose.yml)
- [ ] Identity flow (pre-registered name dropdown + optional PIN, admin PIN) working end-to-end
- [ ] Challenge CRUD + admin publish flow
- [ ] Monaco editor + sandboxed live preview
- [ ] Comparison tools: split slider, opacity slider, difference mode
- [ ] Rendering service (Playwright) isolated and stable
- [ ] Image comparison producing a reliable similarity score
- [ ] Leaderboard with polling + tie-break logic
- [ ] Admin competition controls (start/pause/end/lock/export)
- [ ] Load test with ~10–15 simulated concurrent submissions
- [ ] Local-network hosting tested end-to-end on the actual school network (static IP reserved, no client isolation, firewall configured, admin access to the server machine confirmed, backup machine ready)
- [ ] Buffer days reserved before the event
