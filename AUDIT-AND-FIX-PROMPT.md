# Prompt: Full Codebase Audit & Repair — CSS Battle Platform

Copy everything below into the LLM/agent you're using. Attach (or paste) alongside it: `AGENTS.md`, `CSS-Battle-Project-Plan.md`, all `TASK-01` through `TASK-08` files, and full access to (or a paste of) the current repo. If you have actual error messages/console logs/screenshots, attach those too — "there are many errors" is much less useful to an LLM than the actual stack traces.

---

## Prompt Starts Here

I'm building a CSS Battle-style competition platform for a college event (Yatra @ NCE College). The full spec, constraints, and build sequence already exist in the attached documents:

- `AGENTS.md` — hard constraints on stack, security, and scope. Read this first and follow it strictly. Do not deviate from the locked tech stack, do not add features out of scope, do not loosen any security rule described there to "make something work."
- `CSS-Battle-Project-Plan.md` — the full project plan, architecture, database schema, and reasoning behind every decision.
- `TASK-01` through `TASK-08` — the intended build sequence and per-module requirements (identity, challenges, editor/preview, rendering/scoring, submissions, leaderboard, admin panel).

**Current situation:** development has gotten messy. Multiple pieces are partially built, several things throw errors, and some core functionality doesn't work at all. I need you to fix this properly — not by patching symptoms, but by understanding what's actually broken and why, in the context of what was supposed to be built.

**The one problem I can describe concretely right now:** participants are supposed to see the challenge's target image (uploaded by the admin) while they write HTML/CSS to try to match it. Right now, that image is not being uploaded and/or not being rendered to the client at all — the core mechanic of the entire platform is currently non-functional. There are also other errors and broken functionality across the app that I haven't fully diagnosed myself.

## What I need you to do, in this order:

### Step 1 — Audit first. Do not fix anything yet.

Go through the entire current codebase and produce a written diagnostic report covering:

1. **Module-by-module status**, mapped against `TASK-01` through `TASK-08`: for each module, state whether it's fully implemented, partially implemented, stubbed, or missing entirely — and what specifically is incomplete or wrong, compared to that task file's requirements.
2. **Full trace of the target image lifecycle**, end to end, since this is the known-broken critical path:
   - Admin upload endpoint — does it exist, does it accept the file, does it store it correctly?
   - Storage — where is the image actually being saved (disk path, DB field), and is that path/URL correct and consistent?
   - The `Challenge.targetImageUrl` field — is it being populated correctly on upload?
   - The serving route — is the image actually being served back over HTTP from wherever it's stored? Test this directly (e.g. hit the URL and confirm what comes back), don't just read the code and assume it works.
   - The frontend fetch — does the challenge page actually request the image using the correct URL?
   - The render — does the `<img>` (or however it's rendered) actually display, and are there console errors (404, CORS, broken path, etc.)?
   - **Pinpoint the exact step where this chain breaks.** Don't just say "image upload is broken" — tell me specifically which link in this chain fails and why.
3. **Every current error**: go through server logs, browser console errors, and any failing requests you can reproduce by actually running the app, and list each one with its root cause — not just where it surfaces, but why it's happening.
4. **Any deviations from `AGENTS.md`**: check whether the current code has drifted from the locked stack or scope (e.g. did something add auth/JWT despite the identity-lite decision, did something swap Monaco for something else, is there a dependency that shouldn't be there). Flag anything you find.

Present this audit as a clear, organized report before doing anything else. I want to actually understand the current state before you start changing code.

### Step 2 — Propose a fix plan.

Based on the audit, give me an ordered list of fixes, sequenced by actual dependency (e.g. a broken schema field needs fixing before the endpoint using it can be fixed, which needs fixing before the frontend consuming it can be fixed) — not just severity. For each fix, briefly note:
- What's broken and why
- What the fix involves
- Whether it's a small correction or something that touches multiple files/modules
- Flag anything where you're not fully certain of the right fix, or where fixing it requires a decision from me, rather than guessing and proceeding.

### Step 3 — Execute the fixes.

Once the plan is laid out, fix issues **in the order established above**, starting with the target image pipeline specifically, since the editor/preview (`TASK-04`), rendering/scoring (`TASK-05`), and submission flow (`TASK-06`) all depend on participants actually being able to see the target image — nothing downstream can be meaningfully tested until this works.

For every fix:
- Actually run/test it — don't mark something fixed based on reading the code and assuming it's correct. Reproduce the original failure, apply the fix, then reproduce again to confirm it's actually resolved.
- Stay within the constraints in `AGENTS.md` — same stack, same scope, same security rules. If a "quick fix" would require violating one of those (e.g. re-enabling JS in the sandboxed preview, adding a new dependency not in the locked stack, adding scope not in the task files), stop and tell me instead of doing it.
- Keep fixes scoped to the actual bug — don't refactor unrelated working code "while you're in there."

## Additional context to consider while doing this:

- This runs on a single powerful self-hosted machine (a school PC — i9-14900K, 64GB RAM), on the local network, no cloud/VPS. Everything must work in that context (local file storage is fine and expected, no cloud storage assumptions).
- Everything must remain free — no paid services, APIs, or tiers of any kind.
- I'm a computer engineering student and project lead who's comfortable reading code and technical explanations — you don't need to oversimplify, but please be precise and avoid hand-wavy summaries like "fixed the image issue" without stating exactly what was wrong and what changed.

Start with Step 1 — the audit — and stop there for me to review before moving to Step 2.
