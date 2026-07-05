# Task: Monaco Editor, Live Preview & Comparison Tools

**Module:** frontend — `components/Editor/`, `components/Preview/`, `components/CompareTools/`
**Depends on:** `TASK-03-challenges-crud.md` (needs a target image to compare against)
**Read first:** `AGENTS.md`, `CSS-Battle-Project-Plan.md` Section 3.1.1 (Comparison Tools), Section 7 (Frontend Structure), Section 2 (Security — sandboxing rules apply here too)

---

## Context

This is the core participant-facing screen: HTML editor + CSS editor + live preview + comparison tools, all on one page. This task is purely client-side — no submission/scoring logic yet (that's a later task). The goal here is a smooth editing/previewing experience.

## 1. Editor

- Use **Monaco Editor** (`@monaco-editor/react` or the raw `monaco-editor` package) — two instances, one for HTML and one for CSS, with appropriate language modes for syntax highlighting.
- Debounce editor changes (e.g. 300–500ms) before triggering a preview re-render — don't re-render on every keystroke, it'll feel janky and waste cycles.
- Persist in-progress code to `localStorage` per challenge (keyed by challenge ID + user ID) so a participant doesn't lose work on an accidental refresh. This is separate from actual submission — just a client-side draft safety net.

## 2. Live Preview (Sandboxed)

- Render the participant's HTML/CSS inside an `<iframe>` using `srcDoc`, **not** `dangerouslySetInnerHTML` on the main page — this must be fully isolated from the parent page's DOM/JS context.
- Set `sandbox="allow-same-origin"` on the iframe — deliberately **do not** add `allow-scripts`, since challenges are HTML/CSS only. This mirrors the server-side rendering security rules in `AGENTS.md` Section 2, applied client-side.
- Combine the HTML and CSS into a single document for the `srcDoc` (inject the CSS into a `<style>` tag in the `<head>` of the participant's HTML).

## 3. Comparison Tools

Implement as togglable view modes above/around the preview pane (a small toggle group: Normal / Split / Opacity / Diff). All are purely client-side visual aids — they don't call the backend or affect scoring.

- **Split Slider:** layer the target `<img>` and the preview `<iframe>` in the same container; use a draggable handle that sets `clip-path: inset(0 <slider%> 0 0)` on the top layer as it's dragged.
- **Opacity Slider:** a range input (0–100) controlling the `opacity` CSS property of the target image overlaid on top of the live preview.
- **Difference Mode:** use `html2canvas` to render the live iframe content to a `<canvas>`, load the target image onto a second same-sized `<canvas>`, then run **Pixelmatch** (client-side) between the two and draw the diff output (mismatches highlighted in red) to a result canvas, shown as an overlay. This intentionally mirrors the server-side scoring library so the visual feedback participants see roughly corresponds to what actually gets scored — see Section 3.1.1 of the plan for the full reasoning on why this approach was chosen over a `mix-blend-mode` CSS trick.

## 4. What NOT to Do

- Don't add `allow-scripts` to the preview iframe under any circumstances, even if a "cool" HTML/CSS trick a participant tries seems to need JS — that's participant error, not something to accommodate by loosening sandboxing.
- Don't fetch the target image or run comparisons on every keystroke without debouncing — this will feel laggy and burn CPU for no benefit.
- Don't build undo/redo history beyond what Monaco already provides for free.

## 5. Verification Checklist

- [ ] Typing in either editor updates the preview after a short debounce, not instantly per keystroke
- [ ] The preview iframe cannot execute injected `<script>` tags (test this explicitly with a submission that tries to run JS)
- [ ] Split, Opacity, and Difference modes all work correctly against a real target image and a rough hand-written HTML/CSS attempt
- [ ] Refreshing the page restores the participant's in-progress code from `localStorage`
- [ ] Difference Mode diff output roughly matches what you'd expect visually (obvious mismatches show red, close matches show little/no red)
