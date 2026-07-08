# Task: Challenges CRUD + Publishing Flow

**Module:** `challenges/`
**Depends on:** `TASK-01-prisma-schema.md`, `TASK-02-identity-flow.md` (admin check middleware)
**Read first:** `AGENTS.md`, `CSS-Battle-Project-Plan.md` Section 3.2 (Admin Features), Section 8 (Database Schema)

---

## Context

Challenges are created and managed by the admin before/during the event, and shown to participants once published. This task covers CRUD + publish/unpublish only — not the submission or scoring logic that reads challenges (that's a separate task).

## 1. Backend Endpoints

- `GET /api/challenges` — public, returns only `published: true` challenges (participants should never see unpublished ones, even by guessing an ID directly — filter server-side, not client-side).
- `GET /api/challenges/:id` — public, single challenge detail, same publish-filtering rule applies.
- `POST /api/admin/challenges` — admin-only, creates a challenge (title, description, difficulty, roundNumber, targetImageUrl). Starts as `published: false` by default.
- `PUT /api/admin/challenges/:id` — admin-only, edits a challenge.
- `PATCH /api/admin/challenges/:id/publish` — admin-only, toggles `published` true/false.
- `DELETE /api/admin/challenges/:id` — admin-only. **Only allow deletion if no submissions reference it** — if submissions exist, reject with a clear error suggesting unpublish instead. Don't cascade-delete submissions silently.
- `POST /api/admin/challenges/:id/image` — admin-only, handles target image upload. Store the image on local disk (e.g. `/uploads/challenges/`) and serve it statically — no need for cloud storage (S3, Cloudinary, etc.) given this runs on a single self-hosted machine. Validate file type (images only) and a reasonable size cap.

## 2. Frontend

### Participant-facing
- Challenge list view (only published challenges), showing title, difficulty, and completion status if the participant has already submitted.
- Challenge detail view showing the target image — this feeds into the editor/preview built in a later task.

### Admin-facing
- Challenge list with edit/delete/publish-toggle controls.
- Create/edit form: title, description, difficulty dropdown, round number, image upload.
- Clear visual indicator of publish state (published challenges are visible to participants right now).

## 3. What NOT to Do

- Don't build challenge versioning/history — if an admin edits a challenge, it just changes; no need to track prior versions for this event.
- Don't build a rich text editor for the description field — plain text or basic Markdown rendering (if trivial) is enough.
- Don't allow deleting a challenge with existing submissions — this would silently corrupt leaderboard data.

## 4. Verification Checklist

- [ ] Unpublished challenges are not returned by the public `GET /api/challenges` endpoint, even when requested directly by ID
- [ ] Non-admin requests to `/api/admin/challenges/*` are rejected
- [ ] Image upload correctly rejects non-image files and oversized files
- [ ] Attempting to delete a challenge with existing submissions is blocked with a clear message
- [ ] Publishing/unpublishing correctly and immediately reflects in the participant-facing challenge list
