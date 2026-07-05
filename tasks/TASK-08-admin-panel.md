# Task: Admin Competition Controls

**Module:** `admin/`
**Depends on:** `TASK-01`, `TASK-02` (admin PIN check), `TASK-03`, `TASK-06`, `TASK-07`
**Read first:** `AGENTS.md`, `CSS-Battle-Project-Plan.md` Section 3.2 (Admin Features), Section 13 (Operational Features Organizers Will Actually Need)

---

## Context

This is the control panel organizers actually touch live during the event. Per the plan's Section 13, these low-effort features matter more to a smooth event than participant-facing polish — prioritize correctness and clarity here.

## 1. Backend Endpoints

- `PATCH /api/admin/competition/status` — body: `{ status }` (`NOT_STARTED | RUNNING | PAUSED | ENDED`). Updates the single `CompetitionState` row.
- `PATCH /api/admin/competition/lock` — body: `{ locked: boolean }`. Toggles whether new submissions are accepted (checked by `TASK-06`'s submission endpoint).
- `PATCH /api/admin/competition/round` — body: `{ currentRound }`. Advances which round/challenge set is "current," if the event structure uses this.
- Freeze/unfreeze and CSV export are covered in `TASK-07` — this module's admin UI should surface those controls too, not duplicate the logic.
- `GET /api/admin/submissions?challengeId=` — admin-only, lists all submissions for a challenge with user, code, screenshot, and score, for manual review.
- `POST /api/admin/submissions/:id/rejudge` — admin-only, re-runs the rendering/scoring pipeline (`TASK-05`) for a specific submission — needed if a scoring bug is discovered mid-event and needs correcting without asking everyone to resubmit.

## 2. Frontend — Admin Panel

Build a single-page admin dashboard with clearly separated sections:
- **Competition Controls:** Start / Pause / Resume / End buttons (map to status changes), Lock/Unlock Submissions toggle, current round display/advance control.
- **Leaderboard Controls:** Freeze/Unfreeze toggle, Export CSV button (surfaces `TASK-07`'s endpoints).
- **Submission Review:** a searchable/filterable table of all submissions for a selected challenge, showing user, score, code length, timestamp, with a way to view the submitted code and screenshot, and a "Rejudge" button per submission.
- **Challenge Management:** links into the CRUD UI from `TASK-03`.
- **Participant Management:** links into the bulk-create/PIN-reset UI from `TASK-02`.

Every destructive or state-changing action (especially "End Competition" and "Lock Submissions") should have a confirmation step — these are actions an organizer might trigger under time pressure during a live event, and an accidental click has real consequences.

## 3. What NOT to Do

- Don't build multi-admin accounts/permissions — single shared admin PIN per `TASK-02`.
- Don't build an audit log/history system for admin actions — out of scope for this event's size.
- Don't let "Rejudge" silently overwrite a submission's history — it should update the existing record's score/screenshot in place (it's correcting a bug, not creating a new attempt), but this should be clearly logged/visible in the UI so it's not confused with a genuine resubmission.

## 4. Verification Checklist

- [ ] Locking submissions immediately prevents new submissions (test via `TASK-06`'s endpoint directly, not just through the UI)
- [ ] Status transitions (start/pause/resume/end) work correctly and are reflected wherever `CompetitionState` is read elsewhere in the app
- [ ] Rejudging a submission correctly updates its score without creating a duplicate submission record
- [ ] Confirmation prompts appear before destructive actions (End Competition, Lock Submissions) and canceling actually cancels (no state change)
- [ ] Admin panel is fully inaccessible without the correct `ADMIN_PIN`
