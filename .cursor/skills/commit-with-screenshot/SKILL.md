---
name: commit-with-screenshot
description: >-
  ReadCast: commit and push with a browser screenshot of the changed UI in the
  summary. Use when the user asks to commit and push, ship changes, or wants
  visual proof in the commit summary.
---

# Commit with Screenshot

When the user asks to commit (and push), do this:

1. **Git** — `git status`, `git diff`, `git log -5` (parallel). Follow user git
   rules; never commit secrets. HEREDOC commit message.

2. **Screenshot** — Skip only for non-UI diffs (say why).
   - Start web if needed: `npx expo start --web --port 8090` (see `AGENTS.md`
     for stub mode, testIDs, and Tier 2 loop).
   - `cursor-ide-browser`: navigate → lock → reach the changed screen →
     `browser_take_screenshot` (fullPage for modals) → unlock.
   - CDP fallback: `document.querySelector('[data-testid="…"]')?.click()`

3. **Save** — `.cursor/commit-evidence/<date>-<slug>.png` (gitignored; do not
   stage). Add `Visual: <path>` to the commit body.

4. **Commit & push** — stage relevant files, commit, `git push -u origin HEAD`
   if requested.

5. **Summary** — return what shipped, commit hash, push status, and embed the
   screenshot:

   ```markdown
   ## Shipped `<hash>`
   **Summary:** …
   ![…](.cursor/commit-evidence/<file>.png)
   **Reproduce:** …
   ```

Update `AGENTS.md` in the same commit if architecture or verification changed.
