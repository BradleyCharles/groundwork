# ADR 0002: Agent instruction source

- **ID:** D2
- **Status:** Accepted
- **Source:** scaffolder-roadmap.md, Section 1

## Decision

`AGENTS.md` is the source; `CLAUDE.md` contains `@AGENTS.md` plus Claude-only additions

## Reason

Works for Cursor, Codex, Copilot and others; matches what `create-next-app` generates; committing CLAUDE.md guarantees the import regardless of a user's Claude Code settings. [verify]
