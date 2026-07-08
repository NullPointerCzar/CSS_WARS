# Task: Identity Flow (Name + PIN Selection)

**Module:** `identity/`
**Depends on:** `TASK-01-prisma-schema.md` (must be complete — this task reads/writes the `User` model)
**Read first:** `AGENTS.md`, `CSS-Battle-Project-Plan.md` Section 3.0 ("Identity, Not Auth")

---

## Context

This platform deliberately has **no password-based auth**. Participants are pre-registered by the admin before the event and select their name from a dropdown at the start, optionally entering a short PIN. See Section 3.0 of the plan for the full reasoning — do not build login/register/JWT here, even if it feels like the "normal" thing to add.

---

## 1. Backend Endpoints

- `GET /api/participants` — returns the list of pre-registered participant names (id + name only, no PIN) for populating the dropdown. Public, no identity check needed to view this list.
- `POST /api/identity/select` — body: `{ userId, pinCode? }`. Validates that `userId` exists and, if that user has a `pinCode` set, that the submitted code matches. Returns the user's `id`, `name`, and `role` on success, or a clear error if the PIN doesn't match.
- `POST /api/admin/participants` — admin-only, bulk-creates participants from a list (supports pasting/uploading a simple name list or CSV). Requires the admin identity check (see Section 3 below).
- `POST /api/admin/participants/:id/pin` — admin-only, sets/regenerates a PIN for a specific participant (useful if someone loses their card at the event).

## 2. Frontend

- A landing screen with a **searchable dropdown** (not free text) populated from `GET /api/participants`.
- If the selected user has a PIN configured, show a 4-digit PIN input before proceeding.
- On success, store `{ userId, name, role }` in `localStorage` under a single namespaced key (e.g. `cssbattle_identity`). This is the entire "session" — no cookies, no tokens.
- On every subsequent page load, read from `localStorage` first; if present, skip the selection screen and go straight to the dashboard. Provide a visible "Not you? Switch user" link that clears `localStorage`.
- Handle the case where `localStorage` is empty/cleared (e.g. private browsing, cleared cache) gracefully — just send them back to the selection screen, no error state needed.

## 3. Admin Identity

- Admin access is gated by a **single shared PIN/passphrase** stored in an environment variable (`ADMIN_PIN`), not a per-admin-user system. This is a middleware check (`middleware/adminCheck.js` or similar) applied to all `/api/admin/*` routes — compare the submitted value against `process.env.ADMIN_PIN`.
- This is intentionally simple. Do not build multi-admin accounts, admin roles/permissions, or an admin login screen with a "remember me" flow — one shared PIN, checked per-request via a header or short-lived client-side stored value, is sufficient for this event's scale.

## 4. What NOT to Do

- No JWT issuing, no session cookies, no password hashing.
- No "forgot PIN" self-service flow — that's an admin action (regenerate via the admin endpoint above).
- Do not silently allow selecting a user that doesn't have a PIN set with a blank/empty PIN check that "always passes" — if no PIN is set for a user, skip the PIN step entirely rather than faking a check.

## 5. Verification Checklist

- [ ] Selecting a name with no PIN configured logs the user in immediately
- [ ] Selecting a name with a PIN configured requires the correct PIN, and rejects an incorrect one with a clear (not cryptic) error
- [ ] `localStorage` correctly persists identity across a page refresh
- [ ] "Switch user" clears identity and returns to the selection screen
- [ ] Admin routes reject requests without the correct `ADMIN_PIN`
- [ ] Bulk participant creation correctly enforces the unique-name constraint from the schema (duplicate name attempt should fail with a clear error, not a raw DB error)
