@AGENTS.md

## Claude Code

- Hooks in `.claude/settings.json` enforce parts of the rules above. If a hook blocks you, explain the block to the user rather than working around it.
- Use the reviewer subagents in `.claude/agents/` before marking UI, API, or database work complete.
- Procedures for handoff, database changes, specs, and audits are available as skills in `.claude/skills/`.
