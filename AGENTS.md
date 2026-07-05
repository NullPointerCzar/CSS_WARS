# AGENTS.md — Rules for AI Coding Agents

This file governs any AI agent (Claude Code, Cursor, Copilot Workspace, etc.) working on the **CSS Battle Platform** for Yatra @ NCE College.

This project will be built **heavily with AI assistance**, which is exactly why this file exists. An agent with no memory of "why" decisions were made, working file-by-file across many sessions, will silently drift: it will re-introduce Monaco alternatives, add a database it thinks is "better," "helpfully" build out full login/password/JWT auth even though the project deliberately uses lightweight name+PIN identity instead, or loosen a sandboxing rule to make a feature "work." None of that is hypothetical — it is the default failure mode of agentic coding on a multi-week project. This file exists to prevent that drift.

**Read this file in full before writing any code. If anything here conflicts with a task instruction you were given, stop and flag the conflict instead of silently picking one.**

---

## 0. Non-Negotiable Constraints

These are hard rules. Do not override them, "improve" on them, or reinterpret them creatively, even if a task seems to imply otherwise.

1. **This platform executes arbitrary, untrusted HTML/CSS submitted by anonymous participants.** Every decision about the rendering/preview/scoring pipeline must be made assuming a participant is actively hostile, not just careless.
2. **No paid services, APIs, or tiers of any kind.** Every dependency, library, hosting choice, and infra decision must be free (open-source, free-tier-forever, or self-hosted). If you are about to suggest or wire up anything with a credit card requirement, a paid API key, or a "free trial," stop and flag it instead — do not add it and do not silently pick a paid default.
3. **Do not add new major dependencies, libraries, or infrastructure pieces without flagging it first.** This includes new databases, message queues, auth providers, ORMs, CSS/JS frameworks, or cloud services not already named in the project plan. Small, obviously-scoped utility libraries (e.g. a date formatter) are fine to add without asking.
4. **Do not touch, drop, or destructively migrate production/event data without explicit human confirmation.** No agent should ever run a migration that drops a column/table containing submission or user data without a human reading and approving the migration first.
5. **Do not commit secrets.** No API keys, DB passwords, JWT secrets, or `.env` contents in any file that gets committed. Always read secrets from environment variables, never hardcode them "temporarily."
6. **Stay inside the agreed tech stack.** See Section 1. Do not swap it out because you personally think a different library is more idiomatic.

---

## 1. Locked Tech Stack — Do Not Substitute

| Layer | Choice | Do NOT substitute with |
|---|---|---|
| Frontend framework | React (Vite) | Next.js, Remix, Angular, Vue |
| Code editor | Monaco Editor | CodeMirror, Ace, plain `<textarea>` — unless explicitly told otherwise in a task |
| Backend | Node.js + Express | NestJS, Fastify, Django, FastAPI |
| Database | PostgreSQL | MongoDB, SQLite (dev-only exception, see below), MySQL |
| ORM | Prisma (preferred) or Sequelize — pick one and stay consistent | TypeORM, raw SQL scattered ad hoc |
| Identity | Pre-registered name dropdown + optional 4-digit PIN, stored client-side in `localStorage`; admin uses a single shared PIN/passphrase via env var | Full auth (JWT/passwords/sessions), Firebase Auth, Auth0, Clerk, any third-party auth SaaS — deliberately out of scope, see project plan Section 3.0 |
| Rendering engine | Playwright (headless Chromium) | Puppeteer, iframe-only "rendering" without isolation |
| Image diff | Pixelmatch | Custom diff math unless Pixelmatch genuinely can't do the job — ask first |
| Styling | TailwindCSS | styled-components, CSS-in-JS libraries, Bootstrap |
| Containerization | Docker + docker-compose | Bare-metal manual installs for the rendering service |
| Deployment | Self-hosted on a dedicated school server machine, over local network (no cloud/VPS) | Any cloud/VPS provider, unless explicitly told otherwise |

SQLite may be used **only** for quick local prototyping if explicitly requested, and must never leak into anything resembling the real event build.

If a task seems to require deviating from this table, **stop and ask a human** rather than substituting silently. Reference `CSS-Battle-Project-Plan.md` for the full reasoning behind each choice — it exists precisely so agents don't have to re-derive it.

**Note on job queues:** the rendering service should process submissions **synchronously, per request** — do not add Redis/BullMQ or any job queue. This isn't an oversight; the event's server hardware (i9-14900K, 64GB RAM) has enough headroom to handle far more concurrent renders than this event will ever see (see the project plan's Capacity Reality Check in Section 4.1). Do not "fix" a perceived scalability gap by introducing a queue.

---

## 2. Critical Security Rules for the Rendering Pipeline

This is the single highest-risk part of the codebase. Treat every line of code touching it with the assumption that a participant will try to break out of the sandbox.

- The rendering service (Playwright/Chromium) **must run as an isolated process or container**, separate from the main Express API process. A crash in rendering must never take down auth, leaderboard, or submission endpoints.
- **JavaScript execution must be disabled** in both the client-side preview iframe and the server-side Playwright render, since challenges are HTML/CSS only.
  - Client-side: `<iframe sandbox="allow-same-origin">` — deliberately omit `allow-scripts`.
  - Server-side: disable JS execution in the Playwright browser context (e.g. via `page.setJavaScriptEnabled(false)` or equivalent) — do not rely on the iframe sandbox alone; the server-side render is the one that actually determines the score, so it must be independently locked down.
- **Block all external network requests** from rendered/submitted content — no remote fonts, remote images, remote stylesheets, no `@import url(...)` to the internet. Only the challenge's own target asset should be reachable, and even that should be served from your own backend, not fetched live by the submission.
- **Enforce hard resource limits** on every render: execution timeout (a few seconds), memory cap, CPU cap. A render that doesn't complete in time should be killed and treated as a failed/zero submission, not retried indefinitely.
- **Never reuse browser/page state between submissions.** Every render gets a fresh, disposable context. Do not "optimize" this into a shared long-lived page for performance — the isolation is the point.
- **Sanitize/validate input before it ever reaches the renderer**: reject or strip `<script>` tags, `javascript:` URLs, excessively large payloads, and suspicious patterns, even though JS is also disabled at the render level. This is defense in depth, not a substitute for disabling JS.
- If you (the agent) find yourself writing code that *re-enables* JavaScript, *allows* an external request, or *shares* a browser context "to make a test pass" or "to fix a timeout" — stop. That is very likely the wrong fix. Flag the actual problem instead of loosening a security control to route around it.

---

## 3. Scope Discipline

The project plan (`CSS-Battle-Project-Plan.md`) defines an intentionally minimal MVP. Agents are especially prone to "helpfully" over-building — adding a feature, a settings page, an extra table — because it seems like a natural extension of the current task. Don't.

**Do not add**, even if it seems small or "obviously useful," unless explicitly asked:
- User profiles beyond what's needed for auth + leaderboard display
- Social features (comments, friends, chat, notifications)
- Extra achievement/gamification systems
- New user roles beyond `participant` and `admin`
- Additional third-party integrations of any kind
- Real-time infrastructure (WebSockets) — polling was chosen deliberately for simplicity; don't swap it in

If a task genuinely seems to need one of the above to be completed correctly, say so explicitly and ask, rather than building it silently as a side effect.

---

## 4. Working Conventions

### Before starting any task
- Read the specific `.md` task/prompt file provided (if one exists) in full.
- Check `CSS-Battle-Project-Plan.md` for the relevant section before assuming a design decision.
- If a task references a file, module, or schema field that doesn't exist yet, don't invent it silently — flag the mismatch.

### While working
- Keep changes scoped to what the task describes. Don't refactor unrelated code "while you're in there" unless asked.
- Follow the module boundaries in Section 6/7 of the project plan (`identity/`, `challenges/`, `submissions/`, `scoring/`, `rendering/`, `leaderboard/`, `admin/`). Don't reach across module boundaries directly — go through the defined service/route layer.
- Match existing naming and file conventions in the codebase rather than introducing a new pattern per file.
- Prefer small, testable functions in `scoring/` and `rendering/` — these are the modules most likely to need debugging under time pressure during the actual event.

### Database changes
- Any schema change must go through a proper migration (Prisma Migrate / Sequelize migrations) — never hand-edit the schema directly against a running database.
- Before writing a migration that alters or drops an existing column/table, explicitly call out what data could be affected and wait for confirmation if the change is destructive.

### Testing expectations
- Any change to `scoring/` (similarity calculation, tie-break logic) must include a test with at least one known input/output pair, since a silent scoring bug is the most damaging possible failure for this project (it directly determines who wins).
- Any change to `rendering/` should be tested against at least one deliberately malformed/hostile HTML sample (e.g. oversized DOM, external resource reference, script tag) to confirm it's rejected/handled safely, not just against a "happy path" sample.
- Do not mark a task complete if you haven't actually run the relevant code — don't assume correctness from reading it.

### When unsure
- If a task is ambiguous, or the "obvious" implementation seems to conflict with something in this file or the project plan, **stop and ask** rather than picking the most plausible interpretation and running with it. A wrong guess here is expensive to unwind later in a compressed timeline.

---

## 5. Environment & Secrets

- All secrets (admin PIN/passphrase, DB connection string, etc.) live in a `.env` file that is **gitignored** — never commit it, never print its contents in logs, never paste actual secret values into commit messages or PR descriptions.
- Provide an `.env.example` with placeholder values for every required variable, kept in sync whenever a new env var is introduced.
- Since this project should run entirely on free infrastructure (see Section 0.2), do not introduce any dependency that requires a paid API key to function at all — if a feature seems to need one, that's a signal to find a free alternative or flag it, not to add a "temporary" paid key.

---

## 6. Reference Documents

- `CSS-Battle-Project-Plan.md` — the full project plan: scope, architecture, database schema, timeline, and the reasoning behind every stack choice. Treat it as the source of truth for "why," not just "what."
- Individual task/prompt `.md` files (if provided per module/screen) — treat these as the specific instructions for a given unit of work, scoped within the constraints of this file.

If this file and a specific task instruction conflict, flag the conflict rather than silently resolving it in either direction.
