# Overview

Last updated: 2026-11-09

- Next.js 16 (App Router, TypeScript strict), Tailwind 4, Supabase (Postgres, Auth).
- `app/`: routes. `lib/`: server and shared code. `supabase/`: migrations, generated schema docs, pgTAP tests. `scripts/`: database and docs tooling. `tests/`: Vitest unit tests.
- Every page renders dynamically so the CSP nonce can be applied.
- Node 24 or newer.
- `.claude/` holds the Claude Code layer: hooks (`hooks/`, Node scripts with tests in `tests/hooks/`), four read-only reviewer subagents, and four procedure skills. CI remains the authority for every rule a hook enforces.
