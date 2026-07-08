# Task: Rendering & Scoring Service (Playwright + Pixelmatch)

**Module:** `rendering/`, `scoring/`
**Depends on:** `TASK-01-prisma-schema.md`, `TASK-03-challenges-crud.md` (needs a target image to score against)
**Read first:** `AGENTS.md` (especially Section 2, "Critical Security Rules for the Rendering Pipeline" — this task IS that section made real), `CSS-Battle-Project-Plan.md` Section 10 (Submission → Scoring Pipeline), Section 4.1 (Capacity Reality Check)

---

## Context

This is the highest-risk part of the entire codebase — it executes arbitrary, untrusted HTML/CSS submitted by participants. Every decision here should assume a participant is actively trying to break out of the sandbox, not just writing sloppy code. Read `AGENTS.md` Section 2 in full before writing anything.

Given the event's hardware (see plan Section 4.1), this should run **synchronously per request** — no job queue (Redis/BullMQ). Do not add one.

## 1. Rendering Service

- Runs as an **isolated Node process** (separate from the main Express API — can be a separate module invoked via a controlled internal call, or a fully separate process/container communicating over a local-only internal API. Isolation matters more than the exact mechanism — a crash here must never take down auth/leaderboard/submission endpoints).
- For each submission:
  1. Take the submitted HTML + CSS, combine into a single HTML document.
  2. Sanitize first: strip `<script>` tags, `javascript:` URLs, and reject anything referencing external URLs (remote fonts, images, stylesheets) — allow only inline styles/content and the challenge's own target asset if referenced.
  3. Launch a **fresh, disposable** Playwright browser context (do not reuse contexts between submissions).
  4. **Disable JavaScript execution** in the Playwright context explicitly (e.g. `context.route` to block script requests, or the equivalent JS-disable API for the Playwright version in use) — do not rely on stripping `<script>` tags alone.
  5. Block all external network requests from the page (route interception — allow only `data:` URLs / same-origin local assets).
  6. Set a fixed viewport size (match whatever size the target images are designed for — confirm this from the challenges task/target images).
  7. Load the HTML, wait for render (with a **hard timeout** — a few seconds max; if it doesn't complete, treat as a failed/zero-score submission, not a retry).
  8. Take a screenshot.
  9. **Destroy the browser context immediately after** — never leave it around for reuse.

## 2. Scoring

- Compare the submission's screenshot against the challenge's target image using **Pixelmatch**.
- Compute a similarity percentage from the pixel diff result.
- Store: `score`, `screenshotUrl` (save the screenshot to local disk, e.g. `/uploads/submissions/`), on the `Submission` record.
- Implement the tie-break logic from the plan (Section 8): highest score wins; tie → shortest code length; still tied → earliest submission time. This can live as a pure function in `scoring/` so it's easily unit-testable.

## 3. Resource Limits

- Hard execution timeout per render (a few seconds).
- Reject submissions with an excessively large HTML/CSS payload before they ever reach the renderer (define a reasonable size cap, e.g. a few hundred KB — participants are writing hand-crafted CSS, not generating megabytes of markup).
- No memory/CPU limits are strictly required given the server hardware (see plan Section 4.1), but the timeout above is still mandatory as a correctness/safety measure, not just a performance one — a hung render must not hang the request indefinitely.

## 4. What NOT to Do

- Do not add a job queue (BullMQ/Redis) — validated as unnecessary given the server hardware, see `AGENTS.md`.
- Do not re-enable JavaScript, allow external requests, or share browser contexts between submissions "to fix a bug" or "to make a test pass" — if you find yourself doing this, the actual problem is elsewhere; flag it instead.
- Do not trust client-side sanitization alone — this service must independently sanitize/validate every submission's HTML/CSS as if it arrived from a hostile, unvalidated source, because it did.
- Do not build a "preview via the actual scoring pipeline" feature for participants — the scoring pipeline is server-authoritative and separate from the client-side preview/comparison tools built in `TASK-04`.

## 5. Verification Checklist

- [ ] A normal, well-formed HTML/CSS submission renders and scores correctly end-to-end
- [ ] A submission containing `<script>alert(1)</script>` is rejected or has the script neutralized — verify no JS actually executes during render
- [ ] A submission referencing an external image/font URL does not successfully load that external resource
- [ ] A submission designed to hang (e.g. an infinite CSS animation loop, extremely large DOM) is killed by the timeout and treated as a failed/zero submission, not left hanging
- [ ] Two submissions in a row use fully independent browser contexts (no state leaks between them — test with two submissions that would behave differently if state were shared)
- [ ] Tie-break logic produces the correct ranking on a small set of test cases with equal scores
- [ ] Full loop tested: submission → render → score → stored in DB → retrievable via a query, matching what the plan's "de-risk early" recommendation calls for
