# Maintenance

## Quarterly rule review

Remove or fix rules that no longer apply; an unsatisfiable rule teaches everyone to ignore the rest.

- [ ] Read every rule in `AGENTS.md`. Is each one still true and checkable?
- [ ] Removed a rule? Add an ADR in `docs/decisions/` first.
- [ ] `docs/living-docs.config.json` still matches the real folder layout; run `npm run docs:render`.
- [ ] Hooks and subagents in `.claude/` still match the rules (if present).
- [ ] `docs/technical-map/11-known-gaps.md` reviewed; close or schedule each gap.
- [ ] Dependabot pull requests merged or consciously deferred; `npm audit` clean at high severity.
- [ ] Supabase keys still use publishable/secret names; Supabase and Next.js release notes skimmed for auth or header changes.

## Monthly

- [ ] Are hooks or CI checks being bypassed or ignored? Fix the noise or remove the check.
- [ ] Archive `SESSION_STATE.md` snapshots older than six months from `docs/sessions/`.

## Back-porting from groundwork

This project does not update itself from the generator. Compare against the latest groundwork release and copy over improvements you want.
