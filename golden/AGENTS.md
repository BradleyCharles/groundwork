# Groundwork App

Starter Next.js and Supabase application with a security baseline, WCAG 2.2 AA accessibility, and living documentation. Replace this paragraph with the project's scope statement.

## Session Protocol

- At session start, read `SESSION_STATE.md`. If it does not exist, create it from `docs/templates/SESSION_STATE.md`.
- At a milestone, or before the context window fills: copy `SESSION_STATE.md` to `docs/sessions/<date>.md`, then rewrite it. Never append. Keep it under 150 lines.
- Then tell the user: "State preserved in SESSION_STATE.md. Ready for a fresh chat."
- Facts another machine or person needs go in SESSION_STATE "Machine notes" or in docs, not in tool-specific memory.

## Hard Constraints

- Only the user commits or pushes. Never run `git commit` or `git push`.
- No new dependencies without explicit user approval.
- RLS is the authority for data access. UI and route checks are additional layers, never the only check.
- Never edit `supabase/schema.sql` or `supabase/policies.sql` by hand. They are generated.
- Never read or print `.env*` files or secret values.

## Security Constraints

Rules only. Rationale and examples: `docs/security-constraints.md`.

- Never spread a client request body into a downstream call. Accept named fields only (`pickAllowed`).
- Every API route starts with `requireUser()` or `requireRole()`.
- UPDATE policies pin ownership and role columns with `with check`; columns that must never change use column-level `GRANT UPDATE`.
- Nothing in `public` is granted to `anon`. New functions are `service_role` only until a migration grants them. A `security definer` function never trusts a caller-supplied user id.
- When the server writes with the admin client, the client gets no write path for that table.
- Never return raw database or library errors to the client. Use `logAndRespond()`.
- External calls have a timeout, `try/catch`, and mapped error status.
- User-submitted content rendered as HTML is escaped first. Never use `dangerouslySetInnerHTML`.
- Secrets are never logged and never stored in plaintext in broadly readable tables.
- Server-only values stay in `lib/env.ts` `serverEnv()` and `lib/supabase/admin.ts`; never import them from client code.
- New API routes, integrations, or stored user fields trigger a check against this section before completion.

## Accessibility (WCAG 2.2 Level AA)

- Text contrast 4.5:1 (3:1 for large text and UI component borders); color is never the only signal.
- Every interactive element works by keyboard, has a visible focus indicator, and is at least 24x24px.
- Sizes use `rem`; body text is at least 16px with line height 1.5; layouts reflow at 320px.
- Semantic landmarks, logical heading order, a unique `<title>` per page, `lang` on `<html>`, and a skip link as the first focusable element.
- Every input has a visible label, errors are text associated with the input, and personal data fields have `autocomplete`.
- Images have meaningful `alt` or `alt=""`; dynamic updates use `aria-live` or `role="alert"`.
- Honor `prefers-reduced-motion`.

Verify against Section 17 of `docs/web-accessibility-requirements.md` before completing any UI task.

## Living Documentation

Source: `docs/living-docs.config.json`. CI fails when a listed source changes without a listed doc.
<!-- BEGIN:living-docs -->
| When this changes | Update | Also check |
| --- | --- | --- |
| Route added, removed, or renamed (`app/**/page.tsx`, `app/**/layout.tsx`) | `docs/technical-map/02-site-map.md`, `docs/technical-map/03-permissions.md` |  |
| API route added, removed, or contract changed (`app/api/**`) | `docs/technical-map/05-api-routes.md` | Security Constraints |
| Component added, removed, or significantly refactored (`components/**`) | `docs/technical-map/04-components.md` | Accessibility Section 17 |
| Table, column, policy, grant, or function changed (`supabase/migrations/**`) | `docs/technical-map/06-database.md`, `supabase/schema.sql`, `supabase/policies.sql` |  |
| Auth, session, or role logic changed (`lib/auth/**`, `proxy.ts`) | `docs/technical-map/03-permissions.md`, `docs/technical-map/08-auth-flow.md` |  |
<!-- END:living-docs -->

## Database Change Procedure

1. Write a re-runnable migration in `supabase/migrations/`.
2. `npx supabase db reset` to apply locally.
3. `npm run db:docs` to regenerate schema and policies.
4. `npx supabase test db`; add or update tests for any policy change.
5. Ask the user to review and commit the migration and regenerated files together.

## Completion Checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` pass
- [ ] `npm audit --audit-level=high` shows no new high or critical advisories
- [ ] Living docs updated per the table above
- [ ] Security Constraints check done for new data flows
- [ ] Accessibility Section 17 check done for UI changes
- [ ] Database procedure followed for any schema, policy, or grant change

## Specs

New features start from `docs/specs/_template.md`. Respect its "Already complete: do not touch" and "Files to leave alone" sections.

## Memory Policy

Rules live in this file. Situational facts live in `SESSION_STATE.md`. Nothing that another machine or person needs lives only in tool-specific memory.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
