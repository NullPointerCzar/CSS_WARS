# Task: Submission Flow

**Module:** `submissions/`
**Depends on:** `TASK-01` through `TASK-05` — this task wires the editor (04) to the rendering/scoring service (05), storing results via the schema (01), gated by identity (02), against a challenge (03).
**Read first:** `AGENTS.md`, `CSS-Battle-Project-Plan.md` Section 3.1 (Participant Features), Section 10 (Pipeline)

---

## Context

This is the glue module: participant clicks "Submit," and the system needs to safely, reliably get their code scored and recorded. Resubmissions are allowed — best score counts (see plan Section 9).

## 1. Backend Endpoint

- `POST /api/submissions` — body: `{ userId, challengeId, htmlCode, cssCode }`.
  1. Verify the competition isn't locked (`CompetitionState.locked === false`) — if locked, reject with a clear "submissions are closed" message.
  2. Verify the challenge is published.
  3. Compute `codeLength` (byte size of combined HTML+CSS).
  4. Call the rendering/scoring service from `TASK-05` synchronously, and wait for the score.
  5. Store the new `Submission` record.
  6. Check if this is the user's new best score for this challenge; if so, update `isBest` (set the previous best's `isBest` to false, new one to true) — this should happen in a transaction to avoid a race condition if a user double-submits quickly.
  7. Return the score, screenshot URL, and current rank to the frontend.

- `GET /api/submissions/mine?userId=&challengeId=` — returns a participant's submission history for a given challenge (for showing past attempts/scores).

## 2. Frontend

- Wire the "Submit" button from the editor screen (`TASK-04`) to call the endpoint above.
- Show a clear loading state during submission — since rendering takes roughly 0.5–1 second (see plan Section 4.1), a brief spinner/disabled-button state is enough; no need for a progress bar or polling for an async job (there isn't one, this is synchronous).
- After submission, show the score, a side-by-side of the participant's screenshot vs. the target, and their current rank on this challenge.
- Disable/hide the submit button and show a clear message if the competition is locked or the challenge is unpublished.
- Rate-limit resubmission on the frontend lightly (e.g. disable the button for a couple seconds after a submission) to avoid accidental double-clicks — the backend transaction handles correctness regardless, this is just UX polish.

## 3. What NOT to Do

- Don't build a submission queue or "your submission is being processed" async UI — the rendering service is synchronous and fast enough (per Section 4.1) that this would add complexity for no benefit.
- Don't let a submission through if the competition is locked, even if the request technically reaches the endpoint before a UI-level lock check would catch it — enforce this server-side, not just client-side.
- Don't silently drop old submissions when a new best is set — keep full submission history per user per challenge (useful for admin review and for participants to see their own progress).

## 4. Verification Checklist

- [ ] Submitting valid HTML/CSS returns a score and updates the leaderboard-relevant data correctly
- [ ] Resubmitting with a better score correctly updates `isBest`; resubmitting with a worse score does not overwrite the existing best
- [ ] Submitting while the competition is locked is rejected server-side, even if attempted via a direct API call bypassing the UI
- [ ] Submitting to an unpublished/nonexistent challenge is rejected with a clear error
- [ ] Rapid double-submission (e.g. double-click) doesn't create a race condition in the `isBest` update logic
- [ ] Submission history endpoint correctly returns all past attempts for a user+challenge, not just the best one
