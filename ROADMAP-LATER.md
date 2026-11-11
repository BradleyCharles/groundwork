# Later

Ideas that are out of scope for v0.1. Add to this file instead of widening the current plan.

- **Other package managers.** pnpm, yarn and bun need their own lockfile, CI commands, and permission rules (`Bash(pnpm run *)`). Only npm is supported now.
- **`groundwork upgrade`.** Back-porting improvements into an existing generated project.
- **Signed-in accessibility checks.** The axe suite only covers public routes. Authenticated pages (for example `/settings`) need a test user and a Playwright session.
- **Modules with real SDKs.** Would need lockfile regeneration per module (ADR 0015).
- **rolecheck spec format.** Replace the stub once rolecheck defines it.
- **Interactive checks not yet done.** Windows `$CLAUDE_PROJECT_DIR` expansion, the `/permissions` screen, the Stop-hook warning in the interactive UI, and S11 in another AGENTS.md-aware tool (see `docs/agent-validation.md`).
