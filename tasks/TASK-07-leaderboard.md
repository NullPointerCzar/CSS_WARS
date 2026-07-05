# Task: Leaderboard

**Module:** `leaderboard/`
**Depends on:** `TASK-01`, `TASK-06` (needs real submissions to rank)
**Read first:** `AGENTS.md`, `CSS-Battle-Project-Plan.md` Section 3.1 (Leaderboard, polled), Section 8 (tie-break rules), Section 9 (freeze option)

---

## Context

The leaderboard is read-only from the participant's perspective, refreshed via polling (no WebSockets — deliberately, see the plan). It should also support an admin-triggered "freeze" so results can be hidden/locked in the final minutes for suspense if the organizers want that.

## 1. Backend Endpoint

- `GET /api/leaderboard?challengeId=` — returns ranked results for a given challenge: each participant's best (`isBest: true`) submission, ordered by the tie-break rules from Section 8 (score desc → code length asc → submission time asc).
- `GET /api/leaderboard/overall` — aggregate ranking across all challenges if the event uses multiple challenges (define an aggregation rule — e.g. sum of best scores per challenge, or average — confirm this against the plan/admin's intent before implementing; if genuinely undecided, flag it rather than picking arbitrarily).
- Respect `CompetitionState.leaderboardFrozen` — if true, the endpoint should return the leaderboard **as it was at freeze time**, not live data. Simplest correct approach: when freezing, snapshot the current ranked results (e.g. into a cached table/JSON blob) rather than trying to time-travel query live data afterward.
- `PATCH /api/admin/leaderboard/freeze` — admin-only, toggles the freeze state (and creates the snapshot when freezing).
- `GET /api/admin/leaderboard/export` — admin-only, exports the full results as CSV (name, roll number if available, per-challenge scores, overall rank).

## 2. Frontend

- Leaderboard view polling `GET /api/leaderboard` every 5–10 seconds (use React Query's built-in polling/`refetchInterval`, not a hand-rolled `setInterval`).
- Clearly indicate if the leaderboard is currently frozen (e.g. a small banner: "Results frozen — final standings will be revealed shortly").
- Highlight the current logged-in participant's own row for easy visual tracking of their position.

## 3. What NOT to Do

- Don't implement WebSockets/real-time push — polling was a deliberate simplicity choice in the plan.
- Don't recompute the "frozen" leaderboard from live data on every request after freezing — that defeats the purpose of freezing (results should not change once frozen) and risks a query returning slightly different results moment to moment. Snapshot it once, freeze it for real.
- Don't build a permanent multi-event leaderboard history — this is scoped to a single Yatra event.

## 4. Verification Checklist

- [ ] Leaderboard correctly reflects tie-break rules (score → code length → submission time) — test with deliberately tied scores
- [ ] Freezing the leaderboard causes subsequent requests to return identical, unchanging data even as new submissions come in behind the scenes
- [ ] Unfreezing (if supported) correctly resumes live data
- [ ] CSV export contains correct, complete data and opens cleanly in a spreadsheet app
- [ ] Polling doesn't cause visible flicker/jank in the UI on each refresh
