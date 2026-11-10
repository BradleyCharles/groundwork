# ADR 0013: Next.js managed AGENTS.md block, verified

- **Status:** Accepted
- **Supports:** ADR 0003

## Finding (Next 16.4.6)

With an `AGENTS.md` that already contains `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->`, `next dev` logged "Generated AGENTS.md for AI agents" and wrote its text only between the markers. Everything outside the markers was unchanged, and `CLAUDE.md` was not touched.

## Consequences

- The generator ships the marker pair empty; the first `next dev` fills it, and that content is committed with the project.
- `scripts/docs/check-agents-md.mjs` excludes the managed block from the history lint. The 10 KB size limit still counts it (about 0.9 KB).
- `agentRules: false` in `next.config.ts` disables the behavior if it ever conflicts.
