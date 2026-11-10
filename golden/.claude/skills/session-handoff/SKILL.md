---
name: session-handoff
description: Archive SESSION_STATE.md and rewrite it under 150 lines at a milestone or before the context window fills, then say the handoff phrase. Use when the user asks for a handoff or when context is nearly full.
---

# Session handoff

`AGENTS.md` (Session Protocol) is the source of these rules. Rewrite, never append.

1. Pick today's date as `YYYY-MM-DD`. Copy `SESSION_STATE.md` to `docs/sessions/<date>.md`. If that file exists, use `<date>-2.md`, `<date>-3.md`, and so on. Do not overwrite an archive.
2. Rewrite `SESSION_STATE.md` from `docs/templates/SESSION_STATE.md`, carrying forward only what the next session needs:
   - Start Here: at most 30 lines; the first thing the next session must know.
   - Last Updated: today's date.
   - Active Goal: one sentence.
   - In Progress, Blockers, Waiting on the User, Next Steps: current items only; delete finished ones.
   - Machine Notes: environment facts another machine or person needs.
   - Gotchas: traps hit, with the fix.
3. Keep the file under 150 lines. Move detail into `docs/` and link to it instead of copying it.
4. Do not record secrets, tokens, or `.env` values anywhere in the file.
5. Tell the user exactly: "State preserved in SESSION_STATE.md. Ready for a fresh chat."

Do not commit. The user commits the archive and the rewritten file.
