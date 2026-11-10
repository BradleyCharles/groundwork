# Contributing

## Workflow

1. Start from a spec (`docs/specs/_template.md`) for anything beyond a small fix.
2. Branch, make the change, and keep each pull request to one concern.
3. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. For database changes also follow the Database Change Procedure in `AGENTS.md`.
4. Update the docs that `docs/living-docs.config.json` lists for the files you changed. If a change truly needs no doc update, a maintainer adds the `docs-not-needed` label.
5. Open a pull request using the template.

## Rules

`AGENTS.md` is the single source of rules for people and coding agents. Only people commit and push.

## Accessibility

Every UI change is checked against Section 17 of `docs/web-accessibility-requirements.md`. CI runs automated axe checks, which catch only part of the requirements; keyboard and screen reader checks remain manual.

## Reporting a vulnerability

See `SECURITY.md`.
